import csv
import os
import re
import io
import redis
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.core.config import settings
from app.models import Job, Product, Log, Export
from app.schemas import JobOut, JobCreate
from app.tasks.celery_worker import scrape_amazon_job

router = APIRouter(tags=["Jobs"])
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.post("/upload", response_model=List[str])
def upload_urls_file(
    file: UploadFile = File(...),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Parse uploaded CSV or TXT file and return list of extracted URLs.
    Supports CSV file with 'url' column, or plain text with one URL per line.
    """
    content = file.file.read().decode("utf-8")
    urls = []
    
    if file.filename.endswith(".csv"):
        # Parse CSV
        reader = csv.reader(io.StringIO(content))
        header = next(reader, None)
        url_idx = 0
        if header:
            # Look for header matching 'url'
            try:
                url_idx = [h.strip().lower() for h in header].index("url")
            except ValueError:
                # Fallback to first column
                url_idx = 0
                if header[0].startswith("http"):
                    urls.append(header[0].strip())
            
            for row in reader:
                if row and len(row) > url_idx:
                    val = row[url_idx].strip()
                    if val.startswith("http"):
                        urls.append(val)
    else:
        # Parse text line by line
        for line in content.splitlines():
            val = line.strip()
            if val.startswith("http"):
                urls.append(val)
                
    if not urls:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid URLs found in the uploaded file. Ensure they start with 'http'."
        )
        
    return urls


@router.post("/jobs", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new scraping job and enqueue the Celery worker task"""
    if not job_in.urls:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="List of URLs cannot be empty."
        )

    # 1. Save Job record
    job = Job(
        user_id=current_user_id,
        status="queued",
        total_urls=len(job_in.urls),
        completed_count=0,
        failed_count=0,
        created_at=datetime.now()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # 2. Trigger Celery Task
    scrape_amazon_job.delay(job.id, job_in.urls)
    
    # Write initial db log
    initial_log = Log(
        job_id=job.id,
        level="info",
        message=f"Job queued with {len(job_in.urls)} products to scrape."
    )
    db.add(initial_log)
    db.commit()

    return job


@router.get("/jobs", response_model=List[JobOut])
def get_jobs(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Retrieve all jobs owned by current user"""
    return db.query(Job).filter(Job.user_id == current_user_id).order_by(Job.created_at.desc()).all()


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job_by_id(
    job_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Retrieve detailed progress stats for a job"""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a job and its associated data"""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    
    # Remove files associated with the job if any
    exports = db.query(Export).filter(Export.job_id == job_id).all()
    for exp in exports:
        try:
            if os.path.exists(exp.file_path):
                os.remove(exp.file_path)
        except Exception:
            pass

    # Clean up logs files
    log_path = settings.LOGS_DIR / f"job_{job_id}.log"
    try:
        if log_path.exists():
            log_path.unlink()
    except Exception:
        pass

    db.delete(job)
    db.commit()
    return None


@router.post("/jobs/{job_id}/cancel")
def cancel_job(
    job_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Request job cancellation. Worker will intercept during iteration."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    
    if job.status not in ["queued", "running"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel a job that is already '{job.status}'"
        )
    
    # Store cancellation flag in Redis (expires in 24 hours)
    redis_client.set(f"job:cancel:{job_id}", "true", ex=86400)
    
    # If job was still queued in Celery (not yet started by worker), we can mark it cancelled immediately
    if job.status == "queued":
        job.status = "cancelled"
        job.completed_at = datetime.now()
        db.commit()
        
    return {"message": f"Cancellation requested for job {job_id}."}


@router.post("/jobs/{job_id}/retry", response_model=JobOut)
def retry_failed_urls(
    job_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Rerun failed URLs from a previous scraping job as a new job.
    Fetches all logs or items to determine which URLs failed.
    """
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    
    # Find successfully scraped URLs
    scraped_urls = {p.product_url for p in job.products}
    
    # We find failed URLs by parsing the job logs in the DB or reading the log file
    # Or by matching against errors. A clean way is checking Log entries for navigation failures
    failed_logs = db.query(Log).filter(Log.job_id == job_id, Log.level == "error").all()
    
    failed_urls = []
    # If we have logged navigations, let's extract them
    # For a robust fallback, we can parse the log file if it exists, or scrape database logs
    # Better: scan db logs for "Failed scraping URL" which contains the URL
    for log_entry in failed_logs:
        match = re.search(r'Failed scraping URL (https?://[^\s]+):', log_entry.message)
        if match:
            failed_urls.append(match.group(1))
            
    # Remove duplicates
    failed_urls = list(set(failed_urls))
    
    # If no URLs were extracted from error logs but failed count > 0, we can read the raw log file as fallback
    if not failed_urls:
        log_file_path = settings.LOGS_DIR / f"job_{job_id}.log"
        if log_file_path.exists():
            with open(log_file_path, "r", encoding="utf-8") as f:
                for line in f:
                    match = re.search(r'Failed scraping URL (https?://[^\s]+):', line)
                    if match:
                        failed_urls.append(match.group(1))
            failed_urls = list(set(failed_urls))

    if not failed_urls:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No retriable failed URLs could be identified for this job."
        )

    # Create new job for retry
    new_job = Job(
        user_id=current_user_id,
        status="queued",
        total_urls=len(failed_urls),
        completed_count=0,
        failed_count=0,
        created_at=datetime.now()
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Queue scraping task
    scrape_amazon_job.delay(new_job.id, failed_urls)
    
    # Log retry
    db.add(Log(
        job_id=new_job.id,
        level="info",
        message=f"Retry job started. Retrying {len(failed_urls)} URLs failed from Job {job_id}."
    ))
    db.commit()

    return new_job


@router.get("/jobs/{job_id}/logs", response_model=List[str])
def get_job_logs(
    job_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Read the live logs list of a job from the file system or database logs"""
    # Check if job belongs to user
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    logs_list = []
    log_file_path = settings.LOGS_DIR / f"job_{job_id}.log"
    
    # Read from file first (live, detailed log)
    if log_file_path.exists():
        try:
            with open(log_file_path, "r", encoding="utf-8") as f:
                logs_list = [line.strip() for line in f.readlines()]
        except Exception:
            pass
            
    # Fallback/merge with DB logs if empty
    if not logs_list:
        db_logs = db.query(Log).filter(Log.job_id == job_id).order_by(Log.timestamp.asc()).all()
        logs_list = [f"{log.timestamp.strftime('%Y-%m-%d %H:%M:%S')} | {log.level.upper()} | {log.message}" for log in db_logs]

    return logs_list

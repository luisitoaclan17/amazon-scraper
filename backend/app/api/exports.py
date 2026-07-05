import os
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import Job, Export

router = APIRouter(prefix="/export", tags=["Exports"])

@router.get("/{job_id}")
def download_job_export(
    job_id: int,
    format: str = Query("csv", regex="^(csv|excel)$"),
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Download product dataset export for a given job.
    Supports CSV and Excel formats.
    """
    # 1. Verify Job owner
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Job not found or access unauthorized"
        )

    # 2. Verify Job completed status
    if job.status not in ["completed", "failed"] and job.completed_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Export is not available. Job is currently '{job.status}'."
        )

    # 3. Retrieve Export record
    export_fmt = "excel" if format == "excel" else "csv"
    export_record = db.query(Export).filter(
        Export.job_id == job_id, 
        Export.format == export_fmt
    ).first()
    
    if not export_record or not os.path.exists(export_record.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export file not found. It might have been deleted or failed to generate."
        )

    # Determine filename and media type
    filename = os.path.basename(export_record.file_path)
    media_type = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
        if export_fmt == "excel" else "text/csv"
    )
    
    # Return file response
    return FileResponse(
        path=export_record.file_path,
        filename=filename,
        media_type=media_type,
        background=None  # Can perform post-download logs if needed
    )

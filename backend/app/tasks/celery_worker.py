import os
import time
import traceback
from datetime import datetime, timezone
import redis
from celery import Celery
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.models import Job, Product, Export, Log
from app.services.scraper.browser import ScraperBrowser, get_scrape_delay
from app.services.scraper.parser import parse_amazon_product
from app.services.scraper.validator import validate_and_normalize_url
from app.services.scraper.exporter import generate_exports
from app.services.scraper.logger import logger, add_job_log_file, remove_job_log_file

# Initialize Celery
celery_app = Celery(
    "amazon_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Connect to Redis directly for cancel state checks
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

def write_db_log(db: Session, job_id: int, level: str, message: str):
    """Utility to write log to PostgreSQL logs table"""
    db_log = Log(job_id=job_id, level=level, message=message)
    db.add(db_log)
    db.commit()

@celery_app.task(bind=True, name="app.tasks.celery_worker.scrape_amazon_job")
def scrape_amazon_job(self, job_id: int, urls: list[str]):
    # Setup job-specific logging sink
    handler_id = add_job_log_file(job_id)
    job_logger = logger.bind(job_id=job_id)
    
    db: Session = SessionLocal()
    job_logger.info(f"Worker received job {job_id} with {len(urls)} URLs")
    
    try:
        # 1. Initialize Job in running state
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            job_logger.error(f"Job {job_id} not found in database.")
            remove_job_log_file(handler_id)
            return False
            
        job.status = "running"
        job.started_at = datetime.now()
        db.commit()
        
        write_db_log(db, job_id, "info", "Job started. Initializing browser...")
        
        completed_products = []
        
        # 2. Open Playwright Chromium browser
        with ScraperBrowser(headless=settings.PLAYWRIGHT_HEADLESS) as scraper:
            page = scraper.create_page()
            
            for idx, raw_url in enumerate(urls):
                # 3. Check for cancellation
                cancel_flag = redis_client.get(f"job:cancel:{job_id}")
                if cancel_flag:
                    job_logger.warning(f"Job {job_id} cancellation requested by user")
                    job.status = "cancelled"
                    write_db_log(db, job_id, "warning", "Job cancelled by user.")
                    break
                
                # Update progress current URL details
                job_logger.info(f"Processing URL {idx + 1}/{len(urls)}: {raw_url}")
                write_db_log(db, job_id, "info", f"Navigating to URL {idx + 1}/{len(urls)}")

                # Validate and clean URL
                is_valid, url = validate_and_normalize_url(raw_url)
                if not is_valid:
                    job_logger.error(f"Invalid Amazon URL: {raw_url}")
                    write_db_log(db, job_id, "error", f"Invalid Amazon URL skipped: {raw_url}")
                    job.failed_count += 1
                    db.commit()
                    continue

                # Apply scraping delay to prevent rate limits
                if idx > 0:
                    delay = get_scrape_delay()
                    job_logger.info(f"Delaying for {delay:.2f} seconds...")
                    time.sleep(delay)

                try:
                    # Navigate to URL
                    page.goto(url, wait_until="domcontentloaded", timeout=settings.PAGE_TIMEOUT)
                    
                    # Anti-scraping / CAPTCHA checks
                    title = page.title() or ""
                    if "captcha" in title.lower() or "robot check" in title.lower() or "apologize" in title.lower():
                        raise Exception("Amazon bot protection/CAPTCHA triggered. Loading was blocked.")
                    
                    # Extract fields
                    product_data = parse_amazon_product(page, url)
                    
                    if not product_data or not product_data.get("title"):
                        raise Exception("Failed to parse basic product layout (title was empty)")
                    
                    # Save Product to Database
                    product = Product(
                        job_id=job_id,
                        title=product_data["title"],
                        price=product_data["price"],
                        original_price=product_data["original_price"],
                        discount=product_data["discount"],
                        rating=product_data["rating"],
                        review_count=product_data["review_count"],
                        category=product_data["category"],
                        brand=product_data["brand"],
                        asin=product_data["asin"],
                        availability=product_data["availability"],
                        prime=product_data["prime"],
                        currency=product_data["currency"],
                        image_url=product_data["image_url"],
                        product_url=product_data["product_url"],
                        scraped_at=product_data["scraped_at"]
                    )
                    db.add(product)
                    
                    # Keep track for export step
                    completed_products.append(product_data)
                    
                    job.completed_count += 1
                    db.commit()
                    job_logger.info(f"Successfully scraped: {product_data['title'][:40]}... [ASIN: {product_data['asin']}]")
                    write_db_log(db, job_id, "info", f"Successfully scraped product {product_data['asin']}")
                    
                except Exception as page_exc:
                    job.failed_count += 1
                    db.commit()
                    
                    # Capturing Screenshot on Error
                    screenshot_filename = f"screenshot_job_{job_id}_{idx + 1}_{int(time.time())}.png"
                    screenshot_path = settings.SCREENSHOTS_DIR / screenshot_filename
                    try:
                        page.screenshot(path=str(screenshot_path))
                        screenshot_info = f"Screenshot saved to {screenshot_filename}"
                    except Exception:
                        screenshot_info = "Could not capture screenshot"
                    
                    # HTML dump
                    html_filename = f"html_job_{job_id}_{idx + 1}_{int(time.time())}.html"
                    html_path = settings.SCREENSHOTS_DIR / html_filename
                    try:
                        with open(html_path, "w", encoding="utf-8") as f:
                            f.write(page.content())
                        html_info = f"HTML dump saved to {html_filename}"
                    except Exception:
                        html_info = "Could not dump HTML"
                        
                    err_msg = f"Failed scraping URL {url}: {str(page_exc)}. {screenshot_info}. {html_info}"
                    job_logger.error(err_msg)
                    job_logger.debug(traceback.format_exc())
                    write_db_log(db, job_id, "error", err_msg)
            
            # Close browser context cleanly
            page.close()

        # 4. Finalize Job Status
        if job.status != "cancelled":
            if job.completed_count == 0 and len(urls) > 0:
                job.status = "failed"
                write_db_log(db, job_id, "error", "Job completed. All URLs failed to scrape.")
            else:
                job.status = "completed"
                write_db_log(db, job_id, "info", f"Job completed. Scraped {job.completed_count} successfully, {job.failed_count} failed.")

        # 5. Export products to CSV/Excel
        if completed_products:
            job_logger.info("Generating CSV and Excel exports...")
            export_meta = generate_exports(job_id, completed_products)
            
            for fmt, data in export_meta.items():
                db_export = Export(
                    job_id=job_id,
                    file_path=data["file_path"],
                    file_size=data["file_size"],
                    format=fmt
                )
                db.add(db_export)
            db.commit()
            job_logger.info("CSV/Excel exports saved successfully.")
            write_db_log(db, job_id, "info", "CSV and Excel files generated successfully.")

    except Exception as job_exc:
        job_logger.critical(f"Critical Job Failure: {str(job_exc)}")
        job_logger.debug(traceback.format_exc())
        if db:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = "failed"
                db.commit()
                write_db_log(db, job_id, "error", f"Critical internal job crash: {str(job_exc)}")
    finally:
        # Complete times
        if db:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.completed_at = datetime.now()
                db.commit()
            db.close()
        
        job_logger.info(f"Task finished for job {job_id}")
        remove_job_log_file(handler_id)

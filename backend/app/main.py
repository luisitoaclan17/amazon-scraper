from fastapi import FastAPI, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any, List

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.core.security import get_current_user_id
from app.models import Job, Product, Log, Export
from app.schemas import DashboardStats, JobOut, RecentActivity
from app.api import auth, jobs, products, exports
from app.services.scraper.logger import setup_logger

# Initialize logger
setup_logger()

# Automatically create database tables if they do not exist
# In a full production env, you would run alembic migrations, but this is robust for instant docker bootstrapping
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware configurations
# Reads from CORS_ORIGINS env var (comma-separated list of allowed origins)
# Add your Vercel URL there: e.g. CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
import os as _os
_cors_env = _os.environ.get("CORS_ORIGINS", "")
origins = [o.strip() for o in _cors_env.split(",") if o.strip()] or [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core API router
api_router = APIRouter(prefix=settings.API_V1_STR)

# Register routers
api_router.include_router(auth.router)
api_router.include_router(jobs.router)
api_router.include_router(products.router)
api_router.include_router(exports.router)

@api_router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Retrieve summarized metrics and activity feed for the Dashboard"""
    # 1. Metric Counts
    total_jobs = db.query(Job).filter(Job.user_id == current_user_id).count()
    
    products_scraped = db.query(Product).join(Job).filter(
        Job.user_id == current_user_id
    ).count()
    
    csv_downloads = db.query(Export).join(Job).filter(
        Job.user_id == current_user_id
    ).count()
    
    running_jobs = db.query(Job).filter(
        Job.user_id == current_user_id,
        Job.status.in_(["queued", "running"])
    ).count()
    
    failed_jobs = db.query(Job).filter(
        Job.user_id == current_user_id,
        Job.status == "failed"
    ).count()
    
    # 2. Recent Jobs list (last 5)
    recent_jobs = db.query(Job).filter(
        Job.user_id == current_user_id
    ).order_by(Job.created_at.desc()).limit(5).all()
    
    # Convert to schema compatible list
    recent_jobs_out = [JobOut.model_validate(j) for j in recent_jobs]

    # 3. Dynamic Activity Feed
    # Query latest logs from user's jobs to construct historical activity
    recent_logs = db.query(Log).join(Job).filter(
        Job.user_id == current_user_id
    ).order_by(Log.timestamp.desc()).limit(10).all()
    
    recent_activity: List[RecentActivity] = []
    for log in recent_logs:
        # Determine activity type
        act_type = "job_started"
        if "completed" in log.message.lower():
            act_type = "job_completed"
        elif "failed" in log.message.lower() or "error" in log.message.lower():
            act_type = "job_failed"
        elif "export" in log.message.lower() or "csv" in log.message.lower():
            act_type = "export_downloaded"
            
        recent_activity.append(RecentActivity(
            id=log.id,
            type=act_type,
            message=f"Job #{log.job_id}: {log.message}",
            timestamp=log.timestamp
        ))
        
    # Fallback to general welcome activity if none exist
    if not recent_activity:
        recent_activity.append(RecentActivity(
            id=0,
            type="job_completed",
            message="Account registered. Welcome to Amazon Product Data Automation!",
            timestamp=datetime.now()
        ))
        
    return DashboardStats(
        total_jobs=total_jobs,
        products_scraped=products_scraped,
        csv_downloads=csv_downloads,
        running_jobs=running_jobs,
        failed_jobs=failed_jobs,
        recent_jobs=recent_jobs_out,
        recent_activity=recent_activity
    )

app.include_router(api_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Amazon Product Data Automation API",
        "version": "1.0.0"
    }

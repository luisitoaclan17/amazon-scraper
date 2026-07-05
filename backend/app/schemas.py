from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Optional, Any

# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# Scraper & Jobs Schemas
class JobCreate(BaseModel):
    urls: List[str]

class JobOut(BaseModel):
    id: int
    user_id: int
    status: str
    total_urls: int
    completed_count: int
    failed_count: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    log_file: Optional[str] = None

    class Config:
        from_attributes = True

class JobDetailOut(JobOut):
    logs: List["LogOut"] = []
    
    class Config:
        from_attributes = True

# Product Schemas
class ProductOut(BaseModel):
    id: int
    job_id: int
    title: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount: Optional[float] = None
    rating: Optional[float] = None
    review_count: int
    category: Optional[str] = None
    brand: Optional[str] = None
    asin: Optional[str] = None
    availability: bool
    prime: bool
    currency: str
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    scraped_at: datetime

    class Config:
        from_attributes = True

# Export Schemas
class ExportOut(BaseModel):
    id: int
    job_id: int
    file_path: str
    file_size: int
    format: str
    created_at: datetime

    class Config:
        from_attributes = True

# Log Schemas
class LogOut(BaseModel):
    id: int
    job_id: int
    level: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True

# Dashboard Stats Schema
class RecentActivity(BaseModel):
    id: int
    type: str # job_started, job_completed, job_failed, export_downloaded
    message: str
    timestamp: datetime

class DashboardStats(BaseModel):
    total_jobs: int
    products_scraped: int
    csv_downloads: int
    running_jobs: int
    failed_jobs: int
    recent_jobs: List[JobOut]
    recent_activity: List[RecentActivity]

JobDetailOut.model_rebuild()

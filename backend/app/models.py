from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="queued")  # queued, running, completed, failed, cancelled
    total_urls = Column(Integer, default=0)
    completed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    log_file = Column(String, nullable=True)

    user = relationship("User", back_populates="jobs")
    products = relationship("Product", back_populates="job", cascade="all, delete-orphan")
    exports = relationship("Export", back_populates="job", cascade="all, delete-orphan")
    logs = relationship("Log", back_populates="job", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(Text, nullable=True)
    price = Column(Float, nullable=True)
    original_price = Column(Float, nullable=True)
    discount = Column(Float, nullable=True)
    rating = Column(Float, nullable=True)
    review_count = Column(Integer, default=0)
    category = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    asin = Column(String, index=True, nullable=True)
    availability = Column(Boolean, default=True)
    prime = Column(Boolean, default=False)
    currency = Column(String, default="USD")
    image_url = Column(Text, nullable=True)
    product_url = Column(Text, nullable=True)
    scraped_at = Column(DateTime, default=func.now())

    job = relationship("Job", back_populates="products")


class Export(Base):
    __tablename__ = "exports"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    format = Column(String, default="csv")  # csv, excel
    created_at = Column(DateTime, default=func.now())

    job = relationship("Job", back_populates="exports")


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    level = Column(String, nullable=False)  # info, warning, error
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=func.now())

    job = relationship("Job", back_populates="logs")

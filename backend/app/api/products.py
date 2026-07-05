from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import Product, Job
from app.schemas import ProductOut

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=Dict[str, Any])
def list_products(
    job_id: Optional[int] = Query(None, description="Filter by Job ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    rating_min: Optional[float] = Query(None, description="Minimum rating"),
    price_min: Optional[float] = Query(None, description="Minimum price"),
    price_max: Optional[float] = Query(None, description="Maximum price"),
    availability: Optional[bool] = Query(None, description="Filter by in-stock availability"),
    search: Optional[str] = Query(None, description="Search term (matches Title, Brand, ASIN, Category)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Retrieve and filter products scraped by the user.
    Returns a dictionary with total count and paginated product list.
    """
    # Build query joining with jobs to filter by user ownership
    query = db.query(Product).join(Job).filter(Job.user_id == current_user_id)
    
    # 1. Apply filters
    if job_id is not None:
        query = query.filter(Product.job_id == job_id)
    if category:
        query = query.filter(Product.category.ilike(f"%{category}%"))
    if brand:
        query = query.filter(Product.brand.ilike(f"%{brand}%"))
    if rating_min is not None:
        query = query.filter(Product.rating >= rating_min)
    if price_min is not None:
        query = query.filter(Product.price >= price_min)
    if price_max is not None:
        query = query.filter(Product.price <= price_max)
    if availability is not None:
        query = query.filter(Product.availability == availability)
        
    # 2. Apply general search term
    if search:
        search_terms = f"%{search}%"
        query = query.filter(
            or_(
                Product.title.ilike(search_terms),
                Product.brand.ilike(search_terms),
                Product.asin.ilike(search_terms),
                Product.category.ilike(search_terms)
            )
        )
        
    # 3. Get total count before pagination
    total = query.count()
    
    # 4. Fetch paginated records
    items = query.order_by(Product.scraped_at.desc()).offset(skip).limit(limit).all()
    
    # 5. Extract unique brands and categories for frontend filter options
    # Run lightweight queries to get unique values
    unique_brands_raw = db.query(Product.brand).join(Job).filter(
        Job.user_id == current_user_id, Product.brand != None
    ).distinct().all()
    unique_brands = [b[0] for b in unique_brands_raw if b[0]]

    unique_categories_raw = db.query(Product.category).join(Job).filter(
        Job.user_id == current_user_id, Product.category != None
    ).distinct().all()
    
    # Extract unique individual categories from breadcrumbs
    unique_categories = set()
    for cat_str in [c[0] for c in unique_categories_raw if c[0]]:
        # Take the top level category
        parts = cat_str.split(" > ")
        if parts:
            unique_categories.add(parts[0].strip())
            
    return {
        "total": total,
        "items": [ProductOut.model_validate(item) for item in items],
        "filters": {
            "brands": sorted(list(unique_brands)),
            "categories": sorted(list(unique_categories))
        }
    }

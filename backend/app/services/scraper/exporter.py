import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
from app.core.config import settings

COLUMNS_MAPPING = {
    "asin": "ASIN",
    "title": "Title",
    "brand": "Brand",
    "category": "Category",
    "price": "Price",
    "original_price": "Original Price",
    "discount": "Discount (%)",
    "rating": "Rating",
    "review_count": "Reviews Count",
    "availability": "Availability",
    "prime": "Is Prime",
    "currency": "Currency",
    "image_url": "Image URL",
    "product_url": "Product URL",
    "scraped_at": "Scraped Date"
}

def generate_exports(job_id: int, products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate CSV and Excel exports from a list of products.
    Returns metadata about the exports (file paths, file sizes).
    """
    if not products:
        return {}

    # Convert list of dicts to DataFrame
    df = pd.DataFrame(products)
    
    # Keep only target columns and rename them
    cols_to_keep = [col for col in COLUMNS_MAPPING.keys() if col in df.columns]
    df = df[cols_to_keep]
    df = df.rename(columns=COLUMNS_MAPPING)

    # Reorder columns logically if all exist
    preferred_order = [
        "ASIN", "Title", "Brand", "Category", "Price", "Original Price", 
        "Discount (%)", "Rating", "Reviews Count", "Availability", 
        "Is Prime", "Currency", "Image URL", "Product URL", "Scraped Date"
    ]
    existing_preferred = [col for col in preferred_order if col in df.columns]
    df = df[existing_preferred]

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    
    # 1. Generate CSV
    csv_filename = f"amazon_products_{job_id}_{timestamp}.csv"
    csv_path = settings.EXPORTS_DIR / csv_filename
    df.to_csv(csv_path, index=False)
    csv_size = csv_path.stat().st_size

    # 2. Generate Excel
    excel_filename = f"amazon_products_{job_id}_{timestamp}.xlsx"
    excel_path = settings.EXPORTS_DIR / excel_filename
    df.to_excel(excel_path, index=False, engine="openpyxl")
    excel_size = excel_path.stat().st_size

    return {
        "csv": {
            "file_path": str(csv_path),
            "file_name": csv_filename,
            "file_size": csv_size
        },
        "excel": {
            "file_path": str(excel_path),
            "file_name": excel_filename,
            "file_size": excel_size
        }
    }

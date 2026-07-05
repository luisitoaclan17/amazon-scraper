import re
from typing import Optional, Tuple
from urllib.parse import urlparse

AMAZON_DOMAINS = [
    r'amazon\.com', r'amazon\.co\.uk', r'amazon\.ca', r'amazon\.de', 
    r'amazon\.fr', r'amazon\.it', r'amazon\.es', r'amazon\.co\.jp', 
    r'amazon\.in', r'amazon\.com\.mx', r'amazon\.com\.br', r'amazon\.com\.au'
]

# Regex to match any standard Amazon product URL
AMAZON_URL_PATTERN = re.compile(
    rf'https?://(?:www\.)?(?:[a-zA-Z0-9-]+\.)?(?:{"|".join(AMAZON_DOMAINS)})/(?:[^/]*/)?(?:dp|gp/product)/([A-Z0-9]{{10}})',
    re.IGNORECASE
)

def validate_and_normalize_url(url: str) -> Tuple[bool, Optional[str]]:
    """
    Validate if a URL is a valid Amazon product URL.
    Returns (is_valid, normalized_url).
    Strips tracking queries and standardizes to https://www.amazon.domain/dp/ASIN.
    """
    url = url.strip()
    match = AMAZON_URL_PATTERN.search(url)
    if not match:
        return False, None
    
    domain = urlparse(url).netloc
    asin = match.group(1).upper()
    
    normalized = f"https://{domain}/dp/{asin}"
    return True, normalized

def extract_asin(url: str) -> Optional[str]:
    """Helper to extract just the ASIN from a URL"""
    match = AMAZON_URL_PATTERN.search(url)
    if match:
        return match.group(1).upper()
    return None

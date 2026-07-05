import re
from datetime import datetime
from typing import Dict, Any, Optional
from playwright.sync_api import Page
from loguru import logger

def extract_asin_from_url(url: str) -> Optional[str]:
    """Extract ASIN from standard Amazon URLs"""
    match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})', url, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return None

def clean_text(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    return " ".join(text.split()).strip()

def parse_price(price_str: Optional[str]) -> Optional[float]:
    """Parse floats from string price representations like $1,299.99"""
    if not price_str:
        return None
    try:
        # Remove currency symbols, commas, spaces
        cleaned = re.sub(r'[^\d.]', '', price_str)
        return float(cleaned)
    except ValueError:
        return None

def parse_rating(rating_str: Optional[str]) -> Optional[float]:
    """Parse rating float from strings like '4.5 out of 5 stars' or '4,5 de 5 estrellas'"""
    if not rating_str:
        return None
    try:
        # Match digits like 4.5 or 4,5
        match = re.search(r'(\d(?:[.,]\d)?)', rating_str)
        if match:
            val = match.group(1).replace(',', '.')
            return float(val)
    except Exception:
        pass
    return None

def parse_review_count(review_str: Optional[str]) -> int:
    """Parse review count integer from strings like '1,234 ratings' or '452'"""
    if not review_str:
        return 0
    try:
        cleaned = re.sub(r'[^\d]', '', review_str)
        return int(cleaned) if cleaned else 0
    except ValueError:
        return 0

def detect_currency(price_str: Optional[str]) -> str:
    """Detect currency code from symbol"""
    if not price_str:
        return "USD"
    if "£" in price_str:
        return "GBP"
    if "€" in price_str:
        return "EUR"
    if "¥" in price_str or "円" in price_str:
        return "JPY"
    if "₹" in price_str:
        return "INR"
    if "CDN$" in price_str or "CA$" in price_str:
        return "CAD"
    return "USD"

def parse_amazon_product(page: Page, url: str) -> Dict[str, Any]:
    """Scrape product fields from loaded Playwright Page object"""
    data: Dict[str, Any] = {
        "asin": extract_asin_from_url(url),
        "product_url": url,
        "scraped_at": datetime.now(),
        "title": None,
        "price": None,
        "original_price": None,
        "discount": None,
        "rating": None,
        "review_count": 0,
        "category": None,
        "brand": None,
        "availability": True,
        "prime": False,
        "currency": "USD",
        "image_url": None
    }
    
    # 1. Product Title
    for selector in ["#productTitle", "#title", "h1.a-size-large"]:
        try:
            el = page.locator(selector).first
            if el.is_visible():
                data["title"] = clean_text(el.text_content())
                if data["title"]:
                    break
        except Exception:
            pass

    # 2. Pricing & Currency
    price_str = None
    for selector in [
        "span.a-price.apexPriceToPay span.a-offscreen",
        "span.a-price.priceToPay span.a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        "span.a-price span.a-offscreen"
    ]:
        try:
            el = page.locator(selector).first
            if el.is_visible():
                price_str = clean_text(el.text_content())
                if price_str:
                    break
        except Exception:
            pass

    data["currency"] = detect_currency(price_str)
    data["price"] = parse_price(price_str)

    # 3. Original Price
    original_price_str = None
    for selector in [
        "span.basisPrice span.a-offscreen",
        "span.a-text-price span.a-offscreen",
        "#listPrice",
        "span.priceblock_listprice"
    ]:
        try:
            el = page.locator(selector).first
            if el.is_visible():
                original_price_str = clean_text(el.text_content())
                if original_price_str:
                    break
        except Exception:
            pass
            
    data["original_price"] = parse_price(original_price_str)

    # 4. Calculate or Scrape Discount
    discount_str = None
    for selector in ["span.savingsPercentage", ".savingPriceOverride"]:
        try:
            el = page.locator(selector).first
            if el.is_visible():
                discount_str = clean_text(el.text_content())
                if discount_str:
                    break
        except Exception:
            pass

    if discount_str:
        # Extract percentage digit (e.g. -15% -> 15.0)
        match = re.search(r'(\d+)', discount_str)
        if match:
            data["discount"] = float(match.group(1))
    elif data["original_price"] and data["price"] and data["original_price"] > data["price"]:
        # Calculate manually
        diff = data["original_price"] - data["price"]
        pct = (diff / data["original_price"]) * 100
        data["discount"] = round(pct, 1)

    # 5. Rating
    rating_str = None
    for selector in [
        "#acrPopover",
        "span.a-icon-alt",
        "[data-hook='rating-out-of-text']"
    ]:
        try:
            # We want rating specifically (usually has 'out of 5 stars')
            elements = page.locator(selector).all()
            for el in elements:
                text = el.text_content()
                if text and ("out of 5" in text or "de 5" in text or "stars" in text or "estrellas" in text):
                    rating_str = text
                    break
            if rating_str:
                break
        except Exception:
            pass
            
    data["rating"] = parse_rating(rating_str)

    # 6. Review Count
    review_str = None
    for selector in [
        "#acrCustomerReviewText",
        "[data-hook='total-review-count']",
        "#acrCustomerReviewLink"
    ]:
        try:
            el = page.locator(selector).first
            if el.is_visible():
                review_str = clean_text(el.text_content())
                if review_str:
                    break
        except Exception:
            pass
            
    data["review_count"] = parse_review_count(review_str)

    # 7. Category Breadcrumbs
    try:
        breadcrumbs = page.locator("#wayfinding-breadcrumbs_container ul li a").all()
        cats = [clean_text(cat.text_content()) for cat in breadcrumbs if cat.text_content()]
        if cats:
            data["category"] = " > ".join([c for c in cats if c])
    except Exception:
        pass

    # 8. Brand Name
    for selector in [
        "#bylineInfo",
        "a#bylineInfo",
        "#brand",
        "tr.a-spacing-small:has(td.a-span3:has-text('Brand')) td.a-span9 span"
    ]:
        try:
            el = page.locator(selector).first
            if el.is_visible():
                brand_text = clean_text(el.text_content())
                if brand_text:
                    # Clean up things like "Brand: Apple" or "Visit the Apple Store"
                    brand_text = re.sub(r'^(Brand:\s*|Visit the\s*|\s*Store)', '', brand_text, flags=re.IGNORECASE)
                    data["brand"] = clean_text(brand_text)
                    break
        except Exception:
            pass

    # 9. Availability / Stock
    try:
        avail_el = page.locator("#availability span").first
        if avail_el.is_visible():
            avail_text = clean_text(avail_el.text_content()).lower()
            if "out of stock" in avail_text or "currently unavailable" in avail_text:
                data["availability"] = False
    except Exception:
        pass

    # 10. Prime Status
    for selector in [
        "#priceBadging_feature_div",
        "#shippingMessageInsideBuyBox_feature_div",
        "#primeDetailPageBadge",
        ".amazon-prime-icon"
    ]:
        try:
            el = page.locator(selector).first
            if el.is_visible():
                data["prime"] = True
                break
        except Exception:
            pass

    # 11. Image URL
    for selector in [
        "#landingImage",
        "#imgBlkFront",
        "#main-image",
        "img.a-dynamic-image"
    ]:
        try:
            el = page.locator(selector).first
            if el.is_visible():
                # landingImage uses data-a-dynamic-image attribute (JSON map with image URLs)
                dyn_img = el.get_attribute("data-a-dynamic-image")
                if dyn_img:
                    # Find first key in JSON format (e.g. {"url": [w,h]})
                    urls = re.findall(r'"(https://[^"]+)"', dyn_img)
                    if urls:
                        data["image_url"] = urls[0]
                        break
                src = el.get_attribute("src")
                if src and not src.startswith("data:"):
                    data["image_url"] = src
                    break
        except Exception:
            pass

    # Fallback ASIN from page source if not in URL
    if not data["asin"]:
        try:
            el = page.locator("input#ASIN").first
            if el.is_visible():
                data["asin"] = el.get_attribute("value")
        except Exception:
            pass

    return data

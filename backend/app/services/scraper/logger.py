import sys
from pathlib import Path
from loguru import logger
from app.core.config import settings

# Configure global logger
def setup_logger():
    # Remove default handler
    logger.remove()
    
    # Add console handler
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO"
    )
    
    # Add general file handler
    general_log_path = settings.LOGS_DIR / "app.log"
    logger.add(
        general_log_path,
        rotation="10 MB",
        retention="30 days",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
        level="DEBUG"
    )

def add_job_log_file(job_id: int) -> int:
    """Add a file log sink specifically for a job_id. Returns the handler ID to allow removal later."""
    job_log_path = settings.LOGS_DIR / f"job_{job_id}.log"
    
    # Only write logs that are bound with this job_id
    handler_id = logger.add(
        job_log_path,
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {message}",
        filter=lambda record: record["extra"].get("job_id") == job_id,
        level="DEBUG"
    )
    return handler_id

def remove_job_log_file(handler_id: int):
    """Remove the job log sink to release file locks."""
    try:
        logger.remove(handler_id)
    except Exception:
        pass

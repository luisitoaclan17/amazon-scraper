# Use the official Playwright python image, which comes with browsers and dependencies pre-installed
FROM mcr.microsoft.com/playwright/python:v1.61.0-jammy

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend source code (will be overridden by bind mount in dev)
COPY backend /app

# Create necessary directories
RUN mkdir -p /app/exports /app/logs /app/screenshots

# Expose port
EXPOSE 8000

# Default command (will be overridden in docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

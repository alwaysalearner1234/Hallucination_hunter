FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OCR + document processing
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend imports `agent.*` — /agent is mounted via docker-compose;
# bake the path in so imports work without sys.path hacks.
ENV PYTHONPATH="/app:/agent"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

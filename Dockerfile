FROM python:3.11-slim

WORKDIR /app

# Install system dependencies + Node.js for frontend build
RUN apt-get update && apt-get install -y gcc g++ curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy the entire project
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Build the React frontend
RUN cd frontend && npm install --legacy-peer-deps && npm run build

# Move built frontend to where the backend can serve it
RUN mkdir -p /app/static && cp -r /app/frontend/dist/* /app/static/

# Set environment variables (7860 is required by Hugging Face Spaces)
ENV PORT=7860
ENV DEMO_MODE=true

# Run the unified backend application
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]

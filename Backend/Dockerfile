# 1. Use a stable Python base
FROM python:3.11-slim

# 2. Install system-level audio dependencies (ffmpeg is required by Whisper)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of your backend code
COPY . .

# 6. Create the temp folder inside the container
RUN mkdir -p temp_audio

# 7. Expose the port your Flask app runs on
EXPOSE 8000

# 8. Start the app using Gunicorn for production-level stability
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "run:semaData_app"]
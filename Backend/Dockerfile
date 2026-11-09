# 1. Use a stable Python base
FROM python:3.11-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Install only the web/API dependencies in this test image. ML dependencies
# are deliberately excluded to fit a free instance and are disabled at runtime.
COPY requirements-render.txt .
RUN pip install --no-cache-dir -r requirements-render.txt

# 4. Copy the rest of your backend code
COPY . .

# 5. Create the temp folder inside the container
RUN mkdir -p temp_audio

# 6. Expose the port your Flask app runs on
EXPOSE 8000

# 7. Use the Flask app instance exposed by run.py and Render's assigned port
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8000} run:app"]
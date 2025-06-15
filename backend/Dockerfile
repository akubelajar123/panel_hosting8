FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY src/ ./src/
EXPOSE 5000

CMD ["/usr/local/bin/gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "src.main:app"]


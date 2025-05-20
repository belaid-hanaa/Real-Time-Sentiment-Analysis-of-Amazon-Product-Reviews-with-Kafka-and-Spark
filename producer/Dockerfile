FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .        
COPY kafka-producer.py .
COPY data_validation.json .

RUN pip install -r requirements.txt

CMD ["python", "kafka-producer.py"]

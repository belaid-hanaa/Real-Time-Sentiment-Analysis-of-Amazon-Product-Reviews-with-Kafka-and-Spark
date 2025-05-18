FROM python:3.10-slim

WORKDIR /app

# Copier ton script producer
COPY kafka-producer.py .

COPY data_validation.json ./data_validation.json


# Installer kafka-python
RUN pip install kafka-python

CMD ["python", "kafka-producer.py"]

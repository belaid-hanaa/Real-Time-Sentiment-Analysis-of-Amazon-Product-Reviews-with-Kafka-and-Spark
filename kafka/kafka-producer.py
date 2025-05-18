from kafka import KafkaProducer
import json
import time

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

reviews = [
    {"reviewText": "Great product!", "overall": 5},
    {"reviewText": "Not good", "overall": 1},
    {"reviewText": "Average quality", "overall": 3}
]

for review in reviews:
    producer.send('reviews', value=review)
    print(f"Sent: {review}")
    time.sleep(1)

producer.flush()

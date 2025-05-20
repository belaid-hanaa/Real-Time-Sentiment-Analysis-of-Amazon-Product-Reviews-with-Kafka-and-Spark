import json
import time
from kafka import KafkaProducer

# Configuration
KAFKA_BROKERS = ['kafka1:9092', 'kafka2:9093', 'kafka3:9094']
TOPIC_NAME = 'amazon_reviews'
DATA_FILE = 'data_validation.json'

# Initialiser le Producer Kafka
producer = KafkaProducer(
    bootstrap_servers=KAFKA_BROKERS,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Envoi des données en boucle continue
try:
    while True:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    review = json.loads(line.strip())
                    producer.send(TOPIC_NAME, value=review)
                    print("Envoyé :", review)
                    time.sleep(0.5)
                except Exception as e:
                    print("Erreur lors de l'envoi :", e)
except KeyboardInterrupt:
    print("\nArrêt du programme par l'utilisateur.")

# Nettoyage
finally:
    producer.flush()
    producer.close()

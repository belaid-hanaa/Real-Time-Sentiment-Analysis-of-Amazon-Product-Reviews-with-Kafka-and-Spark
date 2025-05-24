from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import os
from motor.motor_asyncio import AsyncIOMotorClient
from models import Review
from aiokafka import AIOKafkaConsumer
import asyncio
from typing import List

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins (adjust for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB setup
MONGO_DETAILS = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_DETAILS)
db = client.amazon
collection = db.reviews 

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.kafka_task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket client connected: {websocket.client}")
        # Start Kafka consumer if not already running
        if self.kafka_task is None:
            self.kafka_task = asyncio.create_task(self.consume_kafka())

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WebSocket client disconnected: {websocket.client}")

    async def broadcast(self, message: str):
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error sending to client: {e}")
                self.disconnect(connection)

    async def consume_kafka(self):
        print("Starting Kafka consumer...")
        consumer = AIOKafkaConsumer(
            "processed-reviews",
            bootstrap_servers="kafka:29092",
            group_id="fastapi-group",
            auto_offset_reset="latest",
            enable_auto_commit=True
        )
        await consumer.start()
        try:
            async for msg in consumer:
                decoded_msg = msg.value.decode("utf-8")
                print(f"Kafka received: {decoded_msg}")
                await self.broadcast(decoded_msg)
        except Exception as e:
            print(f"Kafka consumer error: {e}")
        finally:
            await consumer.stop()
            print("Kafka consumer stopped")

manager = ConnectionManager()

@app.websocket("/ws/kafka")
async def websocket_kafka(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/reviews", response_model=List[Review])
async def get_reviews():
    reviews_cursor = collection.find({})
    reviews = []
    async for item in reviews_cursor:
        item["_id"] = str(item["_id"])
        reviews.append(item)
    return reviews

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

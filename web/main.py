from fastapi import FastAPI,WebSocket, WebSocketDisconnect
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import os
from motor.motor_asyncio import AsyncIOMotorClient
from aiokafka import AIOKafkaConsumer
import asyncio
import json
from bson import ObjectId
from typing import List
import pymongo
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins from the list
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def get_dashboard():
    return FileResponse("static/index.html")

client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["amazon"]
collection = db["predictions"]
# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/kafka")
async def websocket_kafka(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Kafka consumer startup
@app.on_event("startup")
async def startup_event():
    loop = asyncio.get_event_loop()
    consumer = AIOKafkaConsumer(
        "amazon",
        bootstrap_servers="localhost:9092",
        group_id="fastapi-group",
        auto_offset_reset="latest",
        enable_auto_commit=True
    )
    await consumer.start()

    async def consume():
        try:
            async for msg in consumer:
                decoded_msg = msg.value.decode("utf-8")
                await manager.broadcast(decoded_msg)
        finally:
            await consumer.stop()

    loop.create_task(consume())

@app.get("/reviews")
async def get_reviews():
    reviews_cursor = collection.find({})
    reviews = []
    async for item in reviews_cursor:
        item["_id"] = str(item["_id"])
        reviews.append(item)
    return reviews

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
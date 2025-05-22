from fastapi import FastAPI, WebSocket, WebSocketDisconnect,Request
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
from fastapi.templating import Jinja2Templates

app = FastAPI()

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/static", StaticFiles(directory="static"), name="static")

# Configuration des templates Jinja2
templates = Jinja2Templates(directory="templates")



KAFKA_BROKERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS").split(",")
MONGODB_URL = os.environ.get("MONGODB_URL", "mongodb://mongodb:27017/")


@app.get("/")
async def get_dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


client = pymongo.MongoClient(MONGODB_URL)
db = client["amazon"]
collection = db["predictions"]

# WebSocket Manager
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
        bootstrap_servers=KAFKA_BROKERS,
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
    for item in reviews_cursor:  # `async for` remplacé par `for` car pymongo est sync
        item["_id"] = str(item["_id"])
        reviews.append(item)
    return reviews

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8005)

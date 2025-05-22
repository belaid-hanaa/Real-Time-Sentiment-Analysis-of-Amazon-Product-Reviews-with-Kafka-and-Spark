from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from motor.motor_asyncio import AsyncIOMotorClient
from aiokafka import AIOKafkaConsumer
import asyncio
import os
from typing import List
import uvicorn
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")  # vérifier ce port !
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")

mongo_client = AsyncIOMotorClient(MONGODB_URL)
db = mongo_client["amazon"]
collection = db["predictions"]

@app.get("/")
async def get_dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/realtime")
async def get_realtime(request: Request):
    return templates.TemplateResponse("realtime.html", {"request": request})

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.kafka_task = None
        self.consumer = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f" WebSocket connecté: {websocket.client}")
        if self.kafka_task is None:
            self.kafka_task = asyncio.create_task(self.consume_kafka())

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f" WebSocket déconnecté: {websocket.client}")
        # Optionnel : arrêter consumer si plus aucune connexion
        if not self.active_connections and self.kafka_task:
            self.kafka_task.cancel()
            self.kafka_task = None
            # on peut aussi stopper le consumer proprement ici

    async def broadcast(self, message: str):
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f" Erreur en envoyant via WS: {e}")
                self.disconnect(connection)

    async def consume_kafka(self):
        self.consumer = AIOKafkaConsumer(
            "amazon",
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id="fastapi-group",
            auto_offset_reset="latest",
            enable_auto_commit=True
        )
        await self.consumer.start()
        print(" Kafka consumer démarré")
        try:
            async for msg in self.consumer:
                decoded_msg = msg.value.decode("utf-8")
                print(f"Kafka reçu: {decoded_msg}")
                await self.broadcast(decoded_msg)
        except asyncio.CancelledError:
            print(" Kafka consumer annulé")
        except Exception as e:
            print(f" Erreur Kafka: {e}")
        finally:
            await self.consumer.stop()
            print("Kafka consumer arrêté")

manager = ConnectionManager()

@app.websocket("/ws/kafka")
async def websocket_kafka(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Just keep connection alive without bloquer receive_text
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
@app.get("/reviews")
async def get_reviews():
    reviews_cursor = collection.find({})
    reviews = []
    async for item in reviews_cursor:
        item["_id"] = str(item["_id"])
        reviews.append(item)
    return reviews

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8005, reload=True)
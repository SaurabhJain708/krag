from contextlib import asynccontextmanager
from types import MessageData

from fastapi import FastAPI
from lib.process_request import process_request
from utils.db_client import close_db, init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(lifespan=lifespan)


@app.get("/search")
def search(q: str):
    return {"status": "ok", "uv_worker": True, "query": q}


@app.post("/chat")
async def chat(request: MessageData):
    message_data = request.data
    notebook_id = message_data.notebook_id
    assistant_message_id = message_data.assistant_message_id
    content = message_data.content

    await process_request(notebook_id, assistant_message_id, content)

    return

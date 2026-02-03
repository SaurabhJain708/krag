from contextlib import asynccontextmanager
from types import MessageData

from fastapi import FastAPI
from utils.db_client import close_db, init_db
from utils.prepare_question import prepare_question


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
    user_id = message_data.user_id
    notebook_id = message_data.notebook_id
    message_id = message_data.message_id
    content = message_data.content
    role = message_data.role

    prepared_question = await prepare_question(content)

    print(content, user_id, notebook_id, message_id, role)

    print(prepared_question)

    return

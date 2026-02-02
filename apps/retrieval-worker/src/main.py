from types import MessageData

from fastapi import FastAPI
from modal_services import Qwen2_5_7BAWQ

app = FastAPI()

remote_llm = Qwen2_5_7BAWQ()


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

    response = await remote_llm.generate(
        prompt=content,
        max_tokens=2048,
        temperature=0.1,
        json_schema=None,
    )

    print(content, user_id, notebook_id, message_id, role)

    print(response)

    return

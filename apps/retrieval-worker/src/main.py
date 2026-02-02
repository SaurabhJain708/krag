from fastapi import FastAPI

app = FastAPI()


@app.get("/search")
def search(q: str):
    return {"status": "ok", "uv_worker": True, "query": q}

import asyncio
import io
import os

from schemas.index import (
    Child_Chunks,
    Chunk,
    FileProcessingStatus,
    Parent_Chunks,
    images,
)
from supabase import Client, create_client
from utils.db_client import get_db

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET_NAME = "files"


async def upload_single_image(user_id: str, img_id: str, img_bytes: bytes):
    """
    Upload a single image to Supabase storage.
    """
    storage_path = f"{user_id}/{img_id}.png"

    try:
        file_object = io.BytesIO(img_bytes)

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: supabase.storage.from_(BUCKET_NAME).upload(
                path=storage_path,
                file=file_object,
                file_options={"content-type": "image/png", "x-upsert": "true"},
            ),
        )
        return True
    except Exception as e:
        print(f"❌ Failed to upload {img_id}: {e}", flush=True)
        return False


async def save_to_db(
    child_chunks: list[Child_Chunks],
    parent_chunks: list[Parent_Chunks],
    source_id: str,
    split_content: list[Chunk],
    images: list[images],
    user_id: str,
):
    db = get_db()

    upload_tasks = []
    for img in images:
        img_id = getattr(img, "id", None) or img.get("id")
        img_bytes = (
            getattr(img, "bytes", None) or img.get("bytes") or img.get("content")
        )

        if img_id and img_bytes:
            upload_tasks.append(upload_single_image(user_id, img_id, img_bytes))

    if upload_tasks:
        print(
            f"⏳ Uploading {len(upload_tasks)} images to Supabase...",
            flush=True,
        )
        await asyncio.gather(*upload_tasks)

    await db.source.update(
        where={"id": source_id},
        data={
            "processingStatus": FileProcessingStatus.completed,
            "content": split_content,
            "image_paths": [img.path for img in images],
        },
    )
    await db.parent_chunk.create_many(
        data=[
            {
                "id": parent_chunk["id"],
                "content": parent_chunk["content"],
                "source_id": source_id,
            }
            for parent_chunk in parent_chunks
        ]
    )
    await db.documentchunk.create_many(
        data=[
            {
                "content": child_chunk["content"],
                "parent_ids": child_chunk["parent_ids"],
                "embeddings": child_chunk["embeddings"],
            }
            for child_chunk in child_chunks
        ]
    )

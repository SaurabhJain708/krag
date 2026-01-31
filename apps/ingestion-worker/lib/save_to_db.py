import asyncio
import os

from generated.db import fields
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
        # Supabase Python client accepts bytes directly (not BytesIO)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: supabase.storage.from_(BUCKET_NAME).upload(
                path=storage_path,
                file=img_bytes,  # Pass bytes directly
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
    image_paths = []
    for img in images:
        # Match the images TypedDict schema: image_id, image_bytes
        img_id = getattr(img, "image_id", None) or img.get("image_id")
        img_bytes = (
            getattr(img, "image_bytes", None)
            or img.get("image_bytes")
            or img.get("bytes")  # fallback for backwards compatibility
        )

        if img_id and img_bytes:
            upload_tasks.append(upload_single_image(user_id, img_id, img_bytes))
            # Construct storage path
            img_path = f"{user_id}/{img_id}.png"
            image_paths.append(img_path)

    if upload_tasks:
        print(
            f"⏳ Uploading {len(upload_tasks)} images to Supabase...",
            flush=True,
        )
        await asyncio.gather(*upload_tasks)

    if split_content:
        content_list = [dict(item) for item in split_content]
        content_data = fields.Json(content_list)
    else:
        # For nullable Json fields, pass None explicitly
        content_data = None

    await db.source.update(
        where={"id": source_id},
        data={
            "processingStatus": FileProcessingStatus.completed,
            "content": content_data,
            "image_paths": image_paths,
        },
    )
    await db.parentchunk.create_many(
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

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
from utils.encrypt import encrypt_data

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
    encryption_type: str,
    encryption_key: str | None,
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
        # Encrypt content before converting to Json if needed
        if encryption_type != "NotEncrypted" and encryption_key:
            for content in content_list:
                content["content"] = encrypt_data(content["content"], encryption_key)
        content_data = fields.Json(content_list)
    else:
        # For nullable Json fields, pass None explicitly
        content_data = None

    if encryption_type != "NotEncrypted" and encryption_key:
        # Encrypt parent chunks
        for parent_chunk in parent_chunks:
            parent_chunk["content"] = encrypt_data(
                parent_chunk["content"], encryption_key
            )

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
                "sourceId": source_id,
            }
            for parent_chunk in parent_chunks
        ]
    )
    if child_chunks:
        from uuid import uuid4

        # Use raw SQL since Prisma client doesn't have DocumentChunk mutations
        insert_query = """
            INSERT INTO "DocumentChunk" (id, content, "parentIds", embedding, "sourceId")
            VALUES ($1, $2, $3::text[], $4::vector(1024), $5)
        """

        for child_chunk in child_chunks:
            chunk_id = str(uuid4())
            content = child_chunk["content"]

            if encryption_type == "AdvancedEncryption" and encryption_key:
                content = encrypt_data(content, encryption_key)

            parent_ids = child_chunk["parent_ids"]

            if not isinstance(parent_ids, list):
                parent_ids = [str(parent_ids)] if parent_ids else []
            else:
                parent_ids = [str(pid) for pid in parent_ids if pid]

            embeddings = child_chunk["embeddings"]
            embedding_str = str(embeddings)

            # Pass parent_ids as list - Prisma Python should handle conversion
            # If that doesn't work, we'll need to format as PostgreSQL array literal
            await db.execute_raw(
                insert_query,
                chunk_id,
                content,
                parent_ids if parent_ids else [],
                embedding_str,
                source_id,
            )

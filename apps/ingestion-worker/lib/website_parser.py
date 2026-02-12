import os

from exa_py import Exa
from lib.chunker import process_chunks
from lib.modal_clients import remote_embedder
from lib.redis_client import update_source_status
from lib.save_to_db import save_to_db
from schemas.index import FileProcessingStatus

exa = Exa(os.environ.get("EXA_API_KEY"))


async def parse_website(
    website_url: str,
    user_id: str,
    source_id: str,
    encryption_key: str | None,
    encryption_type: str,
) -> str:
    try:
        update_source_status(source_id, FileProcessingStatus.extracting.value)

        # Use get_contents with URLs to extract text directly
        # Exa API: get_contents accepts urls parameter for direct URL fetching
        result = exa.get_contents(urls=[website_url], text={"max_characters": 100000})
        if not result.results or len(result.results) == 0:
            raise ValueError(f"No content extracted from URL: {website_url}")
        extracted_text = result.results[0].text or ""

        update_source_status(source_id, FileProcessingStatus.chunking.value)
        db_chunks, parent_chunks, child_chunks = process_chunks(extracted_text)

        # Extract text content from child chunks for embedding
        child_texts = [chunk["content"] for chunk in child_chunks]
        print(
            f"🔢 Generating embeddings for {len(child_texts)} child chunks...",
            flush=True,
        )

        # Use .spawn() for async execution, then .get() to get the result
        result_handle = remote_embedder.generate_embeddings.spawn(child_texts)
        embeddings = result_handle.get()

        # Format child chunks for database
        formatted_child_chunks = []
        for i, chunk in enumerate(child_chunks):
            formatted_child_chunks.append(
                {
                    "content": chunk["content"],
                    "parent_ids": chunk["parent_ids"],
                    "embeddings": embeddings[i],  # Assign the matching embedding
                }
            )

        update_source_status(source_id, FileProcessingStatus.uploading.value)
        await save_to_db(
            formatted_child_chunks,
            parent_chunks,
            source_id,
            db_chunks,
            [],
            user_id,
            encryption_type,
            encryption_key,
        )

        update_source_status(source_id, FileProcessingStatus.completed.value)

        return
    except Exception:
        update_source_status(source_id, FileProcessingStatus.failed.value)
        raise

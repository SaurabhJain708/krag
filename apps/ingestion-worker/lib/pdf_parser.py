import json

from lib.chunker import process_chunks
from lib.redis_client import update_source_status
from modal_service import BGEM3Embedder, FlorenceSummarizer, MarkerParser
from schemas.index import FileProcessingStatus
from utils.split_pdf_pages import (
    base64_to_chunked_pdfs,
    replace_markdown_images_with_html,
)

remote_parser = MarkerParser()
remote_summarizer = FlorenceSummarizer()
remote_embedder = BGEM3Embedder()


def parse_pdf(pdf_base_64: str, file_id: str, user_id: str):
    try:
        update_source_status(file_id, FileProcessingStatus.starting.value)
        split_pdf_chunks = base64_to_chunked_pdfs(pdf_base_64)

        if not split_pdf_chunks:
            raise ValueError("Failed to split PDF into chunks")

        # 2. Connect to GPU
        update_source_status(file_id, FileProcessingStatus.extracting.value)
        results = list[tuple[str, dict[str, bytes]]](
            remote_parser.parse_secure_pdf.map(split_pdf_chunks)
        )
    except Exception:
        update_source_status(file_id, FileProcessingStatus.failed.value)
        raise

    extracted_text = "".join([result[0] + "\n\n" for result in results])
    extracted_images = {k: v for result in results for k, v in result[1].items()}

    image_uuids = list(extracted_images.keys())
    image_bytes_list = list(extracted_images.values())

    if image_bytes_list:
        try:
            update_source_status(file_id, FileProcessingStatus.images.value)
            summary_results = list(
                remote_summarizer.summarize_image.map(image_bytes_list)
            )

            # Zip IDs back with their summaries so you know which is which
            image_summaries = dict(zip(image_uuids, summary_results, strict=True))
        except Exception:
            update_source_status(file_id, FileProcessingStatus.failed.value)
            raise
    else:
        image_summaries = {}

    if image_summaries:
        # Replace markdown image syntax with HTML-like format
        extracted_text = replace_markdown_images_with_html(
            extracted_text, image_summaries
        )

    try:
        update_source_status(file_id, FileProcessingStatus.chunking.value)
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

        print(f"✅ Generated {len(embeddings)} embeddings", flush=True)

        with open("extracted_text.txt", "w") as f:
            f.write(extracted_text)

        with open("db_chunks.json", "w") as f:
            json.dump(db_chunks, f)

        with open("parent_chunks.json", "w") as f:
            json.dump(parent_chunks, f)

        with open("child_chunks.json", "w") as f:
            json.dump(child_chunks, f)

        with open("embeddings.json", "w") as f:
            json.dump(embeddings, f)

        update_source_status(file_id, FileProcessingStatus.completed.value)

        return extracted_text, extracted_images
    except Exception:
        update_source_status(file_id, FileProcessingStatus.failed.value)
        raise

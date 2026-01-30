import json

from lib.chunker import process_chunks
from modal_service import FlorenceSummarizer, MarkerParser
from utils.split_pdf_pages import (
    base64_to_chunked_pdfs,
    replace_markdown_images_with_html,
)

remote_parser = MarkerParser()
remote_summarizer = FlorenceSummarizer()


def parse_pdf(pdf_base_64: str, file_id: str, user_id: str):
    split_pdf_chunks = base64_to_chunked_pdfs(pdf_base_64)

    # 2. Connect to GPU
    results = list[tuple[str, dict[str, bytes]]](
        remote_parser.parse_secure_pdf.map(split_pdf_chunks)
    )

    extracted_text = "".join([result[0] + "\n\n" for result in results])
    extracted_images = {k: v for result in results for k, v in result[1].items()}

    image_uuids = list(extracted_images.keys())
    image_bytes_list = list(extracted_images.values())

    if image_bytes_list:
        summary_results = list(remote_summarizer.summarize_image.map(image_bytes_list))

        # Zip IDs back with their summaries so you know which is which
        image_summaries = dict(zip(image_uuids, summary_results, strict=True))
    else:
        image_summaries = {}

    if image_summaries:
        # Replace markdown image syntax with HTML-like format
        extracted_text = replace_markdown_images_with_html(
            extracted_text, image_summaries
        )

    db_chunks, parent_chunks, child_chunks = process_chunks(extracted_text)

    with open("extracted_text.txt", "w") as f:
        f.write(extracted_text)

    with open("extracted_images.json", "w") as f:
        json.dump(extracted_images, f)

    with open("db_chunks.json", "w") as f:
        json.dump(db_chunks, f)

    with open("parent_chunks.json", "w") as f:
        json.dump(parent_chunks, f)

    with open("child_chunks.json", "w") as f:
        json.dump(child_chunks, f)

    return extracted_text, extracted_images

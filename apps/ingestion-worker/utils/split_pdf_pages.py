import base64
import io
import math
import re
from io import BytesIO

from pypdf import PdfReader, PdfWriter


def base64_to_chunked_pdfs(
    base64_string, max_parallel_calls=8, min_pages=25
) -> list[bytes]:
    """
    Decodes a Base64 string to a PDF and chunks it directly into optimized groups.
    Returns a list of PDF bytes, where each item is a chunked PDF containing multiple pages.

    Args:
        base64_string: Base64 encoded PDF string (optionally with Data URI prefix)
        max_parallel_calls: Maximum number of chunks to create (default: 8)
        min_pages: Minimum pages per chunk (default: 25)

    Returns:
        List of PDF bytes, where each item is a chunked PDF
    """

    # --- Step 1: Clean and Decode Base64 ---
    # Check if string has a Data URI prefix (common in web responses)
    if "," in base64_string and "base64" in base64_string:
        base64_string = base64_string.split(",")[1]

    # Decode string to raw bytes
    try:
        pdf_bytes = base64.b64decode(base64_string)
        if len(pdf_bytes) == 0:
            print("⚠️  WARNING: Decoded PDF is empty", flush=True)
            return []
        # Validate PDF header
        if pdf_bytes[:4] != b"%PDF":
            print(
                "⚠️  WARNING: Decoded data doesn't appear to be a valid PDF (missing %PDF header)",
                flush=True,
            )
    except Exception as e:
        print(f"❌ Error decoding Base64: {e}", flush=True)
        return []

    # --- Step 2: Load into PDF Reader ---
    # Wrap bytes in BytesIO so pypdf treats it like a file object
    pdf_stream = io.BytesIO(pdf_bytes)

    try:
        reader = PdfReader(pdf_stream)
    except Exception as e:
        print(f"Error reading PDF structure: {e}")
        return []

    # --- Step 3: Calculate Chunk Size ---
    total_pages = len(reader.pages)

    # Calculate Dynamic Chunk Size
    # We need to fit 'total_pages' into 'max_parallel_calls' bins.
    required_size_for_limit = math.ceil(total_pages / max_parallel_calls)

    # Use the larger of the two: strict limit size OR user preference
    chunk_size = max(min_pages, required_size_for_limit)

    print(
        f"DEBUG: Total Pages: {total_pages} | Chunk Size: {chunk_size} | Est. Calls: {math.ceil(total_pages/chunk_size)}"
    )

    # --- Step 4: Chunk Pages Directly ---
    split_pdfs = []

    for start_page in range(0, total_pages, chunk_size):
        writer = PdfWriter()
        end_page = min(start_page + chunk_size, total_pages)

        # Add pages directly from the reader to the chunk
        for page_num in range(start_page, end_page):
            writer.add_page(reader.pages[page_num])

        output_buffer = BytesIO()
        writer.write(output_buffer)
        chunk_bytes = output_buffer.getvalue()

        # Validate the chunk is a valid PDF by checking PDF header
        if len(chunk_bytes) < 4 or chunk_bytes[:4] != b"%PDF":
            print(
                f"⚠️  WARNING: Chunk {len(split_pdfs)} doesn't have valid PDF header",
                flush=True,
            )

        split_pdfs.append(chunk_bytes)

    return split_pdfs


def replace_markdown_images_with_html(
    text: str, image_id_to_summary: dict[str, str]
) -> str:
    """
    Replaces markdown image syntax ![optional alt text](image_id) with
    HTML-like syntax <img id={image_id} alt={summarised_text}/>.

    Args:
        text: Text containing markdown image syntax
        image_id_to_summary: Dictionary mapping image IDs (UUIDs) to their summarized text

    Returns:
        Text with markdown images replaced by HTML-like img tags
    """
    # Pattern to match markdown image syntax: ![optional alt text](image_id)
    image_pattern = r"!\[([^\]]*)\]\(([^\)]+)\)"

    def replace_image_ref(match):
        alt_text = match.group(1) if match.group(1) else ""
        image_id = match.group(2).strip()

        # Get summarized text for this image ID, fallback to original alt text if not found
        summarised_text = image_id_to_summary.get(image_id, alt_text)

        # Escape quotes in the summarized text to prevent issues
        summarised_text = summarised_text.replace('"', "&quot;")

        # Return HTML-like syntax with curly braces (JSX-style)
        return f"<img id={{{image_id}}} alt={{{summarised_text}}}/>"

    # Replace all markdown image references
    modified_text = re.sub(image_pattern, replace_image_ref, text)

    return modified_text

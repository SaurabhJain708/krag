import base64
import io
import math
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
    except Exception as e:
        print(f"Error decoding Base64: {e}")
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
        split_pdfs.append(output_buffer.getvalue())

    return split_pdfs

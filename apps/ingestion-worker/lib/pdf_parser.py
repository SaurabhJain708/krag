import modal
from utils.split_pdf_pages import base64_to_chunked_pdfs

remote_parser = modal.Cls.lookup("ingestion-worker", "MarkerParser")


def parse_pdf(pdf_base_64: str, file_id: str, user_id: str):
    split_pdf_chunks = base64_to_chunked_pdfs(pdf_base_64)

    # 2. Connect to GPU
    parser = remote_parser()

    results = list[tuple[str, dict[str, bytes]]](
        parser.parse_secure_pdf.map(split_pdf_chunks)
    )

    extracted_text = "".join([result[0] + "\n\n" for result in results])
    extracted_images = {k: v for result in results for k, v in result[1].items()}
    print(extracted_text)
    print(extracted_images)
    print(file_id)
    print(user_id)

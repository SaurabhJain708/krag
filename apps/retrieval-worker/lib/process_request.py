from utils.chunk_retriever import retrieve_chunks
from utils.filter_chunks_using_llm import filter_chunks_using_llm
from utils.final_extraction import final_extraction
from utils.finalise_response import finalise_response
from utils.get_parent_chunks import get_parent_chunks
from utils.prepare_question import prepare_question
from utils.save_to_db import save_to_db


async def process_request(
    notebook_id: str, assistant_message_id: str, content: str
) -> None:
    # 1. Prepare the question
    prepared_question = await prepare_question(content)
    # 2. Retrieve the chunks
    chunks = await retrieve_chunks(
        notebook_id, prepared_question.optimized_query, prepared_question.keywords
    )
    # 3. Filter the chunks using LLM
    filtered_chunks = await filter_chunks_using_llm(chunks)
    # 4. Get the parent chunks
    parent_chunks = await get_parent_chunks(filtered_chunks)
    # 5. Extract the content
    extracted_content = await final_extraction(
        parent_chunks, prepared_question.optimized_query
    )
    # 6. Finalise the response
    final_response = await finalise_response(extracted_content)
    # 7. Save the response to the database
    await save_to_db(assistant_message_id, final_response)

    return

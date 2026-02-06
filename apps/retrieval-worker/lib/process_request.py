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
    print(f"Preparing question for content: {content}")
    prepared_question = await prepare_question(content)
    print(f"Prepared question: {prepared_question}")

    # 2. Retrieve the chunks
    print(
        f"Retrieving chunks for notebook: {notebook_id} and query: {prepared_question.optimized_query}"
    )
    chunks = await retrieve_chunks(
        notebook_id, prepared_question.optimized_query, prepared_question.keywords
    )
    print(f"Retrieved chunks: {chunks}")

    # 3. Filter the chunks using LLM
    filtered_chunks = await filter_chunks_using_llm(
        chunks, prepared_question.optimized_query
    )
    print(f"Filtered chunks: {filtered_chunks}")

    # 4. Get the parent chunks
    print(f"Getting parent chunks for filtered chunks: {filtered_chunks}")
    parent_chunks = await get_parent_chunks(filtered_chunks)
    print(f"Parent chunks: {parent_chunks}")

    # 5. Extract the content
    print(
        f"Extracting content for parent chunks: {parent_chunks} and query: {prepared_question.optimized_query}"
    )
    extracted_content = await final_extraction(parent_chunks, content)
    print(f"Extracted content: {extracted_content}")

    # 6. Finalise the response
    final_response = finalise_response(extracted_content)
    print(f"Final response: {final_response}")

    # 7. Save the response to the database
    print(f"Saving response to database for assistant message: {assistant_message_id}")

    await save_to_db(assistant_message_id, final_response)

    return

from utils.chunk_retriever import retrieve_chunks
from utils.filter_parent_chunks import filter_parent_chunks
from utils.final_extraction import final_extraction
from utils.finalise_response import finalise_response
from utils.get_parent_chunks import get_parent_chunks
from utils.prepare_context import prepare_context
from utils.prepare_question import prepare_question
from utils.save_to_db import save_to_db
from utils.summarise_messages import summarise_messages


class ClientConnectionInterrupted(Exception):
    """Raised when the client connection is cut during processing."""

    pass


async def process_request(
    notebook_id: str,
    assistant_message_id: str,
    user_query: str,
    user_message_id: str,
    encryption_type: str,
    encryption_key: str | None,
):
    """
    Async generator that processes the request and yields status updates.
    Yields status strings that match the frontend expectations.
    Raises ClientConnectionInterrupted if the client connection is cut.
    """
    try:
        # 1. Prepare the question
        yield "preparing_question"
        print(f"Preparing question: {user_query}")
        prepared_question = await prepare_question(
            user_query, notebook_id, encryption_type, encryption_key
        )
        print(f"Prepared {prepared_question} optimized queries")

        # 2. Retrieve the chunks
        yield "retrieving_chunks"
        print(f"Retrieving chunks for notebook: {notebook_id}")
        chunks = await retrieve_chunks(
            notebook_id, prepared_question, encryption_type, encryption_key
        )
        print(f"Retrieved chunks for {chunks} queries")

        # 4. Get the parent chunks
        yield "getting_parent_chunks"
        print("Getting parent chunks")
        parent_chunks = await get_parent_chunks(chunks, encryption_type, encryption_key)
        print(f"Got parent chunks for {parent_chunks} queries")

        # 5. Filter the parent chunks
        yield "filtering_parent_chunks"
        print("Filtering parent chunks")
        filtered_parent_chunks = await filter_parent_chunks(parent_chunks)
        print(f"Filtered to {filtered_parent_chunks} query results")

        # 5. Extract the content
        yield "extracting_content"
        print("Extracting content")
        extracted_content = await final_extraction(filtered_parent_chunks, user_query)
        print("Content extracted")

        # 7. Generate the response
        yield "generating_response"
        final_response = finalise_response(extracted_content)
        print(f"Final response generated ({final_response} chars)")

        print("Summarising messages")
        yield "summarizing_content"
        await summarise_messages(
            user_query,
            final_response,
            assistant_message_id,
            user_message_id,
            encryption_type,
            encryption_key,
        )
        print("Messages summarised")

        # 8. Prepare the context
        yield "preparing_context"
        print("Preparing context")
        await prepare_context(
            user_query,
            final_response,
            notebook_id,
            assistant_message_id,
            user_message_id,
            encryption_type,
            encryption_key,
        )
        print("Context prepared")

        # 9. Save the response to the database
        yield "saving_to_db"
        print(f"Saving response to database: {assistant_message_id}")
        await save_to_db(
            assistant_message_id, final_response, encryption_type, encryption_key
        )

        # 10. Cleanup
        yield "cleaning_up"

    except (
        GeneratorExit,
        BrokenPipeError,
        ConnectionResetError,
        ConnectionAbortedError,
    ) as e:
        # Client disconnected - handle connection errors
        print(f"Client connection was cut during processing: {e}", flush=True)
        await save_to_db(assistant_message_id, None, failed=True)
        raise ClientConnectionInterrupted(
            "Client connection was cut during processing"
        ) from e
    except Exception as e:
        print(f"Error processing request: {e}")
        await save_to_db(assistant_message_id, None, failed=True)
        raise

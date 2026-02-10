from utils.chunk_retriever import retrieve_chunks
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
    notebook_id: str, assistant_message_id: str, content: str, user_message_id: str
):
    """
    Async generator that processes the request and yields status updates.
    Yields status strings that match the frontend expectations.
    Raises ClientConnectionInterrupted if the client connection is cut.
    """
    try:
        # 1. Prepare the question
        yield "preparing_question"
        print(f"Preparing question for content: {content}")
        prepared_question = await prepare_question(content, notebook_id)
        print(f"Prepared question: {prepared_question}")

        # 2. Retrieve the chunks
        yield "retrieving_chunks"
        print(
            f"Retrieving chunks for notebook: {notebook_id} and query: {prepared_question.optimized_query}"
        )
        chunks = await retrieve_chunks(
            notebook_id, prepared_question.optimized_query, prepared_question.keywords
        )
        print(f"Retrieved chunks: {chunks}")

        # 4. Get the parent chunks
        yield "getting_parent_chunks"
        print(f"Getting parent chunks for chunks: {chunks}")
        parent_chunks = await get_parent_chunks(chunks)
        print(f"Parent chunks: {parent_chunks}")

        # 5. Extract the content
        yield "extracting_content"
        print(
            f"Extracting content for parent chunks: {parent_chunks} and query: {prepared_question.optimized_query}"
        )
        extracted_content = await final_extraction(parent_chunks, content)
        print(f"Extracted content: {extracted_content}")

        # 6. Summarize content (if needed)
        yield "summarizing_content"
        # This step may not have explicit logic, but we yield the status

        # 7. Generate the response
        yield "generating_response"
        final_response = finalise_response(extracted_content)
        print(f"Final response: {final_response}")

        print(
            f"Summarising messages for content: {content} and final response: {final_response}"
        )
        await summarise_messages(
            content, final_response, assistant_message_id, user_message_id
        )
        print("Messages summarised")

        # 8. Prepare the context
        yield "preparing_context"
        print(f"Preparing context for notebook: {notebook_id}")
        await prepare_context(
            content, final_response, notebook_id, assistant_message_id, user_message_id
        )
        print("Context prepared")

        # 9. Save the response to the database
        yield "saving_to_db"
        print(
            f"Saving response to database for assistant message: {assistant_message_id}"
        )
        await save_to_db(assistant_message_id, final_response)

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

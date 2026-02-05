import json

from lib.llm_client import remote_llm
from schemas import ParentChunk, TextWithCitations

json_schema_str = json.dumps(TextWithCitations.model_json_schema())


def build_final_extraction_prompt(
    user_query: str, parent_chunks: list[ParentChunk]
) -> str:
    chunks_str = ""
    for chunk in parent_chunks:
        chunks_str += f"ID: {chunk.id}\nSOURCE_ID: {chunk.sourceId}\nCONTENT: {chunk.content}\n---\n"

    return f"""<|im_start|>system
        You are an intelligent, knowledgeable RAG Response Generator with Citation Support. Your goal is to generate a comprehensive, detailed, and well-structured answer to the user's query using the provided document chunks. You should sound like a highly intelligent chatbot that provides thorough, insightful responses.

        **Core Principles:**
        - Be EXTENSIVE and DETAILED: Provide a substantial, comprehensive answer that thoroughly addresses the query
        - Cite AS MANY chunks as possible: Aim to incorporate information from as many relevant chunks as you can
        - Add context and extra details: It's perfectly fine to include additional relevant information, context, examples, or elaborations that enhance understanding
        - Sound intelligent and thoughtful: Write in a clear, articulate manner that demonstrates deep understanding
        - Be thorough: Don't just answer the question - provide a complete, well-rounded response that gives the user a comprehensive understanding

        **Instructions:**
        1. Generate a DETAILED, EXTENSIVE answer that directly addresses the user's query. Your answer should be substantial and comprehensive, not brief or superficial. Use information from AS MANY chunks as possible - aim to cite most or all of the provided chunks if they're relevant.
        2. For every factual claim, statement, or piece of information you use from the source chunks, include a citation marker in the format [CITATION: N] where N is a sequential number starting from 1.
        3. Place citation markers immediately after the relevant information or at the end of sentences that reference the source material.
        4. Ensure your response is well-organized, flows naturally, and synthesizes information from multiple sources. Group related information together and create logical flow between different concepts.
        5. CRITICAL: Every citation in the citations array MUST have a corresponding [CITATION: N] marker in the text. If you include a citation in the array, you MUST use it in the text. Do NOT include citations in the array that you don't reference in the text.
        6. Maximize citations: Try to incorporate and cite as many chunks as possible. If a chunk contains relevant information (even tangentially related), include it in your answer with proper citation.
        7. Add depth: Include additional context, explanations, examples, or related information that helps the user understand the topic better. It's encouraged to go beyond just answering the direct question.
        8. Output ONLY a JSON object matching the TextWithCitations schema.

        **Citation Requirements:**
        - Each citation must include:
          - citation: The citation number (e.g., "1", "2", "3") - this MUST match a [CITATION: N] marker in the text
          - sourceId: The SOURCE_ID from the chunk
          - chunkId: The ID from the chunk
          - exact_text: The verbatim text from the chunk that supports the claim
          - brief_summary: A concise 1-2 sentence summary of what this citation contributes

        **Input Data:**
        User Query: "{user_query}"

        **Source Chunks:**
        {chunks_str}
        <|im_end|>
        <|im_start|>user
        Generate a DETAILED, EXTENSIVE, and comprehensive answer with proper citations. Cite as many chunks as possible and provide a thorough, intelligent response. Include extra context and details to make the answer as informative as possible. Return strictly JSON matching the TextWithCitations schema.<|im_end|>
        <|im_start|>assistant
        """


async def final_extraction(
    parent_chunks: list[ParentChunk], optimised_query: str
) -> str:
    prompt = build_final_extraction_prompt(optimised_query, parent_chunks)

    response_text = await remote_llm.generate.remote.aio(
        prompt=prompt,
        max_tokens=8000,
        temperature=0.1,
        json_schema=json_schema_str,
    )

    return TextWithCitations.model_validate_json(response_text)

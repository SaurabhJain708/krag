import re

from lib.llm_client import remote_llm
from pydantic import Field, create_model
from schemas import Citation, TextWithCitations
from schemas.filtered_chunks import FilteredQueryResult


def build_prompt(filtered_query_results: list, user_query: str) -> str:
    """
    Manually builds the raw prompt string for Phi-4 Mini RAG.
    Returns a single string formatted with <|system|>, <|user|>, and <|assistant|> tokens.
    """

    # 1. Format Context with XML tags
    context_parts = []
    for query_result in filtered_query_results:
        context_parts.append(
            f"<related_query>{query_result.optimized_query}</related_query>"
        )

        for chunk in query_result.parent_chunks:
            # Escape JSON-breaking characters
            safe_content = chunk.content.replace("\\", "\\\\").replace('"', '\\"')

            context_parts.append(
                f'<source id="{chunk.sourceId}">\n'
                f"  <content>{safe_content}</content>\n"
                f"</source>"
            )

    context_str = "\n".join(context_parts)

    # 2. System Prompt
    system_prompt = """You are a precise Knowledge Retrieval Chatbot.
        Your goal is to answer the user's question using ONLY the provided Source Context.

        ### RESPONSE FORMAT
        You must respond with a SINGLE valid JSON object. No markdown formatting around the JSON.
        Schema:
        {
            "_reasoning": "Briefly explain which sources you selected and why.",
            "text": "The answer to the user in GitHub Markdown. End with a short, relevant follow-up question.",
            "citations": [
                {
                    "citation": "1",
                    "sourceId": "The 'id' attribute from the <source> tag",
                    "chunkId": "The ID found strictly inside <<<...>>> markers in the content",
                    "brief_summary": "What this source contributed"
                }
            ]
        }

        ### CITATION RULES
        1. **In-Text Markers**: Use `[CITATION: 1]` format.
        2. **Strict Separation**: NEVER combine citations.
        - CORRECT: `[CITATION: 1] [CITATION: 2]`
        - WRONG: `[CITATION: 1, 2]`
        3. **Chunk ID Extraction**:
        - The content contains markers like `<<<block_123>>>`.
        - You must extract `block_123` as the `chunkId`.

        ### EXAMPLE
        **Context:**
        <source id="doc_A">
        <content>The sky is blue <<<99>>> due to Rayleigh scattering.<<</99>>></content>
        <content>The sky is red <<<100>>> due to the same reason.<<</100>>></content>
        </source>

        **Output:**
        {
            "_reasoning": "Found the explanation for sky color in doc_A, block idx_99.",
            "text": "The sky appears blue because of Rayleigh scattering [CITATION: 1].\\n\\n**Did you know this also affects sunset colors?**",
            "citations": [
                { "citation": "1", "sourceId": "doc_A", "chunkId": "99", "brief_summary": "This citation explains Rayleigh scattering." }
            ]
        }
        """

    # 3. User Prompt
    user_message_content = f"""
        Answer this query using the context below.

        USER QUERY: {user_query}

        SOURCE CONTEXT:
        {context_str}
        """

    # 4. Manual Token Construction
    # We strictly follow the Phi-4 format: <|system|>...<|end|><|user|>...<|end|><|assistant|>
    final_prompt = (
        f"<|system|>\n{system_prompt}\n<|end|>\n"
        f"<|user|>\n{user_message_content}\n<|end|>\n"
        f"<|assistant|>"
    )

    return final_prompt


def create_text_with_citations_model(source_ids: list[str]) -> type[TextWithCitations]:
    """Create a dynamic TextWithCitations model with enum constraint for sourceId."""
    citation_fields = Citation.model_fields

    CitationWithEnum = create_model(
        "Citation",
        citation=(str, Field(..., description=citation_fields["citation"].description)),
        sourceId=(
            str,
            Field(
                ...,
                description=citation_fields["sourceId"].description,
                json_schema_extra={"enum": source_ids},
            ),
        ),
        chunkId=(str, Field(..., description=citation_fields["chunkId"].description)),
        brief_summary=(
            str,
            Field(..., description=citation_fields["brief_summary"].description),
        ),
        __base__=Citation,
    )

    text_fields = TextWithCitations.model_fields
    TextWithCitationsWithEnum = create_model(
        "TextWithCitations",
        # Reasoning is helpful but not strictly required for downstream logic,
        # and some model outputs may omit it. Make it optional here to avoid
        # hard failures on otherwise useful answers.
        reasoning=(
            str | None,
            Field(
                default=None,
                alias="_reasoning",
                description=text_fields["reasoning"].description,
            ),
        ),
        text=(str, Field(..., description=text_fields["text"].description)),
        citations=(
            list[CitationWithEnum],
            Field(..., description=text_fields["citations"].description),
        ),
        __base__=TextWithCitations,
    )

    return TextWithCitationsWithEnum


def deduplicate_citations(
    text_with_citations: TextWithCitations,
) -> TextWithCitations:
    """Deduplicate citations that reference the same (sourceId, chunkId) pair.

    When the same chunk is cited multiple times, they should all use the same
    citation number. This function groups citations by (sourceId, chunkId) and
    reassigns citation numbers accordingly.
    """
    # Group citations by (sourceId, chunkId) to find duplicates
    citation_map: dict[tuple[str, str], Citation] = {}
    old_to_new_number: dict[str, str] = {}
    new_number = 1

    # First pass: identify unique citations and assign new numbers
    for citation in text_with_citations.citations:
        key = (citation.sourceId, citation.chunkId)
        if key not in citation_map:
            # This is a new unique citation
            new_citation_number = str(new_number)
            citation_map[key] = Citation(
                citation=new_citation_number,
                sourceId=citation.sourceId,
                chunkId=citation.chunkId,
                brief_summary=citation.brief_summary,
            )
            old_to_new_number[citation.citation] = new_citation_number
            new_number += 1
        else:
            # This citation already exists, map old number to existing new number
            old_to_new_number[citation.citation] = citation_map[key].citation

    # Update all citation markers in the text
    updated_text = text_with_citations.text
    for old_num, new_num in old_to_new_number.items():
        # Replace [CITATION: old_num] with [CITATION: new_num]
        pattern = rf"\[CITATION:\s*{re.escape(old_num)}\s*\]"
        updated_text = re.sub(pattern, f"[CITATION: {new_num}]", updated_text)

    # Return deduplicated result
    return TextWithCitations(
        text=updated_text,
        citations=list(citation_map.values()),
    )


async def final_extraction(
    filtered_query_results: list[FilteredQueryResult], user_query: str
) -> TextWithCitations:
    """Extract final answer with citations from filtered query results using Gemini."""
    # Extract unique source IDs from all chunks across all query results
    unique_source_ids = list(
        {
            chunk.sourceId
            for query_result in filtered_query_results
            for chunk in query_result.parent_chunks
        }
    )

    # Create model with enum constraint and structured LLM
    TextWithCitationsModel = create_text_with_citations_model(unique_source_ids)

    # Build prompt messages
    prompt = build_prompt(filtered_query_results, user_query)

    schema_str = TextWithCitationsModel.model_json_schema()

    # Invoke model
    result = await remote_llm.generate.remote.aio(
        prompt=prompt,
        max_tokens=20000,
        temperature=0.5,
        json_schema=schema_str,
    )

    # Explicit Pydantic validation
    validated_result = TextWithCitationsModel.model_validate_json(result)

    # Deduplicate citations that reference the same chunk
    deduplicated_result = deduplicate_citations(validated_result)

    print(deduplicated_result.model_dump_json())
    return deduplicated_result

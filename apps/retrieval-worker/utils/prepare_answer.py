import re
import uuid

from lib.llm_client import remote_llm
from schemas import FinalisedCitations


def clean_response(text: str) -> str:
    """
    Clean the final response text:
    - Remove invalid/malformed citation markers (e.g. <cit_1>, <cit_2>)
      that were not converted to valid <span data-citation="true">...</span> citations.
    - Remove backslashes and forward slashes that appear directly before span tags.
    """
    # Remove malformed/leftover citation markers (optional backslashes + <cit_N>)
    text = re.sub(r"\\*<cit_\d+>", " ", text)
    text = re.sub(r"  +", " ", text)
    # Remove backslashes/forward slashes before opening span tags
    text = re.sub(r"[\\/]+(<span\b)", r"\1", text)
    # Remove backslashes/forward slashes before closing span tags
    text = re.sub(r"[\\/]+(</span>)", r"\1", text)
    return text


def renumber_citations(text: str) -> str:
    """Renumber citations based on their appearance order in the text."""
    # Updated to match span elements with data-citation attribute
    uuid_pattern = r'<span[^>]*data-citation="true"[^>]*>\[([a-f0-9-]{36})\]</span>'
    uuid_to_order = {}
    order = 1

    for match in re.finditer(uuid_pattern, text):
        found_uuid = match.group(1)
        if found_uuid not in uuid_to_order:
            uuid_to_order[found_uuid] = order
            order += 1

    for found_uuid, citation_num in uuid_to_order.items():
        text = text.replace(f"[{found_uuid}]", f"[{citation_num}]")

    return text


def replace_with_citation(
    final_response: str,
    citations_map: dict[str, FinalisedCitations],
) -> str:
    """
    Replace inline <cit_N> markers in the final_response with HTML span
    elements that carry citation metadata (sourceId, chunkId, summary).

    This mirrors the behaviour in utils.finalise_response, but operates on the
    <cit_N> markers produced by the final answer model and uses the
    FinalisedCitations entries from citations_map.
    """
    for marker, citation in citations_map.items():
        # Replace the literal marker string, e.g. "<cit_1>"
        pattern = re.escape(marker)

        # Prefer real_text, fall back to how_it_answers
        summary_source = (citation.real_text or citation.how_it_answers or "").strip()
        summary_escaped = summary_source.replace('"', "&quot;").replace("'", "&apos;")

        def _replace(
            _match,
            source_id=citation.sourceId,
            chunk_id=citation.chunkId,
            summary=summary_escaped,
        ):
            citation_uuid = str(uuid.uuid4())
            return f'<span data-citation="true" data-source-id="{source_id}" data-chunk-id="{chunk_id}" data-summary="{summary}">[{citation_uuid}]</span>'

        final_response = re.sub(pattern, _replace, final_response)

    return final_response


def build_prompt(
    citation_map: dict[str, FinalisedCitations],
    user_query: str,
    enhanced_queries: list[str],
) -> str:
    """
    Build a prompt for generating the final answer using pre-computed citations.

    The model must answer the USER QUERY and reference the provided citations
    using inline markers like <cit_1>, <cit_2>, ... where each marker key
    comes from `citation_map` and corresponds to a specific citation entry.
    """

    # Enhanced / optimized queries section
    enhanced_queries_section = "\n".join(f"- {q}" for q in enhanced_queries) or "None"

    # Finalised citations section, keyed directly by the <cit_N> markers.
    # We only expose how_it_answers and source_text here, not sourceId/chunkId,
    # because the backend already knows how to resolve markers via citation_map.
    citation_lines: list[str] = []
    for marker, c in citation_map.items():
        how_it_answers = c.how_it_answers.replace("\n", " ").strip()
        real_text = (c.real_text or "").replace("\n", " ").strip()
        citation_lines.append(
            f"{marker}: {{\n"
            f"  how_it_answers: {how_it_answers}\n"
            f"  source_text: {real_text}\n"
            f"}}"
        )

    citations_block = "\n\n".join(citation_lines) or "None"

    system_prompt = """You are a precise Knowledge Retrieval assistant.

You are given:
- The original USER QUERY.
- A list of ENHANCED QUERIES that expand or clarify the user query.
- A list of FINALISED CITATIONS. Each citation describes how a specific source
  chunk helps answer the user query and includes the underlying source text.

Your job is to write the FINAL ANSWER to the user.

STRICT RESPONSE FORMAT:
- Write a single, coherent answer in GitHub-flavored Markdown.
- Use headings (##, ###), paragraphs, and bullet lists where helpful.
- After every sentence or factual claim that is supported by a citation, add
  an inline citation marker of the form: <cit_1>, <cit_2>, <cit_3>, ...
- Each marker (e.g. <cit_1>) refers to the corresponding entry in the
  FINALISED CITATIONS list below that has the same marker key.
- You may chain multiple markers when multiple citations support a point,
  e.g. <cit_1><cit_2>.
- It is NON-NEGOTIABLE that you correctly cite every citation that is relevant
  to answering the USER QUERY or any ENHANCED QUERY. If a citation meaningfully
  supports part of your answer, you MUST use its <cit_N> marker at the
  appropriate place in the text.
- Prefer statements that are grounded in the provided citations. Avoid making
  unsupported claims.

STYLE:
- Be clear and concise.
- Cover all aspects of the USER QUERY, using ENHANCED QUERIES as hints for
  sub-questions to address.
"""

    user_message = f"""
USER QUERY:
{user_query}

ENHANCED QUERIES:
{enhanced_queries_section}

FINALISED CITATIONS (each entry keyed by its <cit_N> marker):
{citations_block}
"""

    final_prompt = (
        f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
        f"<|im_start|>user\n{user_message}<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )
    return final_prompt


async def prepare_answer(
    extracted_citations: list[FinalisedCitations],
    user_query: str,
    enhanced_queries: list[str],
) -> str:
    """
    Generate the final answer text using the extracted citations, with
    inline <cit_N> markers matching the order of `extracted_citations`.
    """
    citation_map: dict[str, FinalisedCitations] = {
        f"<cit_{idx + 1}>": citation for idx, citation in enumerate(extracted_citations)
    }
    prompt = build_prompt(citation_map, user_query, enhanced_queries)

    result = await remote_llm.generate.remote.aio(
        prompt=prompt,
        max_tokens=4000,
        temperature=0.7,
    )
    print("Result: ", result)

    # 1) Replace <cit_N> markers with span elements containing source metadata.
    result = replace_with_citation(result, citation_map)

    # 2) Renumber citation display numbers ([1], [2], ...) based on first
    #    appearance in the text, ensuring spans with the same UUID share
    #    the same number.
    result = renumber_citations(result)
    print("Result after replacing citations: ", result)

    # 3) Clean the response to remove invalid/malformed citation markers and
    #    backslashes/forward slashes that appear directly before span tags.
    result = clean_response(result)
    print("Result after cleaning: ", result)

    return result

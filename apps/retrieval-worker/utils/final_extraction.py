import os

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import Field, create_model
from schemas import Citation, ParentChunk, TextWithCitations

SYSTEM_MESSAGE = """You are a RAG answer generator that must return a **single valid JSON object** matching the `TextWithCitations` schema.

**CRITICAL: ABSOLUTELY NO BACKSLASHES**
- **NEVER, EVER use the backslash character (\\) anywhere in your response.**
- If you see LaTeX formulas like backslash-bracket or backslash-max or dollar signs with subscripts, convert them to plain text.
- Examples:
  - WRONG: LaTeX with backslashes or dollar signs with curly braces
  - CORRECT: "d_model" or "d model" or "the model dimension"
  - WRONG: Functions with backslashes like backslash-max
  - CORRECT: "max(0, x)" or "maximum of 0 and x"
- For math formulas, write them in plain English or use simple notation without backslashes or dollar signs.

**Your tasks:**
- Read the chunks below and answer the user's question.
- Write the answer as GitHub markdown in the `text` field.
- Use a **small number** of high‑quality citations (typically 3–10), not hundreds.

**How to use citations:**
- When you use information from a chunk, add a marker like `[CITATION: 1]` in the text.
- **CRITICAL**: Each citation must be in its own separate bracket. NEVER combine multiple citations in a single bracket.
  - CORRECT: `[CITATION: 1]` and `[CITATION: 2]` (separate brackets)
  - WRONG: `[CITATION: 1, 2]` or `[CITATION: 2, 3]` (multiple citations in one bracket)
  - If you need to cite multiple sources, use separate brackets: `[CITATION: 1] [CITATION: 2]`
- In the `citations` array:
  - `citation`: the citation number as a string, e.g. `"1"`.
  - `sourceId`: MUST be the exact `SOURCE_ID` value from the chunk (this is the source document ID, NOT the CHUNK_ID).
  - `chunkId`: MUST be the ID from the `<<<id>>>` markers in the chunk content. Look for patterns like `<<<123>>>content<<</123>>>` and use the ID `"123"` (as a string). This ID corresponds to the block ID in the source document.
  - `brief_summary`: 1–2 sentence summary of what this citation adds.
- Every object in `citations` **must** correspond to at least one `[CITATION: N]` marker in `text`.
- **CRITICAL**:
  - For `sourceId`, use the SOURCE_ID field, NOT the CHUNK_ID field. These are different values!
  - For `chunkId`, extract the ID from the `<<<id>>>` markers in the chunk content. Do NOT use the parent CHUNK_ID or indices. Only use IDs that appear in `<<<id>>>` markers.

**Important constraints:**
- Respond with **only JSON**, no extra commentary.
- The JSON **must be syntactically valid** (proper quotes, commas, and braces).
- Do **not** invent fields outside the `TextWithCitations` schema.
- **AGAIN: NO BACKSLASHES. If you see any backslash in the source chunks, convert it to plain text.**"""


def format_chunks(parent_chunks: list[ParentChunk]) -> str:
    """Format parent chunks into a string representation."""
    chunks = []
    for chunk in parent_chunks:
        chunks.append(
            f"CHUNK_ID: {chunk.id}\n"
            f"SOURCE_ID: {chunk.sourceId}\n"
            f"CONTENT: {chunk.content}\n"
            "---"
        )
    return "\n".join(chunks)


def build_prompt_template() -> ChatPromptTemplate:
    """Build the prompt template for final extraction."""
    return ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_MESSAGE),
            (
                "human",
                "User Query: {user_query}\n\n"
                "Source Chunks:\n{chunks_str}\n\n"
                "Return a **single valid JSON object** that matches the `TextWithCitations` schema "
                "for the answer to the query above. Do not include any extra text before or after the JSON.",
            ),
        ]
    )


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
        text=(str, Field(..., description=text_fields["text"].description)),
        citations=(
            list[CitationWithEnum],
            Field(..., description=text_fields["citations"].description),
        ),
        __base__=TextWithCitations,
    )

    return TextWithCitationsWithEnum


def create_structured_llm(model: type[TextWithCitations]) -> ChatGoogleGenerativeAI:
    """Create a Gemini LLM configured with structured output."""
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.1,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )
    return llm.with_structured_output(model, method="json_schema")


async def final_extraction(
    parent_chunks: list[ParentChunk], user_query: str
) -> TextWithCitations:
    """Extract final answer with citations from parent chunks using Gemini."""
    # Format chunks and extract unique source IDs
    chunks_str = format_chunks(parent_chunks)
    unique_source_ids = list({chunk.sourceId for chunk in parent_chunks})

    # Create model with enum constraint and structured LLM
    TextWithCitationsModel = create_text_with_citations_model(unique_source_ids)
    structured_llm = create_structured_llm(TextWithCitationsModel)

    # Build and format prompt
    prompt_template = build_prompt_template()
    formatted_messages = prompt_template.format_messages(
        user_query=user_query, chunks_str=chunks_str
    )

    # Invoke model
    result = await structured_llm.ainvoke(formatted_messages)

    # Explicit Pydantic validation
    validated_result = TextWithCitationsModel.model_validate(result.model_dump())
    print(validated_result.model_dump_json())
    return validated_result

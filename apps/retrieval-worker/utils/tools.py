from schemas.context import MessageDict
from utils.tokenizer_config import tokenizer


def count_tokens(messages: list[MessageDict]) -> int:
    """
    Accurately counts tokens using Qwen's specific chat template.
    """
    if tokenizer is None:
        raise RuntimeError("Tokenizer not initialized. Check tokenizer_config.py")
    # apply_chat_template handles the special tokens (<|im_start|>, etc.)
    # When tokenize=True, it returns a BatchEncoding object with input_ids attribute
    token_result = tokenizer.apply_chat_template(
        messages, tokenize=True, add_generation_prompt=False
    )
    # Extract the actual token IDs from the BatchEncoding object
    # BatchEncoding has input_ids as an attribute (not dict key)
    token_ids = (
        token_result.input_ids if hasattr(token_result, "input_ids") else token_result
    )
    return len(token_ids)


def count_tokens_str(text: str) -> int:
    """
    Counts tokens for a simple string using the tokenizer.
    """
    if tokenizer is None:
        raise RuntimeError("Tokenizer not initialized. Check tokenizer_config.py")
    # Encode the string directly to get token IDs
    token_ids = tokenizer.encode(text, add_special_tokens=False)
    return len(token_ids)

from utils.tokenizer_config import tokenizer


def count_tokens_str(text: str) -> int:
    """
    Counts tokens for a simple string using the tokenizer.
    """
    if tokenizer is None:
        raise RuntimeError("Tokenizer not initialized. Check tokenizer_config.py")
    # Encode the string directly to get token IDs
    token_ids = tokenizer.encode(text, add_special_tokens=False)
    return len(token_ids)

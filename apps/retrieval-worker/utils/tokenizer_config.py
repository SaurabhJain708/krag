from transformers import AutoTokenizer

# --- CONFIGURATION ---
MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
TOKEN_LIMIT = 8000

# --- TOKENIZER SETUP ---
# Load globally to avoid reloading on every function call
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
except Exception as e:
    print(f"Warning: Tokenizer failed to load. Ensure transformers is installed. {e}")
    tokenizer = None

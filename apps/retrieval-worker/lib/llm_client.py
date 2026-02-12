from modal_services import (
    BGEM3EmbedderCPU,
    MXBAIRerankerV2,
    Qwen2_5_14BAWQ,
)

remote_llm = Qwen2_5_14BAWQ()
remote_embedder = BGEM3EmbedderCPU()
remote_filter = MXBAIRerankerV2()

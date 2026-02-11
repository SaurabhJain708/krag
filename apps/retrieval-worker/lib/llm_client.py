from modal_services import BGEM3EmbedderCPU, MXBAIRerankerV2, Phi4Mini

remote_llm = Phi4Mini()
remote_embedder = BGEM3EmbedderCPU()
remote_filter = MXBAIRerankerV2()

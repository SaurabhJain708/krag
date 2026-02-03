-- CreateIndex
CREATE INDEX ON "DocumentChunk" USING hnsw (embedding vector_cosine_ops);

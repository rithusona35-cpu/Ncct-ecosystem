"""
NCCT Ecosystem - RAG Knowledge Ingestion Pipeline
Chunks markdown files from /docs/knowledge-base/ and stores embeddings in persistent ChromaDB.
"""

import os
import glob
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings


# Configuration
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
KNOWLEDGE_BASE_DIR = os.path.join(PROJECT_ROOT, "docs", "knowledge-base")
PERSIST_DIRECTORY = os.path.join(CURRENT_DIR, "chroma_db")
COLLECTION_NAME = "ncct_knowledge"

CHUNK_SIZE = 500  # characters per chunk
CHUNK_OVERLAP = 100  # characters overlap between consecutive chunks


def extract_title(content: str, default_name: str) -> str:
    """Extracts first markdown H1 header or returns default name."""
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line.replace("# ", "").strip()
    return default_name.replace("-", " ").replace(".md", "").title()


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Splits text into chunks of target size with character overlap.
    Prefers breaking at paragraph or sentence boundaries where possible.
    """
    cleaned_text = text.strip()
    if not cleaned_text:
        return []

    if len(cleaned_text) <= chunk_size:
        return [cleaned_text]

    chunks = []
    start = 0
    text_length = len(cleaned_text)

    while start < text_length:
        end = start + chunk_size
        if end >= text_length:
            chunk = cleaned_text[start:].strip()
            if chunk:
                chunks.append(chunk)
            break

        # Try to break at paragraph boundary within the window
        sub = cleaned_text[start:end]
        last_para = sub.rfind("\n\n")
        last_period = max(sub.rfind(". "), sub.rfind(".\n"))
        last_newline = sub.rfind("\n")

        if last_para != -1 and last_para >= chunk_size // 2:
            break_point = start + last_para + 2
        elif last_period != -1 and last_period >= chunk_size // 2:
            break_point = start + last_period + 2
        elif last_newline != -1 and last_newline >= chunk_size // 2:
            break_point = start + last_newline + 1
        else:
            break_point = end

        chunk = cleaned_text[start:break_point].strip()
        if chunk:
            chunks.append(chunk)

        # Move start forward with overlap
        start = max(start + 1, break_point - overlap)

    return chunks


def load_and_chunk_documents(knowledge_dir: str) -> List[Dict[str, Any]]:
    """Loads all .md files in the directory and chunks them."""
    pattern = os.path.join(knowledge_dir, "*.md")
    files = glob.glob(pattern)

    if not files:
        raise FileNotFoundError(f"No markdown documents found in {knowledge_dir}")

    all_chunks = []
    print(f"[Ingest] Found {len(files)} markdown documents in {knowledge_dir}:")

    for file_path in sorted(files):
        file_name = os.path.basename(file_path)
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        title = extract_title(content, file_name)
        chunks = chunk_text(content, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP)

        print(f"  - {file_name}: {len(content)} chars -> {len(chunks)} chunks ('{title}')")

        for idx, chunk_text_content in enumerate(chunks):
            # Create a unique deterministic ID
            doc_base = os.path.splitext(file_name)[0]
            chunk_id = f"{doc_base}_chunk_{idx:03d}"

            all_chunks.append({
                "id": chunk_id,
                "text": chunk_text_content,
                "metadata": {
                    "source": file_name,
                    "title": title,
                    "chunk_index": idx,
                    "total_chunks": len(chunks),
                    "file_path": file_path
                }
            })

    return all_chunks


def ingest_to_chroma(chunks: List[Dict[str, Any]], persist_dir: str = PERSIST_DIRECTORY, collection_name: str = COLLECTION_NAME):
    """Stores chunked documents and generates embeddings into ChromaDB."""
    os.makedirs(persist_dir, exist_ok=True)
    print(f"\n[Ingest] Initializing ChromaDB client at: {persist_dir}")

    client = chromadb.PersistentClient(path=persist_dir)

    # Get or create collection
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"description": "NCCT Ecosystem Cooperative Training Knowledge Base"}
    )

    ids = [c["id"] for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]

    print(f"[Ingest] Ingesting {len(chunks)} chunks into collection '{collection_name}'...")
    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )

    count = collection.count()
    print(f"[Ingest] Ingestion complete! Total items in collection '{collection_name}': {count}")
    return count


def main():
    print("=" * 60)
    print("NCCT RAG Knowledge Ingestion Pipeline")
    print("=" * 60)
    chunks = load_and_chunk_documents(KNOWLEDGE_BASE_DIR)
    total_in_db = ingest_to_chroma(chunks)
    print("=" * 60)
    print(f"Successfully processed {len(chunks)} chunks into persistent ChromaDB.")
    print("=" * 60)


if __name__ == "__main__":
    main()

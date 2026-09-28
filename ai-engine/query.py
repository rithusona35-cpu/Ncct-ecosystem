"""
NCCT Ecosystem - RAG Knowledge Query Script
Queries persistent ChromaDB collection 'ncct_knowledge' and retrieves top-k relevant knowledge chunks.
"""

import os
import sys
from typing import List, Dict, Any
import chromadb


# Configuration
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_DIRECTORY = os.path.join(CURRENT_DIR, "chroma_db")
COLLECTION_NAME = "ncct_knowledge"


def query_knowledge_base(
    query_text: str,
    n_results: int = 3,
    persist_dir: str = PERSIST_DIRECTORY,
    collection_name: str = COLLECTION_NAME
) -> List[Dict[str, Any]]:
    """
    Connects to persistent ChromaDB collection and queries for the top-n most relevant chunks.
    Returns list of dicts with chunk text, source, metadata, and distance.
    """
    if not os.path.exists(persist_dir):
        raise FileNotFoundError(
            f"ChromaDB persistent directory not found at {persist_dir}. Please run ingest.py first!"
        )

    client = chromadb.PersistentClient(path=persist_dir)
    collection = client.get_collection(name=collection_name)

    # Perform query
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )

    formatted_results = []
    if results and "documents" in results and results["documents"]:
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(docs)
        distances = results["distances"][0] if results["distances"] else [0.0] * len(docs)
        ids = results["ids"][0] if results["ids"] else [""] * len(docs)

        for i in range(len(docs)):
            formatted_results.append({
                "id": ids[i],
                "document": docs[i],
                "metadata": metas[i],
                "distance": distances[i],
                "source": metas[i].get("source", "unknown"),
                "title": metas[i].get("title", ""),
                "chunk_index": metas[i].get("chunk_index", 0),
            })

    return formatted_results


def main():
    if len(sys.argv) > 1:
        query_text = " ".join(sys.argv[1:])
    else:
        query_text = "What is PACS?"

    print("=" * 70)
    print(f"NCCT RAG Query Engine")
    print(f"Query: \"{query_text}\"")
    print("=" * 70)

    try:
        results = query_knowledge_base(query_text=query_text, n_results=3)
        if not results:
            print("No matching knowledge base results found.")
            return

        print(f"Retrieved top-{len(results)} most relevant chunks:\n")
        for rank, r in enumerate(results, start=1):
            print(f"--- [Rank {rank}] Source: {r['source']} (Distance: {r['distance']:.4f}) ---")
            print(f"Title: {r['title']} | Chunk Index: #{r['chunk_index']}")
            print(f"Content:\n{r['document']}\n")

    except Exception as e:
        print(f"Error querying knowledge base: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

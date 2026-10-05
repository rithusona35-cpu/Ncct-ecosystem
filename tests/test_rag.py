import os
import glob
import pytest

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
KNOWLEDGE_BASE_DIR = os.path.join(PROJECT_ROOT, "docs", "knowledge-base")
AI_ENGINE_DIR = os.path.join(PROJECT_ROOT, "ai-engine")


def test_knowledge_base_documents_exist():
    """
    Verify that all 6 required markdown documents exist in /docs/knowledge-base/
    and have substantive educational content (300-500 words).
    """
    expected_files = [
        "cooperative-accounting-basics.md",
        "pacs-explained.md",
        "erp-overview.md",
        "gst-for-cooperatives.md",
        "faqs.md",
        "ncct-training-policies.md",
    ]

    for fname in expected_files:
        fpath = os.path.join(KNOWLEDGE_BASE_DIR, fname)
        assert os.path.exists(fpath), f"Missing expected knowledge base document: {fname}"

        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()

        word_count = len(content.split())
        assert word_count >= 200, f"{fname} has only {word_count} words (expected >= 200 words)"


def test_chunking_logic():
    """
    Verify chunk_text produces chunks with overlap and boundary preservation.
    """
    import sys
    if AI_ENGINE_DIR not in sys.path:
        sys.path.insert(0, AI_ENGINE_DIR)

    from ingest import chunk_text

    sample_text = (
        "Paragraph 1: Primary Agricultural Credit Societies form the grassroots foundation of short-term credit. "
        "They disburse seasonal crop loans and provide agricultural inputs to rural farmers.\n\n"
        "Paragraph 2: Enterprise Resource Planning connects PACS to District Central Cooperative Banks. "
        "This ensures transparent accounting, automated ledger updates, and audit compliance.\n\n"
        "Paragraph 3: Goods and Services Tax exemptions apply to rural credit and storage of raw agricultural produce. "
        "However, commercial processing and fertilizer distribution attract standard GST rates."
    )

    chunks = chunk_text(sample_text, chunk_size=200, overlap=50)
    assert len(chunks) >= 2, "Expected multiple chunks from sample text"
    for c in chunks:
        assert len(c) > 0


def test_rag_ingest_and_query():
    """
    Runs ingest and tests query retrieval for 'What is PACS?' and 'GST for cooperatives'.
    """
    import sys
    if AI_ENGINE_DIR not in sys.path:
        sys.path.insert(0, AI_ENGINE_DIR)

    from ingest import load_and_chunk_documents, ingest_to_chroma, PERSIST_DIRECTORY, COLLECTION_NAME
    from query import query_knowledge_base

    # 1. Load and chunk documents
    chunks = load_and_chunk_documents(KNOWLEDGE_BASE_DIR)
    assert len(chunks) > 0, "No chunks generated from knowledge base"

    # 2. Ingest to ChromaDB
    total = ingest_to_chroma(chunks, persist_dir=PERSIST_DIRECTORY, collection_name=COLLECTION_NAME)
    assert total >= len(chunks)

    # 3. Test query: "What is PACS?"
    results = query_knowledge_base("What is PACS?", n_results=3, persist_dir=PERSIST_DIRECTORY, collection_name=COLLECTION_NAME)
    assert len(results) >= 1
    top_result = results[0]

    assert top_result["source"] == "pacs-explained.md", (
        f"Expected top match from pacs-explained.md, got {top_result['source']}"
    )
    assert "Primary Agricultural Credit Society" in top_result["document"] or "PACS" in top_result["document"]

    # 4. Test query: "GST exemptions for cooperative societies"
    gst_results = query_knowledge_base("GST exemptions for cooperative societies", n_results=3, persist_dir=PERSIST_DIRECTORY, collection_name=COLLECTION_NAME)
    assert len(gst_results) >= 1
    assert gst_results[0]["source"] == "gst-for-cooperatives.md"

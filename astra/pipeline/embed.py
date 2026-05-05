#!/usr/bin/env python3
"""
ASTRA Embedding Pipeline
Chunks knowledge files → embeds via Ollama nomic-embed-text → stores in Supabase pgvector
"""

import os, json, httpx
from pathlib import Path

OLLAMA_URL = "http://localhost:11434"
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://jmkophesisqqmocwhto.supabase.co")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_oJCKKDU8IGdOPPykH9aQFg_tJLjXdO4")
KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"
CHUNK_SIZE = 400  # tokens approx

def chunk_text(text: str, size: int = CHUNK_SIZE) -> list[dict]:
    """Split markdown into semantic chunks — respect section boundaries."""
    chunks = []
    current = []
    current_size = 0
    section = "general"

    for line in text.splitlines():
        if line.startswith("## "):
            if current:
                chunks.append({"section": section, "text": "\n".join(current)})
                current = []
                current_size = 0
            section = line.replace("## ", "").strip()
        
        current.append(line)
        current_size += len(line.split())
        
        if current_size >= size:
            chunks.append({"section": section, "text": "\n".join(current)})
            current = []
            current_size = 0
    
    if current:
        chunks.append({"section": section, "text": "\n".join(current)})
    
    return chunks

def embed(text: str) -> list[float]:
    """Get embedding vector from Ollama nomic-embed-text."""
    res = httpx.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text},
        timeout=30
    )
    return res.json()["embedding"]

def embed_knowledge_file(filepath: Path, domain: str) -> int:
    """Embed all chunks from a knowledge file."""
    text = filepath.read_text()
    chunks = chunk_text(text)
    embedded = 0

    for i, chunk in enumerate(chunks):
        if len(chunk["text"].strip()) < 50:
            continue
        
        vector = embed(chunk["text"])
        
        # Store in Supabase
        payload = {
            "domain": domain,
            "section": chunk["section"],
            "content": chunk["text"],
            "embedding": vector,
            "source_file": str(filepath.name),
            "chunk_index": i,
        }
        
        res = httpx.post(
            f"{SUPABASE_URL}/rest/v1/astra_knowledge",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            json=payload,
            timeout=15
        )
        
        if res.status_code in (200, 201):
            embedded += 1
            print(f"  ✓ [{domain}] chunk {i+1}/{len(chunks)} — {chunk['section'][:40]}")
        else:
            print(f"  ✗ [{domain}] chunk {i} failed: {res.status_code} {res.text[:100]}")
    
    return embedded

def run():
    """Embed all knowledge files found in knowledge directory."""
    print("🧠 ASTRA Embedding Pipeline starting...\n")
    total = 0
    
    for domain_dir in sorted(KNOWLEDGE_DIR.iterdir()):
        if not domain_dir.is_dir():
            continue
        domain = domain_dir.name
        
        for md_file in domain_dir.glob("*.md"):
            print(f"📄 Processing {domain}/{md_file.name}...")
            count = embed_knowledge_file(md_file, domain)
            total += count
            print(f"   → {count} chunks embedded\n")
    
    print(f"✅ Pipeline complete — {total} total chunks embedded into ASTRA knowledge base")

if __name__ == "__main__":
    run()

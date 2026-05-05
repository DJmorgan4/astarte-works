#!/usr/bin/env python3
"""ASTRA Embedding Pipeline with retry logic"""
import os, json, time, httpx
from pathlib import Path

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
OLLAMA_URL = "http://localhost:11434"
KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"
CHUNK_SIZE = 400

# Only embed these domains this run
TARGET_DOMAINS = ["landuse", "conservation", "energy", "water_quality", "toxicology"]

def chunk_text(text, size=CHUNK_SIZE):
    chunks, current, current_size, section = [], [], 0, "general"
    for line in text.splitlines():
        if line.startswith("## "):
            if current:
                chunks.append({"section": section, "text": "\n".join(current)})
                current, current_size = [], 0
            section = line.replace("## ", "").strip()
        current.append(line)
        current_size += len(line.split())
        if current_size >= size:
            chunks.append({"section": section, "text": "\n".join(current)})
            current, current_size = [], 0
    if current:
        chunks.append({"section": section, "text": "\n".join(current)})
    return chunks

def embed(text, retries=3):
    for attempt in range(retries):
        try:
            res = httpx.post(f"{OLLAMA_URL}/api/embeddings",
                json={"model": "nomic-embed-text", "prompt": text}, timeout=30)
            return res.json()["embedding"]
        except Exception as e:
            if attempt < retries-1:
                time.sleep(2)
            else:
                raise e

def store(payload, retries=5):
    for attempt in range(retries):
        try:
            res = httpx.post(
                f"{SUPABASE_URL}/rest/v1/astra_knowledge",
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                json=payload, timeout=30)
            return res.status_code in (200, 201)
        except Exception as e:
            wait = 2 ** attempt
            print(f"    ⏳ retry {attempt+1}/{retries} in {wait}s ({e})")
            time.sleep(wait)
    return False

def run():
    print("🧠 ASTRA Embedding Pipeline (with retry)\n")
    total = 0
    for domain_dir in sorted(KNOWLEDGE_DIR.iterdir()):
        if not domain_dir.is_dir(): continue
        domain = domain_dir.name
        if domain not in TARGET_DOMAINS: continue
        for md_file in domain_dir.glob("*.md"):
            print(f"📄 {domain}/{md_file.name}...")
            text = md_file.read_text()
            chunks = chunk_text(text)
            count = 0
            for i, chunk in enumerate(chunks):
                if len(chunk["text"].strip()) < 50: continue
                try:
                    vector = embed(chunk["text"])
                    if store({"domain": domain, "section": chunk["section"],
                              "content": chunk["text"], "embedding": vector,
                              "source_file": md_file.name, "chunk_index": i}):
                        count += 1
                        print(f"  ✓ [{domain}] {i+1}/{len(chunks)} — {chunk['section'][:35]}")
                    time.sleep(0.3)  # gentle rate limiting
                except Exception as e:
                    print(f"  ✗ chunk {i}: {e}")
            print(f"   → {count} chunks\n")
            total += count
    print(f"✅ Done — {total} chunks embedded")

if __name__ == "__main__":
    run()

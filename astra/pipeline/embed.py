#!/usr/bin/env python3
"""
ASTRA Embedding Pipeline
Chunks knowledge files → embeds via Ollama nomic-embed-text → stores in Supabase pgvector

v2 changes:
- Skips [PENDING] scaffold stubs (content-check, self-maintaining)
- Delete-before-insert per file → idempotent, safe to re-run (no duplicates)
- Parses YAML frontmatter into metadata jsonb (tier/confidence/jurisdiction/etc.)
"""

import os, re, httpx
from pathlib import Path

OLLAMA_URL = "http://localhost:11434"
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"
CHUNK_SIZE = 400  # tokens approx

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit(
        "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in env.\n"
        "Export them before running (do not hardcode secrets in this file)."
    )

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Split YAML frontmatter from body. Lightweight parser — no yaml dep."""
    meta: dict = {}
    body = text
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            raw = text[3:end].strip()
            body = text[end + 4:].lstrip("\n")
            for line in raw.splitlines():
                if ":" not in line:
                    continue
                key, val = line.split(":", 1)
                key, val = key.strip(), val.strip()
                # strip simple [list] brackets, leave as string
                meta[key] = val.strip("[]").strip()
    return meta, body


def is_stub(body: str) -> bool:
    """True if the file is an unwritten scaffold stub (only [PENDING] content)."""
    # Remove headings/blockquotes/whitespace; if what's left is just PENDING markers, skip.
    substantive = []
    for line in body.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("#") or s.startswith(">"):
            continue
        substantive.append(s)
    if not substantive:
        return True
    # If every remaining non-trivial line is a PENDING marker, it's a stub.
    non_pending = [s for s in substantive if "[PENDING]" not in s and s not in ("EOF",)]
    return len(non_pending) == 0


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
    """Get embedding vector from Ollama nomic-embed-text (retries on timeout)."""
    last_err = None
    for attempt in range(3):
        try:
            res = httpx.post(
                f"{OLLAMA_URL}/api/embeddings",
                json={"model": "nomic-embed-text", "prompt": text},
                timeout=120,
            )
            return res.json()["embedding"]
        except (httpx.ReadTimeout, httpx.ConnectError) as e:
            last_err = e
            print(f"    ⟳ embed retry {attempt+1}/3 ({type(e).__name__})")
    raise last_err


def delete_existing(domain: str, source_file: str) -> None:
    """Remove prior rows for this file so re-embeds don't duplicate."""
    httpx.delete(
        f"{SUPABASE_URL}/rest/v1/astra_knowledge",
        headers=SB_HEADERS,
        params={"domain": f"eq.{domain}", "source_file": f"eq.{source_file}"},
        timeout=15,
    )


def embed_knowledge_file(filepath: Path, domain: str) -> int:
    """Embed all chunks from a knowledge file (skips stubs, idempotent)."""
    text = filepath.read_text()
    meta, body = parse_frontmatter(text)

    if is_stub(body):
        print(f"  ⊘ [{domain}] {filepath.name} — stub, skipped")
        return 0

    # Idempotency: clear old rows for this file before re-inserting.
    delete_existing(domain, filepath.name)

    chunks = chunk_text(body)
    embedded = 0

    for i, chunk in enumerate(chunks):
        if len(chunk["text"].strip()) < 50:
            continue

        vector = embed(chunk["text"])

        payload = {
            "domain": domain,
            "section": chunk["section"],
            "content": chunk["text"],
            "embedding": vector,
            "source_file": str(filepath.name),
            "chunk_index": i,
            "metadata": {
                "tier": meta.get("tier", "core"),
                "confidence": meta.get("confidence", "unknown"),
                "jurisdiction": meta.get("jurisdiction", ""),
                "type": meta.get("type", "domain"),
                "updated": meta.get("updated", ""),
            },
        }

        res = httpx.post(
            f"{SUPABASE_URL}/rest/v1/astra_knowledge",
            headers={**SB_HEADERS, "Prefer": "return=minimal"},
            json=payload,
            timeout=15,
        )

        if res.status_code in (200, 201):
            embedded += 1
            print(f"  ✓ [{domain}] chunk {i+1}/{len(chunks)} — {chunk['section'][:40]}")
        else:
            print(f"  ✗ [{domain}] chunk {i} failed: {res.status_code} {res.text[:100]}")

    return embedded


def run():
    """Embed all knowledge files found in knowledge directory (recursive)."""
    print("🧠 ASTRA Embedding Pipeline v2 starting...\n")
    total = 0
    skipped = 0

    # Recursive: catches crosswalks/ and playbooks/ too, not just domain dirs.
    for md_file in sorted(KNOWLEDGE_DIR.rglob("*.md")):
        # domain = parent dir name (crosswalks/playbooks group under their own dir)
        domain = md_file.parent.name
        text = md_file.read_text()
        _, body = parse_frontmatter(text)
        if is_stub(body):
            skipped += 1
            print(f"⊘ Skipping stub {domain}/{md_file.name}")
            continue
        print(f"📄 Processing {domain}/{md_file.name}...")
        count = embed_knowledge_file(md_file, domain)
        total += count
        print(f"   → {count} chunks embedded\n")

    print(f"✅ Pipeline complete — {total} chunks embedded, {skipped} stubs skipped")


if __name__ == "__main__":
    run()

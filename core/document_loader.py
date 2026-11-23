"""
Layer 1: Multi-Format Document Ingestion & Language Detection
Supports PDF, DOCX, and TXT files with graceful fallbacks.
"""

import os
import re
from typing import Dict, Any


def _detect_language(text: str) -> str:
    try:
        from langdetect import detect
        sample = text[:2000].strip()
        return detect(sample) if sample else "unknown"
    except Exception:
        return "en"


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def load_document(file_path: str) -> Dict[str, Any]:
    """Load a TXT, PDF, or DOCX legal document and return extracted text + metadata."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Document not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    raw_text = ""

    if ext in (".txt", ".md"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw_text = f.read()
    elif ext == ".pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            pages = [page.extract_text() or "" for page in reader.pages]
            raw_text = "\n\n".join(pages)
        except ImportError as exc:
            raise ImportError("Install 'pypdf' to parse PDF files: pip install pypdf") from exc
    elif ext == ".docx":
        try:
            import docx
            doc = docx.Document(file_path)
            raw_text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except ImportError as exc:
            raise ImportError(
                "Install 'python-docx' to parse DOCX files: pip install python-docx"
            ) from exc
    else:
        raise ValueError(f"Unsupported file format '{ext}'. Supported: .txt, .pdf, .docx")

    clean_text = normalize_text(raw_text)
    return {
        "filename": os.path.basename(file_path),
        "extension": ext,
        "char_count": len(clean_text),
        "word_count": len(clean_text.split()),
        "language": _detect_language(clean_text),
        "text": clean_text,
    }

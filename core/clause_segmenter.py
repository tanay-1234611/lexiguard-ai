"""
Layer 3: Legal Clause Segmentation Engine
Splits raw contract text into numbered/titled clauses for granular risk analysis.
"""

import re
from typing import List, Dict


CLAUSE_HEADER_RE = re.compile(
    r"^(?:(?:SECTION|ARTICLE|CLAUSE)\s+)?(?:\d+(?:\.\d+)*\.?|[A-Z][A-Z\s&,-]{3,}:?)$",
    re.MULTILINE,
)


def segment_clauses(text: str) -> List[Dict[str, str]]:
    """Segment contract text into structured clauses with id, title, and body."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    clauses: List[Dict[str, str]] = []
    current_title = "Preamble / General Terms"
    current_body: List[str] = []

    def flush():
        if current_body:
            body_text = " ".join(current_body).strip()
            if len(body_text) >= 20:
                clauses.append(
                    {
                        "clause_id": f"CL-{len(clauses) + 1:02d}",
                        "title": current_title,
                        "text": body_text,
                    }
                )

    for para in paragraphs:
        lines = [ln.strip() for ln in para.split("\n") if ln.strip()]
        first_line = lines[0]

        # Detect numbered heading like "1. LIABILITY" or "3.2 Termination"
        numbered_match = re.match(r"^(?:SECTION\s+|ARTICLE\s+)?(\d+(?:\.\d+)*\.?)\s+(.+)", first_line, re.I)
        if numbered_match and len(first_line) <= 95:
            flush()
            current_body = []
            current_title = first_line.rstrip(":")
            if len(lines) > 1:
                current_body.append(" ".join(lines[1:]))
        elif CLAUSE_HEADER_RE.match(first_line) and len(first_line) <= 80:
            flush()
            current_body = []
            current_title = first_line.rstrip(":")
            if len(lines) > 1:
                current_body.append(" ".join(lines[1:]))
        else:
            current_body.append(" ".join(lines))

    flush()

    if not clauses and text.strip():
        clauses.append(
            {
                "clause_id": "CL-01",
                "title": "Full Document",
                "text": text.strip(),
            }
        )

    return clauses

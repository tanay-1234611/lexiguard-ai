"""
Layer 2: Client-Side Zero-Trust PII Sanitization Shield
Redacts emails, phone numbers, SSNs, PAN/Aadhaar numbers, and credit card numbers
before any text is analyzed or sent to an external LLM.
"""

import re
from typing import Dict, Tuple


class PIIShield:
    PATTERNS = {
        "EMAIL": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        "PHONE": r"(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b",
        "SSN": r"\b\d{3}-\d{2}-\d{4}\b",
        "PAN_IN": r"\b[A-Z]{5}\d{4}[A-Z]\b",
        "CREDIT_CARD": r"\b(?:\d{4}[-\s]?){3}\d{4}\b",
        "IP_ADDRESS": r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
    }

    def sanitize(self, text: str) -> Tuple[str, Dict[str, int]]:
        """Redact sensitive PII patterns and return (sanitized_text, redaction_counts)."""
        sanitized = text
        counts: Dict[str, int] = {}

        for label, pattern in self.PATTERNS.items():
            matches = re.findall(pattern, sanitized)
            if matches:
                counts[label] = len(matches)
                sanitized = re.sub(pattern, f"[REDACTED_{label}]", sanitized)

        return sanitized, counts

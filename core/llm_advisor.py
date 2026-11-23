"""
Layer 6: Optional LLM Co-Pilot with Deterministic Local Fallback
Uses Google Gemini if GEMINI_API_KEY is set; otherwise produces a structured,
deterministic executive negotiation brief locally with zero external API calls.
"""

import os
from typing import Dict, Any


class LLMAdvisor:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

    def generate_negotiation_brief(self, analysis: Dict[str, Any], explainability: Dict[str, Any]) -> str:
        """Generate an executive negotiation brief using Gemini or local fallback."""
        if self.api_key and self.api_key != "your_gemini_api_key_here":
            try:
                from google import genai
                client = genai.Client(api_key=self.api_key)
                top_issues = "\n".join(
                    f"- {c['title']} (Score {c['risk_score']}/100): "
                    + "; ".join(f["category_label"] for f in c["findings"])
                    for c in analysis.get("top_gotchas", [])
                )
                prompt = (
                    "You are LexiGuard AI, a helpful legal contract literacy assistant "
                    "(informational only, not legal advice). Based on the risk analysis below, "
                    "write a concise 4-bullet negotiation checklist for the signer:\n\n"
                    f"Overall Risk: {analysis['overall_score']}/100 ({analysis['overall_severity']})\n"
                    f"Explainability: {explainability['explanation_summary']}\n"
                    f"Top Flagged Clauses:\n{top_issues}"
                )
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                )
                if response and getattr(response, "text", None):
                    return response.text.strip()
            except Exception:
                pass  # Seamlessly fall back to deterministic local engine

        return self._deterministic_brief(analysis, explainability)

    def _deterministic_brief(self, analysis: Dict[str, Any], explainability: Dict[str, Any]) -> str:
        severity = analysis["overall_severity"]
        score = analysis["overall_score"]
        lines = [
            f"Overall Assessment: {severity} RISK ({score}/100).",
            explainability["explanation_summary"],
            "",
            "Actionable Negotiation Checklist:",
        ]

        seen_categories = set()
        for clause in analysis.get("top_gotchas", []):
            for f in clause["findings"]:
                if f["category_key"] not in seen_categories:
                    seen_categories.add(f["category_key"])
                    lines.append(f"- [{clause['title']}] {f['counter_clause']}")

        if not seen_categories:
            lines.append("- No major predatory clauses detected. Perform a standard final read-through.")

        lines.append(
            "\nDisclaimer: LexiGuard AI provides automated legal information, not formal legal advice. "
            "Consult a qualified attorney for binding legal decisions."
        )
        return "\n".join(lines)

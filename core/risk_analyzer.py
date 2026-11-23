"""
Layer 4: Hybrid Weighted Risk Scoring Engine
Evaluates each clause against the 10-category risk taxonomy and computes
a transparent 0-100 overall contract risk score.
"""

import re
from typing import List, Dict, Any
from config.risk_rules import CLAUSE_CATEGORIES, SEVERITY_THRESHOLDS


def _classify_severity(score: float) -> str:
    if score >= SEVERITY_THRESHOLDS["CRITICAL"]:
        return "CRITICAL"
    if score >= SEVERITY_THRESHOLDS["HIGH"]:
        return "HIGH"
    if score >= SEVERITY_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    return "LOW"


class RiskAnalyzer:
    def __init__(self, categories: Dict[str, Any] = None):
        self.categories = categories or CLAUSE_CATEGORIES

    def analyze_clause(self, clause: Dict[str, str]) -> Dict[str, Any]:
        text_lower = clause["text"].lower()
        title_lower = clause["title"].lower()
        combined = f"{title_lower} {text_lower}"

        findings = []
        clause_score = 0.0

        for cat_key, meta in self.categories.items():
            matched_keywords = [kw for kw in meta["keywords"] if kw.lower() in combined]
            matched_patterns = [
                pat for pat in meta["patterns"] if re.search(pat, combined, re.IGNORECASE)
            ]

            hit_count = len(matched_keywords) + len(matched_patterns)
            if hit_count > 0:
                # Diminishing-returns multiplier so repeated mentions don't explode score
                intensity = min(1.0, 0.55 + 0.15 * hit_count)
                contribution = round(meta["weight"] * intensity * 2.2, 2)
                clause_score += contribution

                findings.append(
                    {
                        "category_key": cat_key,
                        "category_label": meta["label"],
                        "weight": meta["weight"],
                        "matched_keywords": matched_keywords,
                        "matched_pattern_count": len(matched_patterns),
                        "contribution": contribution,
                        "plain_english": meta["plain_english"],
                        "counter_clause": meta["counter_clause"],
                    }
                )

        normalized_clause_score = min(100.0, round(clause_score, 1))
        return {
            "clause_id": clause["clause_id"],
            "title": clause["title"],
            "text": clause["text"],
            "risk_score": normalized_clause_score,
            "severity": _classify_severity(normalized_clause_score),
            "findings": findings,
        }

    def analyze_document(self, clauses: List[Dict[str, str]]) -> Dict[str, Any]:
        analyzed_clauses = [self.analyze_clause(c) for c in clauses]

        # Track highest contribution per category across the entire document
        category_peaks: Dict[str, float] = {}
        category_hits: Dict[str, int] = {}

        for c in analyzed_clauses:
            for f in c["findings"]:
                key = f["category_key"]
                category_hits[key] = category_hits.get(key, 0) + 1
                category_peaks[key] = max(category_peaks.get(key, 0.0), f["contribution"])

        # Overall document risk score (0-100) weighted by unique category coverage + peak severity
        raw_total = sum(category_peaks.values())
        overall_score = min(100.0, round(raw_total * 0.78, 1))
        overall_severity = _classify_severity(overall_score)

        # Sort top risky clauses
        risky_clauses = sorted(
            [c for c in analyzed_clauses if c["findings"]],
            key=lambda x: x["risk_score"],
            reverse=True,
        )

        category_breakdown = []
        for cat_key, meta in self.categories.items():
            peak = category_peaks.get(cat_key, 0.0)
            cat_score = min(100.0, round((peak / max(meta["weight"] * 2.2, 1)) * 100, 1)) if peak else 0.0
            category_breakdown.append(
                {
                    "category_key": cat_key,
                    "category_label": meta["label"],
                    "weight": meta["weight"],
                    "flags": category_hits.get(cat_key, 0),
                    "risk_score": cat_score,
                    "severity": _classify_severity(cat_score),
                }
            )

        return {
            "overall_score": overall_score,
            "overall_severity": overall_severity,
            "total_clauses": len(analyzed_clauses),
            "flagged_clauses_count": len(risky_clauses),
            "top_gotchas": risky_clauses[:3],
            "category_breakdown": category_breakdown,
            "clauses": analyzed_clauses,
        }

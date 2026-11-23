"""
LexiGuard AI — Command-Line Interface (CLI)
Usage:
    python main.py samples/freelance_agreement_high_risk.txt
    python main.py samples/freelance_agreement_high_risk.txt --format html --output report.html
"""

import argparse
import os
from core import (
    load_document,
    PIIShield,
    segment_clauses,
    RiskAnalyzer,
    ExplainabilityEngine,
    LLMAdvisor,
    ReportGenerator,
)


def run_pipeline(file_path: str, redact_pii: bool = True):
    doc = load_document(file_path)
    text_to_analyze = doc["text"]
    pii_counts = {}

    if redact_pii:
        shield = PIIShield()
        text_to_analyze, pii_counts = shield.sanitize(text_to_analyze)

    clauses = segment_clauses(text_to_analyze)
    analyzer = RiskAnalyzer()
    analysis = analyzer.analyze_document(clauses)

    explainer = ExplainabilityEngine()
    explainability = explainer.generate_attributions(analysis)

    advisor = LLMAdvisor()
    brief = advisor.generate_negotiation_brief(analysis, explainability)

    return {
        "document": {k: v for k, v in doc.items() if k != "text"},
        "pii_redactions": pii_counts,
        "analysis": analysis,
        "explainability": explainability,
        "negotiation_brief": brief,
    }


def main():
    parser = argparse.ArgumentParser(
        description="LexiGuard AI — Hybrid Legal Contract Risk Analyzer"
    )
    parser.add_argument("file", help="Path to contract file (.txt, .pdf, or .docx)")
    parser.add_argument(
        "--format",
        choices=["md", "json", "html"],
        default="md",
        help="Output report format (default: md)",
    )
    parser.add_argument("--output", "-o", help="Optional output file path")
    parser.add_argument(
        "--no-pii-redact",
        action="store_true",
        help="Disable client-side PII redaction",
    )
    args = parser.parse_args()

    result = run_pipeline(args.file, redact_pii=not args.no_pii_redact)
    reporter = ReportGenerator()

    if args.format == "json":
        rendered = reporter.to_json(result)
    elif args.format == "html":
        rendered = reporter.to_html(result)
    else:
        rendered = reporter.to_markdown(result)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(rendered)
        print(f"[LexiGuard AI] Report saved to {os.path.abspath(args.output)}")
    else:
        print(rendered)


if __name__ == "__main__":
    main()

"""
Layer 7: Report & Executive Dossier Generator
Exports analysis results as JSON, Markdown, or a clean standalone HTML report.
"""

import json
import html
from datetime import datetime
from typing import Dict, Any


class ReportGenerator:
    def to_json(self, payload: Dict[str, Any]) -> str:
        return json.dumps(payload, indent=2, ensure_ascii=False)

    def to_markdown(self, payload: Dict[str, Any]) -> str:
        doc = payload["document"]
        analysis = payload["analysis"]
        explain = payload["explainability"]
        brief = payload["negotiation_brief"]
        pii = payload.get("pii_redactions", {})

        lines = [
            f"# LexiGuard AI — Contract Risk Dossier",
            f"**Document:** `{doc['filename']}` | **Words:** {doc['word_count']} | **Language:** `{doc['language']}`",
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            f"## Overall Risk Score: {analysis['overall_score']}/100 ({analysis['overall_severity']})",
            f"- **Clauses Analyzed:** {analysis['total_clauses']}",
            f"- **Flagged Clauses:** {analysis['flagged_clauses_count']}",
            f"- **PII Redactions Applied:** {sum(pii.values()) if pii else 0}",
            "",
            "## Executive Negotiation Brief",
            brief,
            "",
            "## Explainability (SHAP-Style Risk Attribution)",
            "| Risk Category | Attribution (%) |",
            "|---|---|",
        ]
        for attr in explain.get("category_attributions", []):
            lines.append(f"| {attr['category']} | {attr['attribution_pct']}% |")

        lines.extend(["", "## Flagged Clauses & Counter-Proposals"])
        for clause in analysis["clauses"]:
            if not clause["findings"]:
                continue
            lines.append(f"### {clause['clause_id']}: {clause['title']} — `{clause['severity']}` ({clause['risk_score']}/100)")
            lines.append(f"> {clause['text'][:400]}{'...' if len(clause['text']) > 400 else ''}")
            for f in clause["findings"]:
                lines.append(f"- **Issue:** {f['category_label']}")
                lines.append(f"  - *Plain English:* {f['plain_english']}")
                lines.append(f"  - *Suggested Counter-Clause:* {f['counter_clause']}")
            lines.append("")

        return "\n".join(lines)

    def to_html(self, payload: Dict[str, Any]) -> str:
        doc = payload["document"]
        analysis = payload["analysis"]
        explain = payload["explainability"]
        brief = html.escape(payload["negotiation_brief"]).replace("\n", "<br>")

        sev_colors = {
            "CRITICAL": "#dc2626",
            "HIGH": "#ea580c",
            "MEDIUM": "#d97706",
            "LOW": "#16a34a",
        }
        badge_color = sev_colors.get(analysis["overall_severity"], "#334155")

        clause_cards = []
        for clause in analysis["clauses"]:
            if not clause["findings"]:
                continue
            c_color = sev_colors.get(clause["severity"], "#334155")
            findings_html = "".join(
                f"<li><strong>{html.escape(f['category_label'])}</strong><br>"
                f"<em>Plain English:</em> {html.escape(f['plain_english'])}<br>"
                f"<em>Counter-Clause:</em> {html.escape(f['counter_clause'])}</li>"
                for f in clause["findings"]
            )
            clause_cards.append(
                f"<div class='card'>"
                f"<h3>{html.escape(clause['clause_id'])}: {html.escape(clause['title'])} "
                f"<span class='badge' style='background:{c_color}'>{clause['severity']} ({clause['risk_score']}/100)</span></h3>"
                f"<blockquote>{html.escape(clause['text'][:500])}</blockquote>"
                f"<ul>{findings_html}</ul></div>"
            )

        attr_rows = "".join(
            f"<tr><td>{html.escape(a['category'])}</td><td>{a['attribution_pct']}%</td></tr>"
            for a in explain.get("category_attributions", [])
        )

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>LexiGuard AI Report - {html.escape(doc['filename'])}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px auto; max-width: 920px; color: #1e293b; line-height: 1.6; padding: 0 20px; }}
  h1, h2, h3 {{ color: #0f172a; }}
  .hero {{ background: #f8fafc; border-left: 6px solid {badge_color}; padding: 20px; border-radius: 8px; margin-bottom: 24px; }}
  .badge {{ color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 0.8em; font-weight: 600; }}
  .card {{ border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #fff; }}
  blockquote {{ background: #f1f5f9; border-left: 3px solid #94a3b8; margin: 10px 0; padding: 10px 14px; font-size: 0.92em; }}
  table {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
  th, td {{ border: 1px solid #e2e8f0; padding: 10px; text-align: left; }}
  th {{ background: #0f172a; color: #fff; }}
</style>
</head>
<body>
  <h1>LexiGuard AI — Legal Risk Dossier</h1>
  <div class="hero">
    <h2>Overall Risk Score: {analysis['overall_score']}/100 <span class="badge" style="background:{badge_color}">{analysis['overall_severity']}</span></h2>
    <p><strong>File:</strong> {html.escape(doc['filename'])} | <strong>Words:</strong> {doc['word_count']} | <strong>Flagged Clauses:</strong> {analysis['flagged_clauses_count']} / {analysis['total_clauses']}</p>
  </div>
  <h2>Executive Negotiation Brief</h2>
  <div class="card">{brief}</div>
  <h2>Risk Attribution Breakdown</h2>
  <table><tr><th>Category</th><th>Contribution (%)</th></tr>{attr_rows}</table>
  <h2>Flagged Clauses</h2>
  {"".join(clause_cards) or "<p>No high-risk clauses detected.</p>"}
</body>
</html>"""

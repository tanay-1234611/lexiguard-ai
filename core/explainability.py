"""
Layer 5: SHAP-Inspired Feature Attribution & Explainability Engine
Computes transparent percentage attributions showing exactly which keywords
and clause categories drove the contract's risk score.
"""

from typing import Dict, Any, List


class ExplainabilityEngine:
    def generate_attributions(self, analysis_result: Dict[str, Any]) -> Dict[str, Any]:
        """Compute SHAP-style normalized feature attributions for the document."""
        feature_impacts: Dict[str, float] = {}
        category_impacts: Dict[str, float] = {}

        for clause in analysis_result.get("clauses", []):
            for finding in clause.get("findings", []):
                cat_label = finding["category_label"]
                contrib = finding["contribution"]
                category_impacts[cat_label] = category_impacts.get(cat_label, 0.0) + contrib

                kws = finding["matched_keywords"]
                if kws:
                    per_kw = contrib / len(kws)
                    for kw in kws:
                        feature_impacts[kw] = feature_impacts.get(kw, 0.0) + per_kw
                else:
                    label = f"[regex:{finding['category_key']}]"
                    feature_impacts[label] = feature_impacts.get(label, 0.0) + contrib

        total_cat = sum(category_impacts.values()) or 1.0
        total_feat = sum(feature_impacts.values()) or 1.0

        category_attributions: List[Dict[str, Any]] = [
            {
                "category": k,
                "raw_impact": round(v, 2),
                "attribution_pct": round((v / total_cat) * 100, 1),
            }
            for k, v in sorted(category_impacts.items(), key=lambda x: x[1], reverse=True)
        ]

        top_triggers: List[Dict[str, Any]] = [
            {
                "trigger_phrase": k,
                "raw_impact": round(v, 2),
                "attribution_pct": round((v / total_feat) * 100, 1),
            }
            for k, v in sorted(feature_impacts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]

        return {
            "category_attributions": category_attributions,
            "top_risk_triggers": top_triggers,
            "explanation_summary": (
                f"Risk score of {analysis_result['overall_score']}/100 "
                f"({analysis_result['overall_severity']}) is driven primarily by "
                + (
                    ", ".join(
                        f"{c['category']} ({c['attribution_pct']}%)"
                        for c in category_attributions[:3]
                    )
                    if category_attributions
                    else "no significant risk triggers detected"
                )
                + "."
            ),
        }

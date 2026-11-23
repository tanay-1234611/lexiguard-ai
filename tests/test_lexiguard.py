import os
import unittest
from core import PIIShield, segment_clauses, RiskAnalyzer, ExplainabilityEngine
from main import run_pipeline


class TestLexiGuardAI(unittest.TestCase):
    def test_pii_shield_redacts_sensitive_info(self):
        shield = PIIShield()
        sample = "Contact john.doe@example.com or 555-123-4567, SSN 123-45-6789."
        cleaned, counts = shield.sanitize(sample)
        self.assertIn("[REDACTED_EMAIL]", cleaned)
        self.assertIn("[REDACTED_PHONE]", cleaned)
        self.assertIn("[REDACTED_SSN]", cleaned)
        self.assertEqual(counts["EMAIL"], 1)

    def test_high_risk_contract_scores_higher_than_low_risk(self):
        high_res = run_pipeline("samples/freelance_agreement_high_risk.txt")
        low_res = run_pipeline("samples/mutual_nda_low_risk.txt")

        self.assertGreater(high_res["analysis"]["overall_score"], 70)
        self.assertEqual(high_res["analysis"]["overall_severity"], "CRITICAL")
        self.assertLess(low_res["analysis"]["overall_score"], 35)

    def test_explainability_attributions_sum_to_100(self):
        res = run_pipeline("samples/freelance_agreement_high_risk.txt")
        attrs = res["explainability"]["category_attributions"]
        self.assertTrue(len(attrs) > 0)
        total_pct = sum(a["attribution_pct"] for a in attrs)
        self.assertAlmostEqual(total_pct, 100.0, delta=1.5)


if __name__ == "__main__":
    unittest.main()

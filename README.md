# LexiGuard AI — Hybrid Legal Contract Risk Analyzer (Python)

LexiGuard AI is a modular, self-contained Python system for automated legal contract review, clause-level risk scoring, SHAP-inspired explainability, and client-side PII redaction.

## Project Structure

```text
lexiguard_ai/
├── main.py                     # CLI entry point (Markdown, JSON, HTML reports)
├── app.py                      # Interactive Streamlit web dashboard
├── api.py                      # FastAPI REST API backend
├── requirements.txt            # Python dependencies
├── .env.example                # Optional Gemini API key config
├── config/
│   └── risk_rules.py           # 10-category legal risk taxonomy & counter-clauses
├── core/
│   ├── document_loader.py      # PDF, DOCX, TXT ingestion & language detection
│   ├── pii_shield.py           # Zero-trust PII redaction (email, phone, SSN, PAN)
│   ├── clause_segmenter.py     # Legal clause & section splitter
│   ├── risk_analyzer.py        # Weighted 0-100 hybrid risk scoring engine
│   ├── explainability.py       # SHAP-inspired feature attribution engine
│   ├── llm_advisor.py          # Optional Gemini co-pilot + local deterministic fallback
│   └── report_generator.py     # Markdown, JSON, and HTML dossier exporter
├── samples/
│   ├── freelance_agreement_high_risk.txt
│   └── mutual_nda_low_risk.txt
└── tests/
    └── test_lexiguard.py       # Unit test suite
```

## Quick Start

1. **Install dependencies:**
   ```bash
   cd lexiguard_ai
   pip install -r requirements.txt
   ```

2. **Run via CLI (works 100% locally without any API key):**
   ```bash
   python main.py samples/freelance_agreement_high_risk.txt
   python main.py samples/freelance_agreement_high_risk.txt --format html -o report.html
   ```

3. **Launch the Streamlit Web Dashboard:**
   ```bash
   streamlit run app.py
   ```

4. **Run the FastAPI Backend:**
   ```bash
   uvicorn api:app --reload
   ```

5. **Run Unit Tests:**
   ```bash
   python -m unittest discover tests
   ```

> **Disclaimer:** LexiGuard AI provides automated legal information and risk triage, not formal legal advice.

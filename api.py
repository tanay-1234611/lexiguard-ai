"""
LexiGuard AI — FastAPI REST Backend
Run with: uvicorn api:app --reload
"""

import os
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from core import PIIShield, segment_clauses, RiskAnalyzer, ExplainabilityEngine, LLMAdvisor
from main import run_pipeline

app = FastAPI(title="LexiGuard AI API", version="1.0.0")


class TextAnalysisRequest(BaseModel):
    text: str
    redact_pii: bool = True


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "LexiGuard AI"}


@app.post("/analyze/text")
def analyze_text(req: TextAnalysisRequest):
    text = req.text
    pii_counts = {}
    if req.redact_pii:
        text, pii_counts = PIIShield().sanitize(text)

    clauses = segment_clauses(text)
    analysis = RiskAnalyzer().analyze_document(clauses)
    explainability = ExplainabilityEngine().generate_attributions(analysis)
    brief = LLMAdvisor().generate_negotiation_brief(analysis, explainability)

    return {
        "pii_redactions": pii_counts,
        "analysis": analysis,
        "explainability": explainability,
        "negotiation_brief": brief,
    }


@app.post("/analyze/file")
async def analyze_file(file: UploadFile = File(...), redact_pii: bool = True):
    suffix = os.path.splitext(file.filename or "")[1].lower()
    if suffix not in (".txt", ".pdf", ".docx"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use .txt, .pdf, or .docx")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        return run_pipeline(tmp_path, redact_pii=redact_pii)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

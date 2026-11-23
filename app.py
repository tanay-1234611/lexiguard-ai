"""
LexiGuard AI — Interactive Streamlit Web Dashboard
Run with: streamlit run app.py
"""

import tempfile
import os
import streamlit as st
from main import run_pipeline
from core import ReportGenerator

st.set_page_config(page_title="LexiGuard AI", page_icon="⚖️", layout="wide")

st.title("⚖️ LexiGuard AI — Contract Risk Intelligence")
st.caption(
    "Hybrid NLP + SHAP-Inspired Explainability | Client-Side PII Shield | Informational Only (Not Legal Advice)"
)

with st.sidebar:
    st.header("Settings")
    redact_pii = st.checkbox("Enable PII Privacy Shield", value=True)
    sample_choice = st.selectbox(
        "Or load a built-in sample:",
        ["None", "samples/freelance_agreement_high_risk.txt", "samples/mutual_nda_low_risk.txt"],
    )

uploaded = st.file_uploader("Upload a contract (.txt, .pdf, .docx)", type=["txt", "pdf", "docx"])

target_path = None
cleanup_temp = False

if uploaded is not None:
    suffix = os.path.splitext(uploaded.name)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(uploaded.read())
        target_path = tmp.name
        cleanup_temp = True
elif sample_choice != "None" and os.path.exists(sample_choice):
    target_path = sample_choice

if target_path and st.button("Run LexiGuard Analysis", type="primary"):
    with st.spinner("Analyzing contract clauses..."):
        payload = run_pipeline(target_path, redact_pii=redact_pii)

    if cleanup_temp and os.path.exists(target_path):
        os.remove(target_path)

    analysis = payload["analysis"]
    explain = payload["explainability"]

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Overall Risk Score", f"{analysis['overall_score']}/100")
    col2.metric("Severity Level", analysis["overall_severity"])
    col3.metric("Flagged Clauses", f"{analysis['flagged_clauses_count']} / {analysis['total_clauses']}")
    col4.metric("PII Redacted", sum(payload["pii_redactions"].values()))

    st.subheader("Executive Negotiation Brief")
    st.info(payload["negotiation_brief"])

    st.subheader("Risk Attribution Breakdown")
    if explain["category_attributions"]:
        st.table(explain["category_attributions"])

    st.subheader("Flagged Clauses & Counter-Proposals")
    for clause in analysis["clauses"]:
        if not clause["findings"]:
            continue
        with st.expander(f"{clause['clause_id']}: {clause['title']} — {clause['severity']} ({clause['risk_score']}/100)"):
            st.write(clause["text"])
            for f in clause["findings"]:
                st.markdown(f"**{f['category_label']}**")
                st.markdown(f"- *Plain English:* {f['plain_english']}")
                st.markdown(f"- *Counter-Clause:* {f['counter_clause']}")

    reporter = ReportGenerator()
    st.download_button(
        "Download HTML Dossier",
        data=reporter.to_html(payload),
        file_name="lexiguard_report.html",
        mime="text/html",
    )

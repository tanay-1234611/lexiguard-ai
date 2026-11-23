"""
LexiGuard AI - Statutory & Contractual Risk Taxonomy
Defines 10 clause categories with empirically grounded risk weights,
detection keywords/patterns, plain-English explanations, and fair counter-clauses.
"""

SEVERITY_THRESHOLDS = {
    "CRITICAL": 75,
    "HIGH": 55,
    "MEDIUM": 30,
    "LOW": 0,
}

CLAUSE_CATEGORIES = {
    "unlimited_liability": {
        "label": "Unlimited Liability & Indemnification",
        "weight": 18,
        "keywords": [
            "unlimited liability",
            "indemnify and hold harmless",
            "unconditional indemnification",
            "defend, indemnify",
            "all claims, damages, losses",
            "without limitation",
            "sole responsibility for any",
            "consequential damages",
        ],
        "patterns": [
            r"indemnif\w+.*hold\s+harmless",
            r"liabilit\w+.*(?:unlimited|without\s+cap|no\s+limit)",
            r"liable\s+for\s+all\s+(?:direct|indirect|consequential)",
        ],
        "plain_english": (
            "You may be forced to pay unlimited legal fees, damages, or third-party lawsuits "
            "even if the issue exceeds what you were paid under the contract."
        ),
        "counter_clause": (
            "Cap total aggregate liability to the fees actually paid under this Agreement in "
            "the preceding 12 months, and make indemnification mutual and limited to gross negligence."
        ),
    },
    "ip_ownership_grab": {
        "label": "Intellectual Property & Moral Rights Grab",
        "weight": 15,
        "keywords": [
            "work made for hire",
            "perpetual, irrevocable",
            "worldwide license",
            "all intellectual property",
            "waives all moral rights",
            "prior inventions",
            "outside of working hours",
            "assigns all right, title, and interest",
        ],
        "patterns": [
            r"assign\w*\s+all\s+right[s]?,\s*title",
            r"waiv\w*\s+.*moral\s+rights",
            r"background\s+ip|prior\s+inventions",
        ],
        "plain_english": (
            "The other party may claim ownership over your pre-existing tools, side projects, "
            "or intellectual property beyond the specific deliverables you are paid to create."
        ),
        "counter_clause": (
            "Limit IP assignment strictly to final paid Deliverables. Explicitly exclude "
            "pre-existing Background IP and personal projects created outside the scope of work."
        ),
    },
    "unilateral_termination": {
        "label": "Unilateral Termination & Exit Traps",
        "weight": 12,
        "keywords": [
            "terminate at any time",
            "without cause",
            "without notice",
            "sole discretion",
            "immediate termination",
            "forfeit all unpaid",
            "termination for convenience",
        ],
        "patterns": [
            r"terminat\w+\s+.*(?:without\s+cause|sole\s+discretion|without\s+notice)",
            r"forfeit\w*\s+.*(?:payment|fees|compensation)",
        ],
        "plain_english": (
            "The other party can cancel the agreement abruptly without a valid reason, "
            "potentially leaving you unpaid for work already completed."
        ),
        "counter_clause": (
            "Require at least 14–30 days written notice for termination without cause, and "
            "guarantee full payment for all work completed and expenses incurred up to the termination date."
        ),
    },
    "non_compete_exclusivity": {
        "label": "Non-Compete & Restrictive Covenants",
        "weight": 12,
        "keywords": [
            "non-compete",
            "non-competition",
            "shall not compete",
            "non-solicitation",
            "exclusivity",
            "similar business",
            "directly or indirectly engage",
            "restraint of trade",
        ],
        "patterns": [
            r"non[-\s]?compet\w+",
            r"shall\s+not\s+(?:directly\s+or\s+indirectly\s+)?(?:compete|solicit|work\s+for)",
        ],
        "plain_english": (
            "This clause restricts who you can work for or which clients you can serve "
            "during or even after the contract ends, limiting your future income."
        ),
        "counter_clause": (
            "Remove the non-compete clause or narrow it strictly to direct competitors using "
            "confidential information, limited to a short duration (e.g., 6 months) and specific scope."
        ),
    },
    "auto_renewal_lockin": {
        "label": "Auto-Renewal & Lock-In",
        "weight": 9,
        "keywords": [
            "automatically renew",
            "auto-renew",
            "successive periods",
            "unless written notice",
            "non-cancellable",
            "minimum commitment",
            "early termination fee",
        ],
        "patterns": [
            r"auto(?:matic(?:ally)?)?[-\s]?renew",
            r"renew\w*\s+for\s+successive\s+(?:terms|periods|years)",
        ],
        "plain_english": (
            "The contract silently renews for another full term unless you cancel within a "
            "strict advance notice window, potentially locking you into extra fees."
        ),
        "counter_clause": (
            "Replace automatic renewal with mutual written renewal, or require a 30-day "
            "advance reminder notice before any renewal takes effect."
        ),
    },
    "payment_delays_penalties": {
        "label": "Payment Delays & Unfair Penalties",
        "weight": 9,
        "keywords": [
            "net 90",
            "net 120",
            "pay when paid",
            "sole satisfaction",
            "liquidated damages",
            "withhold payment",
            "no refund",
            "late fee",
        ],
        "patterns": [
            r"net\s+(?:60|90|120)\s+days",
            r"withhold\s+.*payment",
            r"sole\s+(?:and\s+absolute\s+)?satisfaction",
        ],
        "plain_english": (
            "Payment terms are heavily delayed or tied to subjective approval, giving the "
            "payer wide latitude to withhold or delay your compensation."
        ),
        "counter_clause": (
            "Set clear Net-15 or Net-30 payment terms with objective acceptance criteria "
            "(e.g., deemed accepted after 7 business days) and a 1.5%/month late payment interest."
        ),
    },
    "dispute_jurisdiction": {
        "label": "Dispute Resolution & Unfavorable Jurisdiction",
        "weight": 8,
        "keywords": [
            "binding arbitration",
            "waive jury trial",
            "class action waiver",
            "exclusive jurisdiction",
            "governing law",
            "prevailing party",
            "attorneys' fees",
        ],
        "patterns": [
            r"binding\s+arbitration",
            r"waiv\w+\s+.*(?:jury\s+trial|class\s+action)",
            r"exclusive\s+jurisdiction\s+of\s+the\s+courts",
        ],
        "plain_english": (
            "If a dispute occurs, you may be forced into expensive out-of-state courts or "
            "private arbitration and lose the right to a regular court trial."
        ),
        "counter_clause": (
            "Select a neutral or mutually convenient jurisdiction, and allow small-claims "
            "court or virtual mediation before formal arbitration."
        ),
    },
    "confidentiality_overreach": {
        "label": "One-Sided Confidentiality & NDA Overreach",
        "weight": 6,
        "keywords": [
            "perpetual confidentiality",
            "all information disclosed",
            "strictly confidential",
            "non-disclosure",
            "in perpetuity",
            "trade secrets",
        ],
        "patterns": [
            r"confidential\w*.*(?:in\s+perpetuity|forever|indefinitely)",
            r"non[-\s]?disclosure",
        ],
        "plain_english": (
            "Confidentiality duties may be one-sided or last forever, even for information "
            "that becomes publicly available or is already known to you."
        ),
        "counter_clause": (
            "Make confidentiality mutual, cap its duration to 2–3 years (except trade secrets), "
            "and include standard carve-outs for public or independently developed information."
        ),
    },
    "data_privacy_security": {
        "label": "Data Privacy & Retention Risks",
        "weight": 6,
        "keywords": [
            "personal data",
            "third parties",
            "data breach",
            "retain data",
            "sell or share",
            "subprocessors",
            "gdpr",
            "hipaa",
        ],
        "patterns": [
            r"share\s+.*data\s+with\s+third\s+parties",
            r"data\s+breach|security\s+incident",
        ],
        "plain_english": (
            "Your sensitive data or your customers' data may be retained indefinitely, "
            "shared with third parties, or expose you to strict breach liability."
        ),
        "counter_clause": (
            "Require data deletion within 30 days of contract termination, prohibit selling "
            "client data, and mandate prompt breach notification (within 72 hours)."
        ),
    },
    "unilateral_amendment": {
        "label": "Unilateral Modification Rights",
        "weight": 5,
        "keywords": [
            "modify this agreement at any time",
            "reserves the right to change",
            "without prior notice",
            "continued use constitutes acceptance",
            "unilaterally amend",
        ],
        "patterns": [
            r"reserv\w+\s+the\s+right\s+to\s+(?:modify|change|amend)",
            r"continued\s+use\s+constitutes\s+acceptance",
        ],
        "plain_english": (
            "The other party can rewrite the contract terms later without your explicit "
            "written consent."
        ),
        "counter_clause": (
            "Require that any amendment or modification to this Agreement must be in writing "
            "and signed by authorized representatives of both parties."
        ),
    },
}

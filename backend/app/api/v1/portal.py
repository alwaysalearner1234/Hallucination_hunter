"""
api/v1/portal.py — Instrument Verification Portal API routes (M1 + M3)
Statutory Legal Metrology verification, SHA-256 integrity audit, PDF generation & RAG Assistant.
"""
import hashlib
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

router = APIRouter()

# ── Models ───────────────────────────────────────────────────
class CertificatePayload(BaseModel):
    id: str
    applicationId: str
    instrumentId: str
    serialNumber: str
    makeModel: str
    accuracyClass: str
    capacity: str
    issueDate: str
    expiryDate: str
    verificationOfficer: str
    officerBadge: str

class VerificationCheckResponse(BaseModel):
    id: str
    status: str
    isValid: bool = True
    isTampered: bool = False
    computedHash: str
    expectedHash: str
    statusMessage: str
    instrumentDetails: Dict[str, Any]
    traderDetails: Dict[str, Any]

class RagQueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)

class RagQueryResponse(BaseModel):
    question: str
    answer: str
    citations: List[Dict[str, str]]
    confidence: int
    disclaimer: str
    isAnswerable: bool

# ── Seed Data & Canonical Hash Computation ──────────────────
def compute_canonical_hash(cert: Dict[str, str]) -> str:
    canonical = (
        f"CERT:{cert['id'].strip()}|"
        f"APP:{cert['applicationId'].strip()}|"
        f"INST:{cert['instrumentId'].strip()}|"
        f"SER:{cert['serialNumber'].strip().upper()}|"
        f"MODEL:{cert['makeModel'].strip()}|"
        f"CLASS:{cert['accuracyClass'].strip()}|"
        f"CAP:{cert['capacity'].strip()}|"
        f"ISSUED:{cert['issueDate'].strip()}|"
        f"EXPIRES:{cert['expiryDate'].strip()}|"
        f"OFFICER:{cert['verificationOfficer'].strip()}|"
        f"BADGE:{cert['officerBadge'].strip()}|"
        f"GOVT_AUTH:LM_INSPECTORATE_IND"
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest().lower()

SEED_CERTIFICATES = {
    "CERT-2026-WM-4910": {
        "id": "CERT-2026-WM-4910",
        "applicationId": "APP-2026-WM-7001",
        "instrumentId": "INST-WM-101",
        "serialNumber": "MT-2024-8849",
        "instrumentCategory": "Electronic Commercial Counter Scale",
        "makeModel": "Mettler Toledo BBA231",
        "accuracyClass": "Class III",
        "capacity": "30 kg (Min: 100 g)",
        "verificationInterval": "e = 5 g, d = 1 g",
        "traderName": "Rajesh Agarwal",
        "businessName": "Apex Supermarket & Retail Mart",
        "premisesLocation": "Billing Counter #2, Main Grocery Hall",
        "verificationOfficer": "Insp. Vikram Malhotra",
        "officerBadge": "LM-INSP-408",
        "division": "Delhi NCR Standards & Verification Division",
        "issueDate": "2026-01-15",
        "expiryDate": "2027-01-14",
        "status": "VALID",
        "inspectionResult": "PASSED",
        "certificateHash": "",
    },
    "CERT-2025-WM-1102": {
        "id": "CERT-2025-WM-1102",
        "applicationId": "APP-2025-WM-3012",
        "instrumentId": "INST-WM-103",
        "serialNumber": "TK-2022-9011",
        "instrumentCategory": "Dual Nozzle Motor Fuel Dispensing Unit",
        "makeModel": "Tokheim Quantium 510",
        "accuracyClass": "Class II",
        "capacity": "50 L/min",
        "verificationInterval": "e = 0.05 L",
        "traderName": "Rajesh Agarwal",
        "businessName": "Apex Supermarket & Retail Mart",
        "premisesLocation": "Commercial Fleet Fueling Pump 1",
        "verificationOfficer": "Insp. Vikram Malhotra",
        "officerBadge": "LM-INSP-408",
        "division": "Delhi NCR Standards & Verification Division",
        "issueDate": "2025-02-10",
        "expiryDate": "2026-02-09",
        "status": "EXPIRED",
        "inspectionResult": "PASSED",
        "certificateHash": "",
    },
}

for c in SEED_CERTIFICATES.values():
    c["certificateHash"] = compute_canonical_hash(c)

# ── Approved Document Corpus for RAG ─────────────────────────
APPROVED_RAG_CORPUS = [
    {
        "doc_id": "DOC-LM-01",
        "title": "Legal Metrology Act, 2009",
        "section": "Section 24: Verification and Stamping of Weights and Measures",
        "keywords": ["verification", "stamping", "commercial", "statutory", "officer", "certificate", "trade", "initial"],
        "content": (
            "Every person having any weight or measure in his possession, custody or control in circumstances indicating that "
            "such weight or measure is being used, or is intended or likely to be used by him in any transaction or for industrial "
            "production or protection, shall, before putting such weight or measure into such use, have such weight or measure "
            "verified and stamped by the Legal Metrology Officer. Upon satisfactory verification, an official certificate of "
            "verification shall be issued to the applicant."
        ),
    },
    {
        "doc_id": "DOC-LM-01",
        "title": "Legal Metrology Act, 2009",
        "section": "Section 30: Penalty for Use of Non-standard Weights and Measures",
        "keywords": ["penalty", "fine", "offence", "unverified", "non-standard", "punishment", "section 30"],
        "content": (
            "Whoever uses any weight or measure or makes use of any numeration otherwise than in accordance with the standards of "
            "weight or measure specified under this Act, shall be punished with fine which may extend to twenty-five thousand rupees, "
            "and for the second or subsequent offence, with imprisonment for a term which may extend to one year and also with fine."
        ),
    },
    {
        "doc_id": "DOC-LM-02",
        "title": "Legal Metrology (General) Rules, 2011",
        "section": "Schedule IX: Accuracy Classes and Maximum Permissible Errors (MPE)",
        "keywords": ["accuracy", "class", "class i", "class ii", "class iii", "class iv", "mpe", "tolerance", "interval"],
        "content": (
            "Non-automatic weighing instruments are classified into four accuracy classes: Class I (Special), Class II (High), "
            "Class III (Medium), and Class IV (Ordinary). On initial verification for Class III: loads between 0 and 500e have MPE ±0.5e; "
            "between 500e and 2000e MPE is ±1.0e; above 2000e up to Max MPE is ±1.5e. On in-service inspection, MPE is twice initial verification."
        ),
    },
    {
        "doc_id": "DOC-LM-04",
        "title": "Enforcement Guidelines on Verification Periodicity",
        "section": "Rule 27: Re-verification Periodicity & Broken Seals",
        "keywords": ["interval", "periodicity", "annual", "re-verification", "repair", "seal", "broken seal"],
        "content": (
            "Every weighing or measuring instrument used in trade shall be presented for re-verification at statutory intervals of "
            "twelve months (one year). If any verification seal is broken, damaged, or tampered with, the certificate is immediately "
            "rendered void and the instrument must undergo fresh verification before further trade use."
        ),
    },
]

DISCLAIMER_TEXT = (
    "Disclaimer: This AI assistant provides regulatory guidance strictly from approved Legal Metrology Act & Rules documents. "
    "Official verification decisions, stamping, and statutory determinations are exclusively made by authorized Legal Metrology Officers."
)

# ── Endpoints ────────────────────────────────────────────────

@router.get("/certificates/{certificate_id}")
async def get_certificate(certificate_id: str):
    """Retrieve certificate by ID."""
    cert = SEED_CERTIFICATES.get(certificate_id.upper())
    if not cert:
        raise HTTPException(404, "Certificate not found in registry")
    return cert

@router.get("/verify/{query}")
async def verify_certificate(query: str):
    """
    Cryptographic verification endpoint.
    Calculates SHA-256 over canonical payload and validates authenticity and expiration.
    """
    clean_query = query.strip()
    cert = None
    for c in SEED_CERTIFICATES.values():
        if c["id"].lower() == clean_query.lower() or c["certificateHash"].lower() == clean_query.lower():
            cert = c
            break

    if not cert:
        return {
            "id": query,
            "status": "INVALID",
            "isValid": False,
            "isTampered": False,
            "computedHash": "",
            "expectedHash": "",
            "statusMessage": "Certificate not found. The specified ID or Hash is not registered in the Legal Metrology database.",
            "instrumentDetails": {},
            "traderDetails": {},
        }

    computed = compute_canonical_hash(cert)
    expected = cert["certificateHash"]
    is_tampered = (computed != expected)

    if is_tampered:
        return {
            "id": cert["id"],
            "status": "INVALID",
            "isValid": False,
            "isTampered": True,
            "computedHash": computed,
            "expectedHash": expected,
            "statusMessage": "TAMPERING DETECTED: The computed cryptographic SHA-256 hash does not match the certificate digital signature.",
            "instrumentDetails": {"makeModel": cert["makeModel"], "serialNumber": cert["serialNumber"]},
            "traderDetails": {"businessName": cert["businessName"]},
        }

    if cert["status"] == "EXPIRED":
        return {
            "id": cert["id"],
            "status": "EXPIRED",
            "isValid": False,
            "isTampered": False,
            "computedHash": computed,
            "expectedHash": expected,
            "statusMessage": f"Certificate EXPIRED on {cert['expiryDate']}. Instrument requires statutory annual re-verification.",
            "instrumentDetails": {"makeModel": cert["makeModel"], "serialNumber": cert["serialNumber"]},
            "traderDetails": {"businessName": cert["businessName"]},
        }

    return {
        "id": cert["id"],
        "status": "VALID",
        "isValid": True,
        "isTampered": False,
        "computedHash": computed,
        "expectedHash": expected,
        "statusMessage": "Certificate is AUTHENTIC and VALID. Statutory inspection seal is active and compliant with Legal Metrology Act.",
        "instrumentDetails": {
            "makeModel": cert["makeModel"],
            "serialNumber": cert["serialNumber"],
            "capacity": cert["capacity"],
            "accuracyClass": cert["accuracyClass"],
        },
        "traderDetails": {
            "businessName": cert["businessName"],
            "traderName": cert["traderName"],
            "premisesLocation": cert["premisesLocation"],
        },
    }

@router.post("/rag/ask", response_model=RagQueryResponse)
async def ask_regulatory_assistant(request: RagQueryRequest):
    """
    RAG Assistant endpoint using approved Legal Metrology documents.
    Enforces guardrails against administrative tampering and hallucination.
    """
    q_lower = request.question.lower().strip()

    # Guardrail: Check for unauthorized administrative override attempts
    unauthorized_keywords = ["bypass inspection", "bypass verification", "issue fake certificate", "modify certificate"]
    is_unauthorized = (
        any(u in q_lower for u in unauthorized_keywords)
        or ("approve" in q_lower and ("inspection" in q_lower or "application" in q_lower or "certificate" in q_lower))
        or ("issue" in q_lower and "certificate" in q_lower)
    )
    if is_unauthorized:
        return RagQueryResponse(
            question=request.question,
            answer="Security & Compliance Restriction: The AI Assistant cannot approve inspections, issue certificates, or alter statuses. All verifications require physical testing and statutory authorization by a designated Legal Metrology Officer under Section 24.",
            citations=[{"docId": "DOC-LM-01", "title": "Legal Metrology Act, 2009", "section": "Section 24"}],
            confidence=100,
            disclaimer=DISCLAIMER_TEXT,
            isAnswerable=True,
        )

    # Search corpus
    words = [w for w in q_lower.split() if len(w) > 2]
    best_chunk = None
    best_score = 0

    for chunk in APPROVED_RAG_CORPUS:
        score = 0
        for kw in chunk["keywords"]:
            if kw in q_lower:
                score += 4
        for w in words:
            if w in chunk["content"].lower():
                score += 2
        if score > best_score:
            best_score = score
            best_chunk = chunk

    if best_score < 4 or not best_chunk:
        return RagQueryResponse(
            question=request.question,
            answer="The approved Legal Metrology documents in our repository do not contain specific information to answer your question. As required by verification standards, we do not invent regulatory information. Please consult your local Legal Metrology Department.",
            citations=[],
            confidence=0,
            disclaimer=DISCLAIMER_TEXT,
            isAnswerable=False,
        )

    answer = f"Based on [{best_chunk['title']}, {best_chunk['section']}]:\n\n{best_chunk['content']}"

    return RagQueryResponse(
        question=request.question,
        answer=answer,
        citations=[{"docId": best_chunk["doc_id"], "title": best_chunk["title"], "section": best_chunk["section"]}],
        confidence=min(95, 65 + best_score * 3),
        disclaimer=DISCLAIMER_TEXT,
        isAnswerable=True,
    )

@router.get("/certificates/{certificate_id}/pdf")
async def download_certificate_pdf(certificate_id: str):
    """Generates downloadable HTML/PDF certificate response."""
    cert = SEED_CERTIFICATES.get(certificate_id.upper())
    if not cert:
        raise HTTPException(404, "Certificate not found")

    html_content = f"""<!DOCTYPE html>
<html>
<head><title>Certificate {cert['id']}</title></head>
<body style="font-family: serif; padding: 20px;">
  <h2>Directorate of Legal Metrology</h2>
  <h3>Certificate of Verification — {cert['id']}</h3>
  <p>Instrument: {cert['makeModel']} (S/N: {cert['serialNumber']})</p>
  <p>Owner: {cert['traderName']} - {cert['businessName']}</p>
  <p>Status: {cert['status']}</p>
  <p>SHA-256 Hash: {cert['certificateHash']}</p>
</body>
</html>"""
    return Response(content=html_content, media_type="text/html", headers={"Content-Disposition": f"attachment; filename={cert['id']}.html"})

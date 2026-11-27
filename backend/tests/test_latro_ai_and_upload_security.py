import base64
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from starlette.testclient import TestClient

import main
from app.api.v1 import auth as auth_api
from app.api.v1 import conversations as conversations_api
from app.api.v1 import prescriptions as prescriptions_api
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import create_access_token, hash_password
from app.models.models import Conversation, Patient, PrescriptionUpload, Session as UserSession, User
from app.services import clinical_qa

client = TestClient(main.app, base_url="https://localhost:5173")

CSRF_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://localhost:5173",
}

TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def _create_or_get_user_token(email: str, role: str, name: str, with_patient_profile: bool = False):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                name=name,
                password_hash=hash_password("LatroTest123!"),
                role=role,
                status="active",
                verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.role = role
            user.status = "active"
            user.verified = True
            db.commit()

        patient_id = None
        if with_patient_profile:
            pat = db.query(Patient).filter(Patient.user_id == user.id).first()
            if not pat:
                pat = Patient(
                    user_id=user.id,
                    patient_id_display=f"PAT-{user.id[:6].upper()}",
                    age=42,
                    approval_status="approved",
                )
                db.add(pat)
                db.commit()
                db.refresh(pat)
            patient_id = pat.id

        sess = UserSession(
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
            ip_address="127.0.0.1",
        )
        db.add(sess)
        db.commit()
        db.refresh(sess)

        token, _ = create_access_token(user_id=user.id, session_id=sess.id, role=user.role)
        return token, user.id, patient_id
    finally:
        db.close()


def _snapshot_upload_files():
    upload_root = Path(__file__).resolve().parent.parent / "uploads"
    if not upload_root.exists():
        return set()
    return {str(p.resolve()) for p in upload_root.rglob("*") if p.is_file()}


def _disable_gemini(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")


def test_guest_text_chat_metformin_and_reject_all_uploads_before_store_or_gemini(monkeypatch):
    _disable_gemini(monkeypatch)

    gemini_calls = []

    async def fail_if_called(*args, **kwargs):
        gemini_calls.append((args, kwargs))
        raise AssertionError("Gemini analyzer should not be called for unauthorized uploads")

    monkeypatch.setattr(prescriptions_api, "analyze_prescription_with_gemini", fail_if_called)
    monkeypatch.setattr(auth_api, "save_and_analyze_prescription", fail_if_called, raising=False)

    # 1. Guest can ask general medication question over text chat
    res_chat = client.post(
        "/api/v1/conversations/chat",
        json={"query": "What is metformin used for?", "language": "en"},
        headers=CSRF_HEADERS,
    )
    assert res_chat.status_code == 200, res_chat.text
    reply_lower = res_chat.json()["content"].lower()
    assert "metformin" in reply_lower
    assert "diabetes" in reply_lower or "blood sugar" in reply_lower
    assert "stop" not in reply_lower or "without" in reply_lower or "never" in reply_lower

    before_files = _snapshot_upload_files()

    # 2. Direct upload attempts by guest must all return 401 before storing or calling Gemini
    res_analyze = client.post(
        "/api/v1/prescriptions/analyze",
        files={"file": ("rx.png", TINY_PNG, "image/png")},
        headers=CSRF_HEADERS,
    )
    assert res_analyze.status_code == 401

    res_analyze_json = client.post(
        "/api/v1/prescriptions/analyze-json",
        json={"text_content": "Rx: Metformin 500mg twice daily"},
        headers=CSRF_HEADERS,
    )
    assert res_analyze_json.status_code == 401

    res_auth_up = client.post(
        "/auth/upload-prescription",
        files={"file": ("rx.png", TINY_PNG, "image/png")},
        headers=CSRF_HEADERS,
    )
    assert res_auth_up.status_code == 401

    res_v1_auth_up = client.post(
        "/api/v1/auth/upload-prescription",
        files={"file": ("rx.png", TINY_PNG, "image/png")},
        headers=CSRF_HEADERS,
    )
    assert res_v1_auth_up.status_code == 401

    res_chat_multipart = client.post(
        "/api/v1/conversations/chat",
        data={"query": "Explain this prescription", "language": "en"},
        files={"file": ("rx.png", TINY_PNG, "image/png")},
        headers=CSRF_HEADERS,
    )
    assert res_chat_multipart.status_code == 401

    res_chat_inline_json = client.post(
        "/api/v1/conversations/chat",
        json={
            "query": "Explain this inline prescription",
            "language": "en",
            "attachments": [{"filename": "rx.png", "data": base64.b64encode(TINY_PNG).decode()}],
        },
        headers=CSRF_HEADERS,
    )
    assert res_chat_inline_json.status_code == 401

    after_files = _snapshot_upload_files()
    assert before_files == after_files
    assert gemini_calls == []


@pytest.mark.parametrize("role", ["doctor", "pharmacist", "admin"])
def test_signed_in_non_patient_chat_allowed_and_uploads_return_403(monkeypatch, role):
    _disable_gemini(monkeypatch)
    token, _, _ = _create_or_get_user_token(f"{role}.uploadblock@latrocore.com", role, f"Test {role.title()}")
    headers = {**CSRF_HEADERS, "Authorization": f"Bearer {token}"}

    gemini_calls = []

    async def fail_if_called(*args, **kwargs):
        gemini_calls.append(1)
        raise AssertionError("Gemini analyzer should not be called for non-patient uploads")

    monkeypatch.setattr(
        prescriptions_api,
        "analyze_prescription_with_gemini",
        fail_if_called,
    )

    # Text chat allowed
    res_chat = client.post(
        "/api/v1/conversations/chat",
        json={"query": "What is metformin used for?", "language": "en"},
        headers=headers,
    )
    assert res_chat.status_code == 200, res_chat.text
    assert "metformin" in res_chat.json()["content"].lower()

    before_files = _snapshot_upload_files()

    assert client.post(
        "/api/v1/prescriptions/analyze",
        files={"file": ("rx.png", TINY_PNG, "image/png")},
        headers=headers,
    ).status_code == 403

    assert client.post(
        "/api/v1/prescriptions/analyze-json",
        json={"text_content": "Metformin 500mg"},
        headers=headers,
    ).status_code == 403

    assert client.post(
        "/auth/upload-prescription",
        files={"file": ("rx.png", TINY_PNG, "image/png")},
        headers=headers,
    ).status_code == 403

    assert client.post(
        "/api/v1/conversations/chat",
        data={"query": "Read this", "language": "en"},
        files={"file": ("rx.png", TINY_PNG, "image/png")},
        headers=headers,
    ).status_code == 403

    assert client.post(
        "/api/v1/conversations/chat",
        json={"query": "Read this", "inline_file": {"data": "abc"}},
        headers=headers,
    ).status_code == 403

    assert _snapshot_upload_files() == before_files
    assert gemini_calls == []


def test_patient_upload_prescription_qa_followups_general_qa_and_isolation(monkeypatch):
    _disable_gemini(monkeypatch)

    token_a, user_a_id, pat_a_id = _create_or_get_user_token(
        "patient.alpha@latrocore.com", "patient", "Alpha Patient", with_patient_profile=True
    )
    token_b, user_b_id, pat_b_id = _create_or_get_user_token(
        "patient.beta@latrocore.com", "patient", "Beta Patient", with_patient_profile=True
    )

    headers_a = {**CSRF_HEADERS, "Authorization": f"Bearer {token_a}"}
    headers_b = {**CSRF_HEADERS, "Authorization": f"Bearer {token_b}"}

    # Mock Gemini prescription extraction with one clear timing (Metformin) & one missing timing (Glimepiride)
    mock_rx = {
        "is_valid_prescription": True,
        "rejection_reason": "",
        "doctor_name": "Dr. A. Mehta",
        "clinic_name": "Latro Care Clinic",
        "diagnosis": "Type 2 Diabetes Mellitus",
        "prescription_date": "2026-11-27",
        "medicines": [
            {
                "name": "Metformin 500mg",
                "dose": "500mg",
                "route": "Oral",
                "frequency": "Once daily",
                "schedule_times": ["20:00"],
                "meal_timing": "After dinner",
                "is_prn": False,
                "is_insulin": False,
                "instructions": "Take after dinner",
            },
            {
                "name": "Glimepiride 1mg",
                "dose": "1mg",
                "route": "Oral",
                "frequency": "Once daily",
                "schedule_times": [],
                "meal_timing": "not specified",
                "is_prn": False,
                "is_insulin": False,
                "instructions": "not specified",
            },
        ],
    }
    async def mock_analyze(*args, **kwargs):
        return mock_rx

    monkeypatch.setattr(prescriptions_api, "analyze_prescription_with_gemini", mock_analyze)

    # 1. Patient A uploads prescription via /api/v1/prescriptions/analyze
    res_up = client.post(
        "/api/v1/prescriptions/analyze",
        files={"file": ("alpha_rx.png", TINY_PNG, "image/png")},
        headers=headers_a,
    )
    assert res_up.status_code == 200, res_up.text
    up_data = res_up.json()
    upload_id = up_data["upload_id"]
    file_url = up_data["file_url"]
    assert upload_id
    assert file_url.startswith("/uploads/")

    # 2. Ask timing written for Metformin -> reflects document ("After dinner" / "20:00")
    res_met_timing = client.post(
        "/api/v1/conversations/chat",
        json={
            "query": "What timing is written for Metformin?",
            "language": "en",
            "upload_id": upload_id,
        },
        headers=headers_a,
    )
    assert res_met_timing.status_code == 200, res_met_timing.text
    met_reply = res_met_timing.json()["content"]
    assert "after dinner" in met_reply.lower() or "20:00" in met_reply.lower()

    # 3. Ask timing written for Glimepiride -> must NOT guess "With meals"; identifies missing/unclear detail
    res_glim_timing = client.post(
        "/api/v1/conversations/chat",
        json={
            "query": "What timing is written for Glimepiride?",
            "language": "en",
            "upload_id": upload_id,
        },
        headers=headers_a,
    )
    assert res_glim_timing.status_code == 200, res_glim_timing.text
    glim_reply = res_glim_timing.json()["content"].lower()
    assert "with meals" not in glim_reply
    assert "not" in glim_reply or "unclear" in glim_reply
    assert "pharmacist" in glim_reply or "prescriber" in glim_reply

    # 4. Multiple medicines + ambiguous "this medicine" -> asks which medicine user means
    res_ambig = client.post(
        "/api/v1/conversations/chat",
        json={
            "query": "What timing is written for this medicine?",
            "language": "en",
            "upload_id": upload_id,
        },
        headers=headers_a,
    )
    assert res_ambig.status_code == 200, res_ambig.text
    ambig_reply = res_ambig.json()["content"].lower()
    assert "which" in ambig_reply
    assert "metformin" in ambig_reply and "glimepiride" in ambig_reply

    # 5. Follow-up "that medicine" resolved from conversation history
    res_followup = client.post(
        "/api/v1/conversations/chat",
        json={
            "query": "What timing is written for that medicine?",
            "language": "en",
            "upload_id": upload_id,
            "history": [
                {"role": "user", "content": "Tell me about Metformin 500mg on my prescription"},
                {"role": "assistant", "content": "Metformin 500mg is listed on your uploaded prescription."},
            ],
        },
        headers=headers_a,
    )
    assert res_followup.status_code == 200, res_followup.text
    followup_reply = res_followup.json()["content"].lower()
    assert "metformin" in followup_reply
    assert "after dinner" in followup_reply or "20:00" in followup_reply

    # 6. General question "What is asthma?" in SAME chat without uploading another file
    res_asthma = client.post(
        "/api/v1/conversations/chat",
        json={
            "query": "What is asthma?",
            "language": "en",
            "upload_id": upload_id,
            "history": [
                {"role": "user", "content": "What timing is written for Metformin?"},
                {"role": "assistant", "content": met_reply},
            ],
        },
        headers=headers_a,
    )
    assert res_asthma.status_code == 200, res_asthma.text
    asthma_reply = res_asthma.json()["content"].lower()
    assert "airway" in asthma_reply or "lung" in asthma_reply

    # 7. Patient ownership checks: Patient A can access own file & metadata; guest gets 401; Patient B gets 403
    assert client.get(file_url).status_code == 401
    assert client.get(file_url, headers=headers_a).status_code == 200
    assert client.get(file_url, headers=headers_b).status_code == 403

    assert client.get(f"/api/v1/prescriptions/uploads/{upload_id}", headers=headers_a).status_code == 200
    assert client.get(f"/api/v1/prescriptions/uploads/{upload_id}", headers=headers_b).status_code == 403

    # Patient A sees own upload; Patient B list must not expose Patient A upload
    res_list_a = client.get("/api/v1/prescriptions/uploads", headers=headers_a)
    assert res_list_a.status_code == 200
    assert any(item["id"] == upload_id for item in res_list_a.json()["uploads"])

    res_list_b = client.get("/api/v1/prescriptions/uploads", headers=headers_b)
    assert res_list_b.status_code == 200
    assert all(item["id"] != upload_id for item in res_list_b.json()["uploads"])

    # Patient B cannot reference Patient A's upload_id in chat
    res_b_chat = client.post(
        "/api/v1/conversations/chat",
        json={"query": "What timing is written?", "upload_id": upload_id},
        headers=headers_b,
    )
    assert res_b_chat.status_code == 403

    # Patient B cannot apply a prescription targeting Patient A or Patient A's file_url
    res_b_apply = client.post(
        "/api/v1/prescriptions/apply",
        json={
            "patient_id": pat_a_id,
            "doctor_name": "Dr. A. Mehta",
            "diagnosis": "Type 2 Diabetes Mellitus",
            "medicines": [{"name": "Metformin 500mg", "dose": "500mg"}],
        },
        headers=headers_b,
    )
    assert res_b_apply.status_code == 403

    res_b_apply_file = client.post(
        "/api/v1/prescriptions/apply",
        json={
            "file_url": file_url,
            "doctor_name": "Dr. A. Mehta",
            "medicines": [{"name": "Metformin 500mg", "dose": "500mg"}],
        },
        headers=headers_b,
    )
    assert res_b_apply_file.status_code == 403

    # Conversation message ownership check
    db = SessionLocal()
    try:
        convo_a = Conversation(patient_id=pat_a_id, user_id=user_a_id)
        db.add(convo_a)
        db.commit()
        db.refresh(convo_a)
        convo_a_id = convo_a.id
    finally:
        db.close()

    assert client.get(f"/api/v1/conversations/{convo_a_id}/messages", headers=headers_a).status_code == 200
    assert client.get(f"/api/v1/conversations/{convo_a_id}/messages", headers=headers_b).status_code == 403

    # Cleanup synthetic test file on disk & DB upload/conversation rows
    db = SessionLocal()
    try:
        rec = db.query(PrescriptionUpload).filter(PrescriptionUpload.id == upload_id).first()
        if rec:
            if rec.file_path and os.path.exists(rec.file_path):
                os.remove(rec.file_path)
            db.delete(rec)
        convo = db.query(Conversation).filter(Conversation.id == convo_a_id).first()
        if convo:
            db.delete(convo)
        db.commit()
    finally:
        db.close()


def test_gemini_payload_includes_latro_ai_system_prompt_and_history(monkeypatch):
    captured = {}

    class DummyResponse:
        status_code = 200

        def json(self):
            return {
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": "Metformin is written on your prescription to be taken after dinner."}]
                        }
                    }
                ]
            }

    class DummyAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, json=None, headers=None):
            captured["url"] = url
            captured["payload"] = json
            return DummyResponse()

    monkeypatch.setenv("GEMINI_API_KEY", "unit-test-key")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "unit-test-key")
    monkeypatch.setattr(clinical_qa.httpx, "AsyncClient", DummyAsyncClient)

    token_a, _, _ = _create_or_get_user_token(
        "patient.alpha@latrocore.com", "patient", "Alpha Patient", with_patient_profile=True
    )
    headers_a = {**CSRF_HEADERS, "Authorization": f"Bearer {token_a}"}

    res = client.post(
        "/api/v1/conversations/chat",
        json={
            "query": "What timing is written for that medicine?",
            "language": "en",
            "prescription_context": "- Metformin 500mg | Dose: 500mg | Meal Timing: After dinner",
            "history": [
                {"role": "user", "content": "Tell me about Metformin 500mg"},
                {"role": "assistant", "content": "Metformin 500mg is listed on your prescription."},
            ],
        },
        headers=headers_a,
    )
    assert res.status_code == 200, res.text
    sys_text = captured["payload"]["systemInstruction"]["parts"][0]["text"]
    assert "Latro AI" in sys_text
    assert "Clinical AI" not in sys_text
    assert "VERIFIED PATIENT PRESCRIPTION CONTEXT" in sys_text
    contents = captured["payload"]["contents"]
    assert len(contents) >= 3
    assert "Metformin 500mg" in contents[0]["parts"][0]["text"]
    assert "What timing is written for that medicine?" in contents[-1]["parts"][0]["text"]

    # Also verify guest text chat strips any forged client-supplied prescription_context
    captured.clear()
    res_guest = client.post(
        "/api/v1/conversations/chat",
        json={
            "query": "What is metformin used for?",
            "language": "en",
            "prescription_context": "- Forged Med 99mg",
        },
        headers=CSRF_HEADERS,
    )
    assert res_guest.status_code == 200
    assert "Forged Med" not in captured["payload"]["systemInstruction"]["parts"][0]["text"]


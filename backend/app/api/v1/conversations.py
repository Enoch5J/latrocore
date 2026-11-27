"""AI conversation routes — Latro AI chat with strict upload isolation and Gemini integration."""

import base64
import json
import os
from typing import Optional, List, Dict, Any, Tuple
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from starlette.datastructures import UploadFile as StarletteUploadFile
from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    get_optional_current_user,
    check_patient_access,
    get_or_create_patient_profile,
)
from app.models.models import User, Patient, Conversation, Message, AuditEvent
from app.services.clinical_qa import clinical_qa_service
from app.api.v1.prescriptions import (
    MAX_FILE_SIZE,
    validate_uploaded_prescription_meta,
    save_and_analyze_prescription,
    format_prescription_context_from_dict,
    get_patient_prescription_context,
)

router = APIRouter(tags=["AI Assistant"])

INLINE_ATTACHMENT_KEYS = {
    "file",
    "files",
    "attachment",
    "attachments",
    "inline_file",
    "inline_files",
    "inline_data",
    "inlinedata",
    "file_data",
    "image",
    "document",
    "upload",
    "prescription_file",
}


class MessageCreate(BaseModel):
    content: str
    language: str = "en"


class ChatQuery(BaseModel):
    content: Optional[str] = None
    query: Optional[str] = None
    language: str = "en"
    prescription_context: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None
    upload_id: Optional[str] = None
    prescription_id: Optional[str] = None
    conversation_id: Optional[str] = None

    @property
    def text(self) -> str:
        return (self.content or self.query or "").strip()


def _has_nonempty_inline_attachment(body: Dict[str, Any]) -> bool:
    for key, val in body.items():
        if key.lower() in INLINE_ATTACHMENT_KEYS and val not in (None, "", [], {}):
            return True
    return False


def _extract_inline_file_from_json(body: Dict[str, Any]) -> Tuple[bytes, str, str]:
    """Decode base64 inline file payload from JSON body for an authenticated patient."""
    raw_item = None
    for key in (
        "file", "attachment", "inline_file", "inline_data", "inlineData",
        "file_data", "image", "document", "prescription_file"
    ):
        if body.get(key):
            raw_item = body.get(key)
            break
    if raw_item is None:
        for list_key in ("files", "attachments", "inline_files"):
            items = body.get(list_key)
            if isinstance(items, list) and len(items) > 0:
                raw_item = items[0]
                break

    filename = "prescription.png"
    mime_type = "image/png"
    data_str = None

    if isinstance(raw_item, dict):
        filename = raw_item.get("filename") or raw_item.get("name") or filename
        mime_type = raw_item.get("mime_type") or raw_item.get("mimeType") or raw_item.get("content_type") or mime_type
        data_str = raw_item.get("data") or raw_item.get("base64") or raw_item.get("content")
    elif isinstance(raw_item, str):
        data_str = raw_item

    if not data_str or not isinstance(data_str, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid inline attachment payload. Expected base64 file data."
        )

    if data_str.startswith("data:") and ";base64," in data_str:
        header, b64_part = data_str.split(";base64,", 1)
        mime_type = header.replace("data:", "").strip() or mime_type
        data_str = b64_part

    ext_map = {
        "application/pdf": ".pdf",
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
    }
    if "." not in filename and mime_type.lower() in ext_map:
        filename = f"prescription{ext_map[mime_type.lower()]}"
    validate_uploaded_prescription_meta(filename)

    try:
        file_bytes = base64.b64decode(data_str, validate=True)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 encoding in inline attachment."
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum allowed limit of 12 MB."
        )

    return file_bytes, filename, mime_type


def _require_patient_for_attachment(current_user: Optional[User]) -> User:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to upload or attach prescription files.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only signed-in patients can upload or attach prescription files.",
        )
    return current_user


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/conversations", status_code=201)
def create_conversation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can start conversations")
    patient = get_or_create_patient_profile(current_user, db)
    
    convo = Conversation(
        patient_id=patient.id,
        user_id=current_user.id,
        language=patient.language or "en"
    )
    db.add(convo)
    db.commit()
    db.refresh(convo)
    
    return {"id": convo.id, "language": convo.language}


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return {"conversations": []}
    
    convos = db.query(Conversation).filter(
        Conversation.patient_id == patient.id
    ).order_by(Conversation.updated_at.desc()).all()
    
    results = []
    for c in convos:
        last_msg = db.query(Message).filter(
            Message.conversation_id == c.id
        ).order_by(Message.created_at.desc()).first()
        results.append({
            "id": c.id, "language": c.language,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "last_message": last_msg.content[:100] if last_msg else None
        })
    
    return {"conversations": results}


@router.get("/conversations/{convo_id}/messages")
def get_messages(
    convo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    convo = db.query(Conversation).filter(Conversation.id == convo_id).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user.role == "patient":
        if convo.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized for this conversation")
    elif current_user.role in ("doctor", "pharmacist", "care_team"):
        check_patient_access(convo.patient_id, current_user, db)
    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    messages = db.query(Message).filter(
        Message.conversation_id == convo_id
    ).order_by(Message.created_at.asc()).all()
    
    return {
        "messages": [{
            "id": m.id, "role": m.role, "content": m.content,
            "sources": json.loads(m.sources) if m.sources else [],
            "created_at": m.created_at.isoformat() if m.created_at else None
        } for m in messages]
    }


@router.post("/conversations/chat")
async def chat_with_assistant(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Latro AI Chat endpoint.

    - Plain text Q&A is open to visitors and signed-in users across roles.
    - Any prescription file upload or inline attachment requires an authenticated patient
      (401 for guests, 403 for signed-in non-patients), verified BEFORE storing or forwarding to Gemini.
    """
    content_type = (request.headers.get("content-type") or "").lower()
    text = ""
    language = "en"
    client_prescription_context: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None
    upload_id: Optional[str] = None
    prescription_id: Optional[str] = None
    conversation_id: Optional[str] = None
    upload_result: Optional[Dict[str, Any]] = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        upload_items: List[StarletteUploadFile] = []
        has_attachment_field = False
        for key, value in form.multi_items():
            if isinstance(value, StarletteUploadFile) or hasattr(value, "filename"):
                has_attachment_field = True
                if getattr(value, "filename", None):
                    upload_items.append(value)
            elif key.lower() in INLINE_ATTACHMENT_KEYS and value not in (None, ""):
                has_attachment_field = True

        if has_attachment_field or upload_items:
            patient_user = _require_patient_for_attachment(current_user)
            if not upload_items:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No prescription file was found in the attachment field."
                )
            upload_file = upload_items[0]
            clean_name = validate_uploaded_prescription_meta(upload_file.filename)
            file_bytes = await upload_file.read()
            if len(file_bytes) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File size exceeds the maximum allowed limit of 12 MB."
                )
            upload_result = await save_and_analyze_prescription(
                db=db,
                current_user=patient_user,
                file_bytes=file_bytes,
                filename=clean_name,
                mime_type=upload_file.content_type or "image/jpeg",
            )
            upload_id = upload_result.get("upload_id")

        text = str(form.get("content") or form.get("query") or form.get("message") or "").strip()
        language = str(form.get("language") or "en").strip() or "en"
        upload_id = upload_id or (str(form.get("upload_id")).strip() if form.get("upload_id") else None)
        prescription_id = str(form.get("prescription_id")).strip() if form.get("prescription_id") else None
        conversation_id = str(form.get("conversation_id")).strip() if form.get("conversation_id") else None
        raw_ctx = form.get("prescription_context")
        if isinstance(raw_ctx, str) and raw_ctx.strip():
            client_prescription_context = raw_ctx.strip()
        raw_hist = form.get("history")
        if isinstance(raw_hist, str) and raw_hist.strip():
            try:
                parsed_hist = json.loads(raw_hist)
                if isinstance(parsed_hist, list):
                    history = parsed_hist
            except json.JSONDecodeError:
                history = None
    else:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON request body")

        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="Request body must be a JSON object")

        if _has_nonempty_inline_attachment(body):
            patient_user = _require_patient_for_attachment(current_user)
            file_bytes, clean_name, mime_type = _extract_inline_file_from_json(body)
            upload_result = await save_and_analyze_prescription(
                db=db,
                current_user=patient_user,
                file_bytes=file_bytes,
                filename=clean_name,
                mime_type=mime_type,
            )
            upload_id = upload_result.get("upload_id")

        text = str(body.get("content") or body.get("query") or "").strip()
        language = str(body.get("language") or "en").strip() or "en"
        client_prescription_context = (
            body.get("prescription_context").strip()
            if isinstance(body.get("prescription_context"), str) and body.get("prescription_context").strip()
            else None
        )
        if isinstance(body.get("history"), list):
            history = body.get("history")
        upload_id = upload_id or body.get("upload_id")
        prescription_id = body.get("prescription_id")
        conversation_id = body.get("conversation_id")

    # Enforce access checks if referencing stored conversations or prescription IDs
    if conversation_id:
        if current_user is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if current_user.role == "patient" and convo.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized for this conversation")
        if current_user.role in ("doctor", "pharmacist", "care_team"):
            check_patient_access(convo.patient_id, current_user, db)
        if not history:
            db_msgs = (
                db.query(Message)
                .filter(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.asc())
                .all()
            )
            history = [{"role": m.role, "content": m.content} for m in db_msgs[-12:]]

    if (upload_id or prescription_id) and not upload_result:
        if current_user is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        if current_user.role != "patient":
            raise HTTPException(status_code=403, detail="Only patients can access their uploaded prescriptions via Latro AI")

    # Resolve prescription context strictly for signed-in patients only
    effective_rx_ctx: Optional[str] = None
    if upload_result:
        effective_rx_ctx = format_prescription_context_from_dict(upload_result)
    elif current_user and current_user.role == "patient":
        db_rx_ctx = get_patient_prescription_context(
            current_user,
            db,
            upload_id=upload_id,
            prescription_id=prescription_id,
        )
        effective_rx_ctx = db_rx_ctx or client_prescription_context

    if upload_result and not text:
        meds_summary = ", ".join(m.get("name") or "unclear" for m in (upload_result.get("medicines") or []))
        return {
            "content": f"Your prescription has been uploaded and processed ({meds_summary}). You can now ask about any medicine, dose, or timing written in it.",
            "sources": [{"title": "Uploaded Patient Prescription", "section": "Digitized Rx"}],
            "model_id": upload_result.get("model_used", "latrocore-prescription-ai"),
            "requires_handoff": False,
            "upload_id": upload_result.get("upload_id"),
            "prescription": upload_result,
        }

    if not text:
        raise HTTPException(status_code=400, detail="Query text is required")

    response = await clinical_qa_service.generate_response(
        text,
        language=language,
        prescription_context=effective_rx_ctx,
        history=history,
    )
    if upload_result:
        response["upload_id"] = upload_result.get("upload_id")
        response["prescription"] = upload_result
    return response


@router.post("/conversations/{convo_id}/messages", status_code=201)
async def send_message(
    convo_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content_type = (request.headers.get("content-type") or "").lower()
    if "multipart/form-data" in content_type:
        form = await request.form()
        has_file = any(
            isinstance(v, StarletteUploadFile) or hasattr(v, "filename") or k.lower() in INLINE_ATTACHMENT_KEYS
            for k, v in form.multi_items()
        )
        if has_file and current_user.role != "patient":
            raise HTTPException(status_code=403, detail="Only signed-in patients can attach prescription files.")
        msg_content = str(form.get("content") or "").strip()
        msg_lang = str(form.get("language") or "en").strip() or "en"
    else:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body")
        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="Request body must be a JSON object")
        if _has_nonempty_inline_attachment(body) and current_user.role != "patient":
            raise HTTPException(status_code=403, detail="Only signed-in patients can attach prescription files.")
        data = MessageCreate(**{
            "content": body.get("content", ""),
            "language": body.get("language", "en"),
        })
        msg_content = data.content.strip()
        msg_lang = data.language

    if not msg_content:
        raise HTTPException(status_code=400, detail="Message content is required")

    convo = db.query(Conversation).filter(Conversation.id == convo_id).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if convo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this conversation")

    prior_msgs = (
        db.query(Message)
        .filter(Message.conversation_id == convo_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in prior_msgs[-12:]]

    # Save user message
    user_msg = Message(
        conversation_id=convo_id,
        role="user",
        content=msg_content
    )
    db.add(user_msg)

    # Generate guardrailed AI response with conversation history and patient's own Rx context
    target_lang = msg_lang or convo.language or "en"
    rx_ctx = (
        get_patient_prescription_context(current_user, db)
        if current_user.role == "patient"
        else None
    )
    ai_response = await clinical_qa_service.generate_response(
        msg_content,
        language=target_lang,
        prescription_context=rx_ctx,
        history=history,
    )
    
    assistant_msg = Message(
        conversation_id=convo_id,
        role="assistant",
        content=ai_response["content"],
        sources=json.dumps(ai_response.get("sources", [])),
        model_id=ai_response.get("model_id", "latrocore-guardrailed-ai")
    )
    db.add(assistant_msg)
    
    db.add(AuditEvent(
        actor_id=current_user.id, action="ai_conversation",
        record_type="conversation", record_id=convo_id
    ))
    db.commit()
    db.refresh(assistant_msg)
    
    return {
        "user_message": {"id": user_msg.id, "content": msg_content},
        "assistant_message": {
            "id": assistant_msg.id,
            "content": ai_response["content"],
            "sources": ai_response.get("sources", []),
            "requires_handoff": ai_response.get("requires_handoff", False),
            "pii_scrubbed": ai_response.get("pii_scrubbed", False)
        }
    }


ALLOWED_TTS_LANGS = {"en", "ta", "hi", "ml", "te", "kn"}


class TtsRequest(BaseModel):
    text: str
    language: str = "en"


def _split_tts_chunks(text: str, max_len: int = 180) -> List[str]:
    clean = " ".join(str(text or "").split())[:1200]
    if not clean:
        return []
    chunks: List[str] = []
    while clean:
        if len(clean) <= max_len:
            chunks.append(clean)
            break
        split_at = max(
            clean.rfind(". ", 0, max_len + 1),
            clean.rfind("? ", 0, max_len + 1),
            clean.rfind("! ", 0, max_len + 1),
            clean.rfind(" ", 0, max_len + 1),
        )
        if split_at <= 0:
            split_at = max_len
        else:
            split_at += 1
        chunks.append(clean[:split_at].strip())
        clean = clean[split_at:].strip()
    return [c for c in chunks if c]


@router.post("/ai/tts")
async def synthesize_speech(payload: TtsRequest):
    """Synthesize MP3 speech for English and Indic languages when browser TTS lacks local voices."""
    lang = (payload.language or "en").strip().lower().split("-")[0]
    if lang not in ALLOWED_TTS_LANGS:
        lang = "en"

    chunks = _split_tts_chunks(payload.text)
    if not chunks:
        raise HTTPException(status_code=400, detail="Text is required for speech synthesis.")

    audio_parts: List[bytes] = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for chunk in chunks:
                resp = await client.get(
                    "https://translate.googleapis.com/translate_tts",
                    params={"ie": "UTF-8", "client": "tw-ob", "tl": lang, "q": chunk},
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                if resp.status_code != 200 or not resp.content:
                    raise HTTPException(status_code=502, detail="TTS service unavailable.")
                audio_parts.append(resp.content)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Unable to synthesize speech.") from exc

    return Response(content=b"".join(audio_parts), media_type="audio/mpeg")

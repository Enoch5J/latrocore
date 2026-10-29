"""AI conversation routes — simulated assistant with sourced responses."""

import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Patient, Conversation, Message, AuditEvent
from app.services.clinical_qa import clinical_qa_service

router = APIRouter(tags=["AI Assistant"])


class MessageCreate(BaseModel):
    content: str
    language: str = "en"


class ChatQuery(BaseModel):
    content: Optional[str] = None
    query: Optional[str] = None
    language: str = "en"

    @property
    def text(self) -> str:
        return (self.content or self.query or "").strip()



# Note: AI response generation is handled by `app.services.clinical_qa.clinical_qa_service`
# which integrates Google Gemini API with clinical safety guardrails, PII scrubbing,
# and an evidence-based fallback when offline.



# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/conversations", status_code=201)
def create_conversation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=403, detail="Only patients can start conversations")
    
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
async def chat_with_assistant(data: ChatQuery):
    """Guardrailed Clinical AI Chat (educational Q&A with PII scrubbing and Gemini integration)."""
    text = data.text
    if not text:
        raise HTTPException(status_code=400, detail="Query text is required")
    return await clinical_qa_service.generate_response(text, language=data.language or "en")


@router.post("/conversations/{convo_id}/messages", status_code=201)
async def send_message(
    convo_id: str,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    convo = db.query(Conversation).filter(Conversation.id == convo_id).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Save user message
    user_msg = Message(
        conversation_id=convo_id,
        role="user",
        content=data.content
    )
    db.add(user_msg)
    
    # Generate guardrailed AI response (Gemini with PII scrubbing & fallback)
    target_lang = data.language or convo.language or "en"
    ai_response = await clinical_qa_service.generate_response(data.content, language=target_lang)
    
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
        "user_message": {"id": user_msg.id, "content": data.content},
        "assistant_message": {
            "id": assistant_msg.id,
            "content": ai_response["content"],
            "sources": ai_response.get("sources", []),
            "requires_handoff": ai_response.get("requires_handoff", False),
            "pii_scrubbed": ai_response.get("pii_scrubbed", False)
        }
    }

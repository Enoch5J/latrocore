"""AI conversation routes — simulated assistant with sourced responses."""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Patient, Conversation, Message, AuditEvent

router = APIRouter(tags=["AI Assistant"])


class MessageCreate(BaseModel):
    content: str
    language: str = "en"


# ── Simulated knowledge base (prototype) ─────────────────────────────

KNOWLEDGE_BASE = {
    "glucose": {
        "answer": "Blood glucose monitoring is essential for diabetes management. Fasting blood glucose should ideally be between 80-130 mg/dL, and post-meal readings should be below 180 mg/dL (as per ADA guidelines). Regular monitoring helps track how food, activity, and medications affect your levels.",
        "sources": [{"title": "ADA Standards of Care 2024", "section": "Glycemic Targets"}]
    },
    "hba1c": {
        "answer": "HbA1c (glycated hemoglobin) reflects your average blood sugar over the past 2-3 months. For most adults with diabetes, the target is below 7%. Your doctor may set a different target based on your individual health profile.",
        "sources": [{"title": "ADA Standards of Care 2024", "section": "A1C Testing"}]
    },
    "insulin": {
        "answer": "Insulin should be stored properly — unopened vials in the refrigerator (2-8°C), and in-use vials at room temperature for up to 28 days. Never freeze insulin. Rotate injection sites to prevent lipodystrophy. If you miss a dose, please consult your doctor — do not double the next dose.",
        "sources": [{"title": "WHO Diabetes Guidelines", "section": "Insulin Storage"}]
    },
    "diet": {
        "answer": "A balanced diet for diabetes focuses on consistent carbohydrate intake, plenty of vegetables, lean proteins, and healthy fats. Consider the glycemic index of foods. Portion control and regular meal timing help maintain stable blood sugar levels.",
        "sources": [{"title": "ADA Nutrition Guidelines", "section": "Medical Nutrition Therapy"}]
    },
    "exercise": {
        "answer": "Regular physical activity improves insulin sensitivity. Aim for at least 150 minutes of moderate-intensity aerobic activity per week. Check blood glucose before and after exercise. Carry a fast-acting glucose source during activity.",
        "sources": [{"title": "ADA Physical Activity Guidelines", "section": "Exercise Recommendations"}]
    },
    "medication": {
        "answer": "Take your medications as prescribed by your doctor. Never change doses without consulting your healthcare provider. Keep a record of all medications including supplements. Report any side effects to your care team.",
        "sources": [{"title": "LATROCORE Care Guidelines", "section": "Medication Adherence"}]
    },
    "emergency": {
        "answer": "⚠️ If you are experiencing severe symptoms such as very high blood sugar (>300 mg/dL), confusion, difficulty breathing, or loss of consciousness, please seek immediate medical attention or call emergency services. This assistant cannot provide emergency medical care.",
        "sources": [{"title": "Emergency Guidance", "section": "When to Seek Help"}]
    }
}

SAFETY_KEYWORDS = ["prescribe", "change dose", "increase dose", "decrease dose", "stop medication", "diagnose", "cure"]


def generate_ai_response(question: str) -> dict:
    """Simulate AI response with knowledge retrieval."""
    q_lower = question.lower()
    
    # Safety check — refuse treatment modifications
    for keyword in SAFETY_KEYWORDS:
        if keyword in q_lower:
            return {
                "content": "I'm not able to make changes to your medication or provide medical diagnoses. This type of request requires your doctor's review. Would you like me to create a counselling request so a healthcare professional can assist you?",
                "sources": [],
                "model_id": "latrocore-assistant-v1",
                "requires_handoff": True
            }
    
    # Knowledge retrieval
    for topic, knowledge in KNOWLEDGE_BASE.items():
        if topic in q_lower:
            return {
                "content": knowledge["answer"],
                "sources": knowledge["sources"],
                "model_id": "latrocore-assistant-v1",
                "requires_handoff": False
            }
    
    # Default — limitation acknowledgment
    return {
        "content": "I don't have specific approved information to answer this question accurately. I'd recommend discussing this with your healthcare provider for personalized guidance. Would you like me to request a counselling session?",
        "sources": [],
        "model_id": "latrocore-assistant-v1",
        "requires_handoff": True
    }


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


@router.post("/conversations/{convo_id}/messages", status_code=201)
def send_message(
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
    
    # Generate AI response
    ai_response = generate_ai_response(data.content)
    
    assistant_msg = Message(
        conversation_id=convo_id,
        role="assistant",
        content=ai_response["content"],
        sources=json.dumps(ai_response["sources"]),
        model_id=ai_response["model_id"]
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
            "sources": ai_response["sources"],
            "requires_handoff": ai_response["requires_handoff"]
        }
    }

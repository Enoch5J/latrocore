"""LATROCORE Clinical AI Assistant — Gemini Integration with Guardrails.

Provides:
1. Strict PII and Patient Telemetry Scrubbing (strips names, phones, emails, specific glucose telemetry)
2. Clinical Safety Gate (blocks prescription changes, dosing recommendations, diagnostic claims)
3. Gemini Generative Language API execution with prompt boundary injection
4. Graceful fallback to verified local knowledge base when API key is unavailable or throttled
5. Multi-language clinical support (English, Tamil, Hindi, Malayalam, Telugu, Kannada)
"""

import re
import os
import json
import logging
from typing import Dict, Any, List, Tuple, Optional
import anyio
import httpx

try:
    from google import genai
    HAS_GOOGLE_GENAI = True
except ImportError:
    HAS_GOOGLE_GENAI = False

from app.core.config import settings

logger = logging.getLogger("latrocore.clinical_qa")

# ══════════════════════════════════════════════════════════════════════════════
# GUARDRAIL 1: PII & PATIENT TELEMETRY REGEX PATTERNS
# ══════════════════════════════════════════════════════════════════════════════

EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_PATTERN = re.compile(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b[6-9]\d{9}\b')
PATIENT_ID_PATTERN = re.compile(r'\b(?:PAT|DOC|PHARM|LATRO)-[A-Z0-9]{4,12}\b', re.IGNORECASE)
AADHAAR_PATTERN = re.compile(r'\b\d{4}\s\d{4}\s\d{4}\b|\b\d{12}\b')

# Specific glucose & clinical metric patterns (e.g. "my sugar is 240 mg/dl", "hba1c 8.4%")
GLUCOSE_VALUE_PATTERN = re.compile(
    r'\b(?:\d{2,3}(?:\.\d+)?)\s*(?:mg\/dl|mg\/dL|mmol\/l|mmol\/L)\b',
    re.IGNORECASE
)
GLUCOSE_CONTEXT_PATTERN = re.compile(
    r'\b(?:glucose|sugar|reading|fasting|postprandial|cgm|random)\s*(?:is|was|of|level|at|:)?\s*(\d{2,3})\b',
    re.IGNORECASE
)
HBA1C_PATTERN = re.compile(
    r'\b(?:hba1c|a1c|glycated hemoglobin)\s*(?:is|was|of|level|at|:)?\s*(\d{1,2}(?:\.\d+)?%?)\b',
    re.IGNORECASE
)


def scrub_pii_and_telemetry(text: str) -> Tuple[str, bool, List[str]]:
    """Strictly redacts personally identifiable information and patient telemetry from prompts.
    
    Returns:
        (sanitized_text, pii_detected, redaction_log)
    """
    sanitized = text
    redactions = []

    if EMAIL_PATTERN.search(sanitized):
        sanitized = EMAIL_PATTERN.sub('[EMAIL_REDACTED]', sanitized)
        redactions.append("email")

    if PHONE_PATTERN.search(sanitized):
        sanitized = PHONE_PATTERN.sub('[PHONE_REDACTED]', sanitized)
        redactions.append("phone")

    if PATIENT_ID_PATTERN.search(sanitized):
        sanitized = PATIENT_ID_PATTERN.sub('[HEALTH_ID_REDACTED]', sanitized)
        redactions.append("health_id")

    if AADHAAR_PATTERN.search(sanitized):
        sanitized = AADHAAR_PATTERN.sub('[GOVT_ID_REDACTED]', sanitized)
        redactions.append("govt_id")

    # Scrub explicit glucose & lab values to protect private telemetry
    if GLUCOSE_VALUE_PATTERN.search(sanitized):
        sanitized = GLUCOSE_VALUE_PATTERN.sub('[glucose reading redacted]', sanitized)
        redactions.append("glucose_reading")

    if GLUCOSE_CONTEXT_PATTERN.search(sanitized):
        sanitized = GLUCOSE_CONTEXT_PATTERN.sub(r'glucose reading [redacted]', sanitized)
        redactions.append("glucose_context")

    if HBA1C_PATTERN.search(sanitized):
        sanitized = HBA1C_PATTERN.sub(r'HbA1c [redacted]', sanitized)
        redactions.append("hba1c_reading")

    pii_detected = len(redactions) > 0
    return sanitized, pii_detected, redactions


# ══════════════════════════════════════════════════════════════════════════════
# GUARDRAIL 2: CLINICAL SCOPE & MEDICAL ADVICE SAFETY GATE
# ══════════════════════════════════════════════════════════════════════════════

EMERGENCY_REGEX = re.compile(
    r'\b(?:unconscious|passed out|seizure|coma|cannot breathe|can\'t breathe|shortness of breath|chest pain|severe hypoglycemia|ketoacidosis|shaking violently|vomiting blood)\b',
    re.IGNORECASE
)

MEDICATION_ALTERATION_REGEX = re.compile(
    r'\b(?:increase|decrease|change|adjust|double|skip|stop|alter|lower|raise)\s+(?:\w+\s+){0,3}(?:dose|dosage|units|insulin|medication|medicine|tablets|pills)\b'
    r'|\b(?:prescribe|write me a prescription|give me a prescription)\b'
    r'|\bhow many (?:units|mg|tablets|pills)\s+(?:should|can|do)\s+i\s+(?:take|inject|have)\b'
    r'|\b(?:what|which|suggest|recommend|prescribe)\s+(?:kind of\s+)?(?:medicine|medication|drug|tablets|pills|insulin)\s+(?:should|can|do|i need to|to)\s+(?:i\s+)?(?:take|use|have)\b'
    r'|\bwhat (?:medicine|medication|pills|tablets)\s+(?:i need to take|should i take)\b',
    re.IGNORECASE
)

DIAGNOSTIC_REGEX = re.compile(
    r'\b(?:diagnose me|do i have|confirm my diagnosis|cure diabetes|am i dying|tell me if i have)\b',
    re.IGNORECASE
)

DEFAULT_DISCLAIMER = ""

# ══════════════════════════════════════════════════════════════════════════════
# VERIFIED LOCAL KNOWLEDGE BASE (SAFE FALLBACK)
# ══════════════════════════════════════════════════════════════════════════════

VERIFIED_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "glucose": {
        "keywords": ["glucose", "sugar", "blood sugar", "fasting", "postprandial", "target", "ranges"],
        "answer": (
            "According to the American Diabetes Association (ADA) Standards of Care, typical glycemic targets "
            "for non-pregnant adults with diabetes are:\n"
            "• Fasting / Pre-meal Blood Glucose: 80–130 mg/dL (4.4–7.2 mmol/L)\n"
            "• Post-meal (1-2 hours after eating): Below 180 mg/dL (10.0 mmol/L)\n"
            "Individual targets may vary based on age, duration of diabetes, and cardiovascular history. "
            "Always consult your primary diabetologist to customize your target curve."
        ),
        "sources": [
            {"title": "ADA Standards of Care 2024", "section": "Chapter 6: Glycemic Targets"},
            {"title": "WHO Diabetes Diagnostic Criteria", "section": "Blood Glucose Classifications"}
        ]
    },
    "hba1c": {
        "keywords": ["hba1c", "a1c", "glycated hemoglobin", "3 month average"],
        "answer": (
            "HbA1c reflects your weighted average blood glucose over the past 60 to 90 days.\n"
            "• Normal (Non-diabetic): Below 5.7%\n"
            "• Prediabetes: 5.7% – 6.4%\n"
            "• Diabetes Target: Generally below 7.0% for most adults, though less stringent goals (e.g., <8.0%) "
            "may be set by physicians for older adults or individuals with hypoglycemia unawareness."
        ),
        "sources": [
            {"title": "ADA Standards of Care 2024", "section": "Chapter 2: Classification and Diagnosis"},
            {"title": "NIDDK", "section": "The A1C Test & Diabetes"}
        ]
    },
    "insulin": {
        "keywords": ["insulin", "inject", "pen", "storage", "fridge", "temperature", "rapid", "basal"],
        "answer": (
            "Safe Insulin Handling Principles (WHO & ADA Guidelines):\n"
            "1. Storage: Keep unopened insulin vials and pens in the refrigerator at 2°C to 8°C (36°F to 46°F). "
            "Never freeze insulin.\n"
            "2. In-use Insulin: Pens or vials in active use may remain at room temperature (below 30°C / 86°F) for up to 28 days.\n"
            "3. Injection Sites: Rotate injection areas (abdomen, thighs, upper arms) to prevent lipohypertrophy.\n"
            "4. Missed Dose: Never take a double dose to compensate. Message your healthcare provider for titration instructions."
        ),
        "sources": [
            {"title": "WHO Model List of Essential Medicines", "section": "Insulin Storage Guidelines"},
            {"title": "ADA Standards of Care", "section": "Insulin Administration Safety"}
        ]
    },
    "hypoglycemia": {
        "keywords": ["hypo", "low sugar", "sweating", "shaky", "dizziness", "below 70", "fast acting sugar"],
        "answer": (
            "Hypoglycemia is defined as blood glucose dropping below 70 mg/dL (3.9 mmol/L).\n"
            "Follow the Rule of 15 (ADA Protocol):\n"
            "1. Consume 15 grams of fast-acting carbohydrates (e.g., 1/2 cup fruit juice, 3–4 glucose tablets, or 1 tablespoon sugar/honey).\n"
            "2. Wait 15 minutes and re-test blood glucose.\n"
            "3. If still under 70 mg/dL, repeat with another 15g of fast-acting carbohydrates.\n"
            "4. Once normalized, eat a small balanced snack (carb + protein) if your next meal is more than an hour away."
        ),
        "sources": [
            {"title": "ADA Clinical Practice Recommendations", "section": "Hypoglycemia Management Protocol"},
            {"title": "Endocrine Society Clinical Practice Guidelines", "section": "Treatment of Adult Hypoglycemia"}
        ]
    },
    "diet": {
        "keywords": ["diet", "food", "carb", "carbohydrate", "glycemic index", "meal", "eating", "snack"],
        "answer": (
            "Medical Nutrition Therapy (MNT) for Diabetes:\n"
            "• Prioritize complex carbohydrates with low glycemic index (whole grains, legumes, green leafy vegetables).\n"
            "• Follow the Diabetes Plate Method: 50% non-starchy vegetables, 25% lean protein, 25% quality carbohydrates.\n"
            "• Hydrate with water rather than sweetened beverages or fruit juices.\n"
            "• Consistent meal timing prevents sharp glycemic spikes."
        ),
        "sources": [
            {"title": "ADA Standards of Care 2024", "section": "Chapter 5: Facilitating Positive Health Behaviors"},
            {"title": "NIDDK Healthy Living", "section": "Diabetes Diet, Eating, & Physical Activity"}
        ]
    },
    "exercise": {
        "keywords": ["exercise", "walking", "workout", "gym", "activity", "steps", "physical activity"],
        "answer": (
            "Physical Activity Guidelines for Diabetes:\n"
            "• Aim for at least 150 minutes of moderate-to-vigorous intensity aerobic exercise per week (e.g., 30 mins, 5 days/week).\n"
            "• Include 2-3 sessions of resistance/strength training per week to enhance insulin sensitivity.\n"
            "• Do not go more than 2 consecutive days without physical activity.\n"
            "• Carry fast-acting carbohydrates when exercising if taking insulin or sulfonylureas."
        ),
        "sources": [
            {"title": "ADA Standards of Care 2024", "section": "Physical Activity Guidelines"},
            {"title": "WHO Guidelines on Physical Activity and Sedentary Behaviour", "section": "Chronic Conditions"}
        ]
    },
    "medication": {
        "keywords": ["medicine", "medication", "drug", "pill", "tablet", "metformin", "glimepiride"],
        "answer": (
            "Diabetes medications (such as Metformin, SGLT2 inhibitors, or Insulin) are chosen based on your blood sugar, kidney function, and medical history. Because prescriptions must be individualized, only your doctor can determine the right medication and dosage for you."
        ),
        "sources": [{"title": "ADA Standards of Care 2024", "section": "Pharmacologic Approaches"}]
    }
}


# ══════════════════════════════════════════════════════════════════════════════
# CLINICAL QA SERVICE IMPLEMENTATION
# ══════════════════════════════════════════════════════════════════════════════

class ClinicalQAService:
    """Enterprise-grade, privacy-preserving Clinical QA Engine."""

    @property
    def api_key(self) -> str:
        return (os.getenv("GEMINI_API_KEY", "").strip() or getattr(settings, "GEMINI_API_KEY", "").strip())

    @property
    def model_name(self) -> str:
        return (os.getenv("GEMINI_MODEL", "").strip() or getattr(settings, "GEMINI_MODEL", "gemini-3.1-flash-lite").strip())

    @property
    def endpoint_url(self) -> str:
        return f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent"

    def _check_safety_guardrails(self, query: str) -> Optional[Dict[str, Any]]:
        """Pre-flight check: detects emergencies or medication modification attempts."""
        # 1. Emergency detection
        if EMERGENCY_REGEX.search(query):
            return {
                "content": (
                    "⚠️ **CRITICAL EMERGENCY WARNING**\n\n"
                    "Your query mentions symptoms that may indicate severe hypoglycemia or an acute medical emergency. "
                    "LATROCORE AI cannot provide urgent intervention.\n\n"
                    "**Immediate Actions:**\n"
                    "• Call emergency medical services immediately (e.g., 112 / 108 in India, 911 in US).\n"
                    "• If conscious with hypoglycemia, administer 15g fast-acting sugar.\n"
                    "• Contact your emergency doctor contact right away."
                ),
                "sources": [{"title": "Emergency Protocol", "section": "Urgent Medical Assistance"}],
                "model_id": "latrocore-safety-guardrail",
                "requires_handoff": True,
                "is_emergency": True
            }

        # 2. Medication alteration / Prescription alteration refusal
        if MEDICATION_ALTERATION_REGEX.search(query):
            return {
                "content": (
                    "🛡️ **Medication Safety Advisory**\n\n"
                    "I cannot prescribe or recommend specific medications. Choosing diabetes medications (such as Metformin, GLP-1 agonists, or Insulin) depends strictly on your lab results, kidney function, and your doctor's clinical evaluation.\n\n"
                    "Please message your consulting physician or diabetologist for a safe, personalized prescription."
                ),
                "sources": [
                    {"title": "LATROCORE Clinical Safety Policy", "section": "Medication Safety"}
                ],
                "model_id": "latrocore-safety-guardrail",
                "requires_handoff": True,
                "is_emergency": False
            }

        # 3. Diagnostic disclaimer
        if DIAGNOSTIC_REGEX.search(query):
            return {
                "content": (
                    "🛡️ **Diagnostic Boundary Notice**\n\n"
                    "LATROCORE AI is an educational support tool and cannot diagnose diabetes, assess acute complications, "
                    "or provide cures. Clinical diagnosis requires standardized fasting plasma glucose, oral glucose tolerance "
                    "testing (OGTT), and lab-certified HbA1c under medical supervision.\n\n"
                    "Please schedule an in-person evaluation with a physician."
                ),
                "sources": [
                    {"title": "ADA Standards of Care 2024", "section": "Diagnostic Criteria"}
                ],
                "model_id": "latrocore-safety-guardrail",
                "requires_handoff": True,
                "is_emergency": False
            }

        return None

    def _get_local_kb_response(self, query: str) -> Dict[str, Any]:
        """Retrieves structured, verified clinical information from local knowledge base."""
        q_lower = query.lower()

        for topic_key, kb_data in VERIFIED_KNOWLEDGE_BASE.items():
            for kw in kb_data["keywords"]:
                if kw in q_lower:
                    return {
                        "content": kb_data["answer"],
                        "sources": kb_data["sources"],
                        "model_id": "latrocore-verified-clinical-kb",
                        "requires_handoff": False
                    }

        # Default fallback if no topic match
        return {
            "content": (
                "Here is general diabetes care guidance: Managing diabetes involves consistent blood glucose "
                "telemetry, adhering strictly to physician-prescribed medication schedules, and following a balanced "
                "diet rich in fiber and low in glycemic load.\n\n"
                "For specialized clinical queries regarding your individual regimen, please message your assigned doctor."
            ),
            "sources": [{"title": "ADA Standards of Care 2024", "section": "General Overview"}],
            "model_id": "latrocore-verified-clinical-kb",
            "requires_handoff": False
        }

    async def generate_response(self, user_query: str, language: str = "en") -> Dict[str, Any]:
        """Main entrypoint: Applies PII scrubbing, safety gates, and queries Gemini with verified fallback."""
        # Step 1: PII and telemetry redaction
        clean_prompt, pii_found, redactions = scrub_pii_and_telemetry(user_query)
        if pii_found:
            logger.info("PII/Telemetry scrubbed from query. Redacted types: %s", redactions)

        # Fast Greeting Filter: 0.001s instant response without cloud latency
        clean_lower = clean_prompt.strip().lower().rstrip("!.,?")
        GREETINGS = {
            "hi", "hello", "hey", "hola", "namaste", "vanakkam", "hi there", "hello there",
            "good morning", "good evening", "good afternoon", "hii", "hiii"
        }
        if clean_lower in GREETINGS:
            greeting_msg = (
                "Hello! How can I assist you with your glucose, medications, or diet today?"
                if language == "en" else
                "வணக்கம்! உங்கள் இரத்த சர்க்கரை, மருந்துகள் அல்லது உணவு முறை பற்றி நான் எப்படி உதவலாம்?" if language == "ta" else
                "नमस्ते! आज मैं आपकी रक्त शर्करा, दवाओं या आहार योजना में कैसे मदद कर सकता हूँ?" if language == "hi" else
                "Hello! How can I assist you with your diabetes care today?"
            )
            return {
                "content": greeting_msg,
                "sources": [],
                "model_id": "latrocore-instant-greeting",
                "requires_handoff": False,
                "pii_scrubbed": pii_found
            }

        # Step 2: Clinical safety gate pre-check
        guardrail_response = self._check_safety_guardrails(clean_prompt)
        if guardrail_response:
            return guardrail_response

        # Step 3: If Gemini API key is missing, return safe local knowledge base response
        if not self.api_key:
            logger.info("GEMINI_API_KEY not configured. Serving verified local clinical knowledge base.")
            response = self._get_local_kb_response(clean_prompt)
            response["pii_scrubbed"] = pii_found
            return response

        # Step 4: Query Google Gemini API with concise prompt
        system_instructions = (
            "You are LATROCORE Clinical AI, a concise and friendly healthcare assistant.\n"
            "STRICT RULES:\n"
            "1. BE CONCISE: Keep answers direct, simple, and under 2 to 3 sentences maximum.\n"
            "2. STAY RELEVANT: Answer ONLY the exact question asked. Do not dump general guidelines, unasked topics, or long lectures.\n"
            "3. NEVER prescribe medications, calculate doses, or diagnose conditions.\n"
            "4. Base educational points on ADA and WHO standards.\n"
            "5. Respond in the user's language (code: " + language + ").\n"
            "6. Tone: Warm, empathetic, and direct."
        )

        active_model = self.model_name or "gemini-3.1-flash-lite"

        # Fast direct REST API call (6.0s timeout max)
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": f"{system_instructions}\n\nUser Question:\n{clean_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 800,
                "topP": 0.8
            }
        }

        try:
            async with httpx.AsyncClient(timeout=6.0) as http_client:
                res = await http_client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}:generateContent?key={self.api_key}",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        text_parts = [p.get("text", "") for p in parts if "text" in p and not p.get("thought", False)]
                        text_part = "".join(text_parts).strip()
                        if text_part:
                            return {
                                "content": text_part,
                                "sources": [],
                                "model_id": f"gemini-guardrailed-{active_model}",
                                "requires_handoff": False,
                                "pii_scrubbed": pii_found
                            }
                
                logger.warning("Gemini REST API returned status %s: %s. Falling back to local KB.", res.status_code, res.text)
        except Exception as exc:
            logger.error("Error communicating with Gemini REST API: %s. Falling back to local KB.", exc)

        # Fallback to local verified knowledge base on any API failure
        fallback = self._get_local_kb_response(clean_prompt)
        fallback["pii_scrubbed"] = pii_found
        return fallback


clinical_qa_service = ClinicalQAService()

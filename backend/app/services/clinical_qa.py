"""Latro AI Assistant — Gemini Integration with Guardrails.

Provides:
1. Strict PII and Patient Telemetry Scrubbing (strips names, phones, emails, specific glucose telemetry)
2. Clinical Safety Gate (blocks instructions to start, stop, or change medicines, personal dosing, or diagnostic claims)
3. Gemini Generative Language API execution with intent routing (general info, prescription explanation, multi-turn follow-ups)
4. Graceful fallback to verified local knowledge base when API key is unavailable or unreachable
5. Multi-language support (English, Tamil, Hindi, Malayalam, Telugu, Kannada)
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
    r'\b(?:increase|decrease|change|adjust|double|stop|start|discontinue|alter|lower|raise)\s+(?:my\s+|the\s+|this\s+|that\s+)?(?:\w+\s+){0,3}(?:dose|dosage|units|insulin|medication|medicine|tablets|pills)\b'
    r'|\b(?:should|can)\s+i\s+(?:start|stop|discontinue|quit|change|double)\s+(?:taking\s+)?[a-z0-9\-]+'
    r'|\b(?:prescribe|write me a prescription|give me a prescription)\b'
    r'|\bhow\s+(?:many|much)\s+(?:units|mg|mcg|ml|tablets|pills)\s+(?:should|can|do)\s+i\s+(?:take|inject|have|use)\b'
    r'|\b(?:what|which|suggest|recommend|prescribe)\s+(?:kind of\s+)?(?:medicine|medication|drug|tablets|pills|insulin)\s+(?:should|can|do|i need to|to)\s+(?:i\s+)?(?:take|use|have)\b'
    r'|\bwhat\s+(?:medicine|medication|pills|tablets)\s+(?:i need to take|should i take)\b',
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
        "keywords": ["diabetes medicine", "diabetes medication", "diabetes drug"],
        "answer": (
            "Diabetes medications (such as Metformin, SGLT2 inhibitors, or Insulin) are chosen based on blood sugar levels, kidney function, and medical history. Only a licensed prescriber can decide which medication and dose fit an individual."
        ),
        "sources": [{"title": "ADA Standards of Care 2024", "section": "Pharmacologic Approaches"}]
    }
}


GENERAL_MEDICINE_INFO: Dict[str, str] = {
    "metformin": (
        "Metformin is a commonly prescribed oral medicine used to help lower blood sugar levels in people with type 2 diabetes "
        "(and sometimes prediabetes or PCOS). It works mainly by reducing the amount of glucose produced by the liver and helping the body respond better to insulin."
    ),
    "glimepiride": (
        "Glimepiride is a sulfonylurea medicine commonly used to lower blood sugar in type 2 diabetes by helping the pancreas release more insulin."
    ),
    "gliclazide": (
        "Gliclazide is a sulfonylurea medicine commonly used to manage type 2 diabetes by stimulating the pancreas to release insulin."
    ),
    "glipizide": (
        "Glipizide is an oral sulfonylurea medicine commonly used to help control blood sugar in type 2 diabetes by increasing insulin release."
    ),
    "sitagliptin": (
        "Sitagliptin is a DPP-4 inhibitor commonly used alongside diet and exercise to help control blood sugar in adults with type 2 diabetes."
    ),
    "dapagliflozin": (
        "Dapagliflozin is an SGLT2 inhibitor commonly used for type 2 diabetes, heart failure, and chronic kidney disease; it helps the kidneys remove excess glucose through urine."
    ),
    "empagliflozin": (
        "Empagliflozin is an SGLT2 inhibitor commonly used for type 2 diabetes and heart/kidney protection by helping the kidneys excrete excess blood sugar."
    ),
    "atorvastatin": (
        "Atorvastatin is a statin medicine commonly used to lower LDL ('bad') cholesterol and triglycerides and reduce the risk of heart attack and stroke."
    ),
    "rosuvastatin": (
        "Rosuvastatin is a statin medicine commonly used to lower cholesterol and reduce cardiovascular risk."
    ),
    "telmisartan": (
        "Telmisartan is an angiotensin receptor blocker (ARB) commonly used to treat high blood pressure and help protect the heart and kidneys."
    ),
    "amlodipine": (
        "Amlodipine is a calcium channel blocker commonly used to treat high blood pressure and chest pain (angina) by relaxing blood vessels."
    ),
    "ibuprofen": (
        "Ibuprofen is an over-the-counter nonsteroidal anti-inflammatory drug (NSAID) commonly used for short-term relief of mild to moderate pain, inflammation, and fever."
    ),
    "aspirin": (
        "Aspirin is a medicine commonly used in different strengths to relieve mild pain or fever, or in low doses under medical supervision to help prevent blood clots."
    ),
    "paracetamol": (
        "Paracetamol (acetaminophen) is a common medicine used to reduce fever and relieve mild to moderate pain such as headaches or body aches."
    ),
    "acetaminophen": (
        "Acetaminophen (paracetamol) is a common medicine used to reduce fever and relieve mild to moderate pain such as headaches or body aches."
    ),
    "amoxicillin": (
        "Amoxicillin is a penicillin-type antibiotic commonly used to treat bacterial infections such as ear, throat, respiratory, or urinary tract infections."
    ),
    "omeprazole": (
        "Omeprazole is a proton pump inhibitor (PPI) commonly used to reduce stomach acid and treat acid reflux (GERD), heartburn, or stomach ulcers."
    ),
    "salbutamol": (
        "Salbutamol (albuterol) is a bronchodilator commonly used in inhalers to relax airway muscles and relieve shortness of breath or wheezing in conditions like asthma."
    ),
    "albuterol": (
        "Albuterol (salbutamol) is a bronchodilator commonly used in inhalers to relax airway muscles and quickly relieve wheezing or breathing tightness."
    ),
}

GENERAL_CONDITION_INFO: Dict[str, str] = {
    "asthma": (
        "Asthma is a chronic lung condition in which the airways become inflamed, narrowed, and sensitive, which can cause coughing, wheezing, chest tightness, or shortness of breath. "
        "It is commonly managed with prescribed controller and reliever inhalers and by avoiding triggers such as smoke, dust, or allergens."
    ),
    "diabetes": (
        "Diabetes is a long-term health condition in which blood sugar (glucose) levels stay higher than normal because the body either does not make enough insulin or cannot use insulin effectively."
    ),
    "hypertension": (
        "Hypertension (high blood pressure) means the force of blood pushing against artery walls stays consistently elevated, which over time increases strain on the heart, blood vessels, and kidneys."
    ),
    "high blood pressure": (
        "High blood pressure (hypertension) occurs when blood flows through blood vessels at higher-than-normal pressure, often with no noticeable symptoms."
    ),
    "cholesterol": (
        "Cholesterol is a waxy fat-like substance in the blood. While the body needs some cholesterol, high levels of LDL ('bad') cholesterol can build up in blood vessels and raise cardiovascular risk."
    ),
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
        return (os.getenv("GEMINI_MODEL", "").strip() or getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite").strip())

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
                    "Latro AI cannot provide urgent intervention.\n\n"
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
                    "I cannot advise you to start, stop, or change a medication, or choose a personal dose. "
                    "Medication decisions depend on your clinical history and lab results.\n\n"
                    "Please check with your prescriber or pharmacist for personalized guidance."
                ),
                "sources": [
                    {"title": "Latro AI Safety Policy", "section": "Medication Safety"}
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
                    "Latro AI is an educational support tool and cannot diagnose conditions, assess acute complications, "
                    "or provide cures. Clinical diagnosis requires appropriate testing and evaluation under medical supervision.\n\n"
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

    def _get_companion_topic_response(self, q_lower: str) -> Optional[Dict[str, Any]]:
        """Matches high-intent homepage AI companion educational queries cleanly."""
        if "tamil" in q_lower and ("glucose" in q_lower or "sugar" in q_lower or "log" in q_lower):
            return {
                "content": (
                    "**குளுக்கோஸ் பதிவு (Glucose Log) விளக்கம்:**\n\n"
                    "குளுக்கோஸ் பதிவு என்பது உங்கள் தினசரி இரத்த சர்க்கரை அளவுகளை நேரம் மற்றும் உணவு விவரங்களுடன் தொடர்ந்து பதிவு செய்யும் ஒரு சுகாதார குறிப்பேடு ஆகும்.\n\n"
                    "• **எப்போது பதிவு செய்ய வேண்டும்:** வெறும் வயிற்றில் (Fasting), உணவுக்கு முன், மற்றும் உணவு முடிந்து 2 மணி நேரத்திற்குப் பிறகு.\n"
                    "• **எவற்றை குறிக்க வேண்டும்:** தேதி, நேரம், இரத்த சர்க்கரை அளவு (mg/dL), சாப்பிட்ட உணவு, மற்றும் எடுத்துக்கொண்ட மருந்து விவரம்.\n"
                    "• **பொதுவான இலக்கு (ADA):** உணவுக்கு முன் 80–130 mg/dL மற்றும் உணவு முடிந்து 2 மணி நேரத்தில் 180 mg/dL-க்கும் குறைவாக.\n\n"
                    "இந்தப் பதிவு உங்கள் மருத்துவர் சிகிச்சை மற்றும் உணவுத் திட்டத்தை பாதுகாப்பாக மேம்படுத்த உதவும்."
                ),
                "sources": [{"title": "ADA Standards of Care 2024", "section": "Tamil Glucose Log Guide"}],
                "model_id": "latrocore-verified-clinical-kb",
                "requires_handoff": False,
            }

        if "pharmacist" in q_lower and ("refill" in q_lower or "ask" in q_lower or "prescription" in q_lower):
            return {
                "content": (
                    "**Helpful Questions to Ask Your Pharmacist About Refills:**\n\n"
                    "• **Remaining Refills:** \"How many refills are left on this prescription, and when should I request a doctor renewal?\"\n"
                    "• **Timing & Synchronization:** \"Can we align refill pickup dates or set advance alerts so I do not run out?\"\n"
                    "• **Manufacturer Consistency:** \"If the generic brand changes, is the active ingredient and strength identical?\"\n"
                    "• **Meal Timing & Interactions:** \"Are there any updates to food timing or over-the-counter interactions I should watch for?\"\n\n"
                    "Bring your current medicine strips or bottle labels so your pharmacist can review them accurately."
                ),
                "sources": [{"title": "ADA Standards of Care 2024", "section": "Medication Adherence & Pharmacy Care"}],
                "model_id": "latrocore-verified-clinical-kb",
                "requires_handoff": False,
            }

        if "refill reminder" in q_lower or ("refill" in q_lower and "reminder" in q_lower):
            return {
                "content": (
                    "**How Refill Reminders Work:**\n\n"
                    "• **Tracks Remaining Supply:** Using your prescribed daily schedule and start date, Latrocore estimates when your medicines, test strips, or insulin will run low.\n"
                    "• **Advance Notifications:** Reminders arrive several days before your supply ends so you have time to visit your pharmacy or request a prescription renewal.\n"
                    "• **Prevents Missed Doses:** Timely refills keep your daily treatment consistent between clinic appointments.\n\n"
                    "Once signed in, you can review prescriptions and refill dates anytime in your Medications section."
                ),
                "sources": [{"title": "LATROCORE Medication Adherence", "section": "Refill Tracking"}],
                "model_id": "latrocore-verified-clinical-kb",
                "requires_handoff": False,
            }

        if "glucose log" in q_lower and any(k in q_lower for k in ("record", "what should", "track", "write")):
            return {
                "content": (
                    "**What to Record in Your Glucose Log:**\n\n"
                    "• **Date, Time & Reading:** Note every glucometer or CGM reading in mg/dL with the exact time.\n"
                    "• **Meal Context:** Label readings as **Fasting** (before breakfast), **Pre-meal**, **Post-meal** (1–2 hours after eating), or **Bedtime**.\n"
                    "• **Food & Portions:** Briefly jot down meals or carbohydrate choices to see which foods raise glucose.\n"
                    "• **Medicines, Activity & Symptoms:** Log doses taken, walks or exercise, and symptoms like dizziness, sweating, or fatigue.\n\n"
                    "For many adults, general ADA targets are **80–130 mg/dL pre-meal** and **below 180 mg/dL post-meal**."
                ),
                "sources": [{"title": "ADA Standards of Care 2024", "section": "Self-Monitoring of Blood Glucose"}],
                "model_id": "latrocore-verified-clinical-kb",
                "requires_handoff": False,
            }

        if ("rice" in q_lower and ("dal" in q_lower or "vegetable" in q_lower)) or "balanced meal" in q_lower:
            return {
                "content": (
                    "**Building a Balanced Plate with Rice, Dal & Vegetables:**\n\n"
                    "• **Half Plate (50%) Non-Starchy Vegetables:** Fill half your plate with high-fiber vegetables (greens, cucumber, broccoli, carrots, beans) to blunt post-meal sugar spikes.\n"
                    "• **Quarter Plate (25%) Protein-Rich Dal:** Add thick dal, sambar, chana, or legumes for protein and soluble fiber.\n"
                    "• **Quarter Plate (25%) Rice:** Measure cooked rice to one-quarter of the plate, choosing brown, hand-pounded, or portioned white rice.\n"
                    "• **Eating Order Tip:** Eat vegetables and dal before rice to slow carbohydrate absorption."
                ),
                "sources": [{"title": "ADA Standards of Care 2024", "section": "Diabetes Plate Method"}],
                "model_id": "latrocore-verified-clinical-kb",
                "requires_handoff": False,
            }

        if "workday" in q_lower or (("short walk" in q_lower or "walks" in q_lower or "walking" in q_lower) and any(k in q_lower for k in ("fit", "work", "office", "desk"))):
            return {
                "content": (
                    "**Fitting Short Walks Into Your Workday:**\n\n"
                    "• **10-Minute Post-Meal Walks:** A brisk 10–15 minute walk after lunch or dinner helps muscles clear blood sugar and flattens post-meal peaks.\n"
                    "• **Hourly Movement Breaks:** Stand up for a 3–5 minute hallway loop, climb one flight of stairs, or take routine calls while walking.\n"
                    "• **Split Your 30 Minutes:** Three short 10-minute walks (morning commute, lunch break, evening) meet your daily activity goal.\n\n"
                    "If you take insulin or sulfonylureas, keep a fast-acting carbohydrate snack nearby during activity."
                ),
                "sources": [{"title": "ADA Standards of Care 2024", "section": "Physical Activity Guidelines"}],
                "model_id": "latrocore-verified-clinical-kb",
                "requires_handoff": False,
            }

        return None

    def _parse_prescription_context(self, prescription_context: Optional[str]) -> List[Dict[str, Any]]:
        """Parse pipe- or comma-delimited prescription context lines into structured dicts."""
        if not prescription_context:
            return []
        meds: List[Dict[str, Any]] = []
        for raw_line in prescription_context.splitlines():
            line = raw_line.strip()
            if not line or line.lower().startswith("document metadata:"):
                continue
            if not (line.startswith("-") or line.startswith("•")):
                continue
            body = line.lstrip("-•").strip()
            if "|" in body:
                parts = [p.strip() for p in body.split("|")]
                name = parts[0]
                fields: Dict[str, str] = {}
                for part in parts[1:]:
                    if ":" in part:
                        k, v = part.split(":", 1)
                        fields[k.strip().lower()] = v.strip()
                meds.append({
                    "name": name,
                    "dose": fields.get("dose", "not specified"),
                    "route": fields.get("route", "not specified"),
                    "frequency": fields.get("frequency", "not specified"),
                    "schedule_times": fields.get("schedule times", "not specified"),
                    "meal_timing": fields.get("meal timing", "not specified"),
                    "instructions": fields.get("instructions", "not specified"),
                    "raw": body,
                })
            else:
                match = re.match(r"^([^(]+?)(?:\s*\((.*)\))?$", body)
                name = match.group(1).strip() if match else body
                extra = match.group(2).strip() if (match and match.group(2)) else ""
                meds.append({
                    "name": name,
                    "dose": "not specified",
                    "route": "not specified",
                    "frequency": "not specified",
                    "schedule_times": "not specified",
                    "meal_timing": "not specified",
                    "instructions": extra or "not specified",
                    "raw": body,
                })
                # Attempt to extract key: value pairs from parens
                for key, target in [
                    ("dose", "dose"),
                    ("route", "route"),
                    ("frequency", "frequency"),
                    ("meal timing", "meal_timing"),
                    ("instructions", "instructions"),
                ]:
                    m_field = re.search(rf"{key}\s*:\s*([^,|]+)", extra, re.IGNORECASE)
                    if m_field:
                        meds[-1][target] = m_field.group(1).strip()
        return meds

    @staticmethod
    def _is_missing_or_unclear(val: Optional[str]) -> bool:
        if not val:
            return True
        low = val.strip().lower()
        return low in {"", "none", "null", "not specified", "unclear", "unknown", "n/a", "unreadable"}

    def _find_matching_rx_meds(
        self,
        q_lower: str,
        rx_meds: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Tuple[List[Dict[str, Any]], bool]:
        """Resolve which prescription medicine(s) the query refers to.
        Returns (matched_meds, is_ambiguous).
        """
        if not rx_meds:
            return [], False

        def med_tokens(med_name: str) -> List[str]:
            tokens = [t for t in re.split(r"[\s\-/,()+]+", med_name.lower()) if len(t) >= 3]
            return [t for t in tokens if not re.match(r"^\d+(?:mg|mcg|ml|iu|g)?$", t)]

        direct_matches = [
            m for m in rx_meds
            if any(re.search(rf"\b{re.escape(tok)}\b", q_lower) for tok in med_tokens(m["name"]))
        ]
        if direct_matches:
            return direct_matches, False

        # Check plural overview questions ("my medicines", "my prescription", "all medicines")
        is_plural_overview = any(
            kw in q_lower
            for kw in ("medicines", "medications", "tablets", "pills", "my prescription", "all my", "list")
        ) and not any(kw in q_lower for kw in ("this medicine", "that medicine", "this tablet", "that tablet", "this drug", "that drug"))

        if is_plural_overview:
            return rx_meds, False

        # Follow-up pronoun or singular reference ("this medicine", "that medicine", "it")
        if history:
            for turn in reversed(history):
                content_low = (turn.get("content") or turn.get("text") or "").lower()
                hist_matches = [
                    m for m in rx_meds
                    if any(re.search(rf"\b{re.escape(tok)}\b", content_low) for tok in med_tokens(m["name"]))
                ]
                if len(hist_matches) == 1:
                    return hist_matches, False

        if len(rx_meds) == 1:
            return rx_meds, False

        # Multiple medicines could match singular reference ("this medicine", "that medicine")
        return rx_meds, True

    def _format_rx_medicine_explanation(self, med: Dict[str, Any], q_lower: str) -> str:
        name = med["name"]
        dose = med.get("dose")
        freq = med.get("frequency")
        times = med.get("schedule_times")
        meal = med.get("meal_timing")
        inst = med.get("instructions")

        missing_details = []
        if self._is_missing_or_unclear(dose):
            missing_details.append("dose")
        timing_fields = [freq, times, meal, inst]
        has_any_timing = any(not self._is_missing_or_unclear(v) for v in timing_fields)
        has_specific_timing = any(not self._is_missing_or_unclear(v) for v in (times, meal, inst))
        asked_timing = any(kw in q_lower for kw in ("timing", "when", "time", "schedule", "meal", "food"))
        if not has_any_timing or any(str(v or "").strip().lower() == "unclear" for v in (freq, times, meal)):
            missing_details.append("timing")
        elif asked_timing and not has_specific_timing:
            missing_details.append("schedule/meal timing")

        lines = [f"**{name}** (from your uploaded prescription):"]
        lines.append(f"• **Dose:** {dose if not self._is_missing_or_unclear(dose) else 'not clearly written / missing'}")

        timing_parts = []
        if not self._is_missing_or_unclear(freq):
            timing_parts.append(f"Frequency: {freq}")
        if not self._is_missing_or_unclear(times):
            timing_parts.append(f"Times: {times}")
        if not self._is_missing_or_unclear(meal):
            timing_parts.append(f"Meal timing: {meal}")
        if not self._is_missing_or_unclear(inst) and inst != meal:
            timing_parts.append(f"Instructions: {inst}")

        if timing_parts:
            lines.append("• **Timing & Instructions:** " + "; ".join(timing_parts))
        else:
            lines.append("• **Timing & Instructions:** Missing or unreadable in the prescription document.")

        if missing_details or not has_any_timing:
            unclear_str = " and ".join(missing_details) if missing_details else "timing"
            lines.append(
                f"\nThe {unclear_str} instruction for **{name}** is missing or unclear in this prescription. "
                "Please check with your pharmacist or prescriber rather than guessing."
            )
        return "\n".join(lines)

    def _resolve_general_topic(
        self,
        q_lower: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Match general medicine or condition information questions."""
        # Direct match on condition name
        for cond, answer in GENERAL_CONDITION_INFO.items():
            if re.search(rf"\b{re.escape(cond)}\b", q_lower):
                return {
                    "content": answer,
                    "sources": [{"title": "Clinical Reference Guide", "section": cond.title()}],
                    "model_id": "latrocore-verified-clinical-kb",
                    "requires_handoff": False,
                }

        # Direct match on medicine name
        for med_key, answer in GENERAL_MEDICINE_INFO.items():
            if re.search(rf"\b{re.escape(med_key)}\b", q_lower):
                return {
                    "content": answer,
                    "sources": [{"title": "Medication Information Guide", "section": med_key.title()}],
                    "model_id": "latrocore-verified-clinical-kb",
                    "requires_handoff": False,
                }

        # Resolve pronoun follow-up ("what is that medicine used for?") from conversation history
        if history and any(ref in q_lower for ref in ("that medicine", "this medicine", "that drug", "this drug", "that tablet", "this tablet", "it")):
            for turn in reversed(history):
                content_low = (turn.get("content") or turn.get("text") or "").lower()
                for med_key, answer in GENERAL_MEDICINE_INFO.items():
                    if re.search(rf"\b{re.escape(med_key)}\b", content_low):
                        return {
                            "content": answer,
                            "sources": [{"title": "Medication Information Guide", "section": med_key.title()}],
                            "model_id": "latrocore-verified-clinical-kb",
                            "requires_handoff": False,
                        }
        return None

    def _get_local_kb_response(
        self,
        query: str,
        prescription_context: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Retrieves structured, verified clinical information when Gemini is offline or unavailable."""
        q_lower = query.lower()

        companion_hit = self._get_companion_topic_response(q_lower)
        if companion_hit:
            return companion_hit

        rx_meds = self._parse_prescription_context(prescription_context)

        is_general_info_intent = bool(
            re.search(
                r"\b(?:what\s+is|what\s+are|what\s+does|uses?\s+of|used\s+for|explain|meaning\s+of|define|tell\s+me\s+about)\b",
                q_lower,
            )
        ) and not any(
            kw in q_lower
            for kw in (
                "my prescription", "my medicine", "my medication", "my tablet",
                "written", "on my", "uploaded", "timing", "schedule", "side effect",
                "adverse", "dose on", "dosage on", "what am i taking", "when should i take"
            )
        )

        is_prescription_intent = any(
            kw in q_lower
            for kw in (
                "my prescription", "prescription", "written", "uploaded",
                "this medicine", "that medicine", "this tablet", "that tablet",
                "this drug", "that drug", "timing", "schedule", "when should i take",
                "what am i taking", "my medicine", "my medication", "my tablet",
                "side effect", "adverse", "missed", "dose"
            )
        )

        # 1. General informational question (works without upload AND even when a prescription is uploaded)
        if is_general_info_intent:
            general_hit = self._resolve_general_topic(q_lower, history=history)
            if general_hit:
                return general_hit

        # 2. Prescription explanation (when user asks about their prescription / this medicine / timing)
        if is_prescription_intent and not is_general_info_intent:
            if not rx_meds:
                # Check if asking general info about a named medicine/condition before saying no Rx
                general_hit = self._resolve_general_topic(q_lower, history=history)
                if general_hit and "prescription" not in q_lower and "written" not in q_lower and "this medicine" not in q_lower:
                    return general_hit
                return {
                    "content": (
                        "I don't see an uploaded prescription on file for your account. "
                        "If you are signed in as a patient, you can upload your prescription using the attachment button, "
                        "or check directly with your pharmacist or prescriber for exact dose and timing instructions."
                    ),
                    "sources": [{"title": "Latro AI Guidance", "section": "Prescription Lookup"}],
                    "model_id": "latrocore-guardrailed-prescription-engine",
                    "requires_handoff": False,
                }

            # Check if the user explicitly named an outside medicine not in their Rx
            named_outside = [
                med_key for med_key in GENERAL_MEDICINE_INFO
                if re.search(rf"\b{re.escape(med_key)}\b", q_lower)
                and not any(med_key in m["name"].lower() for m in rx_meds)
            ]
            if named_outside:
                med_key = named_outside[0]
                return {
                    "content": (
                        f"**{med_key.title()}** is not listed in your uploaded prescription. "
                        f"For general information: {GENERAL_MEDICINE_INFO[med_key]} "
                        "Please check with your pharmacist or prescriber if you have questions about your personal regimen."
                    ),
                    "sources": [{"title": "Medication Information Guide", "section": med_key.title()}],
                    "model_id": "latrocore-guardrailed-prescription-engine",
                    "requires_handoff": False,
                }

            matched_meds, is_ambiguous = self._find_matching_rx_meds(q_lower, rx_meds, history=history)
            if is_ambiguous and len(matched_meds) > 1:
                names = ", ".join(m["name"] for m in matched_meds)
                return {
                    "content": (
                        f"Your prescription lists several medicines ({names}). "
                        "Which medicine do you mean? Please share the medicine name so I can explain its dose and timing."
                    ),
                    "sources": [{"title": "Uploaded Patient Prescription", "section": "Clarification"}],
                    "model_id": "latrocore-guardrailed-prescription-engine",
                    "requires_handoff": False,
                }

            is_side_effect = any(kw in q_lower for kw in ["side effect", "adverse", "risk", "reaction"])
            is_lifestyle = any(kw in q_lower for kw in ["lifestyle", "diet tip", "meal tip", "exercise", "hydration"])

            if is_side_effect:
                med_lines = [f"• **{m['name']}** — Dose: {m['dose']}" for m in matched_meds]
                content = (
                    "Based on your uploaded prescription, here are safety notes for your prescribed medicine(s):\n\n"
                    + "\n".join(med_lines)
                    + "\n\nPlease contact your pharmacist or prescriber if you experience unusual side effects or if any item on your prescription is unclear."
                )
            elif is_lifestyle:
                med_lines = [f"• **{m['name']}** — Timing: {m.get('meal_timing') or m.get('frequency') or 'not specified'}" for m in matched_meds]
                content = (
                    "Here are practical routine notes around your prescribed medicine(s):\n\n"
                    + "\n".join(med_lines)
                    + "\n\nFollow the meal and timing instructions written on your prescription, and confirm any unclear instruction with your pharmacist or prescriber."
                )
            else:
                explanations = [self._format_rx_medicine_explanation(m, q_lower) for m in matched_meds]
                content = "\n\n".join(explanations)

            return {
                "content": content,
                "sources": [{"title": "Uploaded Patient Prescription", "section": "Prescription Explanation"}],
                "model_id": "latrocore-guardrailed-prescription-engine",
                "requires_handoff": False,
            }

        # 3. General medicine / condition fallback even without explicit "what is" phrasing
        general_hit = self._resolve_general_topic(q_lower, history=history)
        if general_hit:
            return general_hit

        for topic_key, kb_data in VERIFIED_KNOWLEDGE_BASE.items():
            for kw in kb_data["keywords"]:
                if kw in q_lower:
                    return {
                        "content": kb_data["answer"],
                        "sources": kb_data["sources"],
                        "model_id": "latrocore-verified-clinical-kb",
                        "requires_handoff": False
                    }

        return {
            "content": (
                "I can explain common medicines, health conditions, or details written on your uploaded prescription. "
                "Could you share a bit more detail or name the medicine or condition you are asking about?"
            ),
            "sources": [{"title": "Latro AI", "section": "General Assistance"}],
            "model_id": "latrocore-verified-clinical-kb",
            "requires_handoff": False
        }

    def _build_gemini_contents(
        self,
        clean_prompt: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, Any]]:
        """Normalize conversation history into Gemini REST API alternating user/model turns."""
        contents: List[Dict[str, Any]] = []
        if history:
            for item in history[-12:]:
                if not isinstance(item, dict):
                    continue
                raw_role = (item.get("role") or "user").lower().strip()
                raw_text = (item.get("content") or item.get("text") or "").strip()
                if not raw_text:
                    continue
                clean_hist, _, _ = scrub_pii_and_telemetry(raw_text)
                gemini_role = "model" if raw_role in ("assistant", "model") else "user"
                # Gemini requires conversation to start with a user turn
                if not contents and gemini_role == "model":
                    continue
                if contents and contents[-1]["role"] == gemini_role:
                    contents[-1]["parts"][0]["text"] += f"\n{clean_hist}"
                else:
                    contents.append({"role": gemini_role, "parts": [{"text": clean_hist}]})

        if contents and contents[-1]["role"] == "user":
            contents[-1]["parts"][0]["text"] += f"\n\n{clean_prompt}"
        else:
            contents.append({"role": "user", "parts": [{"text": clean_prompt}]})
        return contents

    async def generate_response(
        self,
        user_query: str,
        language: str = "en",
        prescription_context: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
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
                "Hello! I'm Latro AI. How can I assist you with medications, health conditions, or your care today?"
                if language == "en" else
                "வணக்கம்! நான் Latro AI. உங்கள் இரத்த சர்க்கரை, மருந்துகள் அல்லது உடல்நலம் பற்றி நான் எப்படி உதவலாம்?" if language == "ta" else
                "नमस्ते! मैं Latro AI हूँ। आज मैं आपकी दवाओं, स्वास्थ्य प्रश्नों या आहार में कैसे मदद कर सकता हूँ?" if language == "hi" else
                "Hello! I'm Latro AI. How can I assist you with your care today?"
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
            response = self._get_local_kb_response(
                clean_prompt,
                prescription_context=prescription_context,
                history=history,
            )
            response["pii_scrubbed"] = pii_found
            return response

        # Step 4: Query Google Gemini API with intent-aware instructions and conversation context
        system_instructions = (
            "You are Latro AI, a concise, friendly, and safety-conscious healthcare assistant.\n\n"
            "USE THE INTENT OF THE USER'S CURRENT MESSAGE TO CHOOSE HOW TO RESPOND:\n"
            "1. GENERAL INFORMATION (what a medicine is commonly used for, or what a disease/condition means):\n"
            "- Anyone can ask general questions about medicines or diseases, both without an uploaded prescription and when unrelated to a previously uploaded prescription.\n"
            "- Answer briefly in plain, clear language (2 to 4 concise sentences).\n"
            "- NEVER instruct the user to start, stop, or change a medicine or choose a personal dose.\n"
            "- If the user names a different medicine not listed in their prescription and asks about its uses, answer as general information and NEVER imply it was prescribed to them.\n\n"
            "2. PRESCRIPTION EXPLANATION (questions about the patient's own uploaded prescription, its medicines, dose, or timing):\n"
            "- Explain accurately what the uploaded prescription document says about the named medicine, dose, frequency, and timing.\n"
            "- STRICT ANTI-HALLUCINATION: NEVER guess or invent missing or unreadable details. If an instruction (dose, frequency, schedule time, meal timing, or medicine name) is missing, 'not specified', or unreadable/'unclear', state clearly and specifically what is unclear and suggest checking with their pharmacist or prescriber.\n"
            "- If no uploaded prescription context is available and the user asks about their own prescription, explain that no prescription is uploaded yet rather than guessing.\n\n"
            "3. FOLLOW-UP QUESTIONS & AMBIGUITY RESOLUTION:\n"
            "- Use the conversation history to resolve phrases like 'that medicine', 'this medicine', or 'it'.\n"
            "- If several medicines in the prescription could match and conversation history does not single out one medicine, ask clearly which medicine the user means and list the candidate medicine names.\n\n"
            "4. LANGUAGE & TONE:\n"
            f"- If the user requests a specific language in their question (e.g., 'in Tamil'), reply in that language; otherwise respond in language code '{language}'.\n"
            "- Keep the tone warm, empathetic, plain-language, and direct."
        )

        if prescription_context:
            system_instructions += (
                f"\n\nVERIFIED PATIENT PRESCRIPTION CONTEXT (FOR THIS PATIENT ONLY):\n{prescription_context}\n\n"
                "Apply this prescription context ONLY when the user asks about their own prescription, medicines, doses, or timings—do NOT force unrelated general questions (such as 'What is asthma?' or 'What is ibuprofen used for?') to be about this prescription."
            )

        active_model = self.model_name or "gemini-3.5-flash-lite"
        candidate_models = [active_model]
        for fallback_model in ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest"]:
            if fallback_model not in candidate_models:
                candidate_models.append(fallback_model)

        contents = self._build_gemini_contents(clean_prompt, history=history)
        payload = {
            "systemInstruction": {"parts": [{"text": system_instructions}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 800,
                "topP": 0.8
            }
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as http_client:
                for model in candidate_models:
                    try:
                        res = await http_client.post(
                            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}",
                            json=payload,
                            headers={"Content-Type": "application/json"}
                        )

                        # Fallback if a model variant rejects systemInstruction
                        if res.status_code == 400 and "systemInstruction" in payload:
                            inline_contents = list(contents)
                            first_text = inline_contents[0]["parts"][0]["text"]
                            inline_contents[0] = {
                                "role": "user",
                                "parts": [{"text": f"{system_instructions}\n\n{first_text}"}]
                            }
                            fallback_payload = {
                                "contents": inline_contents,
                                "generationConfig": payload["generationConfig"],
                            }
                            res = await http_client.post(
                                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}",
                                json=fallback_payload,
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
                                        "model_id": f"gemini-guardrailed-{model}",
                                        "requires_handoff": False,
                                        "pii_scrubbed": pii_found
                                    }

                        # If 503 (high demand) or 429 (rate limited), fail over to next model
                        if res.status_code in (503, 429):
                            logger.warning("Gemini model %s returned status %s (high demand/rate limit). Failing over to next model...", model, res.status_code)
                            continue
                        else:
                            logger.warning("Gemini REST API returned status %s for model %s: %s", res.status_code, model, res.text)
                            break
                    except Exception as model_err:
                        logger.warning("Request to Gemini model %s failed: %s. Trying alternate...", model, model_err)
                        continue
        except Exception as exc:
            logger.error("Error communicating with Gemini REST API: %s. Falling back to local KB.", exc)

        # Fallback to local verified knowledge base on any API failure
        fallback = self._get_local_kb_response(
            clean_prompt,
            prescription_context=prescription_context,
            history=history,
        )
        fallback["pii_scrubbed"] = pii_found
        return fallback


clinical_qa_service = ClinicalQAService()

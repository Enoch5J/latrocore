import pytest
from starlette.testclient import TestClient
from datetime import date
from app.core.database import SessionLocal, Base, engine
from app.models.models import User, Patient, Prescription, CarePlan, DoseInstance
import main

client = TestClient(main.app, base_url="https://localhost:5173")
CSRF_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://localhost:5173"
}

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def get_patient_token():
    res = client.post(
        "/auth/login",
        json={"email": "patient@latrocore.com", "password": "patient123"},
        headers=CSRF_HEADERS
    )
    assert res.status_code == 200, res.text
    return res.json()["accessToken"]


def test_analyze_prescription_requires_input():
    token = get_patient_token()
    res = client.post(
        "/api/v1/prescriptions/analyze",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "No prescription file or text" in res.json().get("detail", "")


def test_apply_ai_prescription_creates_schedule_and_care_plan():
    token = get_patient_token()

    payload = {
        "doctor_name": "Dr. Sarah Jenkins, MD",
        "clinic_name": "Apollo Care Center",
        "diagnosis": "Type 2 Diabetes Mellitus",
        "prescription_date": str(date.today()),
        "medicines": [
            {
                "name": "Metformin 500mg",
                "dose": "500mg",
                "route": "Oral",
                "frequency": "Twice daily",
                "schedule_times": ["08:00", "20:00"],
                "meal_timing": "With meals",
                "is_prn": False,
                "is_insulin": False,
                "instructions": "Take with breakfast and dinner"
            },
            {
                "name": "Glimepiride 1mg",
                "dose": "1mg",
                "route": "Oral",
                "frequency": "Once daily",
                "schedule_times": ["07:45"],
                "meal_timing": "15 min before breakfast",
                "is_prn": False,
                "is_insulin": False,
                "instructions": "Take 15 min before breakfast"
            }
        ],
        "diet_plan": {
            "summary": "Controlled glycemic index diet with balanced carb distribution.",
            "meals": [
                {
                    "type": "Breakfast",
                    "recommended_time": "08:00 AM",
                    "suggested_foods": "Oats with nuts and seeds, boiled egg",
                    "carb_target_grams": 40,
                    "instructions": "Take Metformin 500mg after meal"
                },
                {
                    "type": "Lunch",
                    "recommended_time": "01:00 PM",
                    "suggested_foods": "Brown rice with dal and mixed vegetable curry",
                    "carb_target_grams": 50,
                    "instructions": "Hydrate well before and after meal"
                }
            ],
            "hydration_target_liters": 2.5,
            "foods_to_avoid": ["Refined sugar", "Sweetened beverages"],
            "clinical_precautions": ["Carry glucose tablets for hypoglycemia prevention"]
        },
        "daily_schedule": {
            "morning": "07:45 AM: Glimepiride 1mg -> 08:00 AM: Breakfast + Metformin 500mg",
            "afternoon": "01:00 PM: Balanced lunch",
            "evening": "05:00 PM: Evening snack. 08:00 PM: Dinner + Metformin 500mg",
            "bedtime": "10:00 PM: Hydration check and sleep"
        }
    }

    res = client.post(
        "/api/v1/prescriptions/apply",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "active"
    assert data["medicines_count"] == 2
    assert "prescription_id" in data

    db = SessionLocal()
    # Verify DB state
    rx = db.query(Prescription).filter(Prescription.id == data["prescription_id"]).first()
    assert rx is not None
    assert rx.status == "active"
    assert len(rx.items) == 2

    # Verify dose instances were generated
    doses = db.query(DoseInstance).filter(DoseInstance.prescription_item_id == rx.items[0].id).all()
    assert len(doses) > 0

    # Verify CarePlan was created
    care_plan = db.query(CarePlan).filter(CarePlan.patient_id == data["patient_id"]).order_by(CarePlan.version.desc()).first()
    assert care_plan is not None
    assert "diet_plan" in care_plan.rules

    db.close()


def test_analyze_non_prescription_text_is_rejected():
    token = get_patient_token()
    res = client.post(
        "/api/v1/prescriptions/analyze",
        data={"text": "Hello, this is just a photo of my blood glucose meter and walking shoes, please say hi!"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 422
    detail = res.json().get("detail", "")
    assert "Invalid Prescription" in detail or "No prescribed medications" in detail


def test_apply_ai_prescription_with_user_id_as_patient_id():
    token = get_patient_token()
    payload = {
        "patient_id": "test-patient-ai-1",
        "doctor_name": "Dr. Ramanathan",
        "medicines": [
            {
                "name": "Metformin 500mg",
                "dose": "500mg",
                "frequency": "Twice daily",
                "schedule_times": ["08:00", "20:00"]
            }
        ]
    }
    res = client.post(
        "/api/v1/prescriptions/apply",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "active"



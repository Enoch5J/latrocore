"""
Seed synthetic demo data for LATROCORE prototype.
Run: python -m app.seeders.seed
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import json
from datetime import datetime, timezone, date, timedelta
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.models import (
    Organization, User, Patient, Assignment, Prescription, PrescriptionItem,
    DoseInstance, Observation, ScreeningTask, Investigation, Referral, Ticket,
    Note, Conversation, Message, Notification, AuditEvent
)


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already has data. Skipping seed.")
            return
        
        print("[SEED] Seeding LATROCORE database...")
        
        # ── Organization ──
        org = Organization(id="org-001", name="LATROCORE Diabetes Clinic", type="clinic")
        db.add(org)
        db.flush()
        
        # ── Users ──
        admin = User(
            id="user-admin", email="admin@latrocore.com", name="System Admin",
            password_hash=hash_password("admin123"), role="admin",
            status="active", verified=True, org_id=org.id
        )
        doctor = User(
            id="user-doctor", email="doctor@latrocore.com", name="Dr. Priya Sharma",
            password_hash=hash_password("doctor123"), role="doctor",
            phone="+91-9876543210", status="active", verified=True, org_id=org.id
        )
        care_team = User(
            id="user-careteam", email="pharmacist@latrocore.com", name="Pharm. Rajesh Kumar",
            password_hash=hash_password("care123"), role="care_team",
            phone="+91-9876543211", status="active", verified=True, org_id=org.id
        )
        patient_user = User(
            id="user-patient1", email="patient@latrocore.com", name="Anand Krishnan",
            password_hash=hash_password("patient123"), role="patient",
            phone="+91-9876543212", status="active", verified=True, org_id=org.id
        )
        patient_user2 = User(
            id="user-patient2", email="patient2@latrocore.com", name="Lakshmi Devi",
            password_hash=hash_password("patient123"), role="patient",
            phone="+91-9876543213", status="active", verified=True, org_id=org.id
        )
        
        db.add_all([admin, doctor, care_team, patient_user, patient_user2])
        db.flush()
        
        # ── Patients ──
        patient1 = Patient(
            id="pat-001", user_id=patient_user.id,
            date_of_birth=date(1975, 3, 15), gender="male",
            blood_type="B+", language="en", timezone="Asia/Kolkata",
            allergies=json.dumps(["Penicillin"]),
            conditions=json.dumps(["Type 2 Diabetes", "Hypertension"]),
            emergency_contact_name="Meena Krishnan", emergency_contact_phone="+91-9876543220"
        )
        patient2 = Patient(
            id="pat-002", user_id=patient_user2.id,
            date_of_birth=date(1982, 7, 22), gender="female",
            blood_type="O+", language="en", timezone="Asia/Kolkata",
            allergies=json.dumps([]),
            conditions=json.dumps(["Type 2 Diabetes"]),
            emergency_contact_name="Ravi Kumar", emergency_contact_phone="+91-9876543221"
        )
        db.add_all([patient1, patient2])
        db.flush()
        
        # ── Assignments ──
        db.add_all([
            Assignment(patient_id=patient1.id, user_id=doctor.id, role="doctor", org_id=org.id, start_date=date.today() - timedelta(days=30)),
            Assignment(patient_id=patient1.id, user_id=care_team.id, role="pharmacist", org_id=org.id, start_date=date.today() - timedelta(days=25)),
            Assignment(patient_id=patient2.id, user_id=doctor.id, role="doctor", org_id=org.id, start_date=date.today() - timedelta(days=20)),
        ])
        db.flush()
        
        # ── Prescription for Patient 1 ──
        rx = Prescription(
            id="rx-001", patient_id=patient1.id, prescriber_id=doctor.id,
            status="active", version=1, notes="Initial diabetes management",
            activated_at=datetime.now(timezone.utc) - timedelta(days=14)
        )
        db.add(rx)
        db.flush()
        
        items_data = [
            {"name": "Metformin", "strength": "500mg", "dose": "1 tablet", "freq": "Twice daily", "times": ["08:00", "20:00"], "food": "After meals", "route": "oral"},
            {"name": "Glimepiride", "strength": "2mg", "dose": "1 tablet", "freq": "Once daily", "times": ["08:00"], "food": "Before breakfast", "route": "oral"},
            {"name": "Amlodipine", "strength": "5mg", "dose": "1 tablet", "freq": "Once daily", "times": ["09:00"], "food": "Any time", "route": "oral"},
        ]
        
        rx_items = []
        for item_data in items_data:
            item = PrescriptionItem(
                prescription_id=rx.id,
                medicine_name=item_data["name"], strength=item_data["strength"],
                dose=item_data["dose"], route=item_data["route"],
                frequency=item_data["freq"],
                schedule_times=json.dumps(item_data["times"]),
                food_instructions=item_data["food"],
                start_date=date.today() - timedelta(days=14)
            )
            db.add(item)
            db.flush()
            rx_items.append(item)
        
        # ── Dose instances for last 7 days + next 7 days ──
        for item in rx_items:
            times = json.loads(item.schedule_times)
            for day_offset in range(-7, 8):
                d = date.today() + timedelta(days=day_offset)
                for t in times:
                    h, m = map(int, t.split(":"))
                    sched = datetime(d.year, d.month, d.day, h, m, tzinfo=timezone.utc)
                    
                    # Past doses get random statuses
                    if day_offset < 0:
                        import random
                        status = random.choice(["taken", "taken", "taken", "taken", "missed", "taken"])
                    elif day_offset == 0 and h < datetime.now().hour:
                        status = "taken"
                    else:
                        status = "pending"
                    
                    db.add(DoseInstance(
                        prescription_item_id=item.id,
                        scheduled_time=sched,
                        status=status
                    ))
        db.flush()
        
        # ── Observations for Patient 1 (last 30 days) ──
        import random
        for day in range(30, 0, -1):
            d = datetime.now(timezone.utc) - timedelta(days=day)
            
            # Fasting glucose
            db.add(Observation(
                patient_id=patient1.id, type="glucose",
                value=random.uniform(95, 165), unit="mg/dL",
                measured_at=d.replace(hour=7, minute=0),
                context="fasting", source="manual", actor_id=patient_user.id
            ))
            
            # Post-meal glucose (sometimes)
            if random.random() > 0.3:
                db.add(Observation(
                    patient_id=patient1.id, type="glucose",
                    value=random.uniform(120, 220), unit="mg/dL",
                    measured_at=d.replace(hour=14, minute=0),
                    context="post_meal", source="manual", actor_id=patient_user.id
                ))
            
            # Weight (weekly)
            if day % 7 == 0:
                db.add(Observation(
                    patient_id=patient1.id, type="weight",
                    value=round(random.uniform(78, 82), 1), unit="kg",
                    measured_at=d.replace(hour=7, minute=30),
                    source="manual", actor_id=patient_user.id
                ))
        
        # BP readings (weekly)
        for day in range(28, 0, -7):
            d = datetime.now(timezone.utc) - timedelta(days=day)
            db.add(Observation(
                patient_id=patient1.id, type="blood_pressure",
                value=random.randint(120, 145), value_secondary=random.randint(75, 92),
                unit="mmHg", measured_at=d.replace(hour=8, minute=0),
                source="manual", actor_id=patient_user.id
            ))
        
        # HbA1c (quarterly)
        db.add(Observation(
            patient_id=patient1.id, type="hba1c",
            value=7.8, unit="%",
            measured_at=datetime.now(timezone.utc) - timedelta(days=60),
            source="manual", actor_id=doctor.id
        ))
        db.add(Observation(
            patient_id=patient1.id, type="hba1c",
            value=7.2, unit="%",
            measured_at=datetime.now(timezone.utc) - timedelta(days=5),
            source="manual", actor_id=doctor.id
        ))
        db.flush()
        
        # ── Screening Tasks ──
        db.add_all([
            ScreeningTask(patient_id=patient1.id, type="eye", title="Annual Eye Screening", due_date=date.today() + timedelta(days=30), status="due"),
            ScreeningTask(patient_id=patient1.id, type="foot", title="Foot Examination", due_date=date.today() + timedelta(days=15), status="due"),
            ScreeningTask(patient_id=patient1.id, type="kidney", title="Kidney Function Test (eGFR)", due_date=date.today() - timedelta(days=5), status="due"),
            ScreeningTask(patient_id=patient1.id, type="cardiovascular", title="Lipid Profile Check", due_date=date.today() - timedelta(days=60), status="completed", completed_at=datetime.now(timezone.utc) - timedelta(days=55)),
            ScreeningTask(patient_id=patient1.id, type="vaccination", title="Flu Vaccination", due_date=date.today() + timedelta(days=90), status="due"),
        ])
        db.flush()
        
        # ── Investigations ──
        db.add_all([
            Investigation(patient_id=patient1.id, test_name="HbA1c", value="7.2", unit="%", collection_date=date.today() - timedelta(days=5), source="City Lab", reference_range="<7.0"),
            Investigation(patient_id=patient1.id, test_name="Fasting Glucose", value="142", unit="mg/dL", collection_date=date.today() - timedelta(days=5), source="City Lab", reference_range="70-100"),
            Investigation(patient_id=patient1.id, test_name="Total Cholesterol", value="195", unit="mg/dL", collection_date=date.today() - timedelta(days=60), source="Metro Lab", reference_range="<200"),
            Investigation(patient_id=patient1.id, test_name="Creatinine", value="0.9", unit="mg/dL", collection_date=date.today() - timedelta(days=60), source="Metro Lab", reference_range="0.7-1.3"),
        ])
        db.flush()
        
        # ── Referral + Ticket ──
        referral = Referral(
            id="ref-001", patient_id=patient1.id, requester_id=doctor.id,
            purpose="Medication counselling for newly prescribed regimen",
            service="Pharmacy counselling", status="assigned"
        )
        db.add(referral)
        db.flush()
        
        ticket = Ticket(
            id="tick-001", referral_id=referral.id, patient_id=patient1.id,
            assignee_id=care_team.id, status="in_progress",
            type="counselling", due_date=date.today() + timedelta(days=3)
        )
        db.add(ticket)
        db.flush()
        
        db.add(Note(
            ticket_id=ticket.id, author_id=care_team.id,
            content="Patient counselled on Metformin — take after meals to reduce GI side effects. Explained importance of consistent timing.",
            type="shared", follow_up_action="Follow up in 1 week"
        ))
        db.add(Note(
            ticket_id=ticket.id, author_id=care_team.id,
            content="Patient reports occasional nausea. Monitor and escalate if persistent.",
            type="internal"
        ))
        db.flush()
        
        # ── Notifications ──
        db.add_all([
            Notification(user_id=patient_user.id, type="dose_reminder", title="Medication Reminder", content="Time to take Metformin 500mg", status="sent"),
            Notification(user_id=patient_user.id, type="ticket_update", title="Counselling Update", content="Your pharmacist has added notes to your care ticket", status="sent"),
            Notification(user_id=patient_user.id, type="screening", title="Screening Due", content="Your Kidney Function Test is overdue", status="sent"),
            Notification(user_id=doctor.id, type="referral", title="New Referral", content="Referral created for patient Anand Krishnan", read=True, status="read"),
            Notification(user_id=care_team.id, type="ticket_update", title="Ticket Assigned", content="Counselling ticket assigned for Anand Krishnan", read=True, status="read"),
        ])
        db.flush()
        
        # ── AI Conversation ──
        convo = Conversation(id="convo-001", patient_id=patient1.id, user_id=patient_user.id, language="en")
        db.add(convo)
        db.flush()
        
        db.add_all([
            Message(conversation_id=convo.id, role="user", content="What should my fasting blood sugar level be?"),
            Message(conversation_id=convo.id, role="assistant",
                content="Blood glucose monitoring is essential for diabetes management. Fasting blood glucose should ideally be between 80-130 mg/dL, and post-meal readings should be below 180 mg/dL (as per ADA guidelines). Regular monitoring helps track how food, activity, and medications affect your levels.",
                sources=json.dumps([{"title": "ADA Standards of Care 2024", "section": "Glycemic Targets"}]),
                model_id="latrocore-assistant-v1"),
            Message(conversation_id=convo.id, role="user", content="Can you change my insulin dose?"),
            Message(conversation_id=convo.id, role="assistant",
                content="I'm not able to make changes to your medication or provide medical diagnoses. This type of request requires your doctor's review. Would you like me to create a counselling request so a healthcare professional can assist you?",
                sources=json.dumps([]),
                model_id="latrocore-assistant-v1"),
        ])
        
        db.commit()
        print("[SUCCESS] Seed complete! Demo accounts:")
        print("   Admin:     admin@latrocore.com / admin123")
        print("   Doctor:    doctor@latrocore.com / doctor123")
        print("   Care Team: pharmacist@latrocore.com / care123")
        print("   Patient 1: patient@latrocore.com / patient123")
        print("   Patient 2: patient2@latrocore.com / patient123")
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()

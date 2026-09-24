"""Combine all v1 API routers."""

from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.patients import router as patients_router
from app.api.v1.observations import router as observations_router
from app.api.v1.prescriptions import router as prescriptions_router
from app.api.v1.doses import router as doses_router
from app.api.v1.referrals import router as referrals_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(patients_router)
api_router.include_router(observations_router)
api_router.include_router(prescriptions_router)
api_router.include_router(doses_router)
api_router.include_router(referrals_router)
api_router.include_router(conversations_router)
api_router.include_router(dashboard_router)

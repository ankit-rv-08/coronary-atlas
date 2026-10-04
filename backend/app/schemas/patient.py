"""Pydantic schemas for the prediction endpoint."""

from typing import Any

from pydantic import BaseModel, Field


class PatientInput(BaseModel):
    features: dict[str, Any] = Field(
        ...,
        description="Map of dataset feature name to value.",
    )


class VesselPrediction(BaseModel):
    probability: float
    status: str
    severity: str
    contributions: list[dict[str, Any]]


class PredictionResponse(BaseModel):
    CAD: VesselPrediction | None = None
    LAD: VesselPrediction | None = None
    LCX: VesselPrediction | None = None
    RCA: VesselPrediction | None = None
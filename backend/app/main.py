"""FastAPI backend for Coronary Atlas."""

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.ml.explainer import explain, get_available_targets, get_metrics
from app.schemas.patient import PatientInput, PredictionResponse, VesselPrediction

TARGETS = ["CAD", "LAD", "LCX", "RCA"]


def classify_severity(probability: float) -> str:
    if probability < 0.3:
        return "lower"
    if probability < 0.6:
        return "moderate"
    if probability < 0.8:
        return "elevated"
    return "critical"


app = FastAPI(
    title="Coronary Atlas",
    description="Interactive coronary artery disease risk visualization",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "coronary-atlas", "models": get_available_targets()}


@app.get("/model/info")
def model_info() -> dict:
    return {"available_targets": get_available_targets(), "metrics": get_metrics()}


@app.post("/predict", response_model=PredictionResponse)
def predict(patient: PatientInput) -> PredictionResponse:
    available = set(get_available_targets())
    if not available:
        raise HTTPException(status_code=503, detail="No trained models are available")

    results = {}
    for target in TARGETS:
        if target not in available:
            continue
        try:
            output = explain(target, patient.features)
        except Exception as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        probability = output["probability"]
        results[target] = VesselPrediction(
            probability=round(probability, 4),
            status="Positive" if probability >= 0.5 else "Negative",
            severity=classify_severity(probability),
            contributions=output["contributions"],
        )
    return PredictionResponse(**results)
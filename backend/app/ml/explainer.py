"""Load trained models and return predictions with SHAP contributions."""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap

MODEL_DIR = Path(__file__).resolve().parent / "saved_models"
TARGETS = ["CAD", "LAD", "LCX", "RCA"]
_models = {}
_explainers = {}
_feature_names = {}


def _load() -> None:
    if _models:
        return
    for target in TARGETS:
        model_path = MODEL_DIR / f"{target}_model.pkl"
        feature_path = MODEL_DIR / f"{target}_features.json"
        if not model_path.exists() or not feature_path.exists():
            continue
        _models[target] = joblib.load(model_path)
        _explainers[target] = shap.TreeExplainer(_models[target])
        with feature_path.open() as handle:
            _feature_names[target] = json.load(handle)


def _align_features(features: dict, expected_features: list[str]) -> pd.DataFrame:
    """Align raw API values with one-hot encoded training columns."""
    row = {}
    for feature in expected_features:
        if feature in features:
            row[feature] = features[feature]
            continue
        base, separator, category = feature.rpartition("_")
        raw_value = features.get(base) if separator else None
        row[feature] = float(str(raw_value).casefold() == category.casefold()) if separator else raw_value or 0
    return pd.DataFrame([row], columns=expected_features)


def explain(target: str, features: dict) -> dict:
    _load()
    if target not in _models:
        raise ValueError(f"Model for target {target!r} is not available")

    expected_features = _feature_names[target]
    X = _align_features(features, expected_features)
    model = _models[target]
    probability = float(model.predict_proba(X)[0, 1])
    shap_values = np.asarray(_explainers[target].shap_values(X)).flatten()
    contributions = [
        {
            "feature": feature,
            "value": float(X.iloc[0][feature]) if pd.notna(X.iloc[0][feature]) else 0.0,
            "shap": float(value),
        }
        for feature, value in zip(expected_features, shap_values)
    ]
    contributions.sort(key=lambda item: abs(item["shap"]), reverse=True)
    return {"probability": probability, "contributions": contributions[:15]}


def get_metrics() -> dict:
    metrics_path = MODEL_DIR / "metrics.json"
    if not metrics_path.exists():
        return {}
    with metrics_path.open() as handle:
        return json.load(handle)


def get_available_targets() -> list[str]:
    _load()
    return sorted(_models)
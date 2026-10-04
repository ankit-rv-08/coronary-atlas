"""Train leakage-safe XGBoost models on the extended Excel dataset."""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[3]
DATA_PATH = ROOT / "data" / "extension of Z-Alizadeh sani dataset.xlsx"
MODEL_DIR = Path(__file__).resolve().parent / "saved_models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

TARGETS = ["CAD", "LAD", "LCX", "RCA"]
VESSEL_TARGETS = {"LAD", "LCX", "RCA"}


def load_and_clean(path: Path) -> pd.DataFrame:
    """Load the workbook using the first header row with vessel labels."""
    for skiprows in range(15):
        df = pd.read_excel(path, skiprows=skiprows)
        df.columns = [str(column).strip() for column in df.columns]
        if VESSEL_TARGETS.issubset(df.columns):
            print(f"Loaded with skiprows={skiprows}")
            break
    else:
        raise RuntimeError("Could not find a header containing LAD, LCX, and RCA")

    for column in df.select_dtypes(include="object").columns:
        df[column] = df[column].astype(str).str.strip()
    return df


def resolve_target(df: pd.DataFrame, target: str) -> pd.Series | None:
    """Return a binary target, deriving CAD from Cath when necessary."""
    if target in df.columns:
        values = df[target]
    elif target == "CAD" and "Cath" in df.columns:
        values = df["Cath"]
    else:
        return None

    if values.isna().any():
        raise ValueError(f"Target {target} contains unsupported or missing values")
    if values.dtype == object:
        normalized = values.astype(str).str.casefold()
        values = normalized.map(
            {
                "cad": 1,
                "stenotic": 1,
                "stenosis": 1,
                "abnormal": 1,
                "normal": 0,
                "yes": 1,
                "no": 0,
                "true": 1,
                "false": 0,
            }
        )
    if values.isna().any():
        raise ValueError(f"Target {target} contains unsupported or missing values")
    values = pd.to_numeric(values, errors="raise").astype(int)
    if not set(values.unique()).issubset({0, 1}):
        raise ValueError(f"Target {target} must be binary")
    return values


def build_feature_matrix(df: pd.DataFrame, target: str) -> tuple[pd.DataFrame, pd.Series] | None:
    y = resolve_target(df, target)
    if y is None:
        return None

    drop_columns = {"Cath"}
    if target in VESSEL_TARGETS:
        drop_columns |= VESSEL_TARGETS - {target}
        drop_columns.add("CAD")
    else:
        drop_columns |= VESSEL_TARGETS
    drop_columns.add(target)
    feature_columns = [column for column in df.columns if column not in drop_columns]
    X = pd.get_dummies(df[feature_columns], drop_first=True)
    X = X.replace([np.inf, -np.inf], np.nan)
    return X, y


def make_model(
    scale_pos_weight: float,
    seed: int,
    params: dict | None = None,
) -> XGBClassifier:
    model_params = {
        "n_estimators": 300,
        "max_depth": 4,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
    }
    if params:
        model_params.update(params)
    return XGBClassifier(
        **model_params,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=seed,
        n_jobs=-1,
    )


def evaluate_model(model: XGBClassifier, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test)[:, 1]
    return {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision": float(precision_score(y_test, predictions, zero_division=0)),
        "recall": float(recall_score(y_test, predictions, zero_division=0)),
        "f1": float(f1_score(y_test, predictions, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, probabilities)),
    }


def train_target(df: pd.DataFrame, target: str) -> dict:
    built = build_feature_matrix(df, target)
    if built is None:
        raise ValueError(
            f"No labels for {target}. The workbook has no {target} column."
        )
    X, y = built
    print(f"\nTraining target: {target} | features: {X.shape[1]} | positive rate: {y.mean():.3f}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
    best_params_path = MODEL_DIR / "best_params.json"
    params = {}
    if best_params_path.exists():
        with best_params_path.open() as handle:
            params = json.load(handle).get(target, {}).get("best_params", {})
        print(f"Using tuned parameters for {target}")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_aucs = []
    for fold, (train_index, validation_index) in enumerate(cv.split(X_train, y_train), 1):
        model = make_model(scale_pos_weight, 42 + fold, params)
        model.fit(X_train.iloc[train_index], y_train.iloc[train_index])
        probabilities = model.predict_proba(X_train.iloc[validation_index])[:, 1]
        cv_aucs.append(roc_auc_score(y_train.iloc[validation_index], probabilities))
        print(f"  Fold {fold} ROC-AUC: {cv_aucs[-1]:.4f}")

    model = make_model(scale_pos_weight, 42, params)
    model.fit(X_train, y_train)
    metrics = evaluate_model(model, X_test, y_test)
    metrics["cv_mean_roc_auc"] = float(np.mean(cv_aucs))
    metrics["cv_std_roc_auc"] = float(np.std(cv_aucs))
    print(f"  Test ROC-AUC: {metrics['roc_auc']:.4f}")

    joblib.dump(model, MODEL_DIR / f"{target}_model.pkl")
    with (MODEL_DIR / f"{target}_features.json").open("w") as handle:
        json.dump(list(X.columns), handle, indent=2)
    return metrics


def main() -> None:
    print(f"Loading dataset from {DATA_PATH}")
    df = load_and_clean(DATA_PATH)
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")
    metrics = {}
    unavailable = []
    for target in TARGETS:
        try:
            metrics[target] = train_target(df, target)
        except ValueError as error:
            unavailable.append(target)
            print(f"Skipping {target}: {error}")

    with (MODEL_DIR / "metrics.json").open("w") as handle:
        json.dump(metrics, handle, indent=2)
    with (MODEL_DIR / "unavailable_targets.json").open("w") as handle:
        json.dump(unavailable, handle, indent=2)
    print(f"Training complete. Models saved to {MODEL_DIR}")


if __name__ == "__main__":
    main()
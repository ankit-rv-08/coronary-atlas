"""Tune leakage-safe XGBoost models with Optuna cross-validation."""

import json
from pathlib import Path

import optuna
import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_val_score
from xgboost import XGBClassifier

from app.ml.train import (
    DATA_PATH,
    MODEL_DIR,
    TARGETS,
    build_feature_matrix,
    load_and_clean,
)

N_TRIALS = 40
CV_FOLDS = 5


def objective(trial: optuna.Trial, X: pd.DataFrame, y: pd.Series) -> float:
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 200, 800, step=100),
        "max_depth": trial.suggest_int("max_depth", 2, 8),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
        "subsample": trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.4, 1.0),
        "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
        "gamma": trial.suggest_float("gamma", 0.0, 5.0),
        "reg_alpha": trial.suggest_float("reg_alpha", 0.0, 2.0),
        "reg_lambda": trial.suggest_float("reg_lambda", 0.5, 5.0),
    }
    scale_pos_weight = (y == 0).sum() / max((y == 1).sum(), 1)
    model = XGBClassifier(
        **params,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=42)
    scores = cross_val_score(model, X, y, cv=cv, scoring="roc_auc", n_jobs=1)
    return float(scores.mean())


def tune_target(df: pd.DataFrame, target: str) -> dict:
    built = build_feature_matrix(df, target)
    if built is None:
        raise ValueError(f"No labels for {target}")
    X, y = built
    print(f"\nTuning {target}: {X.shape[1]} features, positive rate {y.mean():.3f}")
    sampler = optuna.samplers.TPESampler(seed=42)
    study = optuna.create_study(direction="maximize", sampler=sampler)
    study.optimize(
        lambda trial: objective(trial, X, y),
        n_trials=N_TRIALS,
        show_progress_bar=True,
    )
    print(f"Best CV ROC-AUC for {target}: {study.best_value:.4f}")
    return {
        "target": target,
        "best_value": float(study.best_value),
        "best_params": study.best_params,
    }


def main() -> None:
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    print(f"Loading dataset from {DATA_PATH}")
    df = load_and_clean(DATA_PATH)
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")
    results = {}
    for target in TARGETS:
        results[target] = tune_target(df, target)

    output_path = MODEL_DIR / "best_params.json"
    with output_path.open("w") as handle:
        json.dump(results, handle, indent=2)
    print(f"Saved best parameters to {output_path}")


if __name__ == "__main__":
    main()
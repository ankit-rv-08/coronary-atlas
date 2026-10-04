"""Compare feature-selection strategies with leakage-safe cross-validation."""

import json
from pathlib import Path

import numpy as np
import optuna
import shap
from sklearn.feature_selection import SelectKBest, mutual_info_classif
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold
from xgboost import XGBClassifier

from app.ml.train import (
    DATA_PATH,
    MODEL_DIR,
    TARGETS,
    build_feature_matrix,
    load_and_clean,
)

CV_FOLDS = 5
K_VALUES = [20, 30, 40]


def tuned_params(target: str) -> dict:
    path = MODEL_DIR / "best_params.json"
    if not path.exists():
        return {}
    with path.open() as handle:
        return json.load(handle).get(target, {}).get("best_params", {})


def make_model(y, params: dict) -> XGBClassifier:
    scale_pos_weight = (y == 0).sum() / max((y == 1).sum(), 1)
    return XGBClassifier(
        **params,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )


def cv_roc_auc(X, y, params: dict) -> float:
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=42)
    scores = []
    for train_index, validation_index in cv.split(X, y):
        model = make_model(y.iloc[train_index], params)
        model.fit(X.iloc[train_index], y.iloc[train_index])
        probabilities = model.predict_proba(X.iloc[validation_index])[:, 1]
        scores.append(roc_auc_score(y.iloc[validation_index], probabilities))
    return float(np.mean(scores))


def shap_top_k(X, y, k: int, params: dict) -> list[str]:
    model = make_model(y, params)
    model.fit(X, y)
    values = np.asarray(shap.TreeExplainer(model).shap_values(X))
    importance = np.abs(values).mean(axis=0)
    return list(X.columns[np.argsort(importance)[-k:]])


def mi_top_k(X, y, k: int) -> list[str]:
    selector = SelectKBest(mutual_info_classif, k=k)
    selector.fit(X.fillna(0), y)
    return list(X.columns[selector.get_support()])


def xgb_top_k(X, y, k: int, params: dict) -> list[str]:
    model = make_model(y, params)
    model.fit(X, y)
    return list(X.columns[np.argsort(model.feature_importances_)[-k:]])


def main() -> None:
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    print(f"Loading dataset from {DATA_PATH}")
    df = load_and_clean(DATA_PATH)
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")
    results = {}

    for target in TARGETS:
        built = build_feature_matrix(df, target)
        if built is None:
            continue
        X, y = built
        params = tuned_params(target)
        print(f"\nTarget: {target}")
        print(f"Baseline (all {X.shape[1]} features): ", end="", flush=True)
        baseline = cv_roc_auc(X, y, params)
        print(f"{baseline:.4f}")
        target_results = {"baseline": baseline, "strategies": {}}

        for strategy_name in ["shap", "mutual_info", "xgb_importance"]:
            for k in K_VALUES:
                try:
                    if strategy_name == "shap":
                        columns = shap_top_k(X, y, k, params)
                    elif strategy_name == "mutual_info":
                        columns = mi_top_k(X, y, k)
                    else:
                        columns = xgb_top_k(X, y, k, params)
                    auc = cv_roc_auc(X[columns], y, params)
                    key = f"{strategy_name}_k{k}"
                    target_results["strategies"][key] = {
                        "auc": auc,
                        "columns": columns,
                    }
                    marker = " <-- best" if auc > baseline else ""
                    print(f"  {key}: {auc:.4f}{marker}")
                except Exception as error:
                    print(f"  {strategy_name} top-{k}: failed ({error})")

        results[target] = target_results

    output_path = MODEL_DIR / "feature_selection_results.json"
    with output_path.open("w") as handle:
        json.dump(results, handle, indent=2)

    print("\nSUMMARY")
    print(f"{'Target':<8} {'Baseline':<10} {'Best reduced':<14} {'Strategy':<20}")
    for target, result in results.items():
        best = max(
            result["strategies"].items(),
            key=lambda item: item[1]["auc"],
        )
        print(
            f"{target:<8} {result['baseline']:.4f}    "
            f"{best[1]['auc']:.4f}        {best[0]}"
        )
    print(f"Saved results to {output_path}")


if __name__ == "__main__":
    main()
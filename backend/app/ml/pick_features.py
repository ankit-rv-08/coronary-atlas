"""Promote the best validated reduced feature set for each target."""

import json

from app.ml.train import MODEL_DIR, TARGETS

SELECTION_PATH = MODEL_DIR / "feature_selection_results.json"
OUT_PATH = MODEL_DIR / "best_features.json"


def main() -> None:
    if not SELECTION_PATH.exists():
        raise FileNotFoundError(f"No feature selection results at {SELECTION_PATH}")

    with SELECTION_PATH.open() as handle:
        results = json.load(handle)

    best = {}
    for target in TARGETS:
        if target not in results:
            continue
        result = results[target]
        baseline = result["baseline"]
        strategies = result["strategies"]
        if not strategies:
            continue

        strategy_name, entry = max(
            strategies.items(), key=lambda item: item[1]["auc"]
        )
        if entry["auc"] > baseline:
            best[target] = entry["columns"]
            print(
                f"{target}: using {strategy_name} "
                f"(CV {entry['auc']:.4f} > baseline {baseline:.4f})"
            )
        else:
            print(f"{target}: keeping full feature set")

    with OUT_PATH.open("w") as handle:
        json.dump(best, handle, indent=2)
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
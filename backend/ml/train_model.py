"""Trains the CREDIFY.ai text classifier and writes ml/model.joblib.

Design notes
------------
* Two views of the text are unioned: word 1-2 grams (catches phrases like
  "share the otp", "collect request") and character 3-5 grams inside word
  boundaries (robust to Hinglish spelling drift - "kyc"/"k.y.c", "paisa"/"paise").
* The estimator is a linear model, deliberately: linear coefficients give us a
  signed per-token contribution for free, which is what powers the
  "why we flagged this" chips in the UI. A black-box model would break the
  product's core promise of explainability.
* Probabilities come from CalibratedClassifierCV so the fusion stage can treat
  the output as a real probability rather than a raw margin.

Run:  python train_model.py
"""

from __future__ import annotations

import csv
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import LinearSVC

HERE = Path(__file__).resolve().parent
DATASET = HERE / "dataset.csv"
MODEL_PATH = HERE / "model.joblib"

RANDOM_STATE = 42


def load_dataset() -> tuple[list[str], list[int]]:
    if not DATASET.exists():
        raise SystemExit(
            f"{DATASET} not found. Run `python generate_dataset.py` first."
        )
    texts: list[str] = []
    labels: list[int] = []
    with DATASET.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            text = (row.get("text") or "").strip()
            if not text:
                continue
            texts.append(text)
            labels.append(1 if row["label"] == "scam" else 0)
    return texts, labels


def build_pipeline() -> Pipeline:
    word = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        lowercase=True,
        sublinear_tf=True,
        min_df=1,
        max_df=0.9,
        strip_accents="unicode",
    )
    char = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        lowercase=True,
        sublinear_tf=True,
        min_df=2,
        strip_accents="unicode",
    )
    features = FeatureUnion([("word", word), ("char", char)])
    base = LinearSVC(C=1.0, class_weight="balanced", random_state=RANDOM_STATE)
    clf = CalibratedClassifierCV(base, cv=5, method="sigmoid")
    return Pipeline([("features", features), ("clf", clf)])


def average_coefficients(calibrated: CalibratedClassifierCV) -> np.ndarray:
    """Mean coefficient vector across the calibrated CV folds.

    CalibratedClassifierCV keeps one fitted LinearSVC per fold; averaging the
    coefficients gives a single stable weight per feature for explanations.
    """
    coefs = [
        cc.estimator.coef_.ravel() for cc in calibrated.calibrated_classifiers_
    ]
    return np.mean(np.vstack(coefs), axis=0)


def main() -> None:
    texts, labels = load_dataset()
    y = np.asarray(labels)
    print(f"Loaded {len(texts)} rows  (scam={int(y.sum())}, safe={int((1 - y).sum())})")

    X_train, X_test, y_train, y_test = train_test_split(
        texts, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print("\n=== Held-out test set ===")
    print(f"Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=["safe", "scam"], digits=3))

    cv = cross_val_score(
        build_pipeline(),
        texts,
        y,
        cv=StratifiedKFold(5, shuffle=True, random_state=RANDOM_STATE),
        scoring="accuracy",
    )
    print(f"5-fold CV accuracy: {cv.mean():.4f} (+/- {cv.std():.4f})")

    # Refit on everything for the shipped artifact.
    final = build_pipeline()
    final.fit(texts, y)

    union: FeatureUnion = final.named_steps["features"]
    word_vec: TfidfVectorizer = union.transformer_list[0][1]
    word_feature_count = len(word_vec.vocabulary_)
    coefficients = average_coefficients(final.named_steps["clf"])

    # Only the word-level slice is human readable, so that is what the UI shows.
    word_feature_names = word_vec.get_feature_names_out()
    word_coefficients = coefficients[:word_feature_count]

    joblib.dump(
        {
            "pipeline": final,
            "word_feature_names": np.asarray(word_feature_names),
            "word_coefficients": word_coefficients,
            "word_feature_count": word_feature_count,
            "metrics": {
                "test_accuracy": float(acc),
                "cv_accuracy_mean": float(cv.mean()),
                "cv_accuracy_std": float(cv.std()),
                "n_samples": len(texts),
            },
        },
        MODEL_PATH,
        compress=3,
    )
    print(f"\nSaved model -> {MODEL_PATH}")

    order = np.argsort(word_coefficients)
    print("\nTop 15 scam-indicating tokens:")
    for i in order[::-1][:15]:
        print(f"  {word_feature_names[i]:28s} {word_coefficients[i]:+.3f}")
    print("\nTop 10 safe-indicating tokens:")
    for i in order[:10]:
        print(f"  {word_feature_names[i]:28s} {word_coefficients[i]:+.3f}")

    if acc < 0.85:
        raise SystemExit(f"Accuracy {acc:.3f} is below the 0.85 target.")


if __name__ == "__main__":
    main()

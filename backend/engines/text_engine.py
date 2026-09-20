"""ML text classifier wrapper with per-token explanations.

Loads ml/model.joblib once, lazily, and exposes:

    predict(text) -> (scam_probability, [{"token": ..., "weight": ...}, ...])

The token list is the product's explainability layer: for each word feature that
is actually present in the text, the contribution is tf-idf value x model
coefficient. Positive means "pushed towards scam", negative means "pushed towards
safe" - so the UI can show both, honestly.

If the model artifact is missing the engine degrades to a small keyword prior
rather than raising, so the API never returns a 500 because of a missing file.
"""

from __future__ import annotations

import math
import re
import threading

import numpy as np

from config import settings

_lock = threading.Lock()
_bundle: dict | None = None
_load_failed = False

FALLBACK_TERMS = {
    "kyc": 0.35, "otp": 0.25, "pin": 0.3, "blocked": 0.3, "urgent": 0.25,
    "lottery": 0.4, "winner": 0.35, "prize": 0.3, "arrest": 0.45, "refund": 0.25,
    "collect request": 0.4, "guaranteed": 0.3, "investment": 0.2, "loan": 0.2,
    "click": 0.2, "verify": 0.25, "suspend": 0.3, "customs": 0.3, "cvv": 0.4,
}


def _load() -> dict | None:
    global _bundle, _load_failed
    if _bundle is not None or _load_failed:
        return _bundle
    with _lock:
        if _bundle is not None or _load_failed:
            return _bundle
        try:
            import joblib

            path = settings.model_path
            if not path.exists():
                _load_failed = True
                return None
            _bundle = joblib.load(path)
        except Exception:
            _load_failed = True
            return None
    return _bundle


def is_ready() -> bool:
    return _load() is not None


def model_metrics() -> dict:
    bundle = _load()
    return dict(bundle["metrics"]) if bundle else {}


def _fallback(text: str) -> tuple[float, list[dict]]:
    lowered = (text or "").lower()
    score = 0.0
    tokens: list[dict] = []
    for term, weight in FALLBACK_TERMS.items():
        if term in lowered:
            score += weight
            tokens.append({"token": term, "weight": round(weight, 3)})
    probability = 1 / (1 + math.exp(-(score * 2 - 1.5)))
    tokens.sort(key=lambda t: abs(t["weight"]), reverse=True)
    return probability, tokens[:5]


def predict(text: str) -> tuple[float, list[dict]]:
    """Return (scam probability 0-1, top 5 signed token contributions)."""
    if not text or not text.strip():
        return 0.0, []

    bundle = _load()
    if bundle is None:
        return _fallback(text)

    try:
        pipeline = bundle["pipeline"]
        probability = float(pipeline.predict_proba([text])[0][1])
        tokens = _explain(bundle, text)
        return probability, tokens
    except Exception:
        return _fallback(text)


def _explain(bundle: dict, text: str) -> list[dict]:
    """tf-idf value x coefficient for each word feature present in the text."""
    pipeline = bundle["pipeline"]
    union = pipeline.named_steps["features"]
    word_vectorizer = union.transformer_list[0][1]

    row = word_vectorizer.transform([text])
    if row.nnz == 0:
        return []

    names: np.ndarray = bundle["word_feature_names"]
    coefficients: np.ndarray = bundle["word_coefficients"]

    indices = row.indices
    values = row.data
    contributions = values * coefficients[indices]

    order = np.argsort(np.abs(contributions))[::-1]

    tokens: list[dict] = []
    seen: set[str] = set()
    for position in order:
        token = str(names[indices[position]])
        # Bigrams whose words are already shown add noise, so keep it readable.
        if token in seen:
            continue
        seen.add(token)
        weight = float(contributions[position])
        if abs(weight) < 1e-4:
            continue
        tokens.append({"token": token, "weight": round(weight, 4)})
        if len(tokens) >= 5:
            break
    return tokens


_WORD_RE = re.compile(r"[A-Za-z']+")


def top_keywords(text: str, limit: int = 6) -> list[str]:
    """Cheap keyword pull used by the categoriser as a tie-breaker."""
    words = [w.lower() for w in _WORD_RE.findall(text or "") if len(w) > 3]
    counts: dict[str, int] = {}
    for word in words:
        counts[word] = counts.get(word, 0) + 1
    return [w for w, _ in sorted(counts.items(), key=lambda kv: -kv[1])[:limit]]

import os
import joblib
import pandas as pd
from typing import Dict, Any, Optional

CLASSIFIER_PATH = os.path.join(os.path.dirname(__file__), 'ml', 'irrigation_classifier.pkl')
REGRESSOR_PATH = os.path.join(os.path.dirname(__file__), 'ml', 'irrigation_regressor.pkl')

_classifier = None
_regressor = None

def _load_models():
    global _classifier, _regressor
    try:
        if _classifier is None and os.path.exists(CLASSIFIER_PATH):
            _classifier = joblib.load(CLASSIFIER_PATH)
        if _regressor is None and os.path.exists(REGRESSOR_PATH):
            _regressor = joblib.load(REGRESSOR_PATH)
    except Exception as e:
        print(f"Failed to load ML models: {e}")

def get_ml_recommendation(
    kc: float,
    root_depth_mm: float,
    field_capacity: float,
    wilting_point: float,
    temperature_c: float,
    reference_et0_mm: float,
    soil_moisture_prev_pct: float,
    rew_prev: float,
    rain_forecast_24h_mm: float,
    water_deficit_mm: float
) -> Optional[Dict[str, Any]]:
    
    _load_models()
    if _classifier is None or _regressor is None:
        return None

    features = pd.DataFrame([{
        'kc': kc,
        'root_depth_mm': root_depth_mm,
        'field_capacity': field_capacity,
        'wilting_point': wilting_point,
        'temperature_c': temperature_c,
        'reference_et0_mm': reference_et0_mm,
        'soil_moisture_prev_pct': soil_moisture_prev_pct,
        'rew_prev': rew_prev,
        'rain_forecast_24h_mm': rain_forecast_24h_mm,
        'water_deficit_mm': water_deficit_mm
    }])

    needed = _classifier.predict(features)[0]
    amount = _regressor.predict(features)[0]

    return {
        "irrigation_needed": bool(needed),
        "recommended_amount_mm": float(amount) if needed else 0.0
    }

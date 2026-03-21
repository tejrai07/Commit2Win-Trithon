"""
============================================================================
  METHANE GAS LEAK PREDICTION - FastAPI BACKEND
  Serves the Hybrid LSTM + Transformer model with:
    - Real-time prediction (spike probability, time-to-danger, alert tier)
    - Sliding window buffer per sensor
    - Health check endpoint
  
  Team: Commit2Win | Hackathon: Trithon 2026
============================================================================
"""

import os
import json
import numpy as np
import joblib
import tensorflow as tf
from datetime import datetime
from collections import defaultdict, deque
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import uvicorn

# ============================================================================
# CONFIG
# ============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
CONFIG_PATH = os.path.join(MODELS_DIR, "model_config.json")

# Load config
with open(CONFIG_PATH, "r") as f:
    MODEL_CONFIG = json.load(f)

FEATURE_COLS = MODEL_CONFIG["feature_columns"]
SEQUENCE_LENGTH = MODEL_CONFIG["sequence_length"]
ALERT_TIER_MAP = MODEL_CONFIG["alert_tier_map"]
ALERT_TIER_NAMES = {v: k for k, v in ALERT_TIER_MAP.items()}  # reverse map

# ============================================================================
# LOAD MODEL & SCALER
# ============================================================================
MODEL_PATH = os.path.join(MODELS_DIR, "methane_lstm_transformer.keras")
SCALER_PATH = os.path.join(MODELS_DIR, "feature_scaler.pkl")

print(f"Loading model from: {MODEL_PATH}")
model = tf.keras.models.load_model(MODEL_PATH)
print("Model loaded successfully.")

print(f"Loading scaler from: {SCALER_PATH}")
scaler = joblib.load(SCALER_PATH)
print("Scaler loaded successfully.")

# ============================================================================
# IN-MEMORY SLIDING WINDOW BUFFER (per sensor)
# ============================================================================
sensor_buffers: dict[str, deque] = defaultdict(lambda: deque(maxlen=SEQUENCE_LENGTH))

# ============================================================================
# FastAPI APP
# ============================================================================
app = FastAPI(
    title="Methane Predictive Safety API",
    description="AI-Driven Predictive Safety System for Methane Gas Leak Forecasting. "
                "Hybrid LSTM + Transformer architecture with multi-task heads.",
    version="2.0.0",
    docs_url="/docs",
)

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================
class SensorReading(BaseModel):
    """Single sensor reading payload."""
    sensor_id: str = Field(..., example="SEN-001")
    ch4_concentration_ppm: float = Field(..., example=450.5)
    temperature_celsius: float = Field(..., example=28.3)
    pressure_kPa: float = Field(..., example=101.2)
    humidity_percent: float = Field(..., example=62.1)
    wind_speed_ms: float = Field(..., example=3.5)
    co2_ppm: float = Field(..., example=410.0)
    ch4_rolling_mean_5min: float = Field(..., example=440.2)
    ch4_rolling_std_5min: float = Field(..., example=12.5)
    ch4_rolling_mean_30min: float = Field(..., example=430.8)
    ch4_rate_of_change: float = Field(..., example=2.3)
    lel_percent: float = Field(..., example=0.9)


class PredictionResponse(BaseModel):
    """Prediction output."""
    sensor_id: str
    timestamp: str
    spike_probability: float
    minutes_to_lel_breach: float
    alert_tier: str
    alert_tier_confidence: dict
    buffer_size: int
    buffer_full: bool


class BatchSensorReading(BaseModel):
    """Batch of sensor readings."""
    readings: List[SensorReading]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    scaler_loaded: bool
    model_architecture: str
    sequence_length: int
    feature_count: int
    features: List[str]
    active_sensors: int


# ============================================================================
# PREDICTION LOGIC
# ============================================================================
def make_prediction(sensor_id: str, buffer: deque) -> dict:
    """
    Given a full buffer (SEQUENCE_LENGTH readings), scale features,
    run the model, and return structured predictions.
    """
    # Convert buffer to numpy array
    raw_features = np.array(list(buffer), dtype=np.float32)  # (seq_len, n_features)

    # Scale features using the trained scaler
    scaled_features = scaler.transform(raw_features)

    # Reshape for model: (1, seq_len, n_features)
    X = scaled_features.reshape(1, SEQUENCE_LENGTH, len(FEATURE_COLS))

    # Predict
    reg_pred, clf_pred = model.predict(X, verbose=0)

    spike_probability = float(np.clip(reg_pred[0][0], 0.0, 1.0))
    minutes_to_breach = float(max(reg_pred[0][1], 0.0))

    # Classification probabilities
    clf_probs = clf_pred[0]
    alert_idx = int(np.argmax(clf_probs))
    alert_tier = ALERT_TIER_NAMES[alert_idx]

    return {
        "sensor_id": sensor_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "spike_probability": round(spike_probability, 4),
        "minutes_to_lel_breach": round(minutes_to_breach, 2),
        "alert_tier": alert_tier,
        "alert_tier_confidence": {
            "GREEN_NORMAL": round(float(clf_probs[0]), 4),
            "YELLOW_CAUTION": round(float(clf_probs[1]), 4),
            "RED_EVACUATION": round(float(clf_probs[2]), 4),
        },
        "buffer_size": len(buffer),
        "buffer_full": len(buffer) == SEQUENCE_LENGTH,
    }


# ============================================================================
# ENDPOINTS
# ============================================================================
@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Methane Predictive Safety API v2.0",
        "docs": "/docs",
        "team": "Commit2Win",
        "hackathon": "Trithon 2026"
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "model_architecture": "Hybrid LSTM + Transformer (BiLSTM → 2x Transformer Blocks → Multi-Task Heads)",
        "sequence_length": SEQUENCE_LENGTH,
        "feature_count": len(FEATURE_COLS),
        "features": FEATURE_COLS,
        "active_sensors": len(sensor_buffers),
    }


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(reading: SensorReading):
    """
    Accept a single sensor reading, add it to the per-sensor sliding window buffer,
    and return a prediction once the buffer is full (SEQUENCE_LENGTH readings).
    """
    try:
        # Extract feature values in the correct order
        features = [getattr(reading, col) for col in FEATURE_COLS]

        # Add to sensor-specific buffer
        sensor_buffers[reading.sensor_id].append(features)
        buffer = sensor_buffers[reading.sensor_id]

        if len(buffer) < SEQUENCE_LENGTH:
            # Buffer not yet full — return a "buffering" response
            return PredictionResponse(
                sensor_id=reading.sensor_id,
                timestamp=datetime.utcnow().isoformat() + "Z",
                spike_probability=0.0,
                minutes_to_lel_breach=9999.0,
                alert_tier="GREEN_NORMAL",
                alert_tier_confidence={
                    "GREEN_NORMAL": 1.0,
                    "YELLOW_CAUTION": 0.0,
                    "RED_EVACUATION": 0.0,
                },
                buffer_size=len(buffer),
                buffer_full=False,
            )

        # Buffer full — make a real prediction
        result = make_prediction(reading.sensor_id, buffer)
        return PredictionResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/predict/batch", response_model=List[PredictionResponse], tags=["Prediction"])
def predict_batch(batch: BatchSensorReading):
    """
    Accept a batch of sensor readings and return predictions for each.
    Useful for bulk data ingestion.
    """
    results = []
    for reading in batch.readings:
        features = [getattr(reading, col) for col in FEATURE_COLS]
        sensor_buffers[reading.sensor_id].append(features)
        buffer = sensor_buffers[reading.sensor_id]

        if len(buffer) < SEQUENCE_LENGTH:
            results.append(PredictionResponse(
                sensor_id=reading.sensor_id,
                timestamp=datetime.utcnow().isoformat() + "Z",
                spike_probability=0.0,
                minutes_to_lel_breach=9999.0,
                alert_tier="GREEN_NORMAL",
                alert_tier_confidence={
                    "GREEN_NORMAL": 1.0,
                    "YELLOW_CAUTION": 0.0,
                    "RED_EVACUATION": 0.0,
                },
                buffer_size=len(buffer),
                buffer_full=False,
            ))
        else:
            result = make_prediction(reading.sensor_id, buffer)
            results.append(PredictionResponse(**result))

    return results


@app.get("/sensors", tags=["Sensors"])
def list_sensors():
    """List all sensors that have sent data."""
    return {
        "active_sensors": list(sensor_buffers.keys()),
        "count": len(sensor_buffers),
        "buffer_status": {
            sid: {
                "buffer_size": len(buf),
                "buffer_full": len(buf) == SEQUENCE_LENGTH,
            }
            for sid, buf in sensor_buffers.items()
        },
    }


@app.delete("/sensors/{sensor_id}/buffer", tags=["Sensors"])
def clear_sensor_buffer(sensor_id: str):
    """Clear the sliding window buffer for a specific sensor."""
    if sensor_id in sensor_buffers:
        sensor_buffers[sensor_id].clear()
        return {"message": f"Buffer cleared for {sensor_id}"}
    raise HTTPException(status_code=404, detail=f"Sensor {sensor_id} not found")


# ============================================================================
# MAIN
# ============================================================================
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )

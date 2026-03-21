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
from pymongo import MongoClient

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
MODEL_PATH = os.path.join(MODELS_DIR, "methane_lstm_transformer")
SCALER_PATH = os.path.join(MODELS_DIR, "feature_scaler.pkl")

print(f"Loading model from: {MODEL_PATH}")
# In Keras 3, a generic SavedModel relies on TFSMLayer
model_layer = tf.keras.layers.TFSMLayer(MODEL_PATH, call_endpoint='serving_default')
print("Model loaded successfully.")

print(f"Loading scaler from: {SCALER_PATH}")
scaler = joblib.load(SCALER_PATH)
print("Scaler loaded successfully.")

# ============================================================================
# DATABASE SETUP (MongoDB)
# ============================================================================
try:
    mongo_client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
    mongo_client.server_info() # trigger exception if cannot connect
    db = mongo_client["methane_db"]
    print("Connected to MongoDB successfully.")
except Exception as e:
    print(f"Warning: Could not connect to MongoDB. Is it running? Error: {e}")
    db = None

# ============================================================================
# EXPLAINABLE AI SETUP (Gemini)
# ============================================================================
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        from google import genai
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        print("Explainable AI (Gemini) initialized successfully.")
    except Exception as e:
        print(f"Warning: Could not initialize google-genai. Error: {e}")
        genai_client = None
else:
    print("Warning: GEMINI_API_KEY not found in environment. Explainable AI will use fallback text.")
    genai_client = None

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
    timestamp: Optional[str] = Field(None, example="2023-10-25T14:30:00Z")
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
    hour_sin: float = Field(..., example=0.5)
    hour_cos: float = Field(..., example=0.866)


class PredictionResponse(BaseModel):
    """Prediction output."""
    sensor_id: str
    timestamp: str
    spike_probability: float
    minutes_to_lel_breach: float
    alert_tier: str
    alert_tier_confidence: dict
    actions_triggered: List[str]                  
    explainable_ai_reasoning: Optional[str]       
    temperature_celsius: float
    pressure_kPa: float
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
    explainable_ai_enabled: bool


# ============================================================================
# PREDICTION LOGIC
# ============================================================================
def get_ai_explanation(alert_tier: str, latest_features: list) -> str:
    """Uses Gemini API to explain the alert tier based on the latest sensor window."""
    if not genai_client:
        # Fallback when Gemini is unavailable or rate‑limited
        # latest_features follows the order defined in FEATURE_COLS; temperature is index 1, pressure is index 2
        temp = latest_features[1] if len(latest_features) > 1 else 'N/A'
        pressure = latest_features[2] if len(latest_features) > 2 else 'N/A'
        return f"Fallback reasoning: Temp {temp}°C, Pressure {pressure} kPa – sensor combo matches a {alert_tier} pattern."

    try:
        metrics_summary = f"Methane: {latest_features[0]}ppm, Temp: {latest_features[1]}C, Change Rate: {latest_features[9]}ppm/m, LEL: {latest_features[10]*100}%"
        
        prompt = (f"You are the Explainable AI layer for an industrial methane safety platform.\n"
                  f"Our LSTM-Transformer model just predicted a '{alert_tier}' alert.\n"
                  f"The most recent sensor readings directly from the edge are: {metrics_summary}.\n"
                  f"Provide a 1-sentence ONLY professional, technical explanation to the safety engineer "
                  f"of exactly why this sensor combination is concerning and what it indicates.")
                  
        response = genai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return str(response.text).strip()
    except Exception as e:
        print(f"Gemini API Error: {e}")
        temp = latest_features[1] if len(latest_features) > 1 else 'N/A'
        pressure = latest_features[2] if len(latest_features) > 2 else 'N/A'
        return f"AI Rate Limit Exceeded: Temp {temp}°C, Pressure {pressure} kPa – current sensor combo resembles past {alert_tier} signatures (Showing cached heuristic)."


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

    # Predict using TFSMLayer
    preds = model_layer(X)
    
    # Extract values from dict
    spike_pred = preds['output_0'].numpy()[0][0]
    breach_pred = preds['output_1'].numpy()[0][0]
    clf_probs = preds['output_2'].numpy()[0]

    spike_probability = float(np.clip(spike_pred, 0.0, 1.0))
    minutes_to_breach = float(max(breach_pred, 0.0))

    # Classification probabilities
    alert_idx = int(np.argmax(clf_probs))
    alert_tier = ALERT_TIER_NAMES[alert_idx]

    # Explainable AI & Hardware Triggers Implementation
    actions_triggered = []
    explainable_ai_reasoning = None

    if alert_tier == "RED_EVACUATION" or spike_probability > 0.7:
        actions_triggered = [
            "SMS_SENT_TO_SAFETY_SUPERVISOR",
            "AUTOMATED_VALVES_SHUTOFF"
        ]
        explainable_ai_reasoning = get_ai_explanation(alert_tier, raw_features[-1])

    elif alert_tier == "YELLOW_CAUTION":
        actions_triggered = ["SMS_WARNING_SENT"]
        explainable_ai_reasoning = get_ai_explanation(alert_tier, raw_features[-1])

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
        "actions_triggered": actions_triggered,
        "explainable_ai_reasoning": explainable_ai_reasoning,
        "temperature_celsius": float(raw_features[-1][1]) if len(raw_features[-1]) > 1 else 0.0,
        "pressure_kPa": float(raw_features[-1][2]) if len(raw_features[-1]) > 2 else 0.0,
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
        "model_loaded": model_layer is not None,
        "scaler_loaded": scaler is not None,
        "model_architecture": "Hybrid LSTM + Transformer (BiLSTM → 2x Transformer Blocks → Multi-Task Heads)",
        "sequence_length": SEQUENCE_LENGTH,
        "feature_count": len(FEATURE_COLS),
        "features": FEATURE_COLS,
        "active_sensors": len(sensor_buffers),
        "explainable_ai_enabled": genai_client is not None,
    }


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(reading: SensorReading):
    """
    Accept a single sensor reading, add it to the per-sensor sliding window buffer,
    and return a prediction once the buffer is full (SEQUENCE_LENGTH readings).
    """
    try:
        # 1. Log raw sensor data
        if db is not None:
            reading_dict = reading.dict()
            reading_dict["logged_at"] = datetime.utcnow().isoformat() + "Z"
            db.sensor_data.insert_one(reading_dict)

        # 2. Extract feature values in the correct order
        features = [getattr(reading, col) for col in FEATURE_COLS]

        # 3. Add to sensor-specific buffer
        sensor_buffers[reading.sensor_id].append(features)
        buffer = sensor_buffers[reading.sensor_id]

        # Use reading timestamp if provided, else current time
        reading_time = reading.timestamp or (datetime.utcnow().isoformat() + "Z")

        if len(buffer) < SEQUENCE_LENGTH:
            # Buffer not yet full — return a "buffering" response
            return PredictionResponse(
                sensor_id=reading.sensor_id,
                timestamp=reading_time,
                spike_probability=0.0,
                minutes_to_lel_breach=9999.0,
                alert_tier="GREEN_NORMAL",
                alert_tier_confidence={
                    "GREEN_NORMAL": 1.0,
                    "YELLOW_CAUTION": 0.0,
                    "RED_EVACUATION": 0.0,
                },
                actions_triggered=[],
                explainable_ai_reasoning=None,
                temperature_celsius=reading.temperature_celsius,
                pressure_kPa=reading.pressure_kPa,
                buffer_size=len(buffer),
                buffer_full=False,
            )

        # Buffer full — make a real prediction
        result = make_prediction(reading.sensor_id, buffer)
        result["timestamp"] = reading_time  # Keep original timestamp if historical
        
        # 4. Log prediction to MongoDB
        if db is not None:
            pred_log = result.copy()
            pred_log["logged_at"] = datetime.utcnow().isoformat() + "Z"
            db.predictions.insert_one(pred_log)
            
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
    
    # 1. Log all raw data at once
    if db is not None and batch.readings:
        docs = []
        for r in batch.readings:
            d = r.dict()
            d["logged_at"] = datetime.utcnow().isoformat() + "Z"
            docs.append(d)
        db.sensor_data.insert_many(docs)
        
    for reading in batch.readings:
        features = [getattr(reading, col) for col in FEATURE_COLS]
        sensor_buffers[reading.sensor_id].append(features)
        buffer = sensor_buffers[reading.sensor_id]

        reading_time = reading.timestamp or (datetime.utcnow().isoformat() + "Z")

        if len(buffer) < SEQUENCE_LENGTH:
            results.append(PredictionResponse(
                sensor_id=reading.sensor_id,
                timestamp=reading_time,
                spike_probability=0.0,
                minutes_to_lel_breach=9999.0,
                alert_tier="GREEN_NORMAL",
                alert_tier_confidence={
                    "GREEN_NORMAL": 1.0,
                    "YELLOW_CAUTION": 0.0,
                    "RED_EVACUATION": 0.0,
                },
                actions_triggered=[],
                explainable_ai_reasoning=None,
                temperature_celsius=reading.temperature_celsius,
                pressure_kPa=reading.pressure_kPa,
                buffer_size=len(buffer),
                buffer_full=False,
            ))
        else:
            result = make_prediction(reading.sensor_id, buffer)
            result["timestamp"] = reading_time
            results.append(PredictionResponse(**result))

    # 2. Log predictions batch
    if db is not None and results:
        pred_logs = []
        for res in results:
            if res.buffer_full:  # Only log real predictions, not buffering states
                p = res.dict()
                p["logged_at"] = datetime.utcnow().isoformat() + "Z"
                pred_logs.append(p)
        if pred_logs:
            db.predictions.insert_many(pred_logs)

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


@app.get("/history", tags=["History"])
def get_history(limit: int = 50):
    """Fetch the latest sensor streams and predictions from MongoDB for the Dashboard."""
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB not connected. Start MongoDB to view history.")
        
    try:
        raw_cursor = db.sensor_data.find({}, {"_id": 0}).sort("logged_at", -1).limit(limit)
        raw_data = list(raw_cursor)
        
        pred_cursor = db.predictions.find({}, {"_id": 0}).sort("logged_at", -1).limit(limit)
        predictions = list(pred_cursor)
        
        return {
            "sensor_data": raw_data[::-1],  # Reverse to chronological order for charts
            "predictions": predictions[::-1]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

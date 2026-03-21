import os
import time
import requests
import pandas as pd
import numpy as np

# Configuration
API_URL = "http://localhost:8000/predict"
# Dataset is at the root directory of the project
DATASET_PATH = r"c:\Users\KIIT\Downloads\methane_raw_training_dataset.csv"
SENSOR_ID = "SEN-SIM-01"
DELAY_SECONDS = 4.5  # Throttle to ~13 req/min to respect Gemini 15 req/min free-tier quota

def prepare_data():
    if not os.path.exists(DATASET_PATH):
        print(f"Error: Dataset not found at {DATASET_PATH}")
        return None
        
    print(f"Loading dataset from {DATASET_PATH}...")
    df = pd.read_csv(DATASET_PATH)
    
    # Sort by timestamp to simulate chronological flow
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(by='timestamp')
    
    # Engineer cyclical features required by Model v2
    df['hour_sin'] = np.sin(2 * np.pi * df['timestamp'].dt.hour / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['timestamp'].dt.hour / 24)
    
    return df

def simulate_stream(df):
    print(f"Starting simulated IoT stream for {SENSOR_ID} at {API_URL}...")
    print(f"Streaming {len(df)} records. Press Ctrl+C to stop.\n")
    
    try:
        for index, row in df.iterrows():
            payload = {
                "sensor_id": SENSOR_ID,
                "timestamp": row["timestamp"].isoformat() + "Z",
                "ch4_concentration_ppm": float(row["ch4_concentration_ppm"]),
                "temperature_celsius": float(row["temperature_celsius"]),
                "pressure_kPa": float(row["pressure_kPa"]),
                "humidity_percent": float(row["humidity_percent"]),
                "wind_speed_ms": float(row["wind_speed_ms"]),
                "co2_ppm": float(row["co2_ppm"]),
                "ch4_rolling_mean_5min": float(row["ch4_rolling_mean_5min"]),
                "ch4_rolling_std_5min": float(row["ch4_rolling_std_5min"]),
                "ch4_rolling_mean_30min": float(row["ch4_rolling_mean_30min"]),
                "ch4_rate_of_change": float(row["ch4_rate_of_change"]),
                "lel_percent": float(row["lel_percent"]),
                "hour_sin": float(row["hour_sin"]),
                "hour_cos": float(row["hour_cos"])
            }
            
            # Send POST request
            response = requests.post(API_URL, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                ts = result['timestamp']
                if not result.get("buffer_full"):
                    print(f"[{ts}] Buffering data... ({result.get('buffer_size')}/20)")
                else:
                    spike_prob = result['spike_probability']
                    alert = result['alert_tier']
                    breach = result['minutes_to_lel_breach']
                    
                    # Formatting based on alert tier
                    color = "🟢" if alert == "GREEN_NORMAL" else "🟡" if alert == "YELLOW_CAUTION" else "🔴"
                    
                    print(f"[{ts}] {color} {alert} | Spike Prob: {spike_prob:.2f} | Breach in: {breach:.1f} mins")
            else:
                print(f"Error {response.status_code}: {response.text}")
                
            time.sleep(DELAY_SECONDS)
            
    except KeyboardInterrupt:
        print("\n\nSimulation stopped by user.")
    except requests.exceptions.ConnectionError:
        print(f"\nError: Could not connect to API at {API_URL}.")
        print("Make sure the FastAPI server is running (python backend/app.py).")

if __name__ == "__main__":
    df = prepare_data()
    if df is not None:
        simulate_stream(df)

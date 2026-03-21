import os
import json
import joblib
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, roc_auc_score

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if not os.path.exists(os.path.join(BASE_DIR, "train_model.py")):
    BASE_DIR = os.path.join(BASE_DIR, "..", "backend")
else:
    BASE_DIR = os.path.abspath(BASE_DIR)

print(f"Using base dir: {BASE_DIR}")
MODEL_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(BASE_DIR, "..", "methane")

def main():
    try:
        # Load config
        with open(os.path.join(MODEL_DIR, "model_config.json")) as f:
            config = json.load(f)
            
        print("Model improvements included:")
        for imp in config.get("improvements", []):
            print(f" - {imp}")

        # Load scalers
        feature_scaler = joblib.load(os.path.join(MODEL_DIR, "feature_scaler.pkl"))
        breach_scaler = joblib.load(os.path.join(MODEL_DIR, "breach_scaler.pkl"))
        
        # Load Raw Data
        df = pd.read_csv(os.path.join(DATA_DIR, "methane_raw_training_dataset.csv"))
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Engineer cyclical features
        df['hour_sin'] = np.sin(2 * np.pi * df['timestamp'].dt.hour / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['timestamp'].dt.hour / 24)
        
        # Create target
        alert_map = config["alert_tier_map"]
        df["alert_tier_encoded"] = df["alert_tier"].map(alert_map)
        
        # Use last 20% for testing (same as train_model.py)
        split_idx = int(len(df) * 0.8)
        test_df = df.iloc[split_idx:].copy()
        
        # Scale features
        features = config["feature_columns"]
        X_test_scaled = feature_scaler.transform(test_df[features])
        
        # Scale targets
        y_spike_test = test_df["spike_probability_score"].values.astype(np.float32)
        y_breach_test_scaled = breach_scaler.transform(test_df[["minutes_to_lel_breach"]]).flatten().astype(np.float32)
        y_clf_test = test_df["alert_tier_encoded"].values.astype(np.int32)
        
        # Create sequences
        seq_len = config["sequence_length"]
        def create_sequences(X, y_s, y_b, y_c, seq_len):
            Xs, ys, yb, yc = [], [], [], []
            for i in range(len(X) - seq_len):
                Xs.append(X[i:(i+seq_len)])
                ys.append(y_s[i+seq_len])
                yb.append(y_b[i+seq_len])
                yc.append(y_c[i+seq_len])
            return np.array(Xs), np.array(ys), np.array(yb), np.array(yc)
            
        X_seq, y_spike_seq, y_breach_seq, y_clf_seq = create_sequences(
            X_test_scaled, y_spike_test, y_breach_test_scaled, y_clf_test, seq_len
        )
        
        # Load model
        model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "methane_lstm_transformer"))
        
        # Evaluate
        print("\nEvaluating model on test set...")
        results = model.evaluate(X_seq, [y_spike_seq, y_breach_seq, y_clf_seq], verbose=0)
        
        print(f"\nOverall Test Loss: {results[0]:.4f}")
        for k, v in zip(model.metrics_names, results):
            print(f"  {k}: {v:.4f}")
            
        print("\nClassification Report (Alert Tier):")
        preds = model.predict(X_seq, verbose=0)
        y_clf_pred = np.argmax(preds[2], axis=1)
        print(classification_report(y_clf_seq, y_clf_pred, target_names=["GREEN", "YELLOW", "RED"]))
        
        spike_pred = preds[0].flatten()
        spike_auc = roc_auc_score((y_spike_seq > 0.7).astype(int), spike_pred)
        print(f"Spike AUC (>0.7 logic): {spike_auc:.4f}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()

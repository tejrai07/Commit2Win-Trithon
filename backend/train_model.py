"""
============================================================================
  METHANE GAS LEAK PREDICTION - INDUSTRY-READY TRAINING PIPELINE
  Architecture: Hybrid LSTM + Transformer (Multi-Head Self-Attention)
  
  Targets:
    1. spike_probability_score  (Regression: 0.0 - 1.0)
    2. minutes_to_lel_breach    (Regression: Time-to-Danger)
    3. alert_tier               (Classification: GREEN / YELLOW / RED)

  Dataset: methane_raw_training_dataset.csv (5000 samples, 20 features)
  Team: Commit2Win | Hackathon: Trithon 2026
============================================================================
"""

import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model, callbacks
import joblib
import json

# ============================================================================
# CONFIG
# ============================================================================
DATASET_PATH = os.environ.get(
    "DATASET_PATH",
    r"c:\Users\KIIT\Downloads\methane_raw_training_dataset.csv"
)
MODEL_SAVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
SEQUENCE_LENGTH = 10       # sliding window: 10 timesteps
BATCH_SIZE = 32
EPOCHS = 60
LEARNING_RATE = 1e-3
RANDOM_STATE = 42

# Feature columns used as inputs to the model
FEATURE_COLS = [
    "ch4_concentration_ppm",
    "temperature_celsius",
    "pressure_kPa",
    "humidity_percent",
    "wind_speed_ms",
    "co2_ppm",
    "ch4_rolling_mean_5min",
    "ch4_rolling_std_5min",
    "ch4_rolling_mean_30min",
    "ch4_rate_of_change",
    "lel_percent",
]

# Target columns
TARGET_REG_COLS = ["spike_probability_score", "minutes_to_lel_breach"]
TARGET_CLF_COL = "alert_tier"

# Alert tier mapping
ALERT_TIER_MAP = {"GREEN_NORMAL": 0, "YELLOW_CAUTION": 1, "RED_EVACUATION": 2}
ALERT_TIER_NAMES = ["GREEN_NORMAL", "YELLOW_CAUTION", "RED_EVACUATION"]


# ============================================================================
# 1. DATA LOADING & PREPROCESSING
# ============================================================================
def load_and_preprocess(path: str):
    """Load the CSV, sort by time per sensor, and return processed DataFrames."""
    print(f"[1/6] Loading dataset from: {path}")
    df = pd.read_csv(path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["sensor_id", "timestamp"]).reset_index(drop=True)
    print(f"       Shape: {df.shape}")
    print(f"       Sensors: {df['sensor_id'].nunique()}")
    print(f"       Alert distribution:\n{df[TARGET_CLF_COL].value_counts().to_string()}")
    return df


def scale_features(df: pd.DataFrame):
    """Fit a MinMaxScaler on feature columns and transform."""
    print("[2/6] Scaling features with MinMaxScaler...")
    scaler = MinMaxScaler()
    df_scaled = df.copy()
    df_scaled[FEATURE_COLS] = scaler.fit_transform(df[FEATURE_COLS])
    return df_scaled, scaler


def create_sequences(df: pd.DataFrame, seq_len: int):
    """
    Create sliding-window sequences PER SENSOR to respect time ordering.
    Returns X (sequences), y_reg (regression targets), y_clf (classification target).
    """
    print(f"[3/6] Creating sliding-window sequences (window={seq_len})...")
    X_all, y_reg_all, y_clf_all = [], [], []

    for sensor_id, group in df.groupby("sensor_id"):
        features = group[FEATURE_COLS].values
        targets_reg = group[TARGET_REG_COLS].values
        targets_clf = group[TARGET_CLF_COL].map(ALERT_TIER_MAP).values

        for i in range(len(features) - seq_len):
            X_all.append(features[i : i + seq_len])
            # Target is the NEXT timestep after the window
            y_reg_all.append(targets_reg[i + seq_len])
            y_clf_all.append(targets_clf[i + seq_len])

    X = np.array(X_all, dtype=np.float32)
    y_reg = np.array(y_reg_all, dtype=np.float32)
    y_clf = np.array(y_clf_all, dtype=np.int32)
    print(f"       Total sequences: {X.shape[0]}")
    print(f"       X shape: {X.shape}  |  y_reg shape: {y_reg.shape}  |  y_clf shape: {y_clf.shape}")
    return X, y_reg, y_clf


# ============================================================================
# 2. MODEL ARCHITECTURE: HYBRID LSTM + TRANSFORMER
# ============================================================================
class TransformerBlock(layers.Layer):
    """Single Transformer encoder block with Multi-Head Self-Attention."""

    def __init__(self, embed_dim, num_heads, ff_dim, dropout_rate=0.1, **kwargs):
        super().__init__(**kwargs)
        self.att = layers.MultiHeadAttention(
            num_heads=num_heads, key_dim=embed_dim
        )
        self.ffn = keras.Sequential([
            layers.Dense(ff_dim, activation="gelu"),
            layers.Dense(embed_dim),
        ])
        self.layernorm1 = layers.LayerNormalization(epsilon=1e-6)
        self.layernorm2 = layers.LayerNormalization(epsilon=1e-6)
        self.dropout1 = layers.Dropout(dropout_rate)
        self.dropout2 = layers.Dropout(dropout_rate)

    def call(self, inputs, training=False):
        # Multi-Head Self Attention
        attn_output = self.att(inputs, inputs)
        attn_output = self.dropout1(attn_output, training=training)
        out1 = self.layernorm1(inputs + attn_output)
        # Feed Forward Network
        ffn_output = self.ffn(out1)
        ffn_output = self.dropout2(ffn_output, training=training)
        return self.layernorm2(out1 + ffn_output)


def build_model(seq_len: int, n_features: int):
    """
    Build a Hybrid LSTM + Transformer model with multi-task heads:
      - Head 1: Regression (spike_probability, minutes_to_lel_breach)
      - Head 2: Classification (alert_tier: GREEN / YELLOW / RED)
    """
    print("[4/6] Building Hybrid LSTM + Transformer model...")

    inputs = layers.Input(shape=(seq_len, n_features), name="sensor_input")

    # ---- LSTM Encoder ----
    x = layers.Bidirectional(
        layers.LSTM(64, return_sequences=True, dropout=0.2, recurrent_dropout=0.1),
        name="bi_lstm_1"
    )(inputs)
    x = layers.Bidirectional(
        layers.LSTM(32, return_sequences=True, dropout=0.2, recurrent_dropout=0.1),
        name="bi_lstm_2"
    )(x)

    # ---- Projection to Transformer dim ----
    embed_dim = 64
    x = layers.Dense(embed_dim, name="projection")(x)

    # ---- Positional Encoding (learned) ----
    positions = tf.range(start=0, limit=seq_len, delta=1)
    pos_embedding = layers.Embedding(input_dim=seq_len, output_dim=embed_dim, name="pos_embed")(positions)
    x = x + pos_embedding

    # ---- Transformer Encoder Blocks ----
    x = TransformerBlock(embed_dim=embed_dim, num_heads=4, ff_dim=128, dropout_rate=0.1, name="transformer_1")(x)
    x = TransformerBlock(embed_dim=embed_dim, num_heads=4, ff_dim=128, dropout_rate=0.1, name="transformer_2")(x)

    # ---- Global Average Pooling ----
    x = layers.GlobalAveragePooling1D(name="global_pool")(x)
    x = layers.Dropout(0.3)(x)
    shared = layers.Dense(64, activation="relu", name="shared_dense")(x)

    # ---- Head 1: Regression (spike_probability_score, minutes_to_lel_breach) ----
    reg = layers.Dense(32, activation="relu", name="reg_dense")(shared)
    reg_output = layers.Dense(2, activation="linear", name="regression_output")(reg)

    # ---- Head 2: Classification (alert_tier: 3 classes) ----
    clf = layers.Dense(32, activation="relu", name="clf_dense")(shared)
    clf_output = layers.Dense(3, activation="softmax", name="classification_output")(clf)

    model = Model(inputs=inputs, outputs=[reg_output, clf_output], name="MethanePredictor_LSTM_Transformer")
    model.summary()
    return model


# ============================================================================
# 3. TRAINING
# ============================================================================
def train(model, X_train, y_reg_train, y_clf_train, X_val, y_reg_val, y_clf_val):
    """Compile and train the multi-task model."""
    print("[5/6] Compiling and training...")

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss={
            "regression_output": "mse",
            "classification_output": "sparse_categorical_crossentropy",
        },
        loss_weights={
            "regression_output": 1.0,
            "classification_output": 0.5,
        },
        metrics={
            "regression_output": ["mae"],
            "classification_output": ["accuracy"],
        },
    )

    cb = [
        callbacks.EarlyStopping(
            monitor="val_loss", patience=8, restore_best_weights=True, verbose=1
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=4, min_lr=1e-6, verbose=1
        ),
    ]

    history = model.fit(
        X_train,
        {"regression_output": y_reg_train, "classification_output": y_clf_train},
        validation_data=(
            X_val,
            {"regression_output": y_reg_val, "classification_output": y_clf_val},
        ),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=cb,
        verbose=1,
    )
    return history


# ============================================================================
# 4. EVALUATION & SAVING
# ============================================================================
def evaluate_and_save(model, history, scaler, X_test, y_reg_test, y_clf_test):
    """Evaluate the model on the test set and save all artifacts."""
    print("[6/6] Evaluating and saving model artifacts...")

    os.makedirs(MODEL_SAVE_DIR, exist_ok=True)

    # --- Evaluate ---
    results = model.evaluate(
        X_test,
        {"regression_output": y_reg_test, "classification_output": y_clf_test},
        verbose=0,
    )
    metric_names = model.metrics_names
    for name, val in zip(metric_names, results):
        print(f"  {name}: {val:.4f}")

    # --- Predictions for classification report ---
    y_reg_pred, y_clf_pred = model.predict(X_test, verbose=0)
    y_clf_labels = np.argmax(y_clf_pred, axis=1)

    from sklearn.metrics import classification_report
    print("\nClassification Report (Alert Tier):")
    print(classification_report(y_clf_test, y_clf_labels, target_names=ALERT_TIER_NAMES))

    # --- Save model ---
    model_path = os.path.join(MODEL_SAVE_DIR, "methane_lstm_transformer.keras")
    model.save(model_path)
    print(f"  Model saved to: {model_path}")

    # --- Save scaler ---
    scaler_path = os.path.join(MODEL_SAVE_DIR, "feature_scaler.pkl")
    joblib.dump(scaler, scaler_path)
    print(f"  Scaler saved to: {scaler_path}")

    # --- Save config / metadata ---
    config = {
        "feature_columns": FEATURE_COLS,
        "target_regression": TARGET_REG_COLS,
        "target_classification": TARGET_CLF_COL,
        "alert_tier_map": ALERT_TIER_MAP,
        "sequence_length": SEQUENCE_LENGTH,
        "model_path": model_path,
        "scaler_path": scaler_path,
    }
    config_path = os.path.join(MODEL_SAVE_DIR, "model_config.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"  Config saved to: {config_path}")

    # --- Plot training history ---
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle("Methane LSTM-Transformer Training Results", fontsize=14, fontweight="bold")

    # Total loss
    axes[0, 0].plot(history.history["loss"], label="Train Loss")
    axes[0, 0].plot(history.history["val_loss"], label="Val Loss")
    axes[0, 0].set_title("Total Loss")
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)

    # Regression MAE
    axes[0, 1].plot(history.history["regression_output_mae"], label="Train MAE")
    axes[0, 1].plot(history.history["val_regression_output_mae"], label="Val MAE")
    axes[0, 1].set_title("Regression MAE (Spike Prob + Time-to-Danger)")
    axes[0, 1].legend()
    axes[0, 1].grid(True, alpha=0.3)

    # Classification Accuracy
    axes[1, 0].plot(history.history["classification_output_accuracy"], label="Train Acc")
    axes[1, 0].plot(history.history["val_classification_output_accuracy"], label="Val Acc")
    axes[1, 0].set_title("Classification Accuracy (Alert Tier)")
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)

    # LR schedule
    if "lr" in history.history:
        axes[1, 1].plot(history.history["lr"], label="Learning Rate")
    elif "learning_rate" in history.history:
        axes[1, 1].plot(history.history["learning_rate"], label="Learning Rate")
    axes[1, 1].set_title("Learning Rate Schedule")
    axes[1, 1].legend()
    axes[1, 1].grid(True, alpha=0.3)

    plt.tight_layout()
    plot_path = os.path.join(MODEL_SAVE_DIR, "training_results.png")
    plt.savefig(plot_path, dpi=150)
    plt.close()
    print(f"  Training plots saved to: {plot_path}")

    print("\n✅ Training pipeline complete! Model is ready for deployment.")
    return results


# ============================================================================
# MAIN
# ============================================================================
def main():
    print("=" * 70)
    print("  METHANE PREDICTIVE MODEL - LSTM + TRANSFORMER TRAINING PIPELINE")
    print("  Team Commit2Win | Trithon 2026")
    print("=" * 70)

    # 1. Load
    df = load_and_preprocess(DATASET_PATH)

    # 2. Scale
    df_scaled, scaler = scale_features(df)

    # 3. Create sequences
    X, y_reg, y_clf = create_sequences(df_scaled, SEQUENCE_LENGTH)

    # 4. Train/Val/Test split (70/15/15)
    X_train, X_temp, y_reg_train, y_reg_temp, y_clf_train, y_clf_temp = train_test_split(
        X, y_reg, y_clf, test_size=0.3, random_state=RANDOM_STATE, stratify=y_clf
    )
    X_val, X_test, y_reg_val, y_reg_test, y_clf_val, y_clf_test = train_test_split(
        X_temp, y_reg_temp, y_clf_temp, test_size=0.5, random_state=RANDOM_STATE, stratify=y_clf_temp
    )
    print(f"       Train: {X_train.shape[0]} | Val: {X_val.shape[0]} | Test: {X_test.shape[0]}")

    # 5. Build model
    model = build_model(SEQUENCE_LENGTH, len(FEATURE_COLS))

    # 6. Train
    history = train(model, X_train, y_reg_train, y_clf_train, X_val, y_reg_val, y_clf_val)

    # 7. Evaluate & Save
    evaluate_and_save(model, history, scaler, X_test, y_reg_test, y_clf_test)


if __name__ == "__main__":
    main()

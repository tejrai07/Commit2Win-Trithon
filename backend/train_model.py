"""
============================================================================
  METHANE GAS LEAK PREDICTION - INDUSTRY-READY TRAINING PIPELINE v2
  Architecture: Hybrid LSTM + Transformer (Multi-Head Self-Attention)
  
  IMPROVEMENTS in v2:
    1. Class weighting for imbalanced alert tiers
    2. Increased sequence length (10 → 20) for longer temporal context
    3. Separate target normalization (MinMaxScaler on minutes_to_lel_breach)
    4. Cyclical time features (hour_sin, hour_cos) from timestamps
    5. Sigmoid activation for spike_probability (PPT alignment, threshold>0.7)
    6. Separate regression heads for spike_prob (sigmoid) vs time-to-danger

  Targets:
    1. spike_probability_score  (Sigmoid: 0.0 - 1.0, threshold > 0.7)
    2. minutes_to_lel_breach    (Regression, normalized)
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
from sklearn.preprocessing import MinMaxScaler
from sklearn.utils.class_weight import compute_class_weight
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

# ---- v2 IMPROVEMENTS ----
SEQUENCE_LENGTH = 20       # IMPROVEMENT 2: Increased from 10 → 20 for longer temporal context
BATCH_SIZE = 32
EPOCHS = 80                # More epochs (early stopping will handle overfitting)
LEARNING_RATE = 5e-4       # Slightly lower LR for better convergence
RANDOM_STATE = 42

# Base feature columns from the dataset
BASE_FEATURE_COLS = [
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

# IMPROVEMENT 4: Cyclical time features added
ENGINEERED_FEATURES = ["hour_sin", "hour_cos"]
FEATURE_COLS = BASE_FEATURE_COLS + ENGINEERED_FEATURES  # 13 total features

# Target columns
TARGET_CLF_COL = "alert_tier"

# Alert tier mapping
ALERT_TIER_MAP = {"GREEN_NORMAL": 0, "YELLOW_CAUTION": 1, "RED_EVACUATION": 2}
ALERT_TIER_NAMES = ["GREEN_NORMAL", "YELLOW_CAUTION", "RED_EVACUATION"]


# ============================================================================
# 1. DATA LOADING & PREPROCESSING
# ============================================================================
def load_and_preprocess(path: str):
    """Load CSV, add engineered features, sort by time per sensor."""
    print(f"[1/7] Loading dataset from: {path}")
    df = pd.read_csv(path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["sensor_id", "timestamp"]).reset_index(drop=True)

    # ---- IMPROVEMENT 4: Cyclical time features ----
    print("       Adding cyclical time features (hour_sin, hour_cos)...")
    hour = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24.0)

    print(f"       Shape: {df.shape}")
    print(f"       Sensors: {df['sensor_id'].nunique()}")
    print(f"       Features: {len(FEATURE_COLS)} ({len(BASE_FEATURE_COLS)} base + {len(ENGINEERED_FEATURES)} engineered)")
    print(f"       Alert distribution:\n{df[TARGET_CLF_COL].value_counts().to_string()}")
    return df


def scale_features(df: pd.DataFrame):
    """
    Fit scalers on feature columns and targets separately.
    IMPROVEMENT 3: Separate normalization for minutes_to_lel_breach.
    """
    print("[2/7] Scaling features and targets...")

    # Feature scaler
    feature_scaler = MinMaxScaler()
    df_scaled = df.copy()
    df_scaled[FEATURE_COLS] = feature_scaler.fit_transform(df[FEATURE_COLS])

    # IMPROVEMENT 3: Separate scaler for minutes_to_lel_breach
    breach_scaler = MinMaxScaler()
    df_scaled["minutes_to_lel_breach_scaled"] = breach_scaler.fit_transform(
        df[["minutes_to_lel_breach"]]
    )

    print(f"       minutes_to_lel_breach range: {df['minutes_to_lel_breach'].min():.1f} - {df['minutes_to_lel_breach'].max():.1f}")
    print(f"       spike_probability range: {df['spike_probability_score'].min():.4f} - {df['spike_probability_score'].max():.4f}")

    return df_scaled, feature_scaler, breach_scaler


def create_sequences(df: pd.DataFrame, seq_len: int):
    """
    Create sliding-window sequences PER SENSOR to respect time ordering.
    Returns:
        X: input sequences
        y_spike: spike probability targets (0-1, for sigmoid head)
        y_breach: normalized minutes_to_lel_breach targets
        y_clf: alert tier classification targets
    """
    print(f"[3/7] Creating sliding-window sequences (window={seq_len})...")
    X_all, y_spike_all, y_breach_all, y_clf_all = [], [], [], []

    for sensor_id, group in df.groupby("sensor_id"):
        features = group[FEATURE_COLS].values
        spike_probs = group["spike_probability_score"].values
        breach_mins = group["minutes_to_lel_breach_scaled"].values
        alert_tiers = group[TARGET_CLF_COL].map(ALERT_TIER_MAP).values

        for i in range(len(features) - seq_len):
            X_all.append(features[i : i + seq_len])
            # Target is the NEXT timestep after the window
            y_spike_all.append(spike_probs[i + seq_len])
            y_breach_all.append(breach_mins[i + seq_len])
            y_clf_all.append(alert_tiers[i + seq_len])

    X = np.array(X_all, dtype=np.float32)
    y_spike = np.array(y_spike_all, dtype=np.float32)
    y_breach = np.array(y_breach_all, dtype=np.float32)
    y_clf = np.array(y_clf_all, dtype=np.int32)

    print(f"       Total sequences: {X.shape[0]}")
    print(f"       X shape: {X.shape}")
    print(f"       y_spike shape: {y_spike.shape}  |  y_breach shape: {y_breach.shape}  |  y_clf shape: {y_clf.shape}")
    return X, y_spike, y_breach, y_clf


# ============================================================================
# 2. MODEL ARCHITECTURE: HYBRID LSTM + TRANSFORMER (v2)
# ============================================================================
@tf.keras.utils.register_keras_serializable(package="MethanePredictor")
class TransformerBlock(layers.Layer):
    """Single Transformer encoder block with Multi-Head Self-Attention."""

    def __init__(self, embed_dim, num_heads, ff_dim, dropout_rate=0.1, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.ff_dim = ff_dim
        self.dropout_rate = dropout_rate
        self.att = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim)
        # Use explicit Dense layers instead of Sequential (fixes TF 2.21 serialization bug)
        self.ffn_dense1 = layers.Dense(ff_dim, activation="gelu")
        self.ffn_dense2 = layers.Dense(embed_dim)
        self.layernorm1 = layers.LayerNormalization(epsilon=1e-6)
        self.layernorm2 = layers.LayerNormalization(epsilon=1e-6)
        self.dropout1 = layers.Dropout(dropout_rate)
        self.dropout2 = layers.Dropout(dropout_rate)

    def call(self, inputs, training=False):
        attn_output = self.att(inputs, inputs)
        attn_output = self.dropout1(attn_output, training=training)
        out1 = self.layernorm1(inputs + attn_output)
        # Feed Forward Network (explicit layers)
        ffn_output = self.ffn_dense1(out1)
        ffn_output = self.ffn_dense2(ffn_output)
        ffn_output = self.dropout2(ffn_output, training=training)
        return self.layernorm2(out1 + ffn_output)

    def get_config(self):
        config = super().get_config()
        config.update({
            "embed_dim": self.embed_dim,
            "num_heads": self.num_heads,
            "ff_dim": self.ff_dim,
            "dropout_rate": self.dropout_rate,
        })
        return config


def build_model(seq_len: int, n_features: int):
    """
    Build Hybrid LSTM + Transformer with 3 SEPARATE output heads:
      - spike_output:   Sigmoid-activated (PPT: ">0.7 triggers high alert")
      - breach_output:  Linear regression (normalized minutes to LEL breach)
      - alert_output:   Softmax 3-class (GREEN / YELLOW / RED)
    """
    print("[4/7] Building Hybrid LSTM + Transformer model v2...")

    inputs = layers.Input(shape=(seq_len, n_features), name="sensor_input")

    # ---- LSTM Encoder (larger units for more capacity) ----
    x = layers.Bidirectional(
        layers.LSTM(128, return_sequences=True, dropout=0.2, recurrent_dropout=0.1),
        name="bi_lstm_1"
    )(inputs)
    x = layers.Bidirectional(
        layers.LSTM(64, return_sequences=True, dropout=0.2, recurrent_dropout=0.1),
        name="bi_lstm_2"
    )(x)

    # ---- Projection to Transformer dim ----
    embed_dim = 128
    x = layers.Dense(embed_dim, name="projection")(x)

    # ---- Positional Encoding (learned) ----
    positions = tf.range(start=0, limit=seq_len, delta=1)
    pos_embedding = layers.Embedding(input_dim=seq_len, output_dim=embed_dim, name="pos_embed")(positions)
    x = x + pos_embedding

    # ---- 3x Transformer Encoder Blocks ----
    x = TransformerBlock(embed_dim=embed_dim, num_heads=8, ff_dim=256, dropout_rate=0.1, name="transformer_1")(x)
    x = TransformerBlock(embed_dim=embed_dim, num_heads=8, ff_dim=256, dropout_rate=0.1, name="transformer_2")(x)
    x = TransformerBlock(embed_dim=embed_dim, num_heads=8, ff_dim=256, dropout_rate=0.1, name="transformer_3")(x)

    # ---- Global Average Pooling ----
    x = layers.GlobalAveragePooling1D(name="global_pool")(x)
    x = layers.Dropout(0.3)(x)
    shared = layers.Dense(128, activation="relu", name="shared_dense")(x)
    shared = layers.BatchNormalization(name="shared_bn")(shared)

    # ---- Head 1: Spike Probability (SIGMOID as per PPT) ----
    # PPT: "sigmoid-activated probability score for imminent methane spikes
    #        (threshold >0.7 triggers high alert)"
    spike_branch = layers.Dense(64, activation="relu", name="spike_dense_1")(shared)
    spike_branch = layers.Dropout(0.2)(spike_branch)
    spike_branch = layers.Dense(32, activation="relu", name="spike_dense_2")(spike_branch)
    spike_output = layers.Dense(1, activation="sigmoid", name="spike_output")(spike_branch)

    # ---- Head 2: Minutes to LEL Breach (Linear regression, normalized) ----
    # PPT: "regression head estimating precise minutes until dangerous LEL breach"
    breach_branch = layers.Dense(64, activation="relu", name="breach_dense_1")(shared)
    breach_branch = layers.Dropout(0.2)(breach_branch)
    breach_branch = layers.Dense(32, activation="relu", name="breach_dense_2")(breach_branch)
    breach_output = layers.Dense(1, activation="linear", name="breach_output")(breach_branch)

    # ---- Head 3: Alert Tier Classification (Softmax) ----
    # PPT: "tiered responses from yellow caution to red evacuation"
    alert_branch = layers.Dense(64, activation="relu", name="alert_dense_1")(shared)
    alert_branch = layers.Dropout(0.2)(alert_branch)
    alert_branch = layers.Dense(32, activation="relu", name="alert_dense_2")(alert_branch)
    alert_output = layers.Dense(3, activation="softmax", name="alert_output")(alert_branch)

    model = Model(
        inputs=inputs,
        outputs=[spike_output, breach_output, alert_output],
        name="MethanePredictor_LSTM_Transformer_v2"
    )
    model.summary()
    return model


# ============================================================================
# 3. TRAINING
# ============================================================================
def compute_class_weights(y_clf):
    """IMPROVEMENT 1: Compute class weights for imbalanced alert tiers."""
    print("[5/7] Computing class weights for imbalanced data...")
    classes = np.unique(y_clf)
    weights = compute_class_weight("balanced", classes=classes, y=y_clf)
    class_weight_dict = {int(c): float(w) for c, w in zip(classes, weights)}
    print(f"       Class weights: {class_weight_dict}")
    return class_weight_dict


def train_model(model, X_train, y_spike_train, y_breach_train, y_clf_train,
                X_val, y_spike_val, y_breach_val, y_clf_val, class_weights):
    """Compile and train the multi-task model with class weights."""
    print("[6/7] Compiling and training...")

    # Build sample weights from class weights for the classification head
    sample_weights_clf = np.array([class_weights[int(c)] for c in y_clf_train], dtype=np.float32)

    # Use LIST-BASED outputs (order matches model output order: spike, breach, alert)
    # This avoids TF 2.21 dict-based KeyError bug
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss=[
            "binary_crossentropy",                # spike_output (sigmoid)
            "mse",                                 # breach_output (regression)
            "sparse_categorical_crossentropy",     # alert_output (classification)
        ],
        loss_weights=[1.5, 1.0, 1.0],
        metrics=[
            ["mae"],                               # spike_output metrics
            ["mae"],                               # breach_output metrics
            ["accuracy"],                          # alert_output metrics
        ],
    )

    cb = [
        callbacks.EarlyStopping(
            monitor="val_loss", patience=12, restore_best_weights=True, verbose=1
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6, verbose=1
        ),
    ]

    history = model.fit(
        X_train,
        [y_spike_train, y_breach_train, y_clf_train],
        validation_data=(
            X_val,
            [y_spike_val, y_breach_val, y_clf_val],
        ),
        sample_weight=sample_weights_clf,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=cb,
        verbose=1,
    )
    return history


# ============================================================================
# 4. EVALUATION & SAVING
# ============================================================================
def evaluate_and_save(model, history, feature_scaler, breach_scaler,
                      X_test, y_spike_test, y_breach_test, y_clf_test):
    """Evaluate on test set, print reports, save all artifacts."""
    print("[7/7] Evaluating and saving model artifacts...")

    os.makedirs(MODEL_SAVE_DIR, exist_ok=True)

    # --- Evaluate ---
    results = model.evaluate(
        X_test,
        [y_spike_test, y_breach_test, y_clf_test],
        verbose=0,
    )
    metric_names = model.metrics_names
    print("\n  === TEST METRICS ===")
    for name, val in zip(metric_names, results):
        print(f"  {name}: {val:.4f}")

    # --- Classification report ---
    predictions = model.predict(X_test, verbose=0)
    y_spike_pred = predictions[0]
    y_clf_pred = predictions[2]
    y_clf_labels = np.argmax(y_clf_pred, axis=1)

    from sklearn.metrics import classification_report, roc_auc_score
    print("\n  === CLASSIFICATION REPORT (Alert Tier) ===")
    print(classification_report(y_clf_test, y_clf_labels, target_names=ALERT_TIER_NAMES))

    # Spike detection metrics
    spike_auc = roc_auc_score(
        (y_spike_test > 0.7).astype(int),
        y_spike_pred.flatten()
    )
    spike_accuracy = np.mean(
        ((y_spike_pred.flatten() > 0.7) == (y_spike_test > 0.7)).astype(float)
    )
    print(f"  === SPIKE DETECTION (threshold > 0.7) ===")
    print(f"  Spike AUC: {spike_auc:.4f}")
    print(f"  Spike Accuracy: {spike_accuracy:.4f}")

    # --- Save model ---
    model_dir = os.path.join(MODEL_SAVE_DIR, "methane_lstm_transformer")
    model.export(model_dir)
    print(f"\n  Model saved to: {model_dir}")

    # --- Save scalers ---
    feature_scaler_path = os.path.join(MODEL_SAVE_DIR, "feature_scaler.pkl")
    breach_scaler_path = os.path.join(MODEL_SAVE_DIR, "breach_scaler.pkl")
    joblib.dump(feature_scaler, feature_scaler_path)
    joblib.dump(breach_scaler, breach_scaler_path)
    print(f"  Feature scaler saved to: {feature_scaler_path}")
    print(f"  Breach scaler saved to: {breach_scaler_path}")

    # --- Save config ---
    config = {
        "version": "2.0",
        "feature_columns": FEATURE_COLS,
        "base_feature_columns": BASE_FEATURE_COLS,
        "engineered_features": ENGINEERED_FEATURES,
        "target_spike": "spike_probability_score",
        "target_breach": "minutes_to_lel_breach",
        "target_classification": TARGET_CLF_COL,
        "alert_tier_map": ALERT_TIER_MAP,
        "sequence_length": SEQUENCE_LENGTH,
        "spike_threshold": 0.7,
        "improvements": [
            "class_weighting",
            "sequence_length_20",
            "separate_target_normalization",
            "cyclical_time_features",
            "sigmoid_spike_head",
            "3x_transformer_blocks",
            "larger_lstm_units",
        ],
    }
    config_path = os.path.join(MODEL_SAVE_DIR, "model_config.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"  Config saved to: {config_path}")

    # --- Plot training history ---
    # Auto-detect metric names from history keys
    hist_keys = list(history.history.keys())
    print(f"  Available history keys: {hist_keys}")

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle("Methane LSTM-Transformer v2 Training Results", fontsize=14, fontweight="bold")

    # Total loss
    axes[0, 0].plot(history.history["loss"], label="Train Loss")
    axes[0, 0].plot(history.history["val_loss"], label="Val Loss")
    axes[0, 0].set_title("Total Loss")
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)

    # Find MAE keys for spike (first output)
    spike_mae_keys = [k for k in hist_keys if "mae" in k and "val_" not in k]
    if len(spike_mae_keys) >= 1:
        axes[0, 1].plot(history.history[spike_mae_keys[0]], label="Train MAE (Spike)")
        axes[0, 1].plot(history.history[f"val_{spike_mae_keys[0]}"], label="Val MAE (Spike)")
    axes[0, 1].set_title("Spike Probability MAE")
    axes[0, 1].legend()
    axes[0, 1].grid(True, alpha=0.3)

    # Find accuracy key for alert (third output)
    acc_keys = [k for k in hist_keys if "accuracy" in k and "val_" not in k]
    if len(acc_keys) >= 1:
        axes[1, 0].plot(history.history[acc_keys[0]], label="Train Acc")
        axes[1, 0].plot(history.history[f"val_{acc_keys[0]}"], label="Val Acc")
    axes[1, 0].set_title("Alert Tier Classification Accuracy")
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)

    # Learning Rate
    if "lr" in history.history:
        axes[1, 1].plot(history.history["lr"], label="Learning Rate")
    elif "learning_rate" in history.history:
        axes[1, 1].plot(history.history["learning_rate"], label="Learning Rate")
    axes[1, 1].set_title("Learning Rate Schedule")
    axes[1, 1].legend()
    axes[1, 1].grid(True, alpha=0.3)

    plt.tight_layout()
    plot_path = os.path.join(MODEL_SAVE_DIR, "training_results_v2.png")
    plt.savefig(plot_path, dpi=150)
    plt.close()
    print(f"  Training plots saved to: {plot_path}")

    print("\n" + "=" * 70)
    print("  ✅ TRAINING v2 COMPLETE! Model is ready for deployment.")
    print("=" * 70)
    return results


# ============================================================================
# MAIN
# ============================================================================
def main():
    print("=" * 70)
    print("  METHANE PREDICTIVE MODEL v2 - LSTM + TRANSFORMER PIPELINE")
    print("  Team Commit2Win | Trithon 2026")
    print("  Improvements: Class Weights | Seq=20 | Separate Scaling |")
    print("                 Cyclical Time | Sigmoid Spike | 3x Transformer")
    print("=" * 70)

    # 1. Load & engineer features
    df = load_and_preprocess(DATASET_PATH)

    # 2. Scale features & targets separately (IMPROVEMENT 3)
    df_scaled, feature_scaler, breach_scaler = scale_features(df)

    # 3. Create sequences (IMPROVEMENT 2: seq_len=20)
    X, y_spike, y_breach, y_clf = create_sequences(df_scaled, SEQUENCE_LENGTH)

    # 4. Train/Val/Test split (70/15/15)
    X_train, X_temp, y_spike_train, y_spike_temp, y_breach_train, y_breach_temp, y_clf_train, y_clf_temp = \
        train_test_split(X, y_spike, y_breach, y_clf, test_size=0.3, random_state=RANDOM_STATE, stratify=y_clf)
    X_val, X_test, y_spike_val, y_spike_test, y_breach_val, y_breach_test, y_clf_val, y_clf_test = \
        train_test_split(X_temp, y_spike_temp, y_breach_temp, y_clf_temp, test_size=0.5, random_state=RANDOM_STATE, stratify=y_clf_temp)
    print(f"       Train: {X_train.shape[0]} | Val: {X_val.shape[0]} | Test: {X_test.shape[0]}")

    # 5. Compute class weights (IMPROVEMENT 1)
    class_weights = compute_class_weights(y_clf_train)

    # 6. Build model (v2: sigmoid spike head, 3x transformer, larger LSTM)
    model = build_model(SEQUENCE_LENGTH, len(FEATURE_COLS))

    # 7. Train with class weights
    history = train_model(
        model, X_train, y_spike_train, y_breach_train, y_clf_train,
        X_val, y_spike_val, y_breach_val, y_clf_val, class_weights
    )

    # 8. Evaluate & Save
    evaluate_and_save(
        model, history, feature_scaler, breach_scaler,
        X_test, y_spike_test, y_breach_test, y_clf_test
    )


if __name__ == "__main__":
    main()

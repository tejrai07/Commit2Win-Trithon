import tensorflow as tf
import sys

try:
    model_path = r"c:\Users\KIIT\Downloads\methane_predictive_model.keras"
    model = tf.keras.models.load_model(model_path)
    print("Model Input Shape:", model.input_shape)
    print("Model Output Shape:", model.output_shape)
    model.summary()
except Exception as e:
    print(f"Error loading model: {e}")
    sys.exit(1)

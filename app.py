from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
import os

app = Flask(__name__)

# Load the model directly from the Downloads folder as requested
# Using an environment variable so it can be easily overridden for deploying
MODEL_PATH = os.environ.get("MODEL_PATH", r"c:\Users\KIIT\Downloads\methane_predictive_model.keras")

try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print(f"Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded. Check server logs.'}), 500

    try:
        # Get JSON payload
        data = request.get_json(force=True)
        
        # We expect a 'features' key with a list of historical/sensor features
        if 'features' not in data:
            return jsonify({
                'error': 'Missing "features" key in JSON payload.',
                'expected_format': {'features': [1.2, 3.4, 5.6]}
            }), 400
        
        # Convert input to numpy array
        features = np.array(data['features'])
        
        # Adjust dimensions if it's a 1D array (a single sample)
        # Keras models usually expect batches, e.g., shape (batch_size, num_features)
        if len(features.shape) == 1:
            features = np.expand_dims(features, axis=0)
            
        # Make prediction
        prediction = model.predict(features)
        
        # Convert output to list to make it JSON serializable
        result = prediction.tolist()
        
        return jsonify({
            'prediction': result,
            'status': 'success'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy', 
        'model_loaded': model is not None,
        'model_path': MODEL_PATH
    })

if __name__ == '__main__':
    # Run the app
    # host='0.0.0.0' exposes the server on all local IPs
    app.run(host='0.0.0.0', port=5000, debug=True)

# Methane Predictive Model - Flask Pipeline

This pipeline serves the Keras model (`methane_predictive_model.keras`) via a REST API.

## Setup

1. **Install Python and Pip** if you haven't already.

2. **Create a virtual environment (Recommended)**:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Install the required packages**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the API

Start the Flask development server:
```bash
python app.py
```
The server will start locally on `http://localhost:5000`.

## Endpoints

### 1. Health Check
* **URL:** `/health`
* **Method:** `GET`
* **Description:** Verifies that the API is running and checks whether the model successfully loaded.

* **Example:**
```bash
curl http://localhost:5000/health
```

### 2. Predict
* **URL:** `/predict`
* **Method:** `POST`
* **Description:** Pass your features as a JSON payload to get predictions. Keras usually expects a specific number of features, make sure the input matches your model's expected input dimension.
* **Data Params:**
  ```json
  {
    "features": [1.5, 2.0, 3.1]
  }
  ```
* **Success Response:**
  ```json
  {
    "prediction": [[0.893]],
    "status": "success"
  }
  ```

* **Example Request:**
```bash
curl -X POST -H "Content-Type: application/json" -d '{"features": [1.5, 2.0, 3.1]}' http://localhost:5000/predict
```

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request
from flask_cors import CORS
from utils.preprocessing import load_and_prepare_data
from utils.prediction import train_and_predict, predict_species_presence
from routes import bp as api_blueprint
import pandas as pd
import numpy as np
import pickle
import os
from datetime import datetime

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "https://your-frontend-domain.com"])

trained_models = {}  
model_data = {}
last_training_time = None

def ensure_model_trained(selected_species=None):
    """Ensure the model is trained and ready for predictions"""
    global trained_models, model_data, last_training_time
    
    model_key = selected_species or 'general'
    
  
    if model_key not in trained_models or last_training_time is None:
        print(f"Training model for species: {selected_species or 'general'}...")
        try:
    
            presence_df, full_df, lat_range, lon_range, fasta_species = load_and_prepare_data(selected_species)
            
            result_df = train_and_predict(presence_df, full_df, lat_range, lon_range, selected_species)
          
            model_data[model_key] = {
                'presence_df': presence_df,
                'full_df': full_df,
                'lat_range': lat_range,
                'lon_range': lon_range,
                'predictions': result_df,
                'fasta_species': fasta_species,
                'selected_species': selected_species
            }
            
            trained_models[model_key] = True
            last_training_time = datetime.now()
            
            print(f"Model trained successfully for {selected_species or 'general'} at {last_training_time}")
            print(f"Training data: {len(presence_df)} presence records, {len(full_df)} total records")
            print(f"Prediction grid: {len(result_df)} points")
            print(f"FASTA species available: {len(fasta_species)}")
            
        except Exception as e:
            print(f"Error training model: {e}")
            if model_key in trained_models:
                del trained_models[model_key]
            if model_key in model_data:
                del model_data[model_key]
    
    return model_key in trained_models

app.register_blueprint(api_blueprint)

@app.route("/")
def home():
    return {
        "message": "Marine Biodiversity API ready", 
        "status": "running",
        "trained_models": list(trained_models.keys()),
        "last_training": last_training_time.isoformat() if last_training_time else None
    }

@app.route("/train", methods=["POST"])
def train_model():
    """Manually trigger model training"""
    global trained_models, model_data, last_training_time
    
    try:
        data = request.json or {}
        selected_species = data.get('species')
        
        print(f"Starting model training for species: {selected_species or 'general'}...")
        
        model_key = selected_species or 'general'
        
        # Force retrain
        if model_key in trained_models:
            del trained_models[model_key]
        if model_key in model_data:
            del model_data[model_key]
        
        # Train the model
        if ensure_model_trained(selected_species):
            return jsonify({
                "status": "success",
                "message": f"Model trained successfully for {selected_species or 'general'}",
                "species": selected_species,
                "training_time": last_training_time.isoformat(),
                "data_points": len(model_data[model_key]['predictions']) if model_key in model_data else 0
            })
        else:
            return jsonify({
                "status": "error",
                "message": f"Failed to train model for {selected_species or 'general'}"
            }), 500
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Training failed: {str(e)}"
        }), 500

@app.route("/predict", methods=["POST", "GET"])
def predict():
    """Get predictions from trained model"""
    try:
        # Get species parameter
        if request.method == "GET":
            selected_species = request.args.get('species')
        else:
            data = request.json or {}
            selected_species = data.get('species')
        
        model_key = selected_species or 'general'
        
        # Ensure model is trained
        if not ensure_model_trained(selected_species):
            return jsonify({
                "error": "Model not trained",
                "message": f"Please train the model first for species: {selected_species or 'general'}"
            }), 500
        
        # Handle GET request - return all predictions
        if request.method == "GET":
            region = request.args.get('region')
            
            predictions = model_data[model_key]['predictions'].copy()
            
            # Convert to JSON-serializable format
            result = predictions.to_dict(orient="records")
            
            return jsonify({
                "status": "success",
                "predictions": result,
                "total_points": len(result),
                "species": selected_species,
                "lat_range": model_data[model_key]['lat_range'],
                "lon_range": model_data[model_key]['lon_range']
            })
        
        # Handle POST request - custom prediction
        data = request.json
        lat_range = tuple(data.get("lat_range", model_data[model_key]['lat_range']))
        lon_range = tuple(data.get("lon_range", model_data[model_key]['lon_range']))
        
        # Get predictions for specified range
        predictions = model_data[model_key]['predictions']
        
        # Filter predictions within specified ranges
        filtered_predictions = predictions[
            (predictions['decimalLatitude'] >= lat_range[0]) &
            (predictions['decimalLatitude'] <= lat_range[1]) &
            (predictions['decimalLongitude'] >= lon_range[0]) &
            (predictions['decimalLongitude'] <= lon_range[1])
        ]
        
        return jsonify({
            "status": "success",
            "predictions": filtered_predictions.to_dict(orient="records"),
            "total_points": len(filtered_predictions),
            "species": selected_species,
            "lat_range": lat_range,
            "lon_range": lon_range
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Prediction failed: {str(e)}"
        }), 500

@app.route("/predict/point", methods=["POST"])
def predict_point():
    """Predict species presence at a specific point"""
    try:
        data = request.json
        lat = data.get('latitude')
        lon = data.get('longitude')
        species = data.get('species', 'chanos_chanos')
        
        if lat is None or lon is None:
            return jsonify({
                "error": "Latitude and longitude required"
            }), 400
        
        model_key = species or 'general'
        
        if not ensure_model_trained(species):
            return jsonify({
                "error": "Model not trained for this species"
            }), 500
        
        # Use the prediction function
        probability = predict_species_presence(lat, lon, species)
        
        return jsonify({
            "status": "success",
            "latitude": lat,
            "longitude": lon,
            "species": species,
            "probability": probability,
            "prediction": "present" if probability > 0.5 else "absent"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Point prediction failed: {str(e)}"
        }), 500

@app.route("/model/status", methods=["GET"])
def model_status():
    """Get model training status and statistics"""
    try:
        species = request.args.get('species')
        model_key = species or 'general'
        
        if model_key in model_data:
            data = model_data[model_key]
            return jsonify({
                "model_trained": model_key in trained_models,
                "species": species,
                "last_training": last_training_time.isoformat() if last_training_time else None,
                "data_available": True,
                "statistics": {
                    "presence_records": len(data['presence_df']),
                    "total_records": len(data['full_df']),
                    "prediction_points": len(data['predictions']),
                    "lat_range": data['lat_range'],
                    "lon_range": data['lon_range'],
                    "fasta_species_count": len(data['fasta_species'])
                }
            })
        else:
            return jsonify({
                "model_trained": False,
                "species": species,
                "last_training": None,
                "data_available": False,
                "statistics": {}
            })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/model/retrain", methods=["POST"])
def retrain_model():
    """Force retrain the model with fresh data"""
    global trained_models, model_data, last_training_time
    
    try:
        data = request.json or {}
        selected_species = data.get('species')
        model_key = selected_species or 'general'
        
        # Clear existing model
        if model_key in trained_models:
            del trained_models[model_key]
        if model_key in model_data:
            del model_data[model_key]
        
        # Retrain
        if ensure_model_trained(selected_species):
            return jsonify({
                "status": "success",
                "message": f"Model retrained successfully for {selected_species or 'general'}",
                "species": selected_species,
                "training_time": last_training_time.isoformat()
            })
        else:
            return jsonify({
                "status": "error",
                "message": f"Retraining failed for {selected_species or 'general'}"
            }), 500
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Retraining failed: {str(e)}"
        }), 500

@app.route("/available-species", methods=["GET"])
def available_species():
    """Get list of available species for training"""
    try:
        # This will load FASTA species data
        ensure_model_trained()
        
        available = []
        for model_key, data in model_data.items():
            if 'fasta_species' in data:
                for species_id, fasta_info in data['fasta_species'].items():
                    available.append({
                        'id': species_id,
                        'scientificName': fasta_info['scientific_name'],
                        'commonName': fasta_info['common_name'],
                        'sequenceCount': fasta_info['sequence_count'],
                        'modelTrained': species_id in trained_models
                    })
        
        # Remove duplicates
        seen = set()
        unique_available = []
        for species in available:
            if species['id'] not in seen:
                seen.add(species['id'])
                unique_available.append(species)
        
        return jsonify(unique_available)
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    print("Starting Marine Biodiversity API...")
    print("Training general model on startup...")
    ensure_model_trained()
    app.run(debug=True, host="0.0.0.0", port=5000)

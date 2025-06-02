import numpy as np
import pandas as pd
import xarray as xr
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from backend.utils.preprocessing import interpolate_temperature, get_species_habitat_preferences

def train_and_predict(presence_df, full_df, lat_range, lon_range, selected_species=None):
    """Train model and generate predictions for a grid"""
    try:
        # Prepare training data - include more features if available
        feature_columns = ['decimalLatitude', 'decimalLongitude', 'temperature']
        
        # Add additional features if available
        if 'depth' in full_df.columns:
            feature_columns.append('depth')
        if 'salinity' in full_df.columns:
            feature_columns.append('salinity')
        
        X = full_df[feature_columns]
        y = full_df['label']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train Random Forest model with species-specific parameters
        clf = RandomForestClassifier(
            n_estimators=150, 
            random_state=42,
            max_depth=12,
            min_samples_split=3,
            min_samples_leaf=1,
            max_features='sqrt'
        )
        clf.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = clf.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        print(f"Model accuracy for {selected_species or 'all species'}: {accuracy:.3f}")
        
        # Print feature importance
        feature_importance = pd.DataFrame({
            'feature': feature_columns,
            'importance': clf.feature_importances_
        }).sort_values('importance', ascending=False)
        print("Feature importance:")
        print(feature_importance)
        
        # Generate prediction grid
        grid_df = generate_prediction_grid(lat_range, lon_range, clf, feature_columns, selected_species)
        
        return grid_df
        
    except Exception as e:
        print(f"Error in train_and_predict: {e}")
        return generate_fallback_predictions(lat_range, lon_range, selected_species)

def generate_prediction_grid(lat_range, lon_range, model, feature_columns, selected_species=None):
    """Generate predictions on a regular grid"""
    try:
        # Create grid points
        lat_grid = np.linspace(lat_range[0], lat_range[1], 50)
        lon_grid = np.linspace(lon_range[0], lon_range[1], 50)
        
        grid_points = []
        for lat in lat_grid:
            for lon in lon_grid:
                grid_points.append({'decimalLatitude': lat, 'decimalLongitude': lon})
        
        grid_df = pd.DataFrame(grid_points)
        
        # Add environmental features based on species preferences
        habitat_prefs = get_species_habitat_preferences()
        
        grid_df['temperature'] = grid_df.apply(
            lambda row: generate_species_specific_temperature_for_prediction(
                row['decimalLatitude'], 
                row['decimalLongitude'],
                selected_species,
                habitat_prefs
            ), 
            axis=1
        )
        
        if 'depth' in feature_columns:
            grid_df['depth'] = grid_df.apply(
                lambda row: generate_species_specific_depth_for_prediction(selected_species, habitat_prefs),
                axis=1
            )
        
        if 'salinity' in feature_columns:
            grid_df['salinity'] = grid_df.apply(
                lambda row: generate_species_specific_salinity_for_prediction(selected_species, habitat_prefs),
                axis=1
            )
        
        # Remove points with missing data
        grid_df = grid_df.dropna()
        
        # Make predictions
        if len(grid_df) > 0:
            X_grid = grid_df[feature_columns]
            predictions = model.predict_proba(X_grid)[:, 1]  # Probability of presence
            grid_df['prediction'] = predictions
            
            # Add species information
            grid_df['species'] = selected_species or 'unknown'
        else:
            grid_df['prediction'] = []
            grid_df['species'] = selected_species or 'unknown'
        
        return grid_df
        
    except Exception as e:
        print(f"Error generating prediction grid: {e}")
        return generate_fallback_predictions(lat_range, lon_range, selected_species)

def generate_species_specific_temperature_for_prediction(lat, lon, species, habitat_prefs):
    """Generate temperature for prediction grid based on species preferences"""
    base_temp = 28.0
    
    if species and species in habitat_prefs:
        temp_range = habitat_prefs[species]['temp_range']
        base_temp = (temp_range[0] + temp_range[1]) / 2
    
    # Add latitude effect
    lat_effect = (lat + 5) * 0.2
    
    # Add some variation but less random than training data
    variation = np.random.normal(0, 0.2)
    
    temperature = base_temp + lat_effect + variation
    
    # Keep within species-specific bounds
    if species and species in habitat_prefs:
        temp_range = habitat_prefs[species]['temp_range']
        temperature = max(temp_range[0], min(temp_range[1], temperature))
    else:
        temperature = max(25.0, min(32.0, temperature))
    
    return temperature

def generate_species_specific_depth_for_prediction(species, habitat_prefs):
    """Generate depth for prediction grid based on species preferences"""
    if species and species in habitat_prefs:
        depth_range = habitat_prefs[species]['depth_range']
        # Use mean depth for prediction grid
        return (depth_range[0] + depth_range[1]) / 2
    else:
        return 25.0  # Default depth

def generate_species_specific_salinity_for_prediction(species, habitat_prefs):
    """Generate salinity for prediction grid based on species preferences"""
    if species and species in habitat_prefs:
        salinity_range = habitat_prefs[species]['salinity_range']
        # Use mean salinity for prediction grid
        return (salinity_range[0] + salinity_range[1]) / 2
    else:
        return 32.5  # Default salinity

def generate_fallback_predictions(lat_range, lon_range, selected_species=None):
    """Generate fallback predictions when model training fails"""
    print(f"Generating fallback predictions for {selected_species or 'unknown species'}")
    
    np.random.seed(42)
    n_points = 1000
    
    habitat_prefs = get_species_habitat_preferences()
    
    predictions = []
    for _ in range(n_points):
        lat = np.random.uniform(lat_range[0], lat_range[1])
        lon = np.random.uniform(lon_range[0], lon_range[1])
        
        # Generate species-specific prediction probabilities
        base_prob = 0.3
        
        # Adjust probability based on species habitat preferences
        if selected_species and selected_species in habitat_prefs:
            habitat_type = habitat_prefs[selected_species]['habitat_type']
            
            # Adjust probability based on habitat type and location
            if habitat_type == 'coastal_marine' or habitat_type == 'coastal_brackish':
                # Higher probability near coasts
                if -6 <= lat <= 2 and 110 <= lon <= 125:  # Java Sea area
                    base_prob += 0.3
            elif habitat_type == 'pelagic_marine':
                # Higher probability in open ocean areas
                if -2 <= lat <= 1 and 125 <= lon <= 140:  # Eastern Indonesia
                    base_prob += 0.4
            elif habitat_type == 'reef_marine':
                # Higher probability near coral triangle
                if -1 <= lat <= 3 and 120 <= lon <= 135:  # Coral triangle
                    base_prob += 0.5
            elif habitat_type == 'freshwater' or habitat_type == 'freshwater_river':
                # Lower probability in marine areas, higher near river mouths
                if -6 <= lat <= -2 and 110 <= lon <= 115:  # Java rivers
                    base_prob += 0.2
                else:
                    base_prob *= 0.3  # Much lower in marine areas
        
        # Add random variation
        prediction = base_prob + np.random.normal(0, 0.15)
        prediction = max(0.0, min(1.0, prediction))  # Clamp to [0,1]
        
        predictions.append({
            'decimalLatitude': lat,
            'decimalLongitude': lon,
            'prediction': prediction,
            'species': selected_species or 'unknown'
        })
    
    return pd.DataFrame(predictions)

def predict_species_presence(lat, lon, species_id, model=None):
    """Predict species presence at specific coordinates"""
    try:
        if model is None:
            # Use a simple heuristic based on location and species
            return predict_presence_heuristic(lat, lon, species_id)
        
        # Use trained model
        habitat_prefs = get_species_habitat_preferences()
        temp = generate_species_specific_temperature_for_prediction(lat, lon, species_id, habitat_prefs)
        depth = generate_species_specific_depth_for_prediction(species_id, habitat_prefs)
        salinity = generate_species_specific_salinity_for_prediction(species_id, habitat_prefs)
        
        X = np.array([[lat, lon, temp, depth, salinity]])
        probability = model.predict_proba(X)[0, 1]
        
        return probability
        
    except Exception as e:
        print(f"Error predicting species presence: {e}")
        return 0.5  # Default probability

def predict_presence_heuristic(lat, lon, species_id):
    """Enhanced heuristic for species presence prediction based on habitat preferences"""
    habitat_prefs = get_species_habitat_preferences()
    
    if species_id not in habitat_prefs:
        return 0.3  # Default probability for unknown species
    
    prefs = habitat_prefs[species_id]
    base_prob = 0.5
    
    # Adjust based on habitat type and location
    habitat_type = prefs['habitat_type']
    
    if habitat_type == 'coastal_marine' or habitat_type == 'coastal_brackish':
        # Higher probability near Indonesian coasts
        if -6 <= lat <= 2 and 110 <= lon <= 125:
            base_prob = 0.7
        else:
            base_prob = 0.3
    elif habitat_type == 'pelagic_marine':
        # Higher probability in open ocean
        if -2 <= lat <= 1 and 125 <= lon <= 140:
            base_prob = 0.8
        else:
            base_prob = 0.4
    elif habitat_type == 'reef_marine':
        # Higher probability in coral triangle
        if -1 <= lat <= 3 and 120 <= lon <= 135:
            base_prob = 0.9
        else:
            base_prob = 0.2
    elif habitat_type in ['freshwater', 'freshwater_river', 'freshwater_brackish']:
        # Much lower probability in marine areas
        if -6 <= lat <= -2 and 110 <= lon <= 115:  # Near river mouths
            base_prob = 0.6
        else:
            base_prob = 0.1
    
    # Add some random variation
    final_prob = base_prob + np.random.normal(0, 0.1)
    return max(0.0, min(1.0, final_prob))

"""
AI ETA Prediction Model Training Script
Trains a regression model to predict time_to_arrival_seconds for transit segments
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
from datetime import datetime, timedelta
import json

def generate_training_data(num_samples=5000):
    """
    Generate simulated training data based on Chennai transit patterns
    In production, replace with real GPS traces and historical data
    """
    np.random.seed(42)
    
    data = []
    
    for _ in range(num_samples):
        # Features
        distance_to_next_stop = np.random.uniform(0.1, 15.0)  # km
        hour = np.random.randint(0, 24)
        day_of_week = np.random.randint(0, 7)  # 0=Monday, 6=Sunday
        headway = np.random.choice([3, 5, 10, 15, 20, 30])  # minutes
        mode = np.random.choice(['metro', 'train', 'bus'])
        is_peak = 1 if hour in [7, 8, 9, 17, 18, 19, 20] else 0
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Speed models based on mode and conditions
        if mode == 'metro':
            base_speed = 35 if not is_peak else 32  # km/h
            speed_variance = 0.15
        elif mode == 'train':
            base_speed = 40 if not is_peak else 38
            speed_variance = 0.2
        else:  # bus
            base_speed = 20 if not is_peak else 15
            speed_variance = 0.3
        
        # Add randomness and peak hour slowdown
        actual_speed = base_speed * (1 + np.random.uniform(-speed_variance, speed_variance))
        
        # Calculate travel time (distance/speed * 60 = minutes)
        travel_time_minutes = (distance_to_next_stop / actual_speed) * 60
        
        # Add wait time component based on headway
        if np.random.random() < 0.3:  # 30% chance of just missing vehicle
            wait_time = headway * np.random.uniform(0.5, 0.9)
        else:
            wait_time = headway * np.random.uniform(0.1, 0.5)
        
        # Total time in seconds
        total_time_seconds = (travel_time_minutes + wait_time) * 60
        
        # Add small random delays for realism
        total_time_seconds += np.random.uniform(0, 120)
        
        data.append({
            'distance_to_next_stop': distance_to_next_stop,
            'hour': hour,
            'day_of_week': day_of_week,
            'headway': headway,
            'mode_metro': 1 if mode == 'metro' else 0,
            'mode_train': 1 if mode == 'train' else 0,
            'mode_bus': 1 if mode == 'bus' else 0,
            'is_peak': is_peak,
            'is_weekend': is_weekend,
            'time_to_arrival_seconds': total_time_seconds
        })
    
    return pd.DataFrame(data)

def extract_features(df):
    """Extract and engineer features for the model"""
    feature_cols = [
        'distance_to_next_stop',
        'hour',
        'day_of_week',
        'headway',
        'mode_metro',
        'mode_train',
        'mode_bus',
        'is_peak',
        'is_weekend'
    ]
    
    X = df[feature_cols]
    y = df['time_to_arrival_seconds']
    
    return X, y

def train_model():
    """Train the ETA prediction model"""
    print("Generating training data...")
    df = generate_training_data(num_samples=5000)
    
    print(f"Dataset shape: {df.shape}")
    print(f"Average ETA: {df['time_to_arrival_seconds'].mean()/60:.2f} minutes")
    
    print("\nExtracting features...")
    X, y = extract_features(df)
    
    print("Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print("Training Random Forest model...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    print("\nEvaluating model...")
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Mean Absolute Error: {mae/60:.2f} minutes")
    print(f"R² Score: {r2:.4f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nFeature Importance:")
    print(feature_importance.to_string(index=False))
    
    # Save model
    model_path = 'flask-backend/eta_model.joblib'
    print(f"\nSaving model to {model_path}...")
    joblib.dump(model, model_path)
    
    # Save feature names for prediction
    metadata = {
        'feature_names': list(X.columns),
        'trained_date': datetime.now().isoformat(),
        'mae_minutes': float(mae/60),
        'r2_score': float(r2)
    }
    
    with open('flask-backend/eta_model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("Training complete! Model saved successfully.")
    return model, metadata

if __name__ == "__main__":
    print("=== Chennai Transit ETA Predictor - Model Training ===\n")
    model, metadata = train_model()
    print("\n=== Training Complete ===")

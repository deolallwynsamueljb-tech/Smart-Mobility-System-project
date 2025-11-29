"""
AI-Powered ETA Prediction Module
Provides intelligent time-to-arrival predictions for transit segments
"""
import joblib
import numpy as np
from datetime import datetime
import json
import os

class ETAPredictor:
    def __init__(self, model_path='flask-backend/eta_model.joblib'):
        """Initialize the ETA predictor with trained model"""
        self.model = None
        self.feature_names = None
        self.metadata = None
        self.model_path = model_path
        
        self.load_model()
    
    def load_model(self):
        """Load the trained model and metadata"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                
                # Load metadata
                metadata_path = self.model_path.replace('.joblib', '_metadata.json')
                if os.path.exists(metadata_path):
                    with open(metadata_path, 'r') as f:
                        self.metadata = json.load(f)
                        self.feature_names = self.metadata.get('feature_names', [])
                
                print(f"✓ AI ETA model loaded successfully")
                if self.metadata:
                    print(f"  Model MAE: {self.metadata.get('mae_minutes', 0):.2f} minutes")
                    print(f"  Model R²: {self.metadata.get('r2_score', 0):.4f}")
            else:
                print(f"⚠ Model file not found: {self.model_path}")
                print("  Run train_eta_model.py to generate the model")
        except Exception as e:
            print(f"✗ Error loading model: {e}")
    
    def prepare_features(self, distance_km, mode, current_time=None, headway_minutes=10):
        """
        Prepare features for prediction
        
        Args:
            distance_km: Distance to next stop in kilometers
            mode: 'metro', 'train', or 'bus'
            current_time: datetime object (defaults to now)
            headway_minutes: Expected headway between vehicles
        
        Returns:
            numpy array of features
        """
        if current_time is None:
            current_time = datetime.now()
        
        hour = current_time.hour
        day_of_week = current_time.weekday()
        
        # Peak hours: 7-9 AM, 5-8 PM
        is_peak = 1 if hour in [7, 8, 9, 17, 18, 19, 20] else 0
        
        # Weekend
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Mode encoding
        mode_metro = 1 if mode.lower() == 'metro' else 0
        mode_train = 1 if mode.lower() == 'train' else 0
        mode_bus = 1 if mode.lower() == 'bus' else 0
        
        features = {
            'distance_to_next_stop': distance_km,
            'hour': hour,
            'day_of_week': day_of_week,
            'headway': headway_minutes,
            'mode_metro': mode_metro,
            'mode_train': mode_train,
            'mode_bus': mode_bus,
            'is_peak': is_peak,
            'is_weekend': is_weekend
        }
        
        # Return as array in correct order
        if self.feature_names:
            return np.array([[features[name] for name in self.feature_names]])
        else:
            return np.array([[
                features['distance_to_next_stop'],
                features['hour'],
                features['day_of_week'],
                features['headway'],
                features['mode_metro'],
                features['mode_train'],
                features['mode_bus'],
                features['is_peak'],
                features['is_weekend']
            ]])
    
    def predict_eta(self, distance_km, mode, current_time=None, headway_minutes=10):
        """
        Predict ETA in seconds using AI model
        
        Args:
            distance_km: Distance to destination in kilometers
            mode: Transport mode ('metro', 'train', 'bus')
            current_time: Current time (defaults to now)
            headway_minutes: Expected wait time/headway
        
        Returns:
            dict with prediction details
        """
        if self.model is None:
            # Fallback to simple calculation if model not available
            return self._fallback_prediction(distance_km, mode, headway_minutes)
        
        try:
            # Prepare features
            features = self.prepare_features(distance_km, mode, current_time, headway_minutes)
            
            # Predict
            eta_seconds = self.model.predict(features)[0]
            
            # Ensure positive and reasonable
            eta_seconds = max(60, min(eta_seconds, 7200))  # Between 1 min and 2 hours
            
            return {
                'eta_seconds': float(eta_seconds),
                'eta_minutes': float(eta_seconds / 60),
                'prediction_type': 'ai_model',
                'confidence': 'high' if self.metadata and self.metadata.get('r2_score', 0) > 0.8 else 'medium'
            }
        
        except Exception as e:
            print(f"Error in AI prediction: {e}")
            return self._fallback_prediction(distance_km, mode, headway_minutes)
    
    def _fallback_prediction(self, distance_km, mode, headway_minutes):
        """Simple fallback prediction if AI model unavailable"""
        # Simple speed-based calculation
        speeds = {
            'metro': 35,  # km/h
            'train': 40,
            'bus': 20
        }
        
        speed = speeds.get(mode.lower(), 25)
        travel_time_minutes = (distance_km / speed) * 60
        wait_time_minutes = headway_minutes * 0.5  # Average wait
        
        total_minutes = travel_time_minutes + wait_time_minutes
        
        return {
            'eta_seconds': float(total_minutes * 60),
            'eta_minutes': float(total_minutes),
            'prediction_type': 'fallback',
            'confidence': 'low'
        }
    
    def get_model_info(self):
        """Return model metadata"""
        if self.metadata:
            return self.metadata
        return {
            'status': 'Model not loaded',
            'message': 'Run train_eta_model.py to train the model'
        }

# Global predictor instance
_predictor = None

def get_predictor():
    """Get or create the global ETA predictor instance"""
    global _predictor
    if _predictor is None:
        _predictor = ETAPredictor()
    return _predictor

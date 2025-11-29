"""
Enhanced Flask Backend with Real-time Features
Includes vehicle tracking, traffic data, and WebSocket support
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
from datetime import datetime
import math
import threading
import time

from vehicle_tracker import vehicle_tracker
from traffic_service import traffic_service
from eta_predictor import get_predictor

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Load datasets
try:
    with open('data/metro.json', 'r') as f:
        metro_data = json.load(f)
    with open('data/trains.json', 'r') as f:
        trains_data = json.load(f)
    with open('data/bus_stops.json', 'r') as f:
        bus_stops_data = json.load(f)
    
    # Initialize vehicle tracker with route data
    vehicle_tracker.load_routes(metro_data, trains_data)
    vehicle_tracker.initialize_sample_vehicles()
    vehicle_tracker.start_tracking()
    
    # Initialize AI ETA predictor
    eta_predictor = get_predictor()
    print("AI ETA Predictor initialized")
except Exception as e:
    print(f"Warning: Could not load data files: {e}")
    metro_data = {}
    trains_data = {}
    bus_stops_data = {}
    eta_predictor = None


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km"""
    R = 6371
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


# ============= REST API Endpoints =============

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'vehicle_tracking': vehicle_tracker.is_tracking,
        'active_vehicles': len(vehicle_tracker.vehicles)
    })


@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    """Get all tracked vehicles"""
    vehicles = vehicle_tracker.get_all_vehicles()
    return jsonify({
        'success': True,
        'count': len(vehicles),
        'vehicles': vehicles
    })


@app.route('/api/vehicles/<vehicle_id>', methods=['GET'])
def get_vehicle(vehicle_id):
    """Get specific vehicle details"""
    vehicle = vehicle_tracker.vehicles.get(vehicle_id)
    
    if vehicle:
        return jsonify({
            'success': True,
            'vehicle': vehicle
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Vehicle not found'
        }), 404


@app.route('/api/vehicles/near/<station_name>', methods=['GET'])
def get_vehicles_near_station(station_name):
    """Get vehicles near a specific station"""
    radius = float(request.args.get('radius', 5.0))
    vehicles = vehicle_tracker.get_vehicles_near_station(station_name, radius)
    
    return jsonify({
        'success': True,
        'station': station_name,
        'count': len(vehicles),
        'vehicles': vehicles
    })


@app.route('/api/traffic', methods=['POST'])
def get_traffic():
    """Get traffic conditions for a location"""
    data = request.json
    lat = data.get('lat')
    lon = data.get('lon')
    radius = data.get('radius_km', 5.0)
    
    if not lat or not lon:
        return jsonify({'error': 'Latitude and longitude required'}), 400
    
    traffic_data = traffic_service.get_traffic_conditions(lat, lon, radius)
    
    return jsonify({
        'success': True,
        'traffic': traffic_data
    })


@app.route('/api/traffic/route', methods=['POST'])
def get_route_traffic():
    """Get traffic conditions along a route"""
    data = request.json
    coordinates = data.get('coordinates', [])
    
    if not coordinates:
        return jsonify({'error': 'Route coordinates required'}), 400
    
    traffic_points = traffic_service.get_route_traffic(coordinates)
    
    return jsonify({
        'success': True,
        'traffic_points': traffic_points
    })


@app.route('/api/traffic/alerts', methods=['POST'])
def get_traffic_alerts():
    """Get traffic alerts for an area"""
    data = request.json
    lat = data.get('lat')
    lon = data.get('lon')
    radius = data.get('radius_km', 10.0)
    
    if not lat or not lon:
        return jsonify({'error': 'Latitude and longitude required'}), 400
    
    alerts = traffic_service.get_traffic_alerts(lat, lon, radius)
    
    return jsonify({
        'success': True,
        'count': len(alerts),
        'alerts': alerts
    })


@app.route('/api/predict_eta', methods=['POST'])
def predict_eta():
    """
    AI-powered ETA prediction endpoint
    
    Request body:
    {
        "distance_km": 5.2,
        "mode": "metro",  // "metro", "train", or "bus"
        "headway_minutes": 10,  // optional, default 10
        "current_time": "2024-01-15T09:30:00"  // optional, defaults to now
    }
    """
    data = request.json
    
    # Validate required fields
    distance_km = data.get('distance_km')
    mode = data.get('mode')
    
    if distance_km is None:
        return jsonify({'error': 'distance_km is required'}), 400
    
    if not mode:
        return jsonify({'error': 'mode is required (metro/train/bus)'}), 400
    
    if mode not in ['metro', 'train', 'bus']:
        return jsonify({'error': 'mode must be metro, train, or bus'}), 400
    
    # Optional parameters
    headway_minutes = data.get('headway_minutes', 10)
    current_time_str = data.get('current_time')
    
    current_time = None
    if current_time_str:
        try:
            current_time = datetime.fromisoformat(current_time_str.replace('Z', '+00:00'))
        except:
            return jsonify({'error': 'Invalid current_time format. Use ISO 8601'}), 400
    
    # Get predictor and make prediction
    predictor = get_predictor()
    prediction = predictor.predict_eta(
        distance_km=float(distance_km),
        mode=mode,
        current_time=current_time,
        headway_minutes=int(headway_minutes)
    )
    
    return jsonify({
        'success': True,
        'prediction': prediction,
        'input': {
            'distance_km': distance_km,
            'mode': mode,
            'headway_minutes': headway_minutes
        }
    })


@app.route('/api/model_info', methods=['GET'])
def get_model_info():
    """Get AI model information and performance metrics"""
    predictor = get_predictor()
    info = predictor.get_model_info()
    
    return jsonify({
        'success': True,
        'model_info': info
    })


# ============= WebSocket Events =============

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')
    emit('connection_response', {
        'status': 'connected',
        'timestamp': datetime.now().isoformat()
    })


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')


@socketio.on('subscribe_vehicles')
def handle_subscribe_vehicles(data):
    """Subscribe to vehicle updates"""
    room = data.get('room', 'all_vehicles')
    join_room(room)
    
    # Send current vehicle positions immediately
    vehicles = vehicle_tracker.get_all_vehicles()
    emit('vehicles_update', {
        'vehicles': vehicles,
        'timestamp': datetime.now().isoformat()
    }, room=request.sid)
    
    print(f'Client {request.sid} subscribed to {room}')


@socketio.on('unsubscribe_vehicles')
def handle_unsubscribe_vehicles(data):
    """Unsubscribe from vehicle updates"""
    room = data.get('room', 'all_vehicles')
    leave_room(room)
    print(f'Client {request.sid} unsubscribed from {room}')


@socketio.on('subscribe_traffic')
def handle_subscribe_traffic(data):
    """Subscribe to traffic updates for a location"""
    lat = data.get('lat')
    lon = data.get('lon')
    
    if lat and lon:
        room = f'traffic_{lat}_{lon}'
        join_room(room)
        
        # Send current traffic data immediately
        traffic_data = traffic_service.get_traffic_conditions(lat, lon)
        emit('traffic_update', {
            'traffic': traffic_data,
            'timestamp': datetime.now().isoformat()
        }, room=request.sid)
        
        print(f'Client {request.sid} subscribed to traffic updates')


# ============= Background Tasks =============

def broadcast_vehicle_updates():
    """Broadcast vehicle position updates to all subscribed clients"""
    while True:
        time.sleep(3)  # Broadcast every 3 seconds
        
        vehicles = vehicle_tracker.get_all_vehicles()
        
        socketio.emit('vehicles_update', {
            'vehicles': vehicles,
            'timestamp': datetime.now().isoformat()
        }, room='all_vehicles')


# Start background broadcast thread
broadcast_thread = threading.Thread(target=broadcast_vehicle_updates, daemon=True)
broadcast_thread.start()


if __name__ == '__main__':
    print("🚀 Starting Flask backend with real-time features...")
    print("📡 Vehicle tracking: Active")
    print("🚦 Traffic service: Ready")
    print("🔌 WebSocket server: Running")
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)

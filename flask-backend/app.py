from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime, timedelta
import math

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Load datasets
with open('data/metro.json', 'r') as f:
    metro_data = json.load(f)

with open('data/trains.json', 'r') as f:
    trains_data = json.load(f)

with open('data/bus_stops.json', 'r') as f:
    bus_stops_data = json.load(f)


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


def find_nearest_station(lat, lon, stations):
    """Find nearest station to given coordinates"""
    min_distance = float('inf')
    nearest = None
    
    for station in stations:
        dist = haversine_distance(lat, lon, station['lat'], station['lng'])
        if dist < min_distance:
            min_distance = dist
            nearest = station
    
    return nearest, min_distance


def get_next_metro_departure(station, corridor, current_time):
    """Calculate next metro departure based on timetable"""
    for corridor_data in metro_data['corridors']:
        if corridor_data['id'] == corridor:
            day_type = 'weekday'  # Simplified - detect actual day
            schedule = corridor_data[day_type]
            
            # Parse current time
            current_minutes = int(current_time.split(':')[0]) * 60 + int(current_time.split(':')[1])
            
            # Check if within service hours
            first_train_minutes = int(schedule['firstTrain']['fromAirport'].split(':')[0]) * 60 + int(schedule['firstTrain']['fromAirport'].split(':')[1])
            last_train_minutes = int(schedule['lastTrain']['fromAirport'].split(':')[0]) * 60 + int(schedule['lastTrain']['fromAirport'].split(':')[1])
            
            if current_minutes < first_train_minutes or current_minutes > last_train_minutes:
                return None
            
            # Determine frequency based on time
            frequency = schedule['frequency']['nonPeak']  # Default
            for peak_period in schedule['peakHours']:
                start, end = peak_period.split('-')
                start_min = int(start.split(':')[0]) * 60 + int(start.split(':')[1])
                end_min = int(end.split(':')[0]) * 60 + int(end.split(':')[1])
                if start_min <= current_minutes <= end_min:
                    frequency = schedule['frequency']['peak']
                    break
            
            # Calculate next departure (simplified)
            wait_time = frequency / 2  # Average wait time
            next_departure = (datetime.strptime(current_time, '%H:%M') + timedelta(minutes=wait_time)).strftime('%H:%M')
            
            return {
                'departure': next_departure,
                'frequency': frequency,
                'wait_time': wait_time
            }
    
    return None


def get_next_train_departure(from_station, to_station, current_time):
    """Find next train departure from timetable"""
    current_minutes = int(current_time.split(':')[0]) * 60 + int(current_time.split(':')[1])
    
    next_train = None
    min_wait = float('inf')
    
    for train in trains_data['trains']:
        if from_station in train['stations'] and to_station in train['stations']:
            from_idx = train['stations'].index(from_station)
            to_idx = train['stations'].index(to_station)
            
            if from_idx < to_idx:  # Correct direction
                departure_time = train['times'][from_idx]
                dep_minutes = int(departure_time.split(':')[0]) * 60 + int(departure_time.split(':')[1])
                
                if dep_minutes >= current_minutes:
                    wait = dep_minutes - current_minutes
                    if wait < min_wait:
                        min_wait = wait
                        next_train = {
                            'train_no': train['train_no'],
                            'departure': departure_time,
                            'arrival': train['times'][to_idx],
                            'wait_time': wait
                        }
    
    return next_train


@app.route('/api/route', methods=['POST'])
def calculate_route():
    """Calculate optimal route between two points"""
    data = request.json
    origin = data.get('origin')
    destination = data.get('destination')
    current_time = data.get('time', datetime.now().strftime('%H:%M'))
    
    if not origin or not destination:
        return jsonify({'error': 'Origin and destination required'}), 400
    
    origin_lat, origin_lng = origin['lat'], origin['lng']
    dest_lat, dest_lng = destination['lat'], destination['lng']
    
    # Find nearest metro/train stations
    metro_stations = []
    for corridor in metro_data['corridors']:
        # Would need actual station coordinates from metro.json
        pass
    
    train_stations = trains_data['stations']
    
    nearest_origin_train, origin_train_dist = find_nearest_station(origin_lat, origin_lng, train_stations)
    nearest_dest_train, dest_train_dist = find_nearest_station(dest_lat, dest_lng, train_stations)
    
    # Calculate route options
    routes = []
    
    # Train route option
    if origin_train_dist < 2 and dest_train_dist < 2:  # Within 2km
        next_train = get_next_train_departure(
            nearest_origin_train['code'],
            nearest_dest_train['code'],
            current_time
        )
        
        if next_train:
            route = {
                'mode': 'train',
                'segments': [
                    {
                        'type': 'walk',
                        'from': 'origin',
                        'to': nearest_origin_train['name'],
                        'duration': origin_train_dist * 12,  # ~12 min/km
                        'distance': origin_train_dist
                    },
                    {
                        'type': 'train',
                        'from': nearest_origin_train['name'],
                        'to': nearest_dest_train['name'],
                        'train_no': next_train['train_no'],
                        'departure': next_train['departure'],
                        'arrival': next_train['arrival'],
                        'wait_time': next_train['wait_time']
                    },
                    {
                        'type': 'walk',
                        'from': nearest_dest_train['name'],
                        'to': 'destination',
                        'duration': dest_train_dist * 12,
                        'distance': dest_train_dist
                    }
                ],
                'total_time': origin_train_dist * 12 + next_train['wait_time'] + 30 + dest_train_dist * 12,  # Simplified
                'fare': 10  # Calculate actual fare
            }
            routes.append(route)
    
    # Return best route
    if routes:
        return jsonify({
            'success': True,
            'routes': routes,
            'best_route': routes[0]
        })
    else:
        return jsonify({
            'success': False,
            'error': 'No suitable route found'
        }), 404


@app.route('/api/metro', methods=['GET'])
def get_metro_info():
    """Get metro timetable information"""
    return jsonify(metro_data)


@app.route('/api/trains', methods=['GET'])
def get_trains_info():
    """Get train timetable information"""
    return jsonify(trains_data)


@app.route('/api/bus-stops', methods=['GET'])
def get_bus_stops():
    """Get bus stops information"""
    return jsonify(bus_stops_data)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

"""
Real-time Vehicle Tracking System
Simulates live vehicle positions on metro and train routes
"""
import json
import threading
import time
from datetime import datetime
from typing import Dict, List, Tuple
import math


class VehicleTracker:
    def __init__(self):
        self.vehicles: Dict[str, dict] = {}
        self.routes = {}
        self.is_tracking = False
        self.tracking_thread = None
        
    def load_routes(self, metro_data, trains_data):
        """Load route data for vehicle tracking"""
        self.routes['metro'] = metro_data
        self.routes['trains'] = trains_data
        
    def calculate_position(self, route_coords: List[Tuple[float, float]], 
                          progress: float) -> Tuple[float, float]:
        """Calculate vehicle position along route based on progress (0-1)"""
        if not route_coords or len(route_coords) < 2:
            return route_coords[0] if route_coords else (0, 0)
        
        total_segments = len(route_coords) - 1
        segment_index = int(progress * total_segments)
        segment_index = min(segment_index, total_segments - 1)
        
        segment_progress = (progress * total_segments) - segment_index
        
        start = route_coords[segment_index]
        end = route_coords[segment_index + 1]
        
        lat = start[0] + (end[0] - start[0]) * segment_progress
        lon = start[1] + (end[1] - start[1]) * segment_progress
        
        return (lat, lon)
    
    def create_vehicle(self, vehicle_id: str, vehicle_type: str, 
                      route_id: str, line: str, stations: List[str],
                      coords: List[Tuple[float, float]]) -> dict:
        """Create a new tracked vehicle"""
        vehicle = {
            'id': vehicle_id,
            'type': vehicle_type,  # 'metro' or 'train'
            'route_id': route_id,
            'line': line,
            'stations': stations,
            'coords': coords,
            'current_station_index': 0,
            'progress': 0.0,  # 0 to 1 along the route
            'speed': 30 if vehicle_type == 'metro' else 40,  # km/h
            'position': coords[0] if coords else (0, 0),
            'next_station': stations[1] if len(stations) > 1 else stations[0],
            'eta_minutes': 0,
            'status': 'moving',  # 'moving', 'stopped', 'delayed'
            'last_update': datetime.now().isoformat()
        }
        
        self.vehicles[vehicle_id] = vehicle
        return vehicle
    
    def update_vehicle_position(self, vehicle_id: str):
        """Update vehicle position based on time elapsed"""
        if vehicle_id not in self.vehicles:
            return None
        
        vehicle = self.vehicles[vehicle_id]
        
        # Simulate movement (increment progress)
        speed_per_second = vehicle['speed'] / 3600  # km per second
        distance_per_update = speed_per_second * 2  # Update every 2 seconds
        
        # Rough conversion: assume 111km per degree latitude
        progress_increment = distance_per_update / 111 / len(vehicle['coords'])
        
        vehicle['progress'] += progress_increment
        
        # Handle reaching destination
        if vehicle['progress'] >= 1.0:
            vehicle['progress'] = 0.0
            vehicle['current_station_index'] = 0
            vehicle['status'] = 'completed'
        
        # Calculate new position
        vehicle['position'] = self.calculate_position(vehicle['coords'], vehicle['progress'])
        
        # Update next station
        total_stations = len(vehicle['stations'])
        station_progress = vehicle['progress'] * total_stations
        next_station_idx = min(int(station_progress) + 1, total_stations - 1)
        vehicle['current_station_index'] = int(station_progress)
        vehicle['next_station'] = vehicle['stations'][next_station_idx]
        
        # Calculate ETA to next station
        remaining_progress = (next_station_idx / total_stations) - vehicle['progress']
        remaining_distance = remaining_progress * 111 * len(vehicle['coords'])  # rough km
        vehicle['eta_minutes'] = max(1, int((remaining_distance / vehicle['speed']) * 60))
        
        vehicle['last_update'] = datetime.now().isoformat()
        
        return vehicle
    
    def get_vehicles_near_station(self, station_name: str, 
                                   radius_km: float = 5.0) -> List[dict]:
        """Get all vehicles near a given station"""
        nearby_vehicles = []
        
        for vehicle_id, vehicle in self.vehicles.items():
            if station_name in vehicle['stations']:
                nearby_vehicles.append(vehicle)
        
        return nearby_vehicles
    
    def get_all_vehicles(self) -> List[dict]:
        """Get all tracked vehicles"""
        return list(self.vehicles.values())
    
    def start_tracking(self):
        """Start background thread for vehicle tracking"""
        if self.is_tracking:
            return
        
        self.is_tracking = True
        self.tracking_thread = threading.Thread(target=self._tracking_loop, daemon=True)
        self.tracking_thread.start()
    
    def stop_tracking(self):
        """Stop background tracking"""
        self.is_tracking = False
        if self.tracking_thread:
            self.tracking_thread.join(timeout=5)
    
    def _tracking_loop(self):
        """Background loop to update all vehicle positions"""
        while self.is_tracking:
            for vehicle_id in list(self.vehicles.keys()):
                self.update_vehicle_position(vehicle_id)
            time.sleep(2)  # Update every 2 seconds
    
    def initialize_sample_vehicles(self):
        """Initialize sample vehicles for demonstration"""
        # Sample Metro Blue Line vehicle
        self.create_vehicle(
            vehicle_id='METRO_BLUE_001',
            vehicle_type='metro',
            route_id='blue_line',
            line='Blue Line',
            stations=['Wimco Nagar', 'Washermenpet', 'Chennai Central', 'Airport'],
            coords=[(13.1120, 80.2950), (13.0950, 80.2850), (13.0827, 80.2707), (12.9900, 80.1693)]
        )
        
        # Sample Metro Green Line vehicle
        self.create_vehicle(
            vehicle_id='METRO_GREEN_001',
            vehicle_type='metro',
            route_id='green_line',
            line='Green Line',
            stations=['Chennai Central', 'Egmore', 'CMBT', 'St. Thomas Mount'],
            coords=[(13.0827, 80.2707), (13.0732, 80.2609), (13.0569, 80.2091), (13.0007, 80.1677)]
        )
        
        # Sample Train vehicle
        self.create_vehicle(
            vehicle_id='TRAIN_EMU_001',
            vehicle_type='train',
            route_id='beach_tambaram',
            line='Beach - Tambaram',
            stations=['Chennai Beach', 'Chennai Fort', 'Park Town', 'Chennai Central', 'Tambaram'],
            coords=[(13.0878, 80.2785), (13.0850, 80.2800), (13.0827, 80.2707), (13.0827, 80.2707), (12.9250, 80.1000)]
        )


# Global tracker instance
vehicle_tracker = VehicleTracker()

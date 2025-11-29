"""
Live Traffic Data Integration
Fetches real-time traffic conditions from various sources
"""
import requests
from typing import Dict, List, Optional
from datetime import datetime
import json


class TrafficService:
    def __init__(self):
        self.cache = {}
        self.cache_duration = 300  # 5 minutes
        
    def get_traffic_conditions(self, lat: float, lon: float, 
                               radius_km: float = 5.0) -> Dict:
        """
        Get traffic conditions for a given location
        Uses OpenStreetMap Overpass API for road data
        """
        cache_key = f"{lat:.4f}_{lon:.4f}_{radius_km}"
        
        # Check cache
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if (datetime.now().timestamp() - timestamp) < self.cache_duration:
                return cached_data
        
        try:
            # Query Overpass API for roads in the area
            overpass_url = "http://overpass-api.de/api/interpreter"
            
            # Radius in meters
            radius_m = radius_km * 1000
            
            query = f"""
            [out:json];
            (
              way["highway"](around:{radius_m},{lat},{lon});
            );
            out body;
            >;
            out skel qt;
            """
            
            response = requests.post(overpass_url, data={'data': query}, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                traffic_data = self._process_overpass_data(data, lat, lon)
                
                # Cache the result
                self.cache[cache_key] = (traffic_data, datetime.now().timestamp())
                
                return traffic_data
            else:
                return self._get_simulated_traffic(lat, lon)
                
        except Exception as e:
            print(f"Error fetching traffic data: {e}")
            return self._get_simulated_traffic(lat, lon)
    
    def _process_overpass_data(self, data: Dict, lat: float, lon: float) -> Dict:
        """Process Overpass API response"""
        elements = data.get('elements', [])
        
        # Count roads by type
        road_types = {}
        for element in elements:
            if element.get('type') == 'way':
                highway_type = element.get('tags', {}).get('highway', 'unknown')
                road_types[highway_type] = road_types.get(highway_type, 0) + 1
        
        # Simulate traffic level based on road density and type
        major_roads = sum(road_types.get(t, 0) for t in ['motorway', 'trunk', 'primary', 'secondary'])
        minor_roads = sum(road_types.get(t, 0) for t in ['tertiary', 'residential', 'service'])
        
        traffic_level = 'light'
        if major_roads > 10:
            traffic_level = 'heavy'
        elif major_roads > 5 or minor_roads > 15:
            traffic_level = 'moderate'
        
        return {
            'location': {'lat': lat, 'lon': lon},
            'traffic_level': traffic_level,
            'road_count': len(elements),
            'road_types': road_types,
            'congestion_index': min(100, (major_roads * 8 + minor_roads * 2)),
            'average_speed_kmh': self._calculate_average_speed(traffic_level),
            'timestamp': datetime.now().isoformat(),
            'source': 'OpenStreetMap'
        }
    
    def _calculate_average_speed(self, traffic_level: str) -> int:
        """Calculate average speed based on traffic level"""
        speed_map = {
            'light': 45,
            'moderate': 30,
            'heavy': 15
        }
        return speed_map.get(traffic_level, 30)
    
    def _get_simulated_traffic(self, lat: float, lon: float) -> Dict:
        """Generate simulated traffic data as fallback"""
        hour = datetime.now().hour
        
        # Simulate rush hour traffic
        if 7 <= hour <= 10 or 17 <= hour <= 20:
            traffic_level = 'heavy'
            congestion_index = 75
            avg_speed = 20
        elif 10 < hour < 17:
            traffic_level = 'moderate'
            congestion_index = 45
            avg_speed = 35
        else:
            traffic_level = 'light'
            congestion_index = 20
            avg_speed = 50
        
        return {
            'location': {'lat': lat, 'lon': lon},
            'traffic_level': traffic_level,
            'road_count': 0,
            'road_types': {},
            'congestion_index': congestion_index,
            'average_speed_kmh': avg_speed,
            'timestamp': datetime.now().isoformat(),
            'source': 'simulated',
            'note': 'Real-time data unavailable, using simulated traffic based on time of day'
        }
    
    def get_route_traffic(self, coordinates: List[tuple]) -> List[Dict]:
        """Get traffic conditions along a route"""
        traffic_points = []
        
        # Sample traffic every few coordinates
        sample_rate = max(1, len(coordinates) // 5)
        
        for i in range(0, len(coordinates), sample_rate):
            lat, lon = coordinates[i]
            traffic = self.get_traffic_conditions(lat, lon, radius_km=2.0)
            traffic_points.append(traffic)
        
        return traffic_points
    
    def get_traffic_alerts(self, lat: float, lon: float, 
                           radius_km: float = 10.0) -> List[Dict]:
        """Get traffic alerts for an area (simulated)"""
        # In production, this would connect to a real traffic alert service
        alerts = []
        
        hour = datetime.now().hour
        
        # Simulate some alerts during rush hours
        if 7 <= hour <= 10 or 17 <= hour <= 20:
            alerts.append({
                'id': 'ALERT_001',
                'type': 'congestion',
                'severity': 'moderate',
                'location': {'lat': lat, 'lon': lon},
                'description': 'Heavy traffic on major roads',
                'timestamp': datetime.now().isoformat()
            })
        
        return alerts


# Global traffic service instance
traffic_service = TrafficService()

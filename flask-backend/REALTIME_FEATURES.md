# Real-Time Features Guide 🚀

Your Flask backend now supports **real-time vehicle tracking** and **live traffic data**!

## Features Added

### 1. 🚆 Real-Time Vehicle Tracking
- **Live position updates** for metro and train vehicles
- **ETA calculations** to next stations
- **Vehicle status** (moving, stopped, delayed)
- **Speed monitoring** and route progress
- **WebSocket streaming** for instant updates

### 2. 🚦 Live Traffic Data
- **Traffic conditions** (light, moderate, heavy)
- **Congestion index** (0-100 scale)
- **Average speed** on routes
- **Traffic alerts** for your area
- **Route-specific** traffic analysis

### 3. 🔌 WebSocket Support
- **Real-time streaming** of vehicle positions
- **Traffic updates** pushed to clients
- **Subscribe/unsubscribe** to specific updates
- **3-second update interval** for smooth tracking

## Quick Start

### 1. Install Enhanced Dependencies

```bash
cd flask-backend
pip install -r requirements.txt
```

New dependencies:
- `flask-socketio` - WebSocket support
- `requests` - HTTP client for traffic APIs
- `geopy` - Geographic calculations

### 2. Run Enhanced Backend

```bash
# Use the new real-time app
python app_realtime.py
```

You should see:
```
🚀 Starting Flask backend with real-time features...
📡 Vehicle tracking: Active
🚦 Traffic service: Ready
🔌 WebSocket server: Running
```

### 3. Frontend Integration

```typescript
import { realtimeService } from '@/utils/realtimeService';

// Connect to real-time service
await realtimeService.connect();

// Subscribe to vehicle updates
const unsubscribe = realtimeService.subscribeToVehicles((vehicles) => {
  console.log('Live vehicles:', vehicles);
  // Update your map markers
});

// Get traffic for a location
const traffic = await realtimeService.getTrafficConditions(13.0827, 80.2707);
console.log('Traffic level:', traffic.traffic_level);
```

## API Endpoints

### REST APIs

#### Get All Vehicles
```bash
GET /api/vehicles
```
Returns all tracked vehicles with current positions.

#### Get Specific Vehicle
```bash
GET /api/vehicles/{vehicle_id}
```
Get details for a specific vehicle.

#### Get Vehicles Near Station
```bash
GET /api/vehicles/near/{station_name}?radius=5.0
```
Find vehicles within radius (km) of a station.

#### Get Traffic Conditions
```bash
POST /api/traffic
Body: {"lat": 13.0827, "lon": 80.2707, "radius_km": 5.0}
```
Get traffic for a specific location.

#### Get Route Traffic
```bash
POST /api/traffic/route
Body: {"coordinates": [[13.08, 80.27], [13.09, 80.28], ...]}
```
Get traffic conditions along a route path.

#### Get Traffic Alerts
```bash
POST /api/traffic/alerts
Body: {"lat": 13.0827, "lon": 80.2707, "radius_km": 10.0}
```
Get traffic alerts for an area.

### WebSocket Events

#### Client → Server

**Connect**
```javascript
socket.on('connect', () => {
  console.log('Connected!');
});
```

**Subscribe to Vehicles**
```javascript
socket.emit('subscribe_vehicles', { room: 'all_vehicles' });
```

**Subscribe to Traffic**
```javascript
socket.emit('subscribe_traffic', { lat: 13.0827, lon: 80.2707 });
```

**Unsubscribe**
```javascript
socket.emit('unsubscribe_vehicles', { room: 'all_vehicles' });
```

#### Server → Client

**Vehicle Updates** (every 3 seconds)
```javascript
socket.on('vehicles_update', (data) => {
  console.log('Vehicles:', data.vehicles);
  // data.vehicles is an array of vehicle objects
});
```

**Traffic Updates**
```javascript
socket.on('traffic_update', (data) => {
  console.log('Traffic:', data.traffic);
});
```

**Connection Response**
```javascript
socket.on('connection_response', (data) => {
  console.log('Status:', data.status);
});
```

## Data Structures

### Vehicle Object
```typescript
{
  id: "METRO_BLUE_001",
  type: "metro" | "train",
  route_id: "blue_line",
  line: "Blue Line",
  stations: ["Station1", "Station2", ...],
  position: [13.0827, 80.2707],  // [lat, lon]
  next_station: "Chennai Central",
  eta_minutes: 5,
  status: "moving" | "stopped" | "delayed" | "completed",
  speed: 30,  // km/h
  last_update: "2025-01-26T10:30:00"
}
```

### Traffic Data Object
```typescript
{
  location: { lat: 13.0827, lon: 80.2707 },
  traffic_level: "light" | "moderate" | "heavy",
  congestion_index: 45,  // 0-100
  average_speed_kmh: 35,
  road_count: 25,
  road_types: { "primary": 5, "secondary": 10, ... },
  timestamp: "2025-01-26T10:30:00",
  source: "OpenStreetMap" | "simulated"
}
```

### Traffic Alert Object
```typescript
{
  id: "ALERT_001",
  type: "congestion" | "accident" | "roadwork",
  severity: "low" | "moderate" | "high",
  location: { lat: 13.0827, lon: 80.2707 },
  description: "Heavy traffic on major roads",
  timestamp: "2025-01-26T10:30:00"
}
```

## Architecture

```
┌─────────────────┐
│   React App     │
│  (Frontend)     │
└────────┬────────┘
         │ HTTP + WebSocket
         ↓
┌─────────────────┐
│  Flask Backend  │
│  (app_realtime) │
├─────────────────┤
│ • Vehicle       │
│   Tracker       │
│ • Traffic       │
│   Service       │
│ • WebSocket     │
│   Server        │
└────────┬────────┘
         │
         ├→ Vehicle positions (3s updates)
         ├→ Traffic data (5min cache)
         └→ External APIs (OpenStreetMap)
```

## Traffic Data Sources

### Production Mode
- **OpenStreetMap Overpass API** for real road data
- Analyzes road types and density
- Calculates congestion based on infrastructure

### Fallback Mode
- **Time-based simulation** for rush hours
- Realistic traffic patterns (7-10 AM, 5-8 PM heavy)
- Immediate response without API calls

## Performance Features

✅ **Background threading** for vehicle updates  
✅ **Traffic data caching** (5-minute TTL)  
✅ **Efficient WebSocket broadcasting** (3s interval)  
✅ **Smart fallback** if external APIs fail  
✅ **Room-based subscriptions** for targeted updates  

## Testing

### Test Vehicle Tracking
```bash
# Get all vehicles
curl http://localhost:5000/api/vehicles

# Watch real-time updates
# Use a WebSocket client or the frontend
```

### Test Traffic Data
```bash
# Get traffic for Chennai Central
curl -X POST http://localhost:5000/api/traffic \
  -H "Content-Type: application/json" \
  -d '{"lat": 13.0827, "lon": 80.2707, "radius_km": 5}'
```

### Test WebSocket
Use the frontend `realtimeService` or a tool like `wscat`:
```bash
npm install -g wscat
wscat -c ws://localhost:5000/socket.io/?transport=websocket
```

## Deployment Notes

### Railway.app
- WebSocket support: ✅ Built-in
- Background tasks: ✅ Threading supported
- External APIs: ✅ Outbound requests allowed

### Heroku
- WebSocket support: ✅ Available
- Use `gunicorn` with `eventlet` worker:
  ```
  gunicorn --worker-class eventlet -w 1 app_realtime:app
  ```

### Environment Variables
```env
# Optional: Configure external traffic API
OVERPASS_API_URL=http://overpass-api.de/api/interpreter

# WebSocket settings
SOCKETIO_ASYNC_MODE=threading
```

## Roadmap

Future enhancements:
- 🔄 Integration with actual transit APIs
- 📊 Historical traffic pattern analysis
- 🎯 Predictive ETA using ML
- 🗺️ Multi-route traffic comparison
- 📱 Push notifications for delays
- 🚨 Real-time incident detection

## Troubleshooting

### WebSocket Connection Fails
- Check CORS settings in `app_realtime.py`
- Verify Flask-SocketIO is installed
- Use correct URL format: `http://localhost:5000` (not `ws://`)

### No Vehicle Updates
- Check vehicle tracker initialized: `/health` endpoint
- Verify background thread running
- Look for errors in Flask console

### Traffic Data Shows "Simulated"
- Normal if Overpass API is slow/down
- Traffic patterns are still realistic
- Based on time of day (rush hours)

Happy tracking! 🚆🚦

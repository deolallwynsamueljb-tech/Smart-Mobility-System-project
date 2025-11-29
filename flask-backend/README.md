# Flask Backend for Chennai Transit Planner

## 🚀 NEW: Real-Time Features!

This backend now includes:
- **Live vehicle tracking** with WebSocket streaming
- **Traffic data integration** from OpenStreetMap
- **Real-time updates** every 3 seconds
- **Traffic conditions** and congestion monitoring

[📖 See REALTIME_FEATURES.md for complete documentation](REALTIME_FEATURES.md)

## Setup Instructions

1. **Install Dependencies**
```bash
pip install -r requirements.txt
```

2. **Copy Data Files**
Copy these files from your React project to `flask-backend/data/`:
- `metro.json`
- `trains.json`
- `bus_stops.json`

3. **Run Locally**

**Basic Mode** (route calculation only):
```bash
python app.py
```

**Real-Time Mode** (with vehicle tracking and traffic):
```bash
python app_realtime.py
```

The server will run on `http://localhost:5000`

## Deployment Options

### Option 1: Railway.app (Recommended)
1. Create account at https://railway.app
2. Create new project
3. Deploy from GitHub or upload files
4. Railway will auto-detect Flask and deploy
5. Copy the public URL (e.g., `https://your-app.railway.app`)

**For Real-Time Mode:**
- Set start command: `python app_realtime.py`
- WebSockets are automatically supported ✅

### Option 2: Heroku
1. Create Procfile:
```
web: python app_realtime.py
```

Or for production:
```
web: gunicorn --worker-class eventlet -w 1 app_realtime:app
```

2. Deploy to Heroku
3. Copy the app URL

### Option 3: PythonAnywhere
1. Upload files
2. Configure WSGI
3. Get your URL

## API Endpoints

### Route Calculation
- `POST /api/route` - Calculate optimal route
- `GET /api/metro` - Get metro timetable
- `GET /api/trains` - Get train schedules
- `GET /api/bus-stops` - Get bus stops
- `GET /health` - Health check

### Real-Time Features (app_realtime.py only)
- `GET /api/vehicles` - Get all tracked vehicles
- `GET /api/vehicles/<id>` - Get specific vehicle
- `GET /api/vehicles/near/<station>` - Vehicles near station
- `POST /api/traffic` - Get traffic conditions
- `POST /api/traffic/route` - Get route traffic
- `POST /api/traffic/alerts` - Get traffic alerts

### WebSocket Events
- `subscribe_vehicles` - Live vehicle position updates
- `subscribe_traffic` - Live traffic condition updates
- `vehicles_update` - Broadcast every 3 seconds
- `traffic_update` - Traffic data pushed to clients

## After Deployment

Update the React frontend with your Flask API URL:

**.env.local**
```env
VITE_FLASK_API_URL=https://your-app.railway.app
```

## Features Comparison

| Feature | app.py | app_realtime.py |
|---------|--------|-----------------|
| Route calculation | ✅ | ✅ |
| Static data APIs | ✅ | ✅ |
| Vehicle tracking | ❌ | ✅ |
| Traffic data | ❌ | ✅ |
| WebSocket support | ❌ | ✅ |
| Real-time updates | ❌ | ✅ |

## Dependencies

**Basic** (app.py):
- Flask 3.0.0
- flask-cors 4.0.0
- gunicorn 21.2.0

**Real-Time** (app_realtime.py):
- All basic dependencies +
- flask-socketio 5.3.5
- requests 2.31.0
- geopy 2.4.1
- python-socketio 5.11.0

## Testing

### Test Basic Route API
```bash
curl -X POST http://localhost:5000/api/route \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 13.0827, "lng": 80.2707, "name": "Chennai Central"},
    "destination": {"lat": 12.9822, "lng": 80.2195, "name": "Tambaram"}
  }'
```

### Test Real-Time Vehicle Tracking
```bash
curl http://localhost:5000/api/vehicles
```

### Test Traffic Data
```bash
curl -X POST http://localhost:5000/api/traffic \
  -H "Content-Type: application/json" \
  -d '{"lat": 13.0827, "lon": 80.2707, "radius_km": 5}'
```

For complete real-time feature documentation, see [REALTIME_FEATURES.md](REALTIME_FEATURES.md).

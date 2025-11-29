# Flask Backend Integration Guide

Your Chennai Transit Planner now supports **Python Flask backend** with **real-time features**! 🐍🚀

## 🎯 Features Overview

### Core Features
- ✅ Route calculation with Dijkstra's algorithm
- ✅ Metro, train, and bus route planning
- ✅ Fare calculation with detailed breakdowns
- ✅ Smart client-side fallback

### 🆕 Real-Time Features
- ✅ **Live vehicle tracking** - Track metro and train positions in real-time
- ✅ **Traffic data integration** - Get live traffic conditions from OpenStreetMap
- ✅ **WebSocket streaming** - 3-second updates for smooth tracking
- ✅ **Traffic alerts** - Real-time congestion and incident notifications
- ✅ **ETA predictions** - Dynamic arrival time calculations

## How It Works

The app uses a **smart fallback system**:
1. **Tries Flask API first** (if configured and available)
2. **Falls back to client-side calculation** automatically if Flask is unavailable

This means the app works perfectly even without Flask backend!

## Quick Start (3 Steps)

### Step 1: Deploy Flask Backend

#### Option A: Railway.app (Recommended - Free & Easy)
1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select this repository
4. **Important:** Set start command to `python app_realtime.py` for real-time features
5. Railway auto-detects Flask and deploys
6. Copy your deployment URL (e.g., `https://your-app.railway.app`)

#### Option B: Local Development
```bash
cd flask-backend
pip install -r requirements.txt

# Copy your data files
mkdir data
cp ../src/data/metro.json data/
cp ../src/data/trains.json data/
cp ../src/data/bus_stops.json data/

# Run Flask server with real-time features
python app_realtime.py
```

### Step 2: Configure Frontend

Create a `.env.local` file in the project root:

```env
VITE_FLASK_API_URL=https://your-app.railway.app
```

Or for local development:
```env
VITE_FLASK_API_URL=http://localhost:5000
```

### Step 3: Test Integration

1. Restart your dev server
2. Try calculating a route
3. Check browser console - you should see:
   - ✅ `Flask API is healthy, requesting routes...` (Flask working)
   - OR `Using client-side route calculation...` (fallback)

## Real-Time Features Usage

### Connect to Real-Time Service

```typescript
import { realtimeService } from '@/utils/realtimeService';

// Connect to WebSocket
await realtimeService.connect();

// Subscribe to live vehicle updates
const unsubscribe = realtimeService.subscribeToVehicles((vehicles) => {
  vehicles.forEach(vehicle => {
    console.log(`${vehicle.line}: ${vehicle.next_station} in ${vehicle.eta_minutes} min`);
    // Update map markers with live positions
  });
});

// Get traffic conditions
const traffic = await realtimeService.getTrafficConditions(13.0827, 80.2707);
console.log(`Traffic: ${traffic.traffic_level}, Speed: ${traffic.average_speed_kmh} km/h`);

// Get traffic alerts
const alerts = await realtimeService.getTrafficAlerts(13.0827, 80.2707, 10);
alerts.forEach(alert => {
  console.log(`${alert.type}: ${alert.description}`);
});

// Clean up when done
unsubscribe();
realtimeService.disconnect();
```

## Deployment Options Comparison

| Platform | Cost | Setup Time | Real-Time | Ease |
|----------|------|------------|-----------|------|
| **Railway.app** | Free tier | 5 min | ✅ | ⭐⭐⭐⭐⭐ |
| **Heroku** | $5-7/month | 10 min | ✅ | ⭐⭐⭐⭐ |
| **PythonAnywhere** | Free tier | 15 min | ⚠️ Limited | ⭐⭐⭐ |
| **Local** | Free | 2 min | ✅ | ⭐⭐⭐⭐ |

## API Endpoints Reference

### Route Calculation
- `POST /api/route` - Calculate optimal multi-modal route
- `GET /api/metro` - Metro timetables and frequencies
- `GET /api/trains` - Train schedules and stations
- `GET /api/bus-stops` - All MTC bus stop locations

### Real-Time APIs
- `GET /api/vehicles` - All tracked vehicles with positions
- `GET /api/vehicles/{id}` - Specific vehicle details
- `GET /api/vehicles/near/{station}` - Vehicles near station
- `POST /api/traffic` - Traffic conditions for location
- `POST /api/traffic/route` - Traffic along entire route
- `POST /api/traffic/alerts` - Active traffic alerts

### WebSocket Events
- `subscribe_vehicles` → Receive live vehicle updates every 3s
- `subscribe_traffic` → Receive live traffic updates
- `vehicles_update` ← Server broadcasts vehicle positions
- `traffic_update` ← Server pushes traffic changes

## Testing Flask Backend

### Check Health
```bash
curl https://your-app.railway.app/health
# Should return: {"status": "healthy", "vehicle_tracking": true, "active_vehicles": 3}
```

### Test Route Calculation
```bash
curl -X POST https://your-app.railway.app/api/route \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 13.0827, "lng": 80.2707, "name": "Chennai Central"},
    "destination": {"lat": 12.9822, "lng": 80.2195, "name": "Tambaram"}
  }'
```

### Test Vehicle Tracking
```bash
curl https://your-app.railway.app/api/vehicles
```

### Test Traffic Data
```bash
curl -X POST https://your-app.railway.app/api/traffic \
  -H "Content-Type: application/json" \
  -d '{"lat": 13.0827, "lon": 80.2707, "radius_km": 5}'
```

## Troubleshooting

### "Flask API unavailable" in console
- **Cause**: Backend not deployed or URL incorrect
- **Solution**: App works fine with client-side calculation, no action needed unless you want Flask backend

### CORS errors
- **Cause**: Backend CORS not configured
- **Solution**: Check `app_realtime.py` has `CORS(app, origins="*")` enabled

### "Could not get address" errors
- **Cause**: Missing data files in Flask backend
- **Solution**: Copy `metro.json`, `trains.json`, `bus_stops.json` to `flask-backend/data/`

### WebSocket not connecting
- **Cause**: Wrong URL or port blocked
- **Solution**: Verify VITE_FLASK_API_URL points to HTTP endpoint (not ws://), Socket.IO handles WebSocket upgrade

### No vehicle updates
- **Cause**: Using basic `app.py` instead of `app_realtime.py`
- **Solution**: Use `python app_realtime.py` for real-time features

## Files Structure

```
flask-backend/
├── app.py                    # Basic route calculation API
├── app_realtime.py          # Enhanced with real-time features ⭐
├── vehicle_tracker.py       # Vehicle tracking system
├── traffic_service.py       # Traffic data integration
├── requirements.txt         # Python dependencies
├── README.md               # Setup guide
├── REALTIME_FEATURES.md    # Real-time features documentation
└── data/                   # Create this folder
    ├── metro.json
    ├── trains.json
    └── bus_stops.json

src/utils/
├── flaskApiService.ts      # Flask API client
└── realtimeService.ts      # WebSocket & real-time client ⭐
```

## Benefits of Flask Backend

✅ **More control** over routing algorithms  
✅ **Better performance** for complex calculations  
✅ **Python libraries** for advanced features  
✅ **Centralized logic** easier to maintain  
✅ **Real-time tracking** with WebSocket streaming  
✅ **Live traffic data** from multiple sources  
✅ **Still works without it** (automatic fallback)

## What's Next?

### Immediate Enhancements
- Display vehicle markers on the map during navigation
- Show traffic conditions as color-coded route segments
- Alert users about delays and congestion
- Add vehicle crowding indicators

### Future Possibilities
- Machine learning for ETA predictions
- Historical traffic pattern analysis
- Multi-route traffic comparison
- Push notifications for transit alerts
- Integration with actual transit authority APIs
- Real-time incident detection and reporting

## Documentation

- **REALTIME_FEATURES.md** - Complete real-time features guide
- **README.md** - Flask backend setup instructions
- **requirements.txt** - Python package dependencies

Happy coding! 🚀🚆🚦

### Step 1: Deploy Flask Backend

#### Option A: Railway.app (Recommended - Free & Easy)
1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select this repository
4. Railway auto-detects Flask and deploys
5. Copy your deployment URL (e.g., `https://your-app.railway.app`)

#### Option B: Local Development
```bash
cd flask-backend
pip install -r requirements.txt

# Copy your data files
mkdir data
cp ../src/data/metro.json data/
cp ../src/data/trains.json data/
cp ../src/data/bus_stops.json data/

# Run Flask server
python app.py
```

### Step 2: Configure Frontend

Create a `.env.local` file in the project root:

```env
VITE_FLASK_API_URL=https://your-app.railway.app
```

Or for local development:
```env
VITE_FLASK_API_URL=http://localhost:5000
```

### Step 3: Test Integration

1. Restart your dev server
2. Try calculating a route
3. Check browser console - you should see:
   - ✅ `Flask API is healthy, requesting routes...` (Flask working)
   - OR `Using client-side route calculation...` (fallback)

## Deployment Options Comparison

| Platform | Cost | Setup Time | Ease |
|----------|------|------------|------|
| **Railway.app** | Free tier available | 5 min | ⭐⭐⭐⭐⭐ |
| **Heroku** | $5-7/month | 10 min | ⭐⭐⭐⭐ |
| **PythonAnywhere** | Free tier available | 15 min | ⭐⭐⭐ |
| **Local** | Free | 2 min | ⭐⭐⭐⭐ |

## Testing Flask Backend

### Check Health
```bash
curl https://your-app.railway.app/health
# Should return: {"status": "healthy"}
```

### Test Route Calculation
```bash
curl -X POST https://your-app.railway.app/api/route \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 13.0827, "lng": 80.2707, "name": "Chennai Central"},
    "destination": {"lat": 12.9822, "lng": 80.2195, "name": "Tambaram"}
  }'
```

## Troubleshooting

### "Flask API unavailable" in console
- **Cause**: Backend not deployed or URL incorrect
- **Solution**: App works fine with client-side calculation, no action needed unless you want Flask backend

### CORS errors
- **Cause**: Backend CORS not configured
- **Solution**: Check `flask-backend/app.py` has `CORS(app)` enabled

### "Could not get address" errors
- **Cause**: Missing data files in Flask backend
- **Solution**: Copy `metro.json`, `trains.json`, `bus_stops.json` to `flask-backend/data/`

## Files Created

```
flask-backend/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── README.md          # Detailed instructions
└── data/              # Create this folder
    ├── metro.json
    ├── trains.json
    └── bus_stops.json

src/utils/
└── flaskApiService.ts  # Flask API client

.env.example           # Environment configuration template
```

## Benefits of Flask Backend

✅ **More control** over routing algorithms  
✅ **Better performance** for complex calculations  
✅ **Python libraries** for advanced features  
✅ **Centralized logic** easier to maintain  
✅ **Still works without it** (automatic fallback)

## Next Steps

Want to enhance your Flask backend? Consider adding:
- Real-time bus tracking
- Traffic data integration
- Machine learning for ETA predictions
- Advanced caching strategies
- GraphQL API instead of REST

Happy coding! 🚀

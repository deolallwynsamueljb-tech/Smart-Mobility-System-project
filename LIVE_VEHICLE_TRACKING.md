# Live Vehicle Tracking on Map 🚆📍

Your map now displays **real-time vehicle positions** with ETA indicators during navigation!

## Features Added

### 🎯 Real-Time Vehicle Markers
- **Live Position Updates** - Vehicles update every 3 seconds
- **ETA Indicators** - Shows minutes to next station above each vehicle
- **Status Display** - Color-coded status (moving/stopped/delayed)
- **Vehicle Type Icons** - Metro 🚇 and Train 🚆 badges
- **Detailed Popups** - Click vehicles for full information

### 📊 Vehicle Information Display
Each vehicle marker shows:
- **Line Name** (e.g., "Blue Line", "Beach - Tambaram")
- **Next Station** with ETA in minutes
- **Current Speed** in km/h
- **Status** (Moving/Stopped/Delayed)
- **Vehicle ID** for tracking
- **Last Update Time**

### 🎨 Visual Design
- **Pulsing Animation** - Vehicles have subtle pulse effect
- **Color Coding**:
  - Metro vehicles: Orange/Metro theme color
  - Train vehicles: Red/Train theme color
  - Status indicator: Green (moving), Yellow (delayed), Gray (stopped)
- **ETA Badge** - White badge above vehicle with minutes
- **High Z-Index** - Vehicles display above route lines
- **Smooth Updates** - Positions update without flickering

## How It Works

### 1. Backend Connection
The map automatically connects to your Flask backend when:
```typescript
// Happens automatically in LiveLeafletMapView
const { vehicles, isConnected } = useRealtimeVehicles(true);
```

### 2. WebSocket Streaming
- Connects to Flask backend at startup
- Receives vehicle updates every 3 seconds
- Updates markers smoothly without re-rendering entire map

### 3. Marker Management
- Creates new markers for new vehicles
- Updates positions for existing vehicles
- Removes markers for vehicles no longer tracked
- Manages marker lifecycle efficiently

## Setup Required

### 1. Deploy Flask Backend
Your Flask backend must be running with real-time features:

```bash
cd flask-backend
pip install -r requirements.txt
python app_realtime.py
```

### 2. Configure Frontend
Set your Flask backend URL:

**.env.local**
```env
VITE_FLASK_API_URL=https://your-app.railway.app
```

Or for local development:
```env
VITE_FLASK_API_URL=http://localhost:5000
```

### 3. Verify Connection
Navigate to `/track` page and look for:
- **Green indicator** in top-left saying "Live Tracking Active"
- **Vehicle count** displayed
- **Vehicle markers** on the map with ETA badges

## User Experience

### During Navigation
1. User starts navigation on `/track` page
2. Map automatically connects to real-time service
3. Green "Live Tracking Active" indicator appears
4. Vehicle markers appear on map with ETA badges
5. Markers update smoothly as vehicles move
6. Click any vehicle for detailed information

### Vehicle Marker Details
**Visible at all times:**
- ETA badge showing minutes to next station
- Vehicle icon (pulsing circle)
- Status dot (green/yellow/gray)
- Vehicle type emoji (🚇/🚆)

**On Click (Popup):**
- Line name and vehicle ID
- Next station name
- ETA to next station
- Current speed
- Status with color coding
- Last update timestamp

## Marker States

### Moving (Green)
```
┌─────────┐
│  5 min  │ ← ETA Badge
└────┬────┘
     │
   ●─○ ← Pulsing Circle (Metro/Train Color)
   │ └─ Green Status Dot
   🚇 ← Type Badge
```

### Delayed (Yellow)
```
┌─────────┐
│  12 min │
└────┬────┘
     │
   ●─○
   │ └─ Yellow Status Dot
   🚆
```

### Stopped (Gray)
```
┌─────────┐
│  -- min │
└────┬────┘
     │
   ●─○
   │ └─ Gray Status Dot
   🚇
```

## Fallback Behavior

If Flask backend is unavailable:
- Map still works normally
- No vehicle markers appear
- No "Live Tracking Active" indicator
- User sees own position and route only
- No errors or warnings shown (graceful degradation)

## Performance Considerations

### Optimized for Efficiency
- **Marker Reuse** - Updates existing markers instead of recreating
- **Batch Updates** - Processes all vehicles in one update cycle
- **Efficient Z-Index** - Live vehicles above routes (z-index: 2000)
- **Smart Cleanup** - Removes markers for vehicles that disappeared
- **Throttled Updates** - 3-second intervals prevent excessive rendering

### Memory Management
- Markers stored in `Map<string, L.Marker>` for O(1) lookups
- Automatic cleanup on component unmount
- No memory leaks from orphaned markers

## Testing

### Test Without Flask Backend
1. Don't start Flask backend
2. Navigate to `/track`
3. Should see own position marker only
4. No live tracking indicator
5. No errors in console

### Test With Flask Backend
1. Start Flask backend: `python app_realtime.py`
2. Verify health: `curl http://localhost:5000/health`
3. Navigate to `/track`
4. Should see:
   - "Live Tracking Active" indicator
   - 3 vehicle markers (sample data)
   - Vehicles updating every 3 seconds
5. Click vehicle markers for details

### Test Vehicle Updates
1. Open browser console
2. Navigate to `/track`
3. Should see logs:
   ```
   🚆 Attempting to connect to real-time vehicle service...
   ✅ Connected to real-time vehicle service
   🚆 Vehicle update received: 3 vehicles
   🚆 Updating live vehicle markers: 3 vehicles
   ```
4. Logs appear every 3 seconds with position updates

## Customization

### Modify Update Interval
In `flask-backend/app_realtime.py`:
```python
def broadcast_vehicle_updates():
    while True:
        time.sleep(3)  # Change this value (seconds)
        # ...
```

### Change Vehicle Colors
In `src/components/LiveLeafletMapView.tsx`:
```typescript
const createLiveVehicleIcon = (vehicle: Vehicle) => {
  const isMetro = vehicle.type === 'metro';
  const bgColor = isMetro ? 'hsl(var(--metro))' : 'hsl(var(--train))';
  // Customize colors here
};
```

### Adjust Z-Index
```typescript
const marker = L.marker([lat, lon], {
  icon,
  zIndexOffset: 2000, // Change this value
});
```

## Troubleshooting

### No Vehicle Markers Appear
**Check:**
1. Flask backend running? `curl http://localhost:5000/health`
2. Frontend configured? Check `.env.local` has `VITE_FLASK_API_URL`
3. Browser console for connection errors
4. Network tab shows WebSocket connection

### Markers Don't Update
**Check:**
1. WebSocket connection active (browser DevTools > Network > WS)
2. Flask console shows `Client connected` messages
3. Vehicle update logs in Flask console every 3 seconds
4. No JavaScript errors in browser console

### Markers in Wrong Position
**Check:**
1. Vehicle coordinates valid (not NaN or null)
2. Coordinates format: `[lat, lon]` (not `[lon, lat]`)
3. Coordinates within Chennai area (lat ~13, lon ~80)
4. Flask backend using correct station data

### Performance Issues
**Solutions:**
1. Increase update interval in Flask backend (e.g., 5 seconds)
2. Limit number of tracked vehicles
3. Reduce marker icon complexity
4. Disable animations if needed

## Future Enhancements

Possible improvements:
- 🔄 Vehicle route prediction lines
- 📊 Crowding level indicators
- ⏱️ Historical position trails
- 🎯 Tap vehicle to show full route
- 🔔 Alerts when vehicle approaches your station
- 📱 Vehicle arrival notifications
- 🌐 Share vehicle locations
- 📈 Speed graphs and analytics

## Files Modified

- `src/hooks/useRealtimeVehicles.tsx` - Real-time vehicle connection hook
- `src/components/LiveLeafletMapView.tsx` - Map with live vehicle markers
- `src/utils/realtimeService.ts` - WebSocket client service
- `flask-backend/app_realtime.py` - Backend with vehicle tracking
- `flask-backend/vehicle_tracker.py` - Vehicle position tracking system

## Related Documentation

- [Flask Backend Setup](FLASK_BACKEND_SETUP.md)
- [Real-Time Features](flask-backend/REALTIME_FEATURES.md)
- [Live Traffic Data](flask-backend/REALTIME_FEATURES.md#traffic-data)

Happy tracking! 🚆🗺️

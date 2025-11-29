import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation, Clock, MapPin } from 'lucide-react';
import metroData from '@/data/metro.json';
import trainsData from '@/data/trains.json';
import busStops from '@/data/bus_stops.json';
import { getWalkingRoute } from '@/utils/orsRouting';
import { useRealtimeVehicles } from '@/hooks/useRealtimeVehicles';
import type { Vehicle } from '@/utils/realtimeService';

interface RouteSegment {
  mode: "metro" | "train" | "bus" | "walk";
  from: string;
  to: string;
  duration: number;
  waitTime?: number;
  departureTime?: string;
  fromCoords?: [number, number];
  toCoords?: [number, number];
}

interface LiveLeafletMapViewProps {
  route: RouteSegment[];
  currentPosition: { lat: number; lon: number; accuracy?: number; heading?: number | null; speed?: number | null } | null;
  remainingDuration: number;
  progressPercent: number;
  currentSegment: RouteSegment;
}

const LiveLeafletMapView = ({
  route,
  currentPosition,
  remainingDuration,
  progressPercent,
  currentSegment,
}: LiveLeafletMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const currentPositionMarker = useRef<L.Marker | null>(null);
  const accuracyCircle = useRef<L.Circle | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const routePathLayer = useRef<L.LayerGroup | null>(null);
  const animatedVehicles = useRef<Map<string, L.Marker>>(new Map());
  const liveVehicleMarkers = useRef<Map<string, L.Marker>>(new Map());
  const metroRoutesGeoJSON = useRef<any>(null);
  const trainRoutesGeoJSON = useRef<any>(null);
  
  // Connect to real-time vehicle tracking
  const { vehicles: liveVehicles, isConnected } = useRealtimeVehicles(true);

  // Helper function to create vehicle icon with ETA
  const createLiveVehicleIcon = (vehicle: Vehicle) => {
    const isMetro = vehicle.type === 'metro';
    const bgColor = isMetro ? 'hsl(var(--metro))' : 'hsl(var(--train))';
    const statusColor = vehicle.status === 'moving' ? '#10b981' : 
                       vehicle.status === 'delayed' ? '#f59e0b' : '#6b7280';
    
    return L.divIcon({
      className: 'live-vehicle-marker',
      html: `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        ">
          <!-- ETA Badge -->
          <div style="
            background: white;
            border: 2px solid ${bgColor};
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 700;
            color: ${bgColor};
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            white-space: nowrap;
            margin-bottom: 2px;
          ">
            ${vehicle.eta_minutes} min
          </div>
          
          <!-- Vehicle Icon -->
          <div style="
            width: 24px;
            height: 24px;
            background: ${bgColor};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            position: relative;
            animation: vehiclePulse 2s infinite;
          ">
            <!-- Status Indicator -->
            <div style="
              position: absolute;
              top: -2px;
              right: -2px;
              width: 8px;
              height: 8px;
              background: ${statusColor};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 0 4px ${statusColor};
            "></div>
          </div>
          
          <!-- Vehicle Type Label -->
          <div style="
            background: rgba(0,0,0,0.75);
            color: white;
            border-radius: 4px;
            padding: 1px 6px;
            font-size: 9px;
            font-weight: 600;
            margin-top: 2px;
            text-transform: uppercase;
          ">
            ${isMetro ? '🚇' : '🚆'}
          </div>
        </div>
        
        <style>
          @keyframes vehiclePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        </style>
      `,
      iconSize: [60, 80],
      iconAnchor: [30, 70],
      popupAnchor: [0, -70],
    });
  };

  // Update live vehicle markers
  useEffect(() => {
    if (!map.current || !isConnected || liveVehicles.length === 0) return;

    console.log('🚆 Updating live vehicle markers:', liveVehicles.length, 'vehicles');

    // Remove markers for vehicles that no longer exist
    const currentVehicleIds = new Set(liveVehicles.map(v => v.id));
    liveVehicleMarkers.current.forEach((marker, vehicleId) => {
      if (!currentVehicleIds.has(vehicleId)) {
        marker.remove();
        liveVehicleMarkers.current.delete(vehicleId);
      }
    });

    // Add or update markers for each vehicle
    liveVehicles.forEach(vehicle => {
      const [lat, lon] = vehicle.position;
      
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        console.warn('Invalid vehicle position:', vehicle.id, vehicle.position);
        return;
      }

      const existingMarker = liveVehicleMarkers.current.get(vehicle.id);

      if (existingMarker) {
        // Update existing marker position and icon
        existingMarker.setLatLng([lat, lon]);
        existingMarker.setIcon(createLiveVehicleIcon(vehicle));
        existingMarker.setPopupContent(`
          <div style="font-family: inherit; min-width: 220px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="font-size: 24px;">${vehicle.type === 'metro' ? '🚇' : '🚆'}</div>
              <div>
                <b style="font-size: 16px; color: ${vehicle.type === 'metro' ? 'hsl(var(--metro))' : 'hsl(var(--train))'};">
                  ${vehicle.line}
                </b>
                <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">
                  ${vehicle.id}
                </div>
              </div>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
              <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
                <span style="color: #6b7280;">Next Stop:</span>
                <strong>${vehicle.next_station}</strong>
                
                <span style="color: #6b7280;">ETA:</span>
                <strong style="color: ${vehicle.type === 'metro' ? 'hsl(var(--metro))' : 'hsl(var(--train))'};">
                  ${vehicle.eta_minutes} min
                </strong>
                
                <span style="color: #6b7280;">Speed:</span>
                <strong>${vehicle.speed} km/h</strong>
                
                <span style="color: #6b7280;">Status:</span>
                <div>
                  <span style="
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    background: ${
                      vehicle.status === 'moving' ? '#d1fae5' :
                      vehicle.status === 'delayed' ? '#fef3c7' : '#e5e7eb'
                    };
                    color: ${
                      vehicle.status === 'moving' ? '#065f46' :
                      vehicle.status === 'delayed' ? '#92400e' : '#374151'
                    };
                  ">
                    ${vehicle.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 11px; color: #9ca3af;">
                Updated: ${new Date(vehicle.last_update).toLocaleTimeString()}
              </div>
            </div>
          </div>
        `);
      } else {
        // Create new marker
        const icon = createLiveVehicleIcon(vehicle);
        const marker = L.marker([lat, lon], {
          icon,
          zIndexOffset: 2000, // Display above route markers
        });

        marker.bindPopup(`
          <div style="font-family: inherit; min-width: 220px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="font-size: 24px;">${vehicle.type === 'metro' ? '🚇' : '🚆'}</div>
              <div>
                <b style="font-size: 16px; color: ${vehicle.type === 'metro' ? 'hsl(var(--metro))' : 'hsl(var(--train))'};">
                  ${vehicle.line}
                </b>
                <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">
                  ${vehicle.id}
                </div>
              </div>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
              <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
                <span style="color: #6b7280;">Next Stop:</span>
                <strong>${vehicle.next_station}</strong>
                
                <span style="color: #6b7280;">ETA:</span>
                <strong style="color: ${vehicle.type === 'metro' ? 'hsl(var(--metro))' : 'hsl(var(--train))'};">
                  ${vehicle.eta_minutes} min
                </strong>
                
                <span style="color: #6b7280;">Speed:</span>
                <strong>${vehicle.speed} km/h</strong>
                
                <span style="color: #6b7280;">Status:</span>
                <div>
                  <span style="
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    background: ${
                      vehicle.status === 'moving' ? '#d1fae5' :
                      vehicle.status === 'delayed' ? '#fef3c7' : '#e5e7eb'
                    };
                    color: ${
                      vehicle.status === 'moving' ? '#065f46' :
                      vehicle.status === 'delayed' ? '#92400e' : '#374151'
                    };
                  ">
                    ${vehicle.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 11px; color: #9ca3af;">
                Updated: ${new Date(vehicle.last_update).toLocaleTimeString()}
              </div>
            </div>
          </div>
        `);

        marker.addTo(map.current);
        liveVehicleMarkers.current.set(vehicle.id, marker);
      }
    });
  }, [liveVehicles, isConnected]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Load GeoJSON files
    const loadGeoJSON = async () => {
      try {
        const [metroResponse, trainResponse] = await Promise.all([
          fetch('/data/metro_routes.geojson'),
          fetch('/data/train_routes.geojson')
        ]);
        metroRoutesGeoJSON.current = await metroResponse.json();
        trainRoutesGeoJSON.current = await trainResponse.json();
      } catch (error) {
        console.error('Failed to load GeoJSON files:', error);
      }
    };
    loadGeoJSON();

    // Initialize map
    map.current = L.map(mapContainer.current).setView(
      currentPosition ? [currentPosition.lat, currentPosition.lon] : [13.0827, 80.2707],
      13
    );

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Create layer group for station markers
    markersLayer.current = L.layerGroup().addTo(map.current);
    
    // Create layer group for route path
    routePathLayer.current = L.layerGroup().addTo(map.current);

    // Add metro station markers
    metroData.stations.forEach(station => {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: hsl(var(--metro)); width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;"></div>',
        iconSize: [14, 14],
      });

      L.marker([station.lat, station.lon], { icon })
        .bindPopup(`<b>${station.name}</b><br/>Metro Station`)
        .addTo(markersLayer.current!);
    });

    // Add train station markers
    trainsData.stations.forEach(station => {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: hsl(var(--train)); width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;"></div>',
        iconSize: [14, 14],
      });

      L.marker([station.lat, station.lon], { icon })
        .bindPopup(`<b>${station.name}</b><br/>Train Station`)
        .addTo(markersLayer.current!);
    });

    return () => {
      // Clean up live vehicle markers
      liveVehicleMarkers.current.forEach(marker => marker.remove());
      liveVehicleMarkers.current.clear();
      
      // Clean up animated vehicles
      animatedVehicles.current.forEach((marker) => {
        if ((marker as any)._animationInterval) {
          clearInterval((marker as any)._animationInterval);
        }
        marker.remove();
      });
      animatedVehicles.current.clear();
      
      currentPositionMarker.current?.remove();
      accuracyCircle.current?.remove();
      markersLayer.current?.remove();
      routePathLayer.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !currentPosition) return;

    // Update current position marker
    if (!currentPositionMarker.current) {
      currentPositionMarker.current = L.marker([currentPosition.lat, currentPosition.lon]).addTo(map.current);
    } else {
      currentPositionMarker.current.setLatLng([currentPosition.lat, currentPosition.lon]);
    }

    // Update accuracy circle
    if (currentPosition.accuracy) {
      if (!accuracyCircle.current) {
        accuracyCircle.current = L.circle([currentPosition.lat, currentPosition.lon], {
          radius: currentPosition.accuracy,
          color: 'blue',
          fillColor: 'blue',
          fillOpacity: 0.15,
          interactive: false,
        }).addTo(map.current);
      } else {
        accuracyCircle.current.setLatLng([currentPosition.lat, currentPosition.lon]);
        accuracyCircle.current.setRadius(currentPosition.accuracy);
      }
    } else {
      if (accuracyCircle.current) {
        accuracyCircle.current.remove();
        accuracyCircle.current = null;
      }
    }

    map.current.setView([currentPosition.lat, currentPosition.lon], 15);
  }, [currentPosition]);

  // Helper function to get route color
  const getRouteColor = (mode: string, line?: string): string => {
    if (mode === 'metro') {
      if (line?.toLowerCase().includes('blue')) return '#3b82f6'; // Blue
      if (line?.toLowerCase().includes('green')) return '#10b981'; // Green
      return 'hsl(var(--metro))';
    } else if (mode === 'train') {
      return 'hsl(var(--train))';
    } else if (mode === 'bus') {
      return 'hsl(var(--bus))';
    } else if (mode === 'walk') {
      return '#9333ea'; // Purple
    }
    return '#6b7280';
  };

  // Render route paths
  useEffect(() => {
    if (!map.current || !routePathLayer.current || !route || route.length === 0) return;

    console.log('🗺️ Rendering route with', route.length, 'segments');
    routePathLayer.current.clearLayers();

    const renderRouteSegments = async () => {
      for (let i = 0; i < route.length; i++) {
        const segment = route[i];
        
        if (!segment.fromCoords || !segment.toCoords) {
          console.warn('Segment missing coordinates:', segment);
          continue;
        }

        const color = getRouteColor(segment.mode, segment.to);
        let routeCoordinates: [number, number][] = [segment.fromCoords, segment.toCoords];

        try {
          if (segment.mode === 'walk' || segment.mode === 'bus') {
            // Use ORS for walking and bus routes (actual roads)
            const walkRoute = await getWalkingRoute(
              segment.fromCoords[0], segment.fromCoords[1],
              segment.toCoords[0], segment.toCoords[1]
            );
            
            if (walkRoute && walkRoute.coordinates) {
              routeCoordinates = walkRoute.coordinates;
            }
          } else if (segment.mode === 'metro' && metroRoutesGeoJSON.current) {
            // Try to get actual metro route geometry from GeoJSON
            const metroFeatures = metroRoutesGeoJSON.current.features || [];
            
            // Find metro line - try to match by line name
            let matchedFeature = null;
            for (const feature of metroFeatures) {
              const props = feature.properties || {};
              const featureName = (props.name || props.line || '').toLowerCase();
              const segmentInfo = `${segment.from} ${segment.to}`.toLowerCase();
              
              // Try to match blue line or green line
              if ((featureName.includes('blue') && segmentInfo.includes('blue')) ||
                  (featureName.includes('green') && segmentInfo.includes('green')) ||
                  featureName.includes(segment.from.toLowerCase()) ||
                  featureName.includes(segment.to.toLowerCase())) {
                matchedFeature = feature;
                break;
              }
            }
            
            if (matchedFeature && matchedFeature.geometry) {
              const coords = matchedFeature.geometry.coordinates;
              if (matchedFeature.geometry.type === 'LineString') {
                routeCoordinates = coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
              } else if (matchedFeature.geometry.type === 'MultiLineString') {
                const allCoords: [number, number][] = [];
                coords.forEach((lineCoords: number[][]) => {
                  allCoords.push(...lineCoords.map((c: number[]) => [c[1], c[0]] as [number, number]));
                });
                routeCoordinates = allCoords;
              }
            }
          } else if (segment.mode === 'train' && trainRoutesGeoJSON.current) {
            // Try to get actual train route geometry from GeoJSON
            const trainFeatures = trainRoutesGeoJSON.current.features || [];
            
            let matchedFeature = null;
            for (const feature of trainFeatures) {
              const props = feature.properties || {};
              const featureName = (props.name || '').toLowerCase();
              const segmentInfo = `${segment.from} ${segment.to}`.toLowerCase();
              
              if (featureName.includes('suburban') || 
                  featureName.includes(segment.from.toLowerCase()) ||
                  featureName.includes(segment.to.toLowerCase())) {
                matchedFeature = feature;
                break;
              }
            }
            
            if (matchedFeature && matchedFeature.geometry) {
              const coords = matchedFeature.geometry.coordinates;
              if (matchedFeature.geometry.type === 'LineString') {
                routeCoordinates = coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
              } else if (matchedFeature.geometry.type === 'MultiLineString') {
                const allCoords: [number, number][] = [];
                coords.forEach((lineCoords: number[][]) => {
                  allCoords.push(...lineCoords.map((c: number[]) => [c[1], c[0]] as [number, number]));
                });
                routeCoordinates = allCoords;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching route geometry:', error);
        }

        // Draw polyline
        const polyline = L.polyline(routeCoordinates, {
          color,
          weight: 6,
          opacity: 0.8,
          lineJoin: 'round',
          lineCap: 'round',
          dashArray: segment.mode === 'walk' ? '10, 10' : undefined,
        });

        polyline.bindPopup(`
          <div style="font-family: inherit; min-width: 200px;">
            <b style="color: ${color}; font-size: 16px;">${segment.mode.toUpperCase()}</b><br/>
            <strong>From:</strong> ${segment.from}<br/>
            <strong>To:</strong> ${segment.to}<br/>
            <strong>Duration:</strong> ${segment.duration} min
            ${segment.waitTime ? `<br/><strong>Wait:</strong> ${segment.waitTime} min` : ''}
            ${segment.departureTime ? `<br/><strong>Departs:</strong> ${segment.departureTime}` : ''}
          </div>
        `);

        polyline.addTo(routePathLayer.current!);

        // Add start and end markers for each segment
        const startIcon = L.divIcon({
          className: 'route-point-marker',
          html: `<div style="
            width: 12px;
            height: 12px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        L.marker(segment.fromCoords, { icon: startIcon, zIndexOffset: 100 })
          .bindPopup(`<b>${segment.from}</b>`)
          .addTo(routePathLayer.current!);

        // Add end marker for last segment
        if (i === route.length - 1) {
          L.marker(segment.toCoords, { icon: startIcon, zIndexOffset: 100 })
            .bindPopup(`<b>${segment.to}</b>`)
            .addTo(routePathLayer.current!);
        }
      }

      // Fit map to show entire route
      if (route.length > 0 && route[0].fromCoords && route[route.length - 1].toCoords) {
        const bounds = L.latLngBounds([
          route[0].fromCoords,
          route[route.length - 1].toCoords
        ]);
        
        // Add some padding
        route.forEach(segment => {
          if (segment.fromCoords) bounds.extend(segment.fromCoords);
          if (segment.toCoords) bounds.extend(segment.toCoords);
        });
        
        map.current?.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    renderRouteSegments();

    return () => {
      routePathLayer.current?.clearLayers();
    };
  }, [route]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      
      {/* Live Tracking Indicator */}
      {isConnected && liveVehicles.length > 0 && (
        <Card className="absolute top-4 left-4 p-3 bg-card/95 backdrop-blur-sm border-border/50 z-[1000]">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping" />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground">Live Tracking Active</div>
              <div className="text-[10px] text-muted-foreground">
                {liveVehicles.length} vehicle{liveVehicles.length !== 1 ? 's' : ''} tracked
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* ETA Display */}
      {currentPosition && (
        <Card className="absolute top-4 right-4 p-4 bg-card/95 backdrop-blur-sm border-border/50 z-[1000]">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <div>
              <div className="text-2xl font-bold text-foreground">{remainingDuration} min</div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-1">Current Segment</div>
            <Badge variant="secondary" className="text-xs">
              {currentSegment.mode.toUpperCase()}: {currentSegment.from} → {currentSegment.to}
            </Badge>
          </div>
          <div className="mt-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-center mt-1">
              {Math.round(progressPercent)}% Complete
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LiveLeafletMapView;

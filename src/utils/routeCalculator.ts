import metroData from '@/data/metro.json';
import trainsData from '@/data/trains.json';
import { getTransitGraph } from './dijkstraRouter';
import type { StationNode, PathSegment } from './dijkstraRouter';
import { getActualWaitTime } from './scheduleCalculator';
import { predictETA } from './aiEtaService';

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

interface FareBreakdown {
  mode: string;
  amount: number;
  description: string;
}

interface RouteResult {
  route: RouteSegment[];
  totalDuration: number;
  totalDistance: number;
  originCoords?: [number, number];
  destCoords?: [number, number];
  fare: {
    breakdown: FareBreakdown[];
    total: number;
    currency: string;
  };
}

// Haversine formula to calculate distance between two coordinates
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

// Removed old estimated wait time functions - now using real schedules

// Calculate estimated route using Dijkstra's algorithm with AI-powered ETA predictions
export const calculateRoute = async (
  origin: string,
  destination: string,
  originCoords?: [number, number],
  destCoords?: [number, number]
): Promise<RouteResult> => {
  const currentHour = new Date().getHours();
  const graph = getTransitGraph();
  
  const originLower = origin.toLowerCase();
  const destLower = destination.toLowerCase();
  
  // Use Dijkstra's algorithm for station-to-station routing
  const startCoords: [number, number] = originCoords || [13.0827, 80.2707];
  const endCoords: [number, number] = destCoords || [13.0827, 80.2707];
  
  const route: RouteSegment[] = [];
  let totalDuration = 0;
  
  // Step 1: Find nearest stations to origin and destination
  // Prioritize finding train stations first, then metro
  let originStation = graph.findNearestStation(startCoords[0], startCoords[1], 'train');
  let destStation = graph.findNearestStation(endCoords[0], endCoords[1], 'train');
  
  // If train stations are too far, try metro
  if (!originStation || (originStation && calculateDistance(startCoords[0], startCoords[1], originStation.lat, originStation.lon) > 3)) {
    const metroStation = graph.findNearestStation(startCoords[0], startCoords[1], 'metro');
    if (metroStation) originStation = metroStation;
  }
  
  if (!destStation || (destStation && calculateDistance(endCoords[0], endCoords[1], destStation.lat, destStation.lon) > 3)) {
    const metroStation = graph.findNearestStation(endCoords[0], endCoords[1], 'metro');
    if (metroStation) destStation = metroStation;
  }
  
  if (!originStation || !destStation) {
    // Fallback: direct bus route if no stations found - use AI prediction
    const busDistance = calculateDistance(startCoords[0], startCoords[1], endCoords[0], endCoords[1]);
    const aiPrediction = await predictETA(busDistance, 'bus', 10);
    const busWaitTime = Math.round(aiPrediction.eta_minutes * 0.2); // Approximate 20% of total as wait time
    const busRideTime = Math.round(aiPrediction.eta_minutes * 0.8); // 80% as ride time
    const departureTime = new Date();
    departureTime.setMinutes(departureTime.getMinutes() + busWaitTime);
    
    route.push({
      mode: "bus",
      from: origin,
      to: destination,
      duration: busRideTime,
      waitTime: busWaitTime,
      departureTime: departureTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      fromCoords: startCoords,
      toCoords: endCoords,
    });
    totalDuration = busWaitTime + busRideTime;
    
    return {
      route,
      totalDuration,
      totalDistance: Math.round(totalDuration * 0.5 * 10) / 10,
      originCoords,
      destCoords,
      fare: {
        breakdown: [{ mode: 'Bus', amount: 8, description: `${origin} to ${destination}` }],
        total: 8,
        currency: 'INR',
      },
    };
  }
  
  // Step 2: Calculate first-mile (origin to nearest station)
  const distanceToOriginStation = calculateDistance(
    startCoords[0],
    startCoords[1],
    originStation.lat,
    originStation.lon
  );
  
  const isAtOriginStation = originLower.includes(originStation.name.toLowerCase()) || 
                            distanceToOriginStation < 0.15;
  
  // Add first-mile segment if not at station
  if (!isAtOriginStation) {
    const walkTimeToStation = Math.ceil(distanceToOriginStation * 12);
    
    if (distanceToOriginStation >= 1) {
      // Use bus to approach station when station is not within easy walking distance (< 1 km)
      const initialWalkTime = 5;
      route.push({
        mode: "walk",
        from: origin,
        to: "Nearby Bus Stop",
        duration: initialWalkTime,
        fromCoords: startCoords,
        toCoords: startCoords,
      });
      totalDuration += initialWalkTime;
      
      // AI-powered bus prediction
      const busDistanceKm = distanceToOriginStation - 0.5;
      const busAiPrediction = await predictETA(busDistanceKm, 'bus', 10);
      const busWaitTime = Math.round(busAiPrediction.eta_minutes * 0.25);
      const busRideTime = Math.round(busAiPrediction.eta_minutes * 0.75);
      const busDepartureTime = new Date();
      busDepartureTime.setMinutes(busDepartureTime.getMinutes() + initialWalkTime + busWaitTime);
      
      route.push({
        mode: "bus",
        from: "Nearby Bus Stop",
        to: `Near ${originStation.name}`,
        duration: busRideTime,
        waitTime: busWaitTime,
        departureTime: busDepartureTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        fromCoords: startCoords,
        toCoords: [originStation.lat, originStation.lon],
      });
      totalDuration += busWaitTime + busRideTime;
      
      const finalWalkToStation = Math.floor(Math.random() * 3) + 2;
      route.push({
        mode: "walk",
        from: `Near ${originStation.name}`,
        to: originStation.name,
        duration: finalWalkToStation,
        fromCoords: [originStation.lat, originStation.lon],
        toCoords: [originStation.lat, originStation.lon],
      });
      totalDuration += finalWalkToStation;
    } else {
      // Short walk to station when very close (< 1 km)
      route.push({
        mode: "walk",
        from: origin,
        to: originStation.name,
        duration: walkTimeToStation,
        fromCoords: startCoords,
        toCoords: [originStation.lat, originStation.lon],
      });
      totalDuration += walkTimeToStation;
    }
  }
  
  // Step 3: Use Dijkstra's algorithm for station-to-station route
  const path = graph.dijkstra(originStation.id, destStation.id);
  
  if (path && path.length > 0) {
    // Convert path segments to route segments
    let currentTime = totalDuration;
    
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      const prevSegment = i > 0 ? path[i - 1] : null;
      
      // Add wait time for mode changes or first transit segment
      let waitTime = 0;
      let departureTimeStr: string | undefined;
      
      if (i === 0 || (prevSegment && prevSegment.mode !== segment.mode)) {
        // Get actual wait time from schedules
        const nextDeparture = getActualWaitTime(
          segment.mode,
          segment.from.name,
          segment.line
        );
        waitTime = nextDeparture.waitTimeMinutes;
        departureTimeStr = nextDeparture.departureTime;
      }
      
      // Use AI prediction for segment duration
      const segmentDistance = calculateDistance(
        segment.from.lat,
        segment.from.lon,
        segment.to.lat,
        segment.to.lon
      );
      
      // Get AI-predicted ride time for metro and train segments
      let rideDuration = segment.duration; // fallback to Dijkstra duration
      if (segment.mode === 'metro' || segment.mode === 'train') {
        const aiPrediction = await predictETA(
          segmentDistance,
          segment.mode,
          waitTime > 0 ? waitTime : 10
        );
        rideDuration = Math.round(aiPrediction.eta_minutes - (waitTime > 0 ? waitTime : aiPrediction.eta_minutes * 0.2));
        if (rideDuration < 1) rideDuration = Math.round(aiPrediction.eta_minutes * 0.8);
      }
      
      route.push({
        mode: segment.mode,
        from: segment.from.name,
        to: segment.to.name,
        duration: rideDuration,
        waitTime: waitTime > 0 ? Math.round(waitTime) : undefined,
        departureTime: departureTimeStr,
        fromCoords: [segment.from.lat, segment.from.lon],
        toCoords: [segment.to.lat, segment.to.lon],
      });
      
      currentTime += waitTime + rideDuration;
    }
    
    totalDuration = currentTime;
  } else {
    // No path found, use direct bus with AI prediction
    const busDistanceKm = calculateDistance(originStation.lat, originStation.lon, destStation.lat, destStation.lon);
    const aiPrediction = await predictETA(busDistanceKm, 'bus', 10);
    const busWaitTime = Math.round(aiPrediction.eta_minutes * 0.2);
    const busRideTime = Math.round(aiPrediction.eta_minutes * 0.8);
    const departureTime = new Date();
    departureTime.setMinutes(departureTime.getMinutes() + totalDuration + busWaitTime);
    route.push({
      mode: "bus",
      from: originStation.name,
      to: destStation.name,
      duration: busRideTime,
      waitTime: busWaitTime,
      departureTime: departureTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      fromCoords: [originStation.lat, originStation.lon],
      toCoords: [destStation.lat, destStation.lon],
    });
    totalDuration += busWaitTime + busRideTime;
  }
  
  // Step 4: Add last-mile segment (destination station to final destination)
  const distanceFromDestStation = calculateDistance(
    destStation.lat,
    destStation.lon,
    endCoords[0],
    endCoords[1]
  );
  
  const isAtDestStation = destLower.includes(destStation.name.toLowerCase()) || 
                          distanceFromDestStation < 0.15;
  
  if (!isAtDestStation) {
    if (distanceFromDestStation < 1) {
      // Walk to final destination
      const finalWalkTime = Math.ceil(distanceFromDestStation * 12);
      route.push({
        mode: "walk",
        from: destStation.name,
        to: destination,
        duration: finalWalkTime,
        fromCoords: [destStation.lat, destStation.lon],
        toCoords: endCoords,
      });
      totalDuration += finalWalkTime;
    } else {
      // Use bus for last mile with AI prediction
      const lastMileAiPrediction = await predictETA(distanceFromDestStation, 'bus', 10);
      const busWaitTime = Math.round(lastMileAiPrediction.eta_minutes * 0.25);
      const busRideTime = Math.round(lastMileAiPrediction.eta_minutes * 0.75);
      const busDepartureTime = new Date();
      busDepartureTime.setMinutes(busDepartureTime.getMinutes() + totalDuration + busWaitTime);
      
      route.push({
        mode: "bus",
        from: destStation.name,
        to: destination,
        duration: busRideTime,
        waitTime: busWaitTime,
        departureTime: busDepartureTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        fromCoords: [destStation.lat, destStation.lon],
        toCoords: endCoords,
      });
      totalDuration += busWaitTime + busRideTime;
    }
  }
  
  // Estimate total distance (rough calculation)
  const totalDistance = Math.round(totalDuration * 0.5 * 10) / 10; // Round to 1 decimal place
  
  // Calculate fare
  const fareBreakdown: FareBreakdown[] = [];
  let totalFare = 0;

  route.forEach((segment) => {
    let fare = 0;
    let description = '';

    switch (segment.mode) {
      case 'metro':
        // Metro fare (distance-based)
        const metroDistance = (segment.duration / 60) * 30;
        if (metroDistance <= 2) fare = 10;
        else if (metroDistance <= 4) fare = 20;
        else if (metroDistance <= 6) fare = 30;
        else if (metroDistance <= 10) fare = 40;
        else if (metroDistance <= 15) fare = 50;
        else fare = 60;
        
        description = `${segment.from} to ${segment.to}`;
        fareBreakdown.push({ mode: 'Metro', amount: fare, description });
        totalFare += fare;
        break;

      case 'train':
        // Train fare (zone-based)
        const trainDistance = (segment.duration / 60) * 40;
        if (trainDistance <= 10) fare = 5;
        else if (trainDistance <= 20) fare = 10;
        else if (trainDistance <= 30) fare = 15;
        else if (trainDistance <= 40) fare = 20;
        else fare = 25;
        
        description = `${segment.from} to ${segment.to}`;
        fareBreakdown.push({ mode: 'Train', amount: fare, description });
        totalFare += fare;
        break;

      case 'bus':
        // Bus fare (flat)
        fare = 8;
        description = `${segment.from} to ${segment.to}`;
        fareBreakdown.push({ mode: 'Bus', amount: fare, description });
        totalFare += fare;
        break;
    }
  });
  
  return {
    route,
    totalDuration: Math.round(totalDuration),
    totalDistance,
    originCoords,
    destCoords,
    fare: {
      breakdown: fareBreakdown,
      total: totalFare,
      currency: 'INR',
    },
  };
};

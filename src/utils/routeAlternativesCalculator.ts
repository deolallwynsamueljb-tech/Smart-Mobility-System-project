import { calculateRoute, calculateDistance } from './routeCalculator';
import { getTransitGraph } from './dijkstraRouter';
import type { PathSegment } from './dijkstraRouter';
import { getActualWaitTime } from './scheduleCalculator';
import { flaskApi } from './flaskApiService';

interface RouteOption {
  type: 'fastest' | 'cheapest' | 'fewest-transfers';
  route: any[];
  totalDuration: number;
  totalDistance: number;
  originCoords?: [number, number];
  destCoords?: [number, number];
  fare: {
    breakdown: any[];
    total: number;
    currency: string;
  };
  transferCount: number;
}

// Calculate fare for a segment
const calculateSegmentFare = (mode: 'metro' | 'train' | 'bus', duration: number): number => {
  if (mode === 'metro') {
    const metroDistance = (duration / 60) * 30;
    if (metroDistance <= 2) return 10;
    if (metroDistance <= 4) return 20;
    if (metroDistance <= 6) return 30;
    if (metroDistance <= 10) return 40;
    if (metroDistance <= 15) return 50;
    return 60;
  } else if (mode === 'train') {
    const trainDistance = (duration / 60) * 40;
    if (trainDistance <= 10) return 5;
    if (trainDistance <= 20) return 10;
    if (trainDistance <= 30) return 15;
    if (trainDistance <= 40) return 20;
    return 25;
  } else {
    return 8; // bus
  }
};

// Count transfers in a route
const countTransfers = (route: any[]): number => {
  let transfers = 0;
  for (let i = 1; i < route.length; i++) {
    const prevMode = route[i - 1].mode;
    const currentMode = route[i].mode;
    
    if (prevMode !== currentMode && prevMode !== 'walk' && currentMode !== 'walk') {
      transfers++;
    }
  }
  return transfers;
};

// Build route from graph path
const buildRouteFromPath = (
  path: PathSegment[],
  origin: string,
  destination: string,
  originCoords: [number, number],
  destCoords: [number, number],
  originStation: any,
  destStation: any
): any => {
  const route: any[] = [];
  let totalDuration = 0;
  const fareBreakdown: any[] = [];
  let totalFare = 0;

  // First mile
  const distanceToOriginStation = calculateDistance(
    originCoords[0], originCoords[1],
    originStation.lat, originStation.lon
  );
  const isAtOriginStation = origin.toLowerCase().includes(originStation.name.toLowerCase()) || distanceToOriginStation < 0.15;

  if (!isAtOriginStation) {
    if (distanceToOriginStation < 1) {
      const walkTime = Math.ceil(distanceToOriginStation * 12);
      route.push({
        mode: "walk",
        from: origin,
        to: originStation.name,
        duration: walkTime,
        fromCoords: originCoords,
        toCoords: [originStation.lat, originStation.lon],
      });
      totalDuration += walkTime;
    } else {
      // Use bus for longer first-mile distances in line with mode preference
      const busDistance = distanceToOriginStation;
      const busRideTime = Math.max(5, Math.round((busDistance / 20) * 60)); // approx 20 km/h
      const busWaitTime = 10;
      route.push({
        mode: "bus",
        from: origin,
        to: `Near ${originStation.name}`,
        duration: busRideTime,
        waitTime: busWaitTime,
        fromCoords: originCoords,
        toCoords: [originStation.lat, originStation.lon],
      });
      fareBreakdown.push({
        mode: "Bus",
        amount: 8,
        description: `${origin} to ${originStation.name}`,
      });
      totalFare += 8;
      totalDuration += busWaitTime + busRideTime;
    }
  }

  // Transit segments
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    const prevSegment = i > 0 ? path[i - 1] : null;

    let waitTime = 0;
    let departureTimeStr: string | undefined;

    if (i === 0 || (prevSegment && prevSegment.mode !== segment.mode)) {
      const nextDeparture = getActualWaitTime(segment.mode, segment.from.name, segment.line);
      waitTime = nextDeparture.waitTimeMinutes;
      departureTimeStr = nextDeparture.departureTime;
    }

    const fare = calculateSegmentFare(segment.mode, segment.duration);
    fareBreakdown.push({
      mode: segment.mode === 'metro' ? 'Metro' : 'Train',
      amount: fare,
      description: `${segment.from.name} to ${segment.to.name}`,
    });
    totalFare += fare;

    route.push({
      mode: segment.mode,
      from: segment.from.name,
      to: segment.to.name,
      duration: segment.duration,
      waitTime: waitTime > 0 ? Math.round(waitTime) : undefined,
      departureTime: departureTimeStr,
      fromCoords: [segment.from.lat, segment.from.lon],
      toCoords: [segment.to.lat, segment.to.lon],
    });

    totalDuration += waitTime + segment.duration;
  }

  // Last mile
  const distanceFromDestStation = calculateDistance(
    destStation.lat, destStation.lon,
    destCoords[0], destCoords[1]
  );
  const isAtDestStation = destination.toLowerCase().includes(destStation.name.toLowerCase()) || distanceFromDestStation < 0.15;

  if (!isAtDestStation) {
    if (distanceFromDestStation < 1) {
      const walkTime = Math.ceil(distanceFromDestStation * 12);
      route.push({
        mode: "walk",
        from: destStation.name,
        to: destination,
        duration: walkTime,
        fromCoords: [destStation.lat, destStation.lon],
        toCoords: destCoords,
      });
      totalDuration += walkTime;
    } else {
      // Use bus for longer last-mile distances in line with mode preference
      const busDistance = distanceFromDestStation;
      const busRideTime = Math.max(5, Math.round((busDistance / 20) * 60));
      const busWaitTime = 10;
      route.push({
        mode: "bus",
        from: destStation.name,
        to: destination,
        duration: busRideTime,
        waitTime: busWaitTime,
        fromCoords: [destStation.lat, destStation.lon],
        toCoords: destCoords,
      });
      fareBreakdown.push({
        mode: "Bus",
        amount: 8,
        description: `${destStation.name} to ${destination}`,
      });
      totalFare += 8;
      totalDuration += busWaitTime + busRideTime;
    }
  }

  const totalDistance = Math.round(totalDuration * 0.5 * 10) / 10;

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

// Calculate route optimized for speed
const calculateFastestRoute = async (
  origin: string,
  destination: string,
  originCoords?: [number, number],
  destCoords?: [number, number]
): Promise<RouteOption> => {
  const graph = getTransitGraph();
  const startCoords: [number, number] = originCoords || [13.0827, 80.2707];
  const endCoords: [number, number] = destCoords || [13.0827, 80.2707];

  const originStation = graph.findNearestStation(startCoords[0], startCoords[1]);
  const destStation = graph.findNearestStation(endCoords[0], endCoords[1]);

  if (!originStation || !destStation) {
    const result = await calculateRoute(origin, destination, originCoords, destCoords);
    return { ...result, type: 'fastest', transferCount: countTransfers(result.route) };
  }

  // Use time as cost (default)
  const path = graph.dijkstra(originStation.id, destStation.id);
  
  if (!path) {
    const result = await calculateRoute(origin, destination, originCoords, destCoords);
    return { ...result, type: 'fastest', transferCount: countTransfers(result.route) };
  }

  const result = buildRouteFromPath(path, origin, destination, startCoords, endCoords, originStation, destStation);
  
  return {
    type: 'fastest',
    ...result,
    transferCount: countTransfers(result.route),
  };
};

// Calculate route optimized for cost
const calculateCheapestRoute = async (
  origin: string,
  destination: string,
  originCoords?: [number, number],
  destCoords?: [number, number]
): Promise<RouteOption> => {
  const graph = getTransitGraph();
  const startCoords: [number, number] = originCoords || [13.0827, 80.2707];
  const endCoords: [number, number] = destCoords || [13.0827, 80.2707];

  const originStation = graph.findNearestStation(startCoords[0], startCoords[1]);
  const destStation = graph.findNearestStation(endCoords[0], endCoords[1]);

  if (!originStation || !destStation) {
    const result = await calculateRoute(origin, destination, originCoords, destCoords);
    return { ...result, type: 'cheapest', transferCount: countTransfers(result.route) };
  }

  // Use fare as cost (prefer train over metro due to lower fares)
  const fareCostFunction = (edge: any) => {
    const fare = calculateSegmentFare(edge.mode, edge.weight);
    // Also factor in time to avoid extremely long routes
    return fare * 2 + edge.weight * 0.1;
  };

  const path = graph.dijkstra(originStation.id, destStation.id, fareCostFunction);
  
  if (!path) {
    const result = await calculateRoute(origin, destination, originCoords, destCoords);
    return { ...result, type: 'cheapest', transferCount: countTransfers(result.route) };
  }

  const result = buildRouteFromPath(path, origin, destination, startCoords, endCoords, originStation, destStation);
  
  return {
    type: 'cheapest',
    ...result,
    transferCount: countTransfers(result.route),
  };
};

// Calculate route with fewest transfers
const calculateFewestTransfersRoute = async (
  origin: string,
  destination: string,
  originCoords?: [number, number],
  destCoords?: [number, number]
): Promise<RouteOption> => {
  const graph = getTransitGraph();
  const startCoords: [number, number] = originCoords || [13.0827, 80.2707];
  const endCoords: [number, number] = destCoords || [13.0827, 80.2707];

  const originStation = graph.findNearestStation(startCoords[0], startCoords[1]);
  const destStation = graph.findNearestStation(endCoords[0], endCoords[1]);

  if (!originStation || !destStation) {
    const result = await calculateRoute(origin, destination, originCoords, destCoords);
    return { ...result, type: 'fewest-transfers', transferCount: countTransfers(result.route) };
  }

  // Penalize mode changes heavily to minimize transfers
  const transferCostFunction = (edge: any, prevMode?: 'metro' | 'train') => {
    const TRANSFER_PENALTY = 60; // 60 minutes penalty for switching modes
    let cost = edge.weight;
    
    if (prevMode && prevMode !== edge.mode) {
      cost += TRANSFER_PENALTY;
    }
    
    return cost;
  };

  const path = graph.dijkstra(originStation.id, destStation.id, transferCostFunction);
  
  if (!path) {
    const result = await calculateRoute(origin, destination, originCoords, destCoords);
    return { ...result, type: 'fewest-transfers', transferCount: countTransfers(result.route) };
  }

  const result = buildRouteFromPath(path, origin, destination, startCoords, endCoords, originStation, destStation);
  
  return {
    type: 'fewest-transfers',
    ...result,
    transferCount: countTransfers(result.route),
  };
};

// Convert Flask API response to RouteOption format
const convertFlaskToRouteOption = (flaskRoute: any, type: 'fastest' | 'cheapest' | 'fewest-transfers'): RouteOption => {
  const route = flaskRoute.segments.map((seg: any) => ({
    mode: seg.type,
    from: seg.from,
    to: seg.to,
    duration: seg.duration || 0,
    waitTime: seg.wait_time,
    departureTime: seg.departure,
    fromCoords: seg.from_coords,
    toCoords: seg.to_coords,
    distance: seg.distance,
  }));

  return {
    type,
    route,
    totalDuration: flaskRoute.total_time,
    totalDistance: route.reduce((sum: number, seg: any) => sum + (seg.distance || 0), 0),
    fare: {
      breakdown: [{ mode: flaskRoute.mode, amount: flaskRoute.fare, description: 'Total fare' }],
      total: flaskRoute.fare,
      currency: 'INR',
    },
    transferCount: countTransfers(route),
  };
};

// Generate all route alternatives using Flask API with client-side fallback
export const calculateRouteAlternatives = async (
  origin: string,
  destination: string,
  originCoords?: [number, number],
  destCoords?: [number, number]
): Promise<RouteOption[]> => {
  // Try Flask API first
  try {
    console.log('🐍 Attempting Flask API route calculation...');
    const isHealthy = await flaskApi.healthCheck();
    
    if (isHealthy && originCoords && destCoords) {
      console.log('✅ Flask API is healthy, requesting routes...');
      const response = await flaskApi.calculateRoute({
        origin: { lat: originCoords[0], lng: originCoords[1], name: origin },
        destination: { lat: destCoords[0], lng: destCoords[1], name: destination },
      });

      if (response.success && response.routes && response.routes.length > 0) {
        console.log('✅ Flask API returned routes:', response.routes.length);
        // Convert Flask routes to RouteOption format
        const alternatives: RouteOption[] = response.routes.map((route: any, idx: number) => {
          const types: ('fastest' | 'cheapest' | 'fewest-transfers')[] = ['fastest', 'cheapest', 'fewest-transfers'];
          return convertFlaskToRouteOption(route, types[idx] || 'fastest');
        });
        
        return alternatives;
      }
    }
  } catch (error) {
    console.warn('⚠️ Flask API unavailable, falling back to client-side calculation:', error);
  }

  // Fallback to client-side calculation
  console.log('🔄 Using client-side route calculation...');
  const alternatives: RouteOption[] = [];
  
  // Calculate fastest route
  const fastest = await calculateFastestRoute(origin, destination, originCoords, destCoords);
  alternatives.push(fastest);
  
  // Calculate cheapest route
  const cheapest = await calculateCheapestRoute(origin, destination, originCoords, destCoords);
  // Only add if it's actually different and cheaper
  if (cheapest.fare.total < fastest.fare.total) {
    alternatives.push(cheapest);
  }
  
  // Calculate fewest transfers route
  const fewestTransfers = await calculateFewestTransfersRoute(origin, destination, originCoords, destCoords);
  // Only add if it has fewer transfers
  if (fewestTransfers.transferCount < fastest.transferCount) {
    alternatives.push(fewestTransfers);
  }
  
  // If we only have one option, still return it in an array
  return alternatives.length > 0 ? alternatives : [fastest];
};

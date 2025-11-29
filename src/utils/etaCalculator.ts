import { calculateDistance } from './routeCalculator';

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

export const calculateUpdatedETA = (
  currentLat: number,
  currentLon: number,
  route: RouteSegment[],
  originalTotalDuration: number
): { remainingDuration: number; progressPercent: number } => {
  if (!route.length || !route[0].fromCoords || !route[route.length - 1].toCoords) {
    return { remainingDuration: originalTotalDuration, progressPercent: 0 };
  }

  // Get actual start and end from route
  const startCoords = route[0].fromCoords;
  const endCoords = route[route.length - 1].toCoords;
  
  // Calculate total route distance
  let totalRouteDistance = 0;
  for (const segment of route) {
    if (segment.fromCoords && segment.toCoords) {
      totalRouteDistance += calculateDistance(
        segment.fromCoords[0], segment.fromCoords[1],
        segment.toCoords[0], segment.toCoords[1]
      );
    }
  }

  // Find closest segment to current position
  let closestSegmentIndex = 0;
  let minDistance = Infinity;
  
  for (let i = 0; i < route.length; i++) {
    const segment = route[i];
    if (segment.fromCoords) {
      const dist = calculateDistance(
        currentLat, currentLon,
        segment.fromCoords[0], segment.fromCoords[1]
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestSegmentIndex = i;
      }
    }
  }

  // Calculate distance traveled (sum of completed segments + partial current segment)
  let traveledDistance = 0;
  for (let i = 0; i < closestSegmentIndex; i++) {
    const segment = route[i];
    if (segment.fromCoords && segment.toCoords) {
      traveledDistance += calculateDistance(
        segment.fromCoords[0], segment.fromCoords[1],
        segment.toCoords[0], segment.toCoords[1]
      );
    }
  }

  // Add partial progress in current segment
  const currentSegment = route[closestSegmentIndex];
  if (currentSegment.fromCoords) {
    const currentSegmentProgress = calculateDistance(
      currentSegment.fromCoords[0], currentSegment.fromCoords[1],
      currentLat, currentLon
    );
    traveledDistance += Math.min(currentSegmentProgress, 
      currentSegment.toCoords ? calculateDistance(
        currentSegment.fromCoords[0], currentSegment.fromCoords[1],
        currentSegment.toCoords[0], currentSegment.toCoords[1]
      ) : currentSegmentProgress
    );
  }

  const progressPercent = totalRouteDistance > 0 
    ? Math.min((traveledDistance / totalRouteDistance) * 100, 100) 
    : 0;
    
  const remainingDuration = Math.max(
    originalTotalDuration * (1 - progressPercent / 100),
    0
  );

  return {
    remainingDuration: Math.round(remainingDuration),
    progressPercent: Math.round(progressPercent),
  };
};

export const getCurrentSegment = (
  progressPercent: number,
  route: RouteSegment[]
): { segment: RouteSegment; index: number } => {
  const segmentProgress = (progressPercent / 100) * route.length;
  const index = Math.min(Math.floor(segmentProgress), route.length - 1);
  return {
    segment: route[index],
    index,
  };
};

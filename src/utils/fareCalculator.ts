import { calculateDistance } from './routeCalculator';

interface RouteSegment {
  mode: "metro" | "train" | "bus" | "walk";
  from: string;
  to: string;
  duration: number;
  waitTime?: number;
  departureTime?: string;
}

interface FareBreakdown {
  mode: string;
  amount: number;
  description: string;
}

interface FareResult {
  breakdown: FareBreakdown[];
  total: number;
  currency: string;
}

// Metro fare calculation (distance-based)
// Chennai Metro fare ranges from ₹10 to ₹60 based on distance
const calculateMetroFare = (duration: number): number => {
  // Estimate distance from duration (assume 30 km/h avg speed)
  const estimatedDistance = (duration / 60) * 30;
  
  if (estimatedDistance <= 2) return 10;
  if (estimatedDistance <= 4) return 20;
  if (estimatedDistance <= 6) return 30;
  if (estimatedDistance <= 10) return 40;
  if (estimatedDistance <= 15) return 50;
  return 60;
};

// Train fare calculation (zone-based)
// Chennai Suburban trains have zone-based pricing
const calculateTrainFare = (duration: number): number => {
  // Estimate distance for zone calculation
  const estimatedDistance = (duration / 60) * 40; // Trains are faster
  
  // Zone 1: 0-10 km
  if (estimatedDistance <= 10) return 5;
  // Zone 2: 10-20 km
  if (estimatedDistance <= 20) return 10;
  // Zone 3: 20-30 km
  if (estimatedDistance <= 30) return 15;
  // Zone 4: 30-40 km
  if (estimatedDistance <= 40) return 20;
  // Zone 5: 40+ km
  return 25;
};

// Bus fare calculation (flat fare)
// MTC buses typically have flat fares for ordinary buses
const calculateBusFare = (): number => {
  return 8; // Flat fare for ordinary MTC bus
};

export const calculateTotalFare = (route: RouteSegment[]): FareResult => {
  const breakdown: FareBreakdown[] = [];
  let total = 0;

  route.forEach((segment) => {
    let fare = 0;
    let description = '';

    switch (segment.mode) {
      case 'metro':
        fare = calculateMetroFare(segment.duration);
        description = `${segment.from} to ${segment.to} (distance-based)`;
        breakdown.push({
          mode: 'Metro',
          amount: fare,
          description,
        });
        total += fare;
        break;

      case 'train':
        fare = calculateTrainFare(segment.duration);
        description = `${segment.from} to ${segment.to} (zone-based)`;
        breakdown.push({
          mode: 'Train',
          amount: fare,
          description,
        });
        total += fare;
        break;

      case 'bus':
        fare = calculateBusFare();
        description = `${segment.from} to ${segment.to} (flat fare)`;
        breakdown.push({
          mode: 'Bus',
          amount: fare,
          description,
        });
        total += fare;
        break;

      case 'walk':
        // Walking is free
        break;
    }
  });

  return {
    breakdown,
    total,
    currency: 'INR',
  };
};

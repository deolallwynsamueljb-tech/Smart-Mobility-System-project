import metroData from '@/data/metro.json';
import trainsData from '@/data/trains.json';

interface NextDeparture {
  departureTime: string;
  waitTimeMinutes: number;
  frequency: number;
}

// Parse time string (HH:MM) to minutes since midnight
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Format minutes since midnight to HH:MM AM/PM
const minutesToTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
};

// Get current time in minutes since midnight
const getCurrentMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

// Check if current time is in a time range
const isInTimeRange = (currentMinutes: number, rangeStr: string): boolean => {
  const [start, end] = rangeStr.split('-');
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
};

// Get next metro departure
export const getNextMetroDeparture = (stationName: string, lineName: string): NextDeparture => {
  const currentMinutes = getCurrentMinutes();
  
  // Find the corridor
  const corridor = metroData.corridors.find(c => c.name === lineName);
  if (!corridor) {
    return {
      departureTime: minutesToTimeString(currentMinutes + 7),
      waitTimeMinutes: 7,
      frequency: 7,
    };
  }

  const { weekday } = corridor;
  
  // Check if service is running
  const firstTrainCandidates: string[] = [];
  if (weekday.firstTrain.fromAirport) firstTrainCandidates.push(weekday.firstTrain.fromAirport);
  if (weekday.firstTrain.fromWashermanpet) firstTrainCandidates.push(weekday.firstTrain.fromWashermanpet);
  if (weekday.firstTrain.fromCentral) firstTrainCandidates.push(weekday.firstTrain.fromCentral);
  if (weekday.firstTrain.fromStThomas) firstTrainCandidates.push(weekday.firstTrain.fromStThomas);

  const firstTrainMinutes = Math.min(...firstTrainCandidates.map(timeToMinutes));
  
  const lastTrainCandidates: string[] = [];
  if (weekday.lastTrain.fromAirport) lastTrainCandidates.push(weekday.lastTrain.fromAirport);
  if (weekday.lastTrain.fromWashermanpet) lastTrainCandidates.push(weekday.lastTrain.fromWashermanpet);
  if (weekday.lastTrain.fromCentral) lastTrainCandidates.push(weekday.lastTrain.fromCentral);
  if (weekday.lastTrain.fromStThomas) lastTrainCandidates.push(weekday.lastTrain.fromStThomas);

  const lastTrainMinutes = Math.max(...lastTrainCandidates.map(timeToMinutes));

  // If before first train or after last train
  if (currentMinutes < firstTrainMinutes) {
    const waitTime = firstTrainMinutes - currentMinutes;
    return {
      departureTime: minutesToTimeString(firstTrainMinutes),
      waitTimeMinutes: waitTime,
      frequency: weekday.frequency.peak,
    };
  }

  if (currentMinutes >= lastTrainMinutes) {
    // Service ended for the day - next train is tomorrow's first train
    const waitTime = (24 * 60 - currentMinutes) + firstTrainMinutes;
    return {
      departureTime: minutesToTimeString(firstTrainMinutes),
      waitTimeMinutes: waitTime,
      frequency: weekday.frequency.peak,
    };
  }

  // Determine frequency based on time
  let frequency: number;
  if (weekday.peakHours.some(range => isInTimeRange(currentMinutes, range))) {
    frequency = weekday.frequency.peak;
  } else if (weekday.extendedHours && weekday.extendedHours.some(range => isInTimeRange(currentMinutes, range))) {
    frequency = weekday.frequency.extended;
  } else {
    frequency = weekday.frequency.nonPeak;
  }

  // Calculate next departure based on frequency
  // Assume trains depart at regular intervals
  const minutesSinceFirst = currentMinutes - firstTrainMinutes;
  const trainNumber = Math.ceil(minutesSinceFirst / frequency);
  const nextDepartureMinutes = firstTrainMinutes + (trainNumber * frequency);
  
  const waitTime = nextDepartureMinutes - currentMinutes;

  return {
    departureTime: minutesToTimeString(nextDepartureMinutes),
    waitTimeMinutes: Math.max(1, waitTime),
    frequency,
  };
};

// Get next train departure
export const getNextTrainDeparture = (stationCode: string): NextDeparture => {
  const currentMinutes = getCurrentMinutes();
  
  // Find all trains departing from this station
  const departures: number[] = [];
  
  trainsData.routes.forEach(route => {
    const stationInRoute = route.stations.find(s => s.code === stationCode);
    if (stationInRoute && stationInRoute.departure) {
      const departureMinutes = timeToMinutes(stationInRoute.departure);
      if (departureMinutes > currentMinutes) {
        departures.push(departureMinutes);
      }
    }
  });

  if (departures.length === 0) {
    // No more trains today, use average frequency
    const avgFrequency = trainsData.averageFrequency?.peak || 15;
    return {
      departureTime: minutesToTimeString(currentMinutes + avgFrequency),
      waitTimeMinutes: avgFrequency,
      frequency: avgFrequency,
    };
  }

  // Sort and get next departure
  departures.sort((a, b) => a - b);
  const nextDeparture = departures[0];
  const waitTime = nextDeparture - currentMinutes;

  return {
    departureTime: minutesToTimeString(nextDeparture),
    waitTimeMinutes: Math.max(1, waitTime),
    frequency: trainsData.averageFrequency?.peak || 15,
  };
};

// Get wait time for a specific mode
export const getActualWaitTime = (
  mode: 'metro' | 'train',
  stationName: string,
  lineName?: string
): NextDeparture => {
  if (mode === 'metro' && lineName) {
    return getNextMetroDeparture(stationName, lineName);
  } else if (mode === 'train') {
    // Try to find station code from name
    const station = trainsData.stations.find(
      s => s.name.toLowerCase() === stationName.toLowerCase()
    );
    if (station) {
      return getNextTrainDeparture(station.code);
    }
  }
  
  // Fallback to estimated wait time
  return {
    departureTime: minutesToTimeString(getCurrentMinutes() + 10),
    waitTimeMinutes: 10,
    frequency: 10,
  };
};

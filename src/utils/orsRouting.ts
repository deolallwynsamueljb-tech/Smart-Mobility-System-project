const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZmOTExYTdlZmUyNTQ0N2RhY2QxMTBkMjY1NmMxNmRjIiwiaCI6Im11cm11cjY0In0=';
const ORS_BASE_URL = 'https://api.openrouteservice.org';

interface ORSRouteResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "LineString";
      coordinates: number[][]; // [lon, lat] pairs
    };
    properties: {
      summary: {
        distance: number; // in meters
        duration: number; // in seconds
      };
    };
  }>;
}

interface RouteResult {
  coordinates: [number, number][]; // [lat, lon] format for Leaflet
  distance: number; // in kilometers
  duration: number; // in minutes
}

export const getWalkingRoute = async (
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<RouteResult> => {
  try {
    const url = `${ORS_BASE_URL}/v2/directions/foot-walking/geojson`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ORS_API_KEY,
      },
      body: JSON.stringify({
        coordinates: [
          [startLon, startLat],
          [endLon, endLat],
        ],
        radiuses: [5000, 5000], // Search within 5km radius for more flexibility
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ORS API error:', errorText);
      throw new Error(`Failed to fetch walking route: ${response.status}`);
    }

    const data: ORSRouteResponse = await response.json();
    
    if (!data.features || data.features.length === 0) {
      throw new Error('No route found');
    }
    
    const feature = data.features[0];

    return {
      // Convert ORS [lon, lat] to [lat, lon] for Leaflet
      coordinates: feature.geometry.coordinates.map(coord => [coord[1], coord[0]]),
      distance: feature.properties.summary.distance / 1000, // convert to km
      duration: Math.round(feature.properties.summary.duration / 60), // convert to minutes
    };
  } catch (error) {
    console.error('ORS routing error:', error);
    // Fallback to straight line estimation
    const distance = calculateStraightLineDistance(startLat, startLon, endLat, endLon);
    return {
      coordinates: [[startLat, startLon], [endLat, endLon]], // [lat, lon]
      distance,
      duration: Math.round((distance / 5) * 60), // Assume 5 km/h walking speed
    };
  }
};

// Haversine formula for fallback
const calculateStraightLineDistance = (
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
  return R * c;
};

export const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const response = await fetch(
      `${ORS_BASE_URL}/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address)}&boundary.country=IN`
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

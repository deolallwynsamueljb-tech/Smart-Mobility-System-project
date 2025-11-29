const ORS_API_KEY = "5b3ce3597851110001cf62488f911a7efe25447dacd110d2656c16dc";

export interface GeocodingResult {
  name: string;
  label: string;
  coordinates: [number, number]; // [lat, lon]
  type: string;
}

export const searchLocations = async (
  query: string,
  boundingBox?: [number, number, number, number] // [minLon, minLat, maxLon, maxLat]
): Promise<GeocodingResult[]> => {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    // Chennai bounding box - focusing on Chennai metropolitan area
    const chennaiBBox = boundingBox || [80.0, 12.8, 80.3, 13.3];
    
    const url = new URL("https://api.openrouteservice.org/geocode/search");
    url.searchParams.append("api_key", ORS_API_KEY);
    url.searchParams.append("text", query);
    url.searchParams.append("boundary.rect.min_lon", chennaiBBox[0].toString());
    url.searchParams.append("boundary.rect.min_lat", chennaiBBox[1].toString());
    url.searchParams.append("boundary.rect.max_lon", chennaiBBox[2].toString());
    url.searchParams.append("boundary.rect.max_lat", chennaiBBox[3].toString());
    url.searchParams.append("size", "8");
    url.searchParams.append("layers", "venue,address,street,locality");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.features.map((feature: any) => {
      const [lon, lat] = feature.geometry.coordinates as [number, number];
      return {
        name: feature.properties.name || feature.properties.locality || feature.properties.label,
        label: feature.properties.label,
        coordinates: [lat, lon] as [number, number], // store as [lat, lon]
        type: feature.properties.layer || "unknown",
      };
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
};

// Popular Chennai landmarks for quick suggestions (stored as [lat, lon])
export const popularLandmarks = [
  { name: "Chennai Central", coordinates: [13.0827, 80.2707] as [number, number], type: "station" },
  { name: "Chennai Airport", coordinates: [12.9941, 80.1709] as [number, number], type: "airport" },
  { name: "Marina Beach", coordinates: [13.0499, 80.2785] as [number, number], type: "landmark" },
  { name: "T Nagar", coordinates: [13.0418, 80.2337] as [number, number], type: "locality" },
  { name: "Anna Nagar", coordinates: [13.0878, 80.2089] as [number, number], type: "locality" },
  { name: "Velachery", coordinates: [12.9750, 80.2220] as [number, number], type: "locality" },
  { name: "Tambaram", coordinates: [12.9249, 80.1275] as [number, number], type: "locality" },
  { name: "Egmore", coordinates: [13.0732, 80.2609] as [number, number], type: "station" },
  { name: "Guindy", coordinates: [13.0067, 80.2206] as [number, number], type: "locality" },
  { name: "Adyar", coordinates: [13.0067, 80.2565] as [number, number], type: "locality" },
];

// Reverse geocoding - convert coordinates to address
export const reverseGeocode = async (
  lon: number,
  lat: number
): Promise<string> => {
  try {
    const url = new URL("https://api.openrouteservice.org/geocode/reverse");
    url.searchParams.append("api_key", ORS_API_KEY);
    url.searchParams.append("point.lon", lon.toString());
    url.searchParams.append("point.lat", lat.toString());
    url.searchParams.append("size", "1");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return feature.properties.label || feature.properties.name || `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    }
    
    return `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return `Current Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  }
};

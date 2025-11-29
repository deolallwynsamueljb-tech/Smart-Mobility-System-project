import { useState, useEffect } from 'react';

interface GeolocationPosition {
  lat: number;
  lon: number;
  accuracy: number;
  heading: number | null; // Direction of movement in degrees (0-360, null if stationary)
  speed: number | null; // Speed in m/s
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

export const useGeolocation = () => {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [retryCount, setRetryCount] = useState(0);

  // Check permission status
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermission(result.state as PermissionState);
        result.addEventListener('change', () => {
          setPermission(result.state as PermissionState);
        });
      }).catch(() => {
        setPermission('unknown');
      });
    }
  }, []);

  useEffect(() => {
    if (!isTracking) {
      setIsLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Try to get initial position with higher timeout
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log("✅ Initial GPS position acquired:", pos.coords.latitude, pos.coords.longitude);
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        });
        setError(null);
        setIsLoading(false);
        setRetryCount(0);
      },
      (err) => {
        console.error("❌ GPS error:", err.message);
        // Don't set loading to false yet, we'll start watching
        if (retryCount < 2) {
          console.log(`🔄 Retrying GPS acquisition (attempt ${retryCount + 1}/2)...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            setIsTracking(false);
            setTimeout(() => setIsTracking(true), 100);
          }, 1000);
        } else {
          setIsLoading(false);
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError('Location permission denied. Please enable location access in your browser settings.');
              setPermission('denied');
              break;
            case err.POSITION_UNAVAILABLE:
              setError('Location information unavailable. Please check your device settings and ensure GPS is enabled.');
              break;
            case err.TIMEOUT:
              setError('Location request timed out. Please ensure you have good GPS signal and try again.');
              break;
            default:
              setError('An unknown error occurred while getting your location.');
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );

    // Also start watching for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        console.log("📍 GPS position update:", pos.coords.latitude, pos.coords.longitude, "heading:", pos.coords.heading);
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        });
        setError(null);
        setIsLoading(false);
        setRetryCount(0);
      },
      (err) => {
        console.error("❌ GPS watch error:", err.message);
        // Only set error if we haven't already got a position
        if (!position) {
          setIsLoading(false);
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError('Location permission denied. Please enable location access in your browser settings.');
              setPermission('denied');
              break;
            case err.POSITION_UNAVAILABLE:
              setError('Location information unavailable. Please check your device settings and ensure GPS is enabled.');
              break;
            case err.TIMEOUT:
              setError('Location update timed out. Current position may not be accurate.');
              break;
            default:
              setError('An error occurred while tracking your location.');
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000, // Only allow 1 second old positions for better accuracy
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsLoading(false);
    };
  }, [isTracking]);

  return { position, error, isTracking, setIsTracking, isLoading, permission };
};

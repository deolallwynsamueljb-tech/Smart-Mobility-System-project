import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navigation, MapPin, Loader2, Crosshair } from "lucide-react";
import { searchLocations, popularLandmarks, GeocodingResult, reverseGeocode } from "@/utils/orsGeocoding";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";

interface RouteInputProps {
  onSearch: (origin: string, destination: string, originCoords?: [number, number], destCoords?: [number, number]) => void;
  isLoading?: boolean;
}

export const RouteInput = ({ onSearch, isLoading }: RouteInputProps) => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originCoords, setOriginCoords] = useState<[number, number] | undefined>();
  const [destCoords, setDestCoords] = useState<[number, number] | undefined>();
  const [originSuggestions, setOriginSuggestions] = useState<GeocodingResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<GeocodingResult[]>([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { position, error, isTracking, setIsTracking, isLoading: gpsLoading } = useGeolocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (originRef.current && !originRef.current.contains(event.target as Node)) {
        setShowOriginDropdown(false);
      }
      if (destRef.current && !destRef.current.contains(event.target as Node)) {
        setShowDestDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle GPS location received
  useEffect(() => {
    if (position && isGettingLocation) {
      console.log("📍 GPS Position received (lon, lat):", position.lon, position.lat);
      // Get readable address from coordinates using reverse geocoding
      reverseGeocode(position.lon, position.lat).then((address) => {
        console.log("📍 Reverse geocode result:", address);
        console.log("📍 Setting origin coords as [lat, lon]:", [position.lat, position.lon]);
        setOrigin(address);
        // Store as [lat, lon] for consistency
        setOriginCoords([position.lat, position.lon]);
        setIsGettingLocation(false);
        setIsTracking(false);
        toast({
          title: "Location Found",
          description: "Your current location has been set as origin",
        });
      }).catch((error) => {
        console.error("📍 Reverse geocode error:", error);
        toast({
          title: "Location Error",
          description: "Could not get address for your location",
          variant: "destructive",
        });
        setIsGettingLocation(false);
        setIsTracking(false);
      });
    }
  }, [position, isGettingLocation, setIsTracking, toast]);

  // Handle GPS errors
  useEffect(() => {
    if (error && isGettingLocation) {
      toast({
        title: "Location Error",
        description: error,
        variant: "destructive",
      });
      setIsGettingLocation(false);
      setIsTracking(false);
    }
  }, [error, isGettingLocation, setIsTracking, toast]);

  const handleOriginChange = (value: string) => {
    setOrigin(value);
    setShowOriginDropdown(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 2) {
      setOriginSuggestions(popularLandmarks.map(l => ({
        name: l.name,
        label: l.name,
        coordinates: l.coordinates,
        type: l.type
      })));
      return;
    }

    setIsSearchingOrigin(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchLocations(value);
      setOriginSuggestions(results.length > 0 ? results : popularLandmarks.map(l => ({
        name: l.name,
        label: l.name,
        coordinates: l.coordinates,
        type: l.type
      })));
      setIsSearchingOrigin(false);
    }, 300);
  };

  const handleDestChange = (value: string) => {
    setDestination(value);
    setShowDestDropdown(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 2) {
      setDestSuggestions(popularLandmarks.map(l => ({
        name: l.name,
        label: l.name,
        coordinates: l.coordinates,
        type: l.type
      })));
      return;
    }

    setIsSearchingDest(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchLocations(value);
      setDestSuggestions(results.length > 0 ? results : popularLandmarks.map(l => ({
        name: l.name,
        label: l.name,
        coordinates: l.coordinates,
        type: l.type
      })));
      setIsSearchingDest(false);
    }, 300);
  };

  const handleSearch = () => {
    if (origin && destination) {
      console.log("🔎 Search clicked - Origin:", origin, "Coords:", originCoords);
      console.log("🔎 Search clicked - Destination:", destination, "Coords:", destCoords);
      onSearch(origin, destination, originCoords, destCoords);
      setShowOriginDropdown(false);
      setShowDestDropdown(false);
    }
  };

  const handleQuickSelect = (location: string, coords: [number, number], isOrigin: boolean) => {
    if (isOrigin) {
      setOrigin(location);
      setOriginCoords(coords);
      setShowOriginDropdown(false);
    } else {
      setDestination(location);
      setDestCoords(coords);
      setShowDestDropdown(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setIsGettingLocation(true);
    setIsTracking(true);
    toast({
      title: "Getting Location",
      description: "Requesting GPS permission...",
    });
  };

  return (
    <Card className="p-6 backdrop-blur-sm bg-card/95 shadow-lg border-border/50">
      <div className="space-y-4">
        {/* Quick Access Landmarks */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Quick Access</label>
          <div className="flex flex-wrap gap-2">
            {popularLandmarks.slice(0, 6).map((landmark) => (
              <button
                key={landmark.name}
                onClick={() => {
                  if (!origin) {
                    handleQuickSelect(landmark.name, landmark.coordinates, true);
                  } else if (!destination) {
                    handleQuickSelect(landmark.name, landmark.coordinates, false);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium bg-muted hover:bg-accent hover:text-accent-foreground text-foreground rounded-full transition-colors border border-border"
              >
                {landmark.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 relative" ref={originRef}>
          <label className="text-sm font-medium text-foreground flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Origin
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation || gpsLoading}
              className="h-7 px-2 text-xs"
            >
              {isGettingLocation || gpsLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Getting...
                </>
              ) : (
                <>
                  <Crosshair className="w-3 h-3 mr-1" />
                  Use Current
                </>
              )}
            </Button>
          </label>
          <div className="relative">
            <Input
              placeholder="Search Chennai locations..."
              value={origin}
              onChange={(e) => handleOriginChange(e.target.value)}
              onFocus={() => {
                setShowOriginDropdown(true);
                if (originSuggestions.length === 0) {
                  setOriginSuggestions(popularLandmarks.map(l => ({
                    name: l.name,
                    label: l.name,
                    coordinates: l.coordinates,
                    type: l.type
                  })));
                }
              }}
              className="border-border/50 focus:border-primary pr-10"
            />
            {isSearchingOrigin && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {showOriginDropdown && originSuggestions.length > 0 && (
            <div className="absolute z-[100] w-full mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-auto backdrop-blur-sm">
              {originSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setOrigin(suggestion.name);
                    setOriginCoords(suggestion.coordinates);
                    setShowOriginDropdown(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-accent transition-colors",
                    "flex flex-col gap-1 border-b border-border/50 last:border-0"
                  )}
                >
                  <span className="font-medium text-foreground">{suggestion.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{suggestion.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="space-y-2 relative" ref={destRef}>
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Navigation className="w-4 h-4 text-secondary" />
            Destination
          </label>
          <div className="relative">
            <Input
              placeholder="Search Chennai locations..."
              value={destination}
              onChange={(e) => handleDestChange(e.target.value)}
              onFocus={() => {
                setShowDestDropdown(true);
                if (destSuggestions.length === 0) {
                  setDestSuggestions(popularLandmarks.map(l => ({
                    name: l.name,
                    label: l.name,
                    coordinates: l.coordinates,
                    type: l.type
                  })));
                }
              }}
              className="border-border/50 focus:border-secondary pr-10"
            />
            {isSearchingDest && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {showDestDropdown && destSuggestions.length > 0 && (
            <div className="absolute z-[100] w-full mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-auto backdrop-blur-sm">
              {destSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDestination(suggestion.name);
                    setDestCoords(suggestion.coordinates);
                    setShowDestDropdown(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-accent transition-colors",
                    "flex flex-col gap-1 border-b border-border/50 last:border-0"
                  )}
                >
                  <span className="font-medium text-foreground">{suggestion.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{suggestion.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleSearch}
          disabled={!origin || !destination || isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          size="lg"
        >
          {isLoading ? "Calculating..." : "Find Best Route"}
        </Button>
      </div>
    </Card>
  );
};

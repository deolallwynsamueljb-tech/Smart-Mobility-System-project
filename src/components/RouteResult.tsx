import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FareBreakdown } from "@/components/FareBreakdown";
import { useNavigate } from "react-router-dom";
import { Train, Bus, Navigation, Clock, TrendingUp, MapPin, Footprints, ArrowRight, Save } from "lucide-react";
import { calculateDistance } from "@/utils/routeCalculator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface RouteResultProps {
  route: RouteSegment[];
  totalDuration: number;
  totalDistance?: number;
  originCoords?: [number, number];
  destCoords?: [number, number];
  fare?: {
    breakdown: { mode: string; amount: number; description: string }[];
    total: number;
    currency: string;
  };
}

const getModeIcon = (mode: string) => {
  switch (mode) {
    case "metro":
      return <Train className="w-5 h-5" />;
    case "train":
      return <Train className="w-5 h-5" />;
    case "bus":
      return <Bus className="w-5 h-5" />;
    case "walk":
      return <Navigation className="w-5 h-5" />;
    default:
      return null;
  }
};

const getModeColor = (mode: string) => {
  switch (mode) {
    case "metro":
      return "bg-metro text-white";
    case "train":
      return "bg-train text-white";
    case "bus":
      return "bg-bus text-white";
    case "walk":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const RouteResult = ({ route, totalDuration, totalDistance, originCoords, destCoords, fare }: RouteResultProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleStartNavigation = () => {
    navigate('/track', {
      state: {
        routeData: {
          route,
          totalDuration,
          totalDistance,
          originCoords,
          destCoords,
          fare,
        },
      },
    });
  };

  const handleSaveTrip = async () => {
    try {
      setIsSaving(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save trips.",
          variant: "destructive",
        });
        return;
      }

      // Determine the primary transport type
      const primaryMode = route.reduce((acc, segment) => {
        if (segment.mode !== "walk") {
          return segment.mode;
        }
        return acc;
      }, route[0]?.mode || "walk");

      // Get current date and time
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Determine if it's a mixed mode trip
      const uniqueModes = new Set(route.filter(s => s.mode !== "walk").map(s => s.mode));
      const tripType = uniqueModes.size > 1 ? "mixed" : primaryMode;

      // Prepare booking data
      const bookingData = {
        user_id: user.id,
        origin: route[0]?.from || "Unknown",
        destination: route[route.length - 1]?.to || "Unknown",
        origin_coords: originCoords || null,
        destination_coords: destCoords || null,
        date: currentDate,
        time: currentTime,
        type: tripType, // Keep lowercase: metro, bus, train, or mixed
        duration: `${totalDuration} mins`,
        distance: totalDistance || null,
        fare: fare?.total || 0,
        status: "upcoming", // Changed from 'planned' to 'upcoming' to match DB constraint
        route_details: { route, fare },
      };

      console.log("Saving booking:", bookingData);

      // Save to bookings table
      const { data, error } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Booking saved successfully:", data);

      toast({
        title: "Trip Saved!",
        description: "Your trip has been saved to My Trips.",
      });
    } catch (error: any) {
      console.error("Error saving trip:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 backdrop-blur-sm bg-card/95 shadow-lg border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-foreground">Recommended Route</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-semibold text-foreground">{totalDuration} min</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            onClick={handleStartNavigation}
            className="gap-2"
            size="lg"
          >
            <MapPin className="w-5 h-5" />
            Navigate
          </Button>
          <Button
            onClick={handleSaveTrip}
            variant="outline"
            className="gap-2"
            size="lg"
            disabled={isSaving}
          >
            <Save className="w-5 h-5" />
            {isSaving ? "Saving..." : "Save Trip"}
          </Button>
        </div>

      <div className="space-y-4">
        {route.map((segment, index) => {
          // Calculate distance for this segment if coords are available
          const segmentDistance = segment.fromCoords && segment.toCoords
            ? calculateDistance(
                segment.fromCoords[0],
                segment.fromCoords[1],
                segment.toCoords[0],
                segment.toCoords[1]
              )
            : null;

          return (
            <div key={index}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${getModeColor(segment.mode)}`}>
                  {getModeIcon(segment.mode)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {segment.mode.toUpperCase()}
                    </Badge>
                    {segment.departureTime && (
                      <span className="text-xs text-muted-foreground">
                        Departs: {segment.departureTime}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {segment.from} → {segment.to}
                    </p>
                    
                    {/* Step-by-step directions for walk and bus */}
                    {(segment.mode === "walk" || segment.mode === "bus") && (
                      <div className="pl-3 border-l-2 border-muted space-y-1.5 mt-2">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <div>
                            {segment.mode === "walk" ? (
                              <>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Footprints className="w-3 h-3" />
                                  <span className="font-medium text-foreground">Walking Directions</span>
                                </div>
                                <p>Start from <span className="font-medium">{segment.from}</span></p>
                                {segmentDistance && (
                                  <p className="mt-0.5">Walk approximately <span className="font-medium text-foreground">{segmentDistance.toFixed(2)} km</span> ({segment.duration} min)</p>
                                )}
                                <p className="mt-0.5">Head towards <span className="font-medium">{segment.to}</span></p>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Bus className="w-3 h-3" />
                                  <span className="font-medium text-foreground">Bus Journey</span>
                                </div>
                                <p>Board bus at <span className="font-medium">{segment.from}</span></p>
                                {segment.waitTime && (
                                  <p className="mt-0.5">Wait time: <span className="font-medium text-foreground">{segment.waitTime} min</span></p>
                                )}
                                {segmentDistance && (
                                  <p className="mt-0.5">Distance: <span className="font-medium text-foreground">{segmentDistance.toFixed(2)} km</span></p>
                                )}
                                <p className="mt-0.5">Alight at <span className="font-medium">{segment.to}</span></p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{segment.duration} min</span>
                      {segmentDistance && (segment.mode === "metro" || segment.mode === "train") && (
                        <span>{segmentDistance.toFixed(1)} km</span>
                      )}
                      {segment.waitTime && (segment.mode === "metro" || segment.mode === "train") && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Wait: {segment.waitTime} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {index < route.length - 1 && <Separator className="my-3" />}
            </div>
          );
        })}
      </div>

        {totalDistance && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Distance</span>
              <span className="font-semibold text-foreground">{totalDistance.toFixed(1)} km</span>
            </div>
          </div>
        )}
      </Card>

      {/* Fare Breakdown */}
      {fare && (
        <FareBreakdown
          breakdown={fare.breakdown}
          total={fare.total}
          currency={fare.currency}
        />
      )}
    </div>
  );
};

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RouteInput } from "@/components/RouteInput";
import { RouteResult } from "@/components/RouteResult";
import { RouteAlternatives } from "@/components/RouteAlternatives";
import { calculateRouteAlternatives } from "@/utils/routeAlternativesCalculator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Train, Bus, Navigation, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Index = () => {
  const [routeAlternatives, setRouteAlternatives] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSearch = async (origin: string, destination: string, originCoords?: [number, number], destCoords?: [number, number]) => {
    setIsLoading(true);
    
    try {
      const alternatives = await calculateRouteAlternatives(origin, destination, originCoords, destCoords);
      setRouteAlternatives(alternatives);
      setShowAlternatives(true);
      setSelectedRoute(null);
      toast({
        title: "Routes Found!",
        description: `${alternatives.length} route option${alternatives.length > 1 ? 's' : ''} available`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not calculate routes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRoute = (route: any) => {
    setSelectedRoute(route);
    setShowAlternatives(false);
    toast({
      title: "Route Selected",
      description: `${route.type.charAt(0).toUpperCase() + route.type.slice(1).replace('-', ' ')} route confirmed`,
    });
  };

  const handleBackToAlternatives = () => {
    setShowAlternatives(true);
    setSelectedRoute(null);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
          {/* Header */}
          <header className="border-b border-border/50 backdrop-blur-sm bg-card/80 sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Chennai Transit Planner</h1>
                    <p className="text-sm text-muted-foreground">Smart Multi-Modal Route Planning</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Left Column - Input */}
          <div className="space-y-6">
            <RouteInput onSearch={handleSearch} isLoading={isLoading} />
            
            {/* Info Cards */}
            <div className="grid gap-4">
              <Card className="p-4 bg-gradient-to-br from-metro/10 to-metro/5 border-metro/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-metro/20">
                    <Train className="w-5 h-5 text-metro" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Metro Integration</h3>
                    <p className="text-sm text-muted-foreground">Blue & Green Line coverage</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-train/10 to-train/5 border-train/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-train/20">
                    <Train className="w-5 h-5 text-train" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Suburban Trains</h3>
                    <p className="text-sm text-muted-foreground">Real schedule integration</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-bus/10 to-bus/5 border-bus/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-bus/20">
                    <Bus className="w-5 h-5 text-bus" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">MTC Bus Network</h3>
                    <p className="text-sm text-muted-foreground">2000+ bus stops mapped</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Column - Results */}
          <div>
            {showAlternatives && routeAlternatives.length > 0 ? (
              <Card className="p-6 backdrop-blur-sm bg-card/95 border-border/50">
                <RouteAlternatives
                  alternatives={routeAlternatives}
                  onSelectRoute={handleSelectRoute}
                />
              </Card>
            ) : selectedRoute ? (
              <div className="space-y-4">
                {routeAlternatives.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToAlternatives}
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    View All Route Options
                  </Button>
                )}
                <RouteResult
                  route={selectedRoute.route}
                  totalDuration={selectedRoute.totalDuration}
                  totalDistance={selectedRoute.totalDistance}
                  originCoords={selectedRoute.originCoords}
                  destCoords={selectedRoute.destCoords}
                  fare={selectedRoute.fare}
                />
              </div>
            ) : (
              <Card className="p-12 text-center backdrop-blur-sm bg-card/95 border-border/50">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="p-4 rounded-full bg-muted">
                    <Navigation className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Ready to Plan Your Journey
                    </h3>
                    <p className="text-sm">
                      Enter your origin and destination to compare route options
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

          {/* Footer Info */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>Compare fastest, cheapest, and fewest-transfer routes • Data includes Chennai Metro, Suburban Trains & MTC Bus</p>
          </div>
        </main>
      </div>
    </SidebarInset>
  </SidebarProvider>
  );
};

export default Index;

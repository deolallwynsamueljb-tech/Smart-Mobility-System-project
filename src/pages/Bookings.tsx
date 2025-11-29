import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Calendar, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface Booking {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  type: string;
  duration: string;
  fare: number;
}

const Bookings = () => {
  const [session, setSession] = useState(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        loadBookings(session.user.id);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        loadBookings(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadBookings = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load your bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "metro":
        return "text-metro bg-metro/10 border-metro/20";
      case "bus":
        return "text-bus bg-bus/10 border-bus/20";
      case "train":
      case "suburban train":
        return "text-train bg-train/10 border-train/20";
      case "mixed":
        return "text-primary bg-primary/10 border-primary/20";
      default:
        return "text-muted-foreground bg-muted/10 border-muted/20";
    }
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
                    <History className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
                    <p className="text-sm text-muted-foreground">View your travel history</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading ? (
            <Card className="p-12 text-center backdrop-blur-sm bg-card/95 border-border/50">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm">Loading your trips...</p>
              </div>
            </Card>
          ) : bookings.length === 0 ? (
            <Card className="p-12 text-center backdrop-blur-sm bg-card/95 border-border/50">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted">
                  <History className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Bookings Yet
                  </h3>
                  <p className="text-sm mb-4">
                    Your travel history will appear here once you start planning routes
                  </p>
                  <Button onClick={() => navigate("/")}>
                    Plan Your First Route
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            bookings.map((booking) => (
              <Card key={booking.id} className="backdrop-blur-sm bg-card/95 border-border/50 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(booking.type)}`}>
                        {booking.type.charAt(0).toUpperCase() + booking.type.slice(1)}
                      </div>
                      <CardTitle className="text-lg">
                        {booking.origin} → {booking.destination}
                      </CardTitle>
                    </div>
                    <div className="text-xl font-bold text-primary">
                      ₹{booking.fare}
                    </div>
                  </div>
                  <CardDescription>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(booking.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{booking.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{booking.duration}</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  </SidebarInset>
</SidebarProvider>
  );
};

export default Bookings;

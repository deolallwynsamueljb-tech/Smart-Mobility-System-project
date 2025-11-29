import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag, Copy, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface Offer {
  id: string;
  title: string;
  description: string;
  code: string;
  discount: string;
  validUntil: string;
  type: "metro" | "bus" | "train" | "all";
}

const Offers = () => {
  const [session, setSession] = useState(null);
  const [offers, setOffers] = useState<Offer[]>([
    {
      id: "1",
      title: "Metro Monday",
      description: "Get 20% off on all metro rides every Monday",
      code: "METRO20",
      discount: "20% OFF",
      validUntil: "2025-12-31",
      type: "metro",
    },
    {
      id: "2",
      title: "First Ride Free",
      description: "Get your first bus ride free with Chennai Transit",
      code: "FIRST100",
      discount: "100% OFF",
      validUntil: "2025-12-15",
      type: "bus",
    },
    {
      id: "3",
      title: "Wallet Bonus",
      description: "Add ₹500 or more and get ₹50 cashback",
      code: "WALLET50",
      discount: "₹50 Cashback",
      validUntil: "2025-12-25",
      type: "all",
    },
  ]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code Copied!",
      description: `Promo code ${code} copied to clipboard`,
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "metro":
        return "bg-metro/10 text-metro border-metro/20";
      case "bus":
        return "bg-bus/10 text-bus border-bus/20";
      case "train":
        return "bg-train/10 text-train border-train/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
          <header className="border-b border-border/50 backdrop-blur-sm bg-card/80 sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Tag className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Offers & Promo</h1>
                    <p className="text-sm text-muted-foreground">Save more on your journeys</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-4">
              {offers.length === 0 ? (
                <Card className="p-12 text-center">
                  <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Active Offers</h3>
                  <p className="text-sm text-muted-foreground">
                    Check back soon for exciting deals and discounts!
                  </p>
                </Card>
              ) : (
                offers.map((offer) => (
                  <Card key={offer.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="flex">
                      <div className={`w-2 ${getTypeColor(offer.type).replace('bg-', 'bg-').split(' ')[0]}`} />
                      <div className="flex-1">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-xl">{offer.title}</CardTitle>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getTypeColor(offer.type)}`}>
                                  {offer.discount}
                                </span>
                              </div>
                              <CardDescription>{offer.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Clock className="w-4 h-4" />
                                Valid till {new Date(offer.validUntil).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="px-3 py-2 bg-muted rounded font-mono text-sm">
                                  {offer.code}
                                </code>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyCode(offer.code)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <Button>Apply Now</Button>
                          </div>
                        </CardContent>
                      </div>
                    </div>
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

export default Offers;

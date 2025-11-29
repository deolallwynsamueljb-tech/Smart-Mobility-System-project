import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Home, Briefcase, MapPin, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useSavedPlaces } from "@/hooks/useData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SavedPlaces = () => {
  const [session, setSession] = useState(null);
  const { places, loading, addPlace, deletePlace } = useSavedPlaces();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlace, setNewPlace] = useState({
    name: "",
    address: "",
    type: "favorite" as "home" | "work" | "favorite",
  });
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

  const getIcon = (type: string) => {
    switch (type) {
      case "home":
        return <Home className="w-5 h-5 text-blue-500" />;
      case "work":
        return <Briefcase className="w-5 h-5 text-orange-500" />;
      default:
        return <Star className="w-5 h-5 text-yellow-500" />;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlace(id);
      toast({
        title: "Place removed",
        description: "Saved place has been deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete place.",
        variant: "destructive",
      });
    }
  };

  const handleAddPlace = async () => {
    if (!newPlace.name || !newPlace.address) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addPlace({
        name: newPlace.name,
        address: newPlace.address,
        type: newPlace.type,
        coordinates: null,
      });
      toast({
        title: "Place added",
        description: "Saved place has been added successfully.",
      });
      setIsDialogOpen(false);
      setNewPlace({ name: "", address: "", type: "favorite" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add place.",
        variant: "destructive",
      });
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
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Saved Places</h1>
                    <p className="text-sm text-muted-foreground">Quick access to your favorite locations</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Place
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Saved Place</DialogTitle>
                    <DialogDescription>
                      Save a location for quick route planning
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Place Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Home, Office, Gym"
                        value={newPlace.name}
                        onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        placeholder="e.g., Anna Nagar, Chennai"
                        value={newPlace.address}
                        onChange={(e) => setNewPlace({ ...newPlace, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={newPlace.type}
                        onValueChange={(value: "home" | "work" | "favorite") =>
                          setNewPlace({ ...newPlace, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="home">Home</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="favorite">Favorite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddPlace}>Add Place</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {loading ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">Loading saved places...</p>
                </Card>
              ) : places.length === 0 ? (
                <Card className="p-12 text-center">
                  <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Saved Places</h3>
                  <p className="text-sm text-muted-foreground">
                    Save your frequent locations for quick route planning
                  </p>
                </Card>
              ) : (
                places.map((place) => (
                  <Card key={place.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getIcon(place.type)}
                          <div>
                            <CardTitle className="text-lg">{place.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {place.address}
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(place.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

export default SavedPlaces;

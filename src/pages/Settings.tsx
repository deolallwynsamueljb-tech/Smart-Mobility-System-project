import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Bell, Lock, Globe, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Settings = () => {
  const [session, setSession] = useState(null);
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: false,
    smsAlerts: true,
    locationTracking: true,
    autoRefresh: true,
  });
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
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

  const handleToggle = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved.",
    });
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
                    <SettingsIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground">Customize your experience</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Notifications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    <CardTitle>Notifications</CardTitle>
                  </div>
                  <CardDescription>Manage how you receive updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notifications" className="font-medium">
                        Push Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts about your trips
                      </p>
                    </div>
                    <Switch
                      id="notifications"
                      checked={settings.notifications}
                      onCheckedChange={() => handleToggle("notifications")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailUpdates" className="font-medium">
                        Email Updates
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get offers and updates via email
                      </p>
                    </div>
                    <Switch
                      id="emailUpdates"
                      checked={settings.emailUpdates}
                      onCheckedChange={() => handleToggle("emailUpdates")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="smsAlerts" className="font-medium">
                        SMS Alerts
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive trip reminders via SMS
                      </p>
                    </div>
                    <Switch
                      id="smsAlerts"
                      checked={settings.smsAlerts}
                      onCheckedChange={() => handleToggle("smsAlerts")}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Privacy */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    <CardTitle>Privacy & Security</CardTitle>
                  </div>
                  <CardDescription>Control your data and privacy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="locationTracking" className="font-medium">
                        Location Tracking
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow location for better route suggestions
                      </p>
                    </div>
                    <Switch
                      id="locationTracking"
                      checked={settings.locationTracking}
                      onCheckedChange={() => handleToggle("locationTracking")}
                    />
                  </div>
                  <Button variant="outline" className="w-full">
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>

              {/* Appearance */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-primary" />
                    <CardTitle>Appearance</CardTitle>
                  </div>
                  <CardDescription>Customize the look and feel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="darkMode" className="font-medium">
                        Dark Mode
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Switch to dark theme
                      </p>
                    </div>
                    <Switch
                      id="darkMode"
                      checked={theme === "dark"}
                      onCheckedChange={() => {
                        toggleTheme();
                        toast({
                          title: "Theme Updated",
                          description: `Switched to ${theme === "dark" ? "light" : "dark"} mode.`,
                        });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* General */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <CardTitle>General</CardTitle>
                  </div>
                  <CardDescription>App preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoRefresh" className="font-medium">
                        Auto Refresh Routes
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically update route information
                      </p>
                    </div>
                    <Switch
                      id="autoRefresh"
                      checked={settings.autoRefresh}
                      onCheckedChange={() => handleToggle("autoRefresh")}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Settings;

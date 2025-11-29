import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LiveLeafletMapView from '@/components/LiveLeafletMapView';
import { useGeolocation } from '@/hooks/useGeolocation';
import { calculateUpdatedETA, getCurrentSegment } from '@/utils/etaCalculator';
import { ArrowLeft, MapPin, Play, Pause, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TrackRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { position, error, isTracking, setIsTracking, isLoading, permission } = useGeolocation();
  
  const routeData = location.state?.routeData;
  const [remainingDuration, setRemainingDuration] = useState(routeData?.totalDuration || 0);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    if (!routeData) {
      toast({
        title: "No Route Found",
        description: "Please calculate a route first",
        variant: "destructive",
      });
      navigate('/');
    } else {
      // Automatically start tracking when page loads
      setIsTracking(true);
      toast({
        title: "GPS Tracking Started",
        description: "Tracking your location in real-time",
      });
    }
  }, [routeData, navigate, toast, setIsTracking]);

  useEffect(() => {
    if (position && routeData) {
      const { remainingDuration: newDuration, progressPercent: newProgress } = 
        calculateUpdatedETA(
          position.lat,
          position.lon,
          routeData.route,
          routeData.totalDuration
        );
      
      setRemainingDuration(newDuration);
      setProgressPercent(newProgress);
    }
  }, [position, routeData]);

  if (!routeData) {
    return null;
  }

  const currentSegment = getCurrentSegment(progressPercent, routeData.route);

  const toggleTracking = () => {
    if (!isTracking) {
      toast({
        title: "GPS Tracking Started",
        description: "Tracking your location in real-time",
      });
    }
    setIsTracking(!isTracking);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-card/80 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Live Route Tracking</h1>
                <p className="text-sm text-muted-foreground">Real-time navigation</p>
              </div>
            </div>
            <Button
              onClick={toggleTracking}
              variant={isTracking ? "destructive" : "default"}
              className="gap-2"
            >
              {isTracking ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop Tracking
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Tracking
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Loading State */}
        {isLoading && !position && (
          <Alert className="mb-6 bg-primary/10 border-primary/20">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <AlertTitle className="text-foreground">Acquiring GPS Signal</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Please wait while we locate your position. This may take a few seconds...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Location Error</AlertTitle>
            <AlertDescription>
              {error}
              {permission === 'denied' && (
                <div className="mt-2 text-sm">
                  <strong>How to fix:</strong>
                  <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>Click the location icon in your browser's address bar</li>
                    <li>Select "Allow" for location access</li>
                    <li>Refresh the page and try again</li>
                  </ol>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Position Display */}
        {position && (
          <Card className="p-4 mb-6 bg-card/95 border-border/50">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-4 text-sm flex-1">
                <div>
                  <span className="text-muted-foreground">Latitude:</span>
                  <span className="ml-2 font-mono text-foreground">{position.lat.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Longitude:</span>
                  <span className="ml-2 font-mono text-foreground">{position.lon.toFixed(6)}</span>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  position.accuracy <= 20 ? 'bg-green-500' : 
                  position.accuracy <= 50 ? 'bg-yellow-500' : 
                  position.accuracy <= 200 ? 'bg-orange-500' : 
                  'bg-red-500'
                } animate-pulse`} />
                <span className={`text-sm font-medium ${
                  position.accuracy <= 20 ? 'text-green-600 dark:text-green-400' : 
                  position.accuracy <= 50 ? 'text-yellow-600 dark:text-yellow-400' : 
                  position.accuracy <= 200 ? 'text-orange-600 dark:text-orange-400' : 
                  'text-red-600 dark:text-red-400'
                }`}>
                  ±{Math.round(position.accuracy)}m
                </span>
              </div>
            </div>
            {position.accuracy > 100 && (
              <Alert className="mt-3 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertTitle className="text-orange-800 dark:text-orange-300">Poor GPS Signal</AlertTitle>
                <AlertDescription className="text-orange-700 dark:text-orange-400 text-sm">
                  <p className="mb-2">GPS accuracy is low. For better tracking:</p>
                  <ul className="list-disc ml-4 space-y-1 text-xs">
                    <li>Move to an open area away from buildings</li>
                    <li>Ensure Location Services are enabled in device settings</li>
                    <li>Check that GPS/Location is set to "High Accuracy" mode</li>
                    <li>Wait a moment for GPS to stabilize</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </Card>
        )}

        {/* Live Map */}
        <div className="h-[600px] rounded-lg overflow-hidden shadow-lg">
          <LiveLeafletMapView
            route={routeData.route}
            currentPosition={position}
            remainingDuration={remainingDuration}
            progressPercent={progressPercent}
            currentSegment={currentSegment.segment}
          />
        </div>
      </main>
    </div>
  );
};

export default TrackRoute;

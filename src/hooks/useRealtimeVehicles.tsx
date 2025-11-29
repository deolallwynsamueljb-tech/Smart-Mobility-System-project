import { useEffect, useState, useCallback } from 'react';
import { realtimeService, Vehicle } from '@/utils/realtimeService';
import { useToast } from '@/hooks/use-toast';

export const useRealtimeVehicles = (enabled: boolean = true) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const connect = useCallback(async () => {
    if (!enabled || isConnected) return;

    setIsLoading(true);
    try {
      console.log('🚆 Attempting to connect to real-time vehicle service...');
      await realtimeService.connect();
      setIsConnected(true);
      
      console.log('✅ Connected to real-time vehicle service');
      toast({
        title: "Live Tracking Active",
        description: "Showing real-time vehicle positions",
      });
    } catch (error) {
      console.warn('⚠️ Real-time service unavailable:', error);
      // Silently fail - user doesn't need to know if backend isn't available
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isConnected, toast]);

  const disconnect = useCallback(() => {
    if (realtimeService.connected) {
      realtimeService.disconnect();
      setIsConnected(false);
      setVehicles([]);
      console.log('🔌 Disconnected from real-time vehicle service');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    connect();

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = realtimeService.subscribeToVehicles((updatedVehicles) => {
      console.log('🚆 Vehicle update received:', updatedVehicles.length, 'vehicles');
      setVehicles(updatedVehicles);
    });

    // Also fetch initial vehicle data
    realtimeService.getVehicles().then(initialVehicles => {
      if (initialVehicles.length > 0) {
        console.log('🚆 Initial vehicles loaded:', initialVehicles.length);
        setVehicles(initialVehicles);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isConnected]);

  return {
    vehicles,
    isConnected,
    isLoading,
    connect,
    disconnect,
  };
};

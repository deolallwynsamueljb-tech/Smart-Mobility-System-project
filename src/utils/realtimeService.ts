/**
 * Real-time WebSocket Service for Vehicle Tracking and Traffic Updates
 * Connects to Flask backend for live data streaming
 */

import { io, Socket } from 'socket.io-client';

const FLASK_API_URL = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000';

export interface Vehicle {
  id: string;
  type: 'metro' | 'train';
  route_id: string;
  line: string;
  stations: string[];
  position: [number, number];
  next_station: string;
  eta_minutes: number;
  status: 'moving' | 'stopped' | 'delayed' | 'completed';
  speed: number;
  last_update: string;
}

export interface TrafficData {
  location: { lat: number; lon: number };
  traffic_level: 'light' | 'moderate' | 'heavy';
  congestion_index: number;
  average_speed_kmh: number;
  timestamp: string;
  source: string;
}

export interface TrafficAlert {
  id: string;
  type: string;
  severity: string;
  location: { lat: number; lon: number };
  description: string;
  timestamp: string;
}

class RealtimeService {
  private socket: Socket | null = null;
  private vehicleCallbacks: Set<(vehicles: Vehicle[]) => void> = new Set();
  private trafficCallbacks: Set<(traffic: TrafficData) => void> = new Set();
  private isConnected = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      console.log('🔌 Connecting to real-time service:', FLASK_API_URL);

      this.socket = io(FLASK_API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ Real-time service connected');
        this.isConnected = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Real-time connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Real-time service disconnected');
        this.isConnected = false;
      });

      this.socket.on('connection_response', (data) => {
        console.log('📡 Connection confirmed:', data);
      });

      this.socket.on('vehicles_update', (data: { vehicles: Vehicle[]; timestamp: string }) => {
        console.log('🚆 Received vehicle update:', data.vehicles.length, 'vehicles');
        this.vehicleCallbacks.forEach(callback => callback(data.vehicles));
      });

      this.socket.on('traffic_update', (data: { traffic: TrafficData; timestamp: string }) => {
        console.log('🚦 Received traffic update:', data.traffic.traffic_level);
        this.trafficCallbacks.forEach(callback => callback(data.traffic));
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 Real-time service disconnected');
    }
  }

  subscribeToVehicles(callback: (vehicles: Vehicle[]) => void) {
    this.vehicleCallbacks.add(callback);
    
    if (this.socket?.connected) {
      this.socket.emit('subscribe_vehicles', { room: 'all_vehicles' });
      console.log('📡 Subscribed to vehicle updates');
    }

    // Return unsubscribe function
    return () => {
      this.vehicleCallbacks.delete(callback);
      if (this.socket?.connected) {
        this.socket.emit('unsubscribe_vehicles', { room: 'all_vehicles' });
      }
    };
  }

  subscribeToTraffic(lat: number, lon: number, callback: (traffic: TrafficData) => void) {
    this.trafficCallbacks.add(callback);
    
    if (this.socket?.connected) {
      this.socket.emit('subscribe_traffic', { lat, lon });
      console.log('📡 Subscribed to traffic updates');
    }

    // Return unsubscribe function
    return () => {
      this.trafficCallbacks.delete(callback);
    };
  }

  async getVehicles(): Promise<Vehicle[]> {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/vehicles`);
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      const data = await response.json();
      return data.vehicles || [];
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      return [];
    }
  }

  async getVehicle(vehicleId: string): Promise<Vehicle | null> {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/vehicles/${vehicleId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.vehicle;
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      return null;
    }
  }

  async getTrafficConditions(lat: number, lon: number, radiusKm: number = 5): Promise<TrafficData | null> {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/traffic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, radius_km: radiusKm }),
      });
      if (!response.ok) throw new Error('Failed to fetch traffic');
      const data = await response.json();
      return data.traffic;
    } catch (error) {
      console.error('Error fetching traffic:', error);
      return null;
    }
  }

  async getRouteTraffic(coordinates: [number, number][]): Promise<TrafficData[]> {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/traffic/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates }),
      });
      if (!response.ok) throw new Error('Failed to fetch route traffic');
      const data = await response.json();
      return data.traffic_points || [];
    } catch (error) {
      console.error('Error fetching route traffic:', error);
      return [];
    }
  }

  async getTrafficAlerts(lat: number, lon: number, radiusKm: number = 10): Promise<TrafficAlert[]> {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/traffic/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, radius_km: radiusKm }),
      });
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Error fetching traffic alerts:', error);
      return [];
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export const realtimeService = new RealtimeService();

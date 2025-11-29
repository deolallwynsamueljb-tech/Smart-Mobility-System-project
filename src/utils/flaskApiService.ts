// Flask Backend API Service
// Update FLASK_API_URL with your deployed Flask backend URL

const FLASK_API_URL = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000';

export interface RouteRequest {
  origin: { lat: number; lng: number; name?: string };
  destination: { lat: number; lng: number; name?: string };
  time?: string;
}

export interface RouteSegment {
  type: 'walk' | 'metro' | 'train' | 'bus';
  from: string;
  to: string;
  duration?: number;
  distance?: number;
  departure?: string;
  arrival?: string;
  wait_time?: number;
  train_no?: string;
  line?: string;
}

export interface Route {
  mode: string;
  segments: RouteSegment[];
  total_time: number;
  fare: number;
}

export interface RouteResponse {
  success: boolean;
  routes?: Route[];
  best_route?: Route;
  error?: string;
}

class FlaskApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = FLASK_API_URL;
  }

  async calculateRoute(request: RouteRequest): Promise<RouteResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error calculating route:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate route',
      };
    }
  }

  async getMetroInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/api/metro`);
      if (!response.ok) throw new Error('Failed to fetch metro info');
      return await response.json();
    } catch (error) {
      console.error('Error fetching metro info:', error);
      throw error;
    }
  }

  async getTrainsInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/api/trains`);
      if (!response.ok) throw new Error('Failed to fetch trains info');
      return await response.json();
    } catch (error) {
      console.error('Error fetching trains info:', error);
      throw error;
    }
  }

  async getBusStops() {
    try {
      const response = await fetch(`${this.baseUrl}/api/bus-stops`);
      if (!response.ok) throw new Error('Failed to fetch bus stops');
      return await response.json();
    } catch (error) {
      console.error('Error fetching bus stops:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const flaskApi = new FlaskApiService();

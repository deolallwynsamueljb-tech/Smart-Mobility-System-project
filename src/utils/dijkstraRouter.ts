import metroData from '@/data/metro.json';
import trainsData from '@/data/trains.json';
import { calculateDistance } from './routeCalculator';

interface StationNode {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'metro' | 'train';
  lines?: string[];
}

interface Edge {
  to: string;
  weight: number; // Travel time in minutes
  mode: 'metro' | 'train';
  line?: string;
}

interface PathSegment {
  from: StationNode;
  to: StationNode;
  mode: 'metro' | 'train';
  duration: number;
  line?: string;
}

class TransitGraph {
  private nodes: Map<string, StationNode> = new Map();
  private edges: Map<string, Edge[]> = new Map();

  constructor() {
    this.buildGraph();
  }

  private buildGraph() {
    // Add metro stations as nodes
    metroData.stations.forEach(station => {
      const nodeId = `metro_${station.name.toLowerCase().replace(/\s+/g, '_')}`;
      this.nodes.set(nodeId, {
        id: nodeId,
        name: station.name,
        lat: station.lat,
        lon: station.lon,
        type: 'metro',
        lines: station.lines,
      });
    });

    // Add train stations as nodes
    trainsData.stations.forEach(station => {
      const nodeId = `train_${station.code.toLowerCase()}`;
      this.nodes.set(nodeId, {
        id: nodeId,
        name: station.name,
        lat: station.lat,
        lon: station.lon,
        type: 'train',
      });
    });

    // Build metro edges (connect stations on same line)
    metroData.corridors.forEach(corridor => {
      const lineStations = metroData.stations
        .filter(s => s.lines.includes(corridor.id))
        .sort((a, b) => a.order[corridor.id] - b.order[corridor.id]);

      for (let i = 0; i < lineStations.length - 1; i++) {
        const from = lineStations[i];
        const to = lineStations[i + 1];
        const fromId = `metro_${from.name.toLowerCase().replace(/\s+/g, '_')}`;
        const toId = `metro_${to.name.toLowerCase().replace(/\s+/g, '_')}`;

        // Calculate travel time based on distance and average metro speed (30 km/h)
        const distance = calculateDistance(from.lat, from.lon, to.lat, to.lon);
        const travelTime = Math.max(2, Math.round((distance / 30) * 60)); // Min 2 minutes between stations

        // Add bidirectional edges
        this.addEdge(fromId, toId, travelTime, 'metro', corridor.name);
        this.addEdge(toId, fromId, travelTime, 'metro', corridor.name);
      }
    });

    // Build train edges (connect stations on same route)
    trainsData.routes.forEach(route => {
      for (let i = 0; i < route.stations.length - 1; i++) {
        const fromCode = route.stations[i].code;
        const toCode = route.stations[i + 1].code;
        const fromStation = trainsData.stations.find(s => s.code === fromCode);
        const toStation = trainsData.stations.find(s => s.code === toCode);

        if (fromStation && toStation) {
          const fromId = `train_${fromCode.toLowerCase()}`;
          const toId = `train_${toCode.toLowerCase()}`;

          // Calculate travel time based on distance and average train speed (40 km/h)
          const distance = calculateDistance(
            fromStation.lat,
            fromStation.lon,
            toStation.lat,
            toStation.lon
          );
          const travelTime = Math.max(3, Math.round((distance / 40) * 60)); // Min 3 minutes

          // Add bidirectional edges
          this.addEdge(fromId, toId, travelTime, 'train');
          this.addEdge(toId, fromId, travelTime, 'train');
        }
      }
    });

    // Add transfer edges between metro and train at nearby stations
    this.addTransferEdges();
  }

  private addTransferEdges() {
    const TRANSFER_DISTANCE_THRESHOLD = 0.5; // 500 meters
    const TRANSFER_TIME = 8; // 8 minutes for transfer

    this.nodes.forEach((metroNode, metroId) => {
      if (metroNode.type !== 'metro') return;

      this.nodes.forEach((trainNode, trainId) => {
        if (trainNode.type !== 'train') return;

        const distance = calculateDistance(
          metroNode.lat,
          metroNode.lon,
          trainNode.lat,
          trainNode.lon
        );

        if (distance <= TRANSFER_DISTANCE_THRESHOLD) {
          // Add bidirectional transfer edges
          this.addEdge(metroId, trainId, TRANSFER_TIME, 'metro');
          this.addEdge(trainId, metroId, TRANSFER_TIME, 'train');
        }
      });
    });

    // Add transfer edges between different metro lines at interchange stations
    metroData.stations.forEach(station => {
      if (station.lines.length > 1) {
        const nodeId = `metro_${station.name.toLowerCase().replace(/\s+/g, '_')}`;
        // Transfer time within same station (different lines) is 3 minutes
        this.addEdge(nodeId, nodeId, 3, 'metro');
      }
    });
  }

  private addEdge(from: string, to: string, weight: number, mode: 'metro' | 'train', line?: string) {
    if (!this.edges.has(from)) {
      this.edges.set(from, []);
    }
    this.edges.get(from)!.push({ to, weight, mode, line });
  }

  public findNearestStation(lat: number, lon: number, preferredType?: 'metro' | 'train'): StationNode | null {
    let nearest: StationNode | null = null;
    let minDistance = Infinity;

    // First pass: try to find preferred type within reasonable distance
    if (preferredType) {
      this.nodes.forEach(node => {
        if (node.type !== preferredType) return;
        const distance = calculateDistance(lat, lon, node.lat, node.lon);
        if (distance < minDistance && distance < 2) { // Within 2km
          minDistance = distance;
          nearest = node;
        }
      });
      
      if (nearest) return nearest;
    }

    // Second pass: find any nearby station, but prioritize metro/train over other options
    minDistance = Infinity;
    this.nodes.forEach(node => {
      const distance = calculateDistance(lat, lon, node.lat, node.lon);
      // Apply preference: metro/train stations get a bonus (reduce effective distance)
      const effectiveDistance = (node.type === 'metro' || node.type === 'train') 
        ? distance * 0.7  // 30% preference for metro/train
        : distance;
      
      if (effectiveDistance < minDistance) {
        minDistance = effectiveDistance;
        nearest = node;
      }
    });

    return nearest;
  }

  public dijkstra(
    startId: string, 
    endId: string, 
    costFunction?: (edge: Edge, prevMode?: 'metro' | 'train') => number
  ): PathSegment[] | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edge: Edge; prevMode?: 'metro' | 'train' } | null>();
    const unvisited = new Set<string>();

    // Default cost function: use time
    const getCost = costFunction || ((edge: Edge) => edge.weight);

    // Initialize
    this.nodes.forEach((_, nodeId) => {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    });
    distances.set(startId, 0);

    while (unvisited.size > 0) {
      // Find node with minimum distance
      let currentId: string | null = null;
      let minDist = Infinity;
      unvisited.forEach(nodeId => {
        const dist = distances.get(nodeId)!;
        if (dist < minDist) {
          minDist = dist;
          currentId = nodeId;
        }
      });

      if (currentId === null || minDist === Infinity) break;
      if (currentId === endId) break; // Reached destination

      unvisited.delete(currentId);

      const prevData = previous.get(currentId);
      const prevMode = prevData?.prevMode;

      // Check neighbors
      const neighbors = this.edges.get(currentId) || [];
      neighbors.forEach(edge => {
        if (!unvisited.has(edge.to)) return;

        const cost = getCost(edge, prevMode);
        const alt = distances.get(currentId)! + cost;
        if (alt < distances.get(edge.to)!) {
          distances.set(edge.to, alt);
          previous.set(edge.to, { nodeId: currentId, edge, prevMode: edge.mode });
        }
      });
    }

    // Reconstruct path
    if (!previous.get(endId)) return null;

    const path: PathSegment[] = [];
    let currentId: string | null = endId;

    while (currentId && currentId !== startId) {
      const prev = previous.get(currentId);
      if (!prev) break;

      const fromNode = this.nodes.get(prev.nodeId)!;
      const toNode = this.nodes.get(currentId)!;

      path.unshift({
        from: fromNode,
        to: toNode,
        mode: prev.edge.mode,
        duration: prev.edge.weight,
        line: prev.edge.line,
      });

      currentId = prev.nodeId;
    }

    return path.length > 0 ? path : null;
  }

  public getNode(id: string): StationNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): StationNode[] {
    return Array.from(this.nodes.values());
  }
}

// Singleton instance
let graphInstance: TransitGraph | null = null;

export const getTransitGraph = (): TransitGraph => {
  if (!graphInstance) {
    graphInstance = new TransitGraph();
  }
  return graphInstance;
};

export type { StationNode, PathSegment };

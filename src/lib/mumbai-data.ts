// Mumbai Ward Data - 24 Administrative Wards with simplified boundaries and flood metrics

export interface Ward {
  id: string;
  name: string;
  code: string;
  center: [number, number]; // [lng, lat]
  elevation: number;
  twi: number; // Topographic Wetness Index
  urbanArea: number; // sq m in millions
  population: number;
  severity: 0 | 1 | 2 | 3;
  rainfall3day: number;
  soilMoisture: number;
  landSurfaceTemp: number;
  wardType: 'coastal' | 'lowland' | 'midland' | 'highland';
  evacuationRoute: [number, number][];
  buildings: { coordinates: number[][]; height: number }[];
  // Simplified polygon boundary [lng, lat]
  boundary: [number, number][];
}

// Center of Mumbai
const MUM = [72.8777, 19.076];

export const mumbaiWards: Ward[] = [
  { id: 'A', name: 'A (Colaba / Fort)', code: 'A', center: [72.8275, 18.9209], elevation: 11.2, twi: 10.78, urbanArea: 8.4, population: 185000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'coastal', evacuationRoute: [[72.8275, 18.9209], [72.835, 18.925], [72.84, 18.93]], buildings: generateBuildings([72.825, 18.915], [72.835, 18.925], 40, 25), boundary: generateBoundary([72.825, 18.915], [72.835, 18.925]) },
  { id: 'B', name: 'B (Sandhurst Road)', code: 'B', center: [72.8398, 18.9569], elevation: 9.8, twi: 11.03, urbanArea: 4.8, population: 130000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'coastal', evacuationRoute: [[72.8398, 18.9569], [72.845, 18.96], [72.85, 18.965]], buildings: generateBuildings([72.835, 18.95], [72.845, 18.962], 35, 20), boundary: generateBoundary([72.835, 18.95], [72.845, 18.962]) },
  { id: 'C', name: 'C (Marine Lines)', code: 'C', center: [72.8272, 18.9511], elevation: 10.1, twi: 11.14, urbanArea: 4.2, population: 165000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'coastal', evacuationRoute: [[72.8272, 18.9511], [72.832, 18.955], [72.837, 18.96]], buildings: generateBuildings([72.822, 18.945], [72.832, 18.955], 35, 22), boundary: generateBoundary([72.822, 18.945], [72.832, 18.955]) },
  { id: 'D', name: 'D (Grant Road / Malabar Hill)', code: 'D', center: [72.8090, 18.9564], elevation: 18.4, twi: 10.42, urbanArea: 6.6, population: 345000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'coastal', evacuationRoute: [[72.809, 18.9564], [72.815, 18.96], [72.82, 18.965]], buildings: generateBuildings([72.805, 18.95], [72.815, 18.962], 45, 30), boundary: generateBoundary([72.805, 18.95], [72.815, 18.962]) },
  { id: 'E', name: 'E (Byculla)', code: 'E', center: [72.8426, 18.9734], elevation: 11.3, twi: 11.20, urbanArea: 7.4, population: 395000, severity: 2, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'midland', evacuationRoute: [[72.8426, 18.9734], [72.848, 18.978], [72.855, 18.982]], buildings: generateBuildings([72.838, 18.968], [72.848, 18.978], 30, 18), boundary: generateBoundary([72.838, 18.968], [72.848, 18.978]) },
  { id: 'F/S', name: 'F/S (Parel / Sewri)', code: 'F/S', center: [72.8540, 18.9986], elevation: 12.6, twi: 10.88, urbanArea: 14.1, population: 360000, severity: 2, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'midland', evacuationRoute: [[72.854, 18.9986], [72.86, 19.003], [72.865, 19.008]], buildings: generateBuildings([72.848, 18.992], [72.858, 19.004], 35, 20), boundary: generateBoundary([72.848, 18.992], [72.858, 19.004]) },
  { id: 'F/N', name: 'F/N (Matunga / Wadala)', code: 'F/N', center: [72.8706, 19.0318], elevation: 8.9, twi: 11.55, urbanArea: 13.2, population: 525000, severity: 3, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'coastal', evacuationRoute: [[72.8706, 19.0318], [72.876, 19.036], [72.882, 19.04]], buildings: generateBuildings([72.865, 19.025], [72.875, 19.036], 35, 22), boundary: generateBoundary([72.865, 19.025], [72.875, 19.036]) },
  { id: 'G/S', name: 'G/S (Worli / Lower Parel)', code: 'G/S', center: [72.8202, 19.0045], elevation: 8.2, twi: 11.41, urbanArea: 10.3, population: 380000, severity: 3, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'coastal', evacuationRoute: [[72.8202, 19.0045], [72.826, 19.01], [72.832, 19.015]], buildings: generateBuildings([72.815, 18.998], [72.825, 19.01], 50, 25), boundary: generateBoundary([72.815, 18.998], [72.825, 19.01]) },
  { id: 'G/N', name: 'G/N (Dadar / Dharavi)', code: 'G/N', center: [72.8456, 19.0328], elevation: 9.6, twi: 11.35, urbanArea: 9.1, population: 580000, severity: 2, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'midland', evacuationRoute: [[72.8456, 19.0328], [72.852, 19.038], [72.858, 19.042]], buildings: generateBuildings([72.84, 19.026], [72.85, 19.038], 28, 16), boundary: generateBoundary([72.84, 19.026], [72.85, 19.038]) },
  { id: 'H/W', name: 'H/W (Bandra West)', code: 'H/W', center: [72.8280, 19.0625], elevation: 10.5, twi: 10.65, urbanArea: 11.5, population: 310000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'coastal', evacuationRoute: [[72.828, 19.0625], [72.835, 19.068], [72.84, 19.072]], buildings: generateBuildings([72.822, 19.056], [72.832, 19.068], 38, 22), boundary: generateBoundary([72.822, 19.056], [72.832, 19.068]) },
  { id: 'H/E', name: 'H/E (Santacruz East / BKC)', code: 'H/E', center: [72.8596, 19.0783], elevation: 7.2, twi: 11.82, urbanArea: 13.5, population: 560000, severity: 3, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'lowland', evacuationRoute: [[72.8596, 19.0783], [72.866, 19.083], [72.872, 19.088]], buildings: generateBuildings([72.854, 19.072], [72.865, 19.084], 32, 18), boundary: generateBoundary([72.854, 19.072], [72.865, 19.084]) },
  { id: 'K/W', name: 'K/W (Andheri West)', code: 'K/W', center: [72.8198, 19.1268], elevation: 8.6, twi: 10.95, urbanArea: 23.4, population: 750000, severity: 2, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'coastal', evacuationRoute: [[72.8198, 19.1268], [72.826, 19.132], [72.832, 19.138]], buildings: generateBuildings([72.814, 19.12], [72.825, 19.132], 30, 16), boundary: generateBoundary([72.814, 19.12], [72.825, 19.132]) },
  { id: 'K/E', name: 'K/E (Andheri East)', code: 'K/E', center: [72.8661, 19.1016], elevation: 14.8, twi: 10.45, urbanArea: 16.5, population: 820000, severity: 2, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'midland', evacuationRoute: [[72.8661, 19.1016], [72.872, 19.106], [72.878, 19.11]], buildings: generateBuildings([72.86, 19.095], [72.871, 19.107], 28, 15), boundary: generateBoundary([72.86, 19.095], [72.871, 19.107]) },
  { id: 'L', name: 'L (Kurla)', code: 'L', center: [72.8859, 19.0880], elevation: 6.3, twi: 12.10, urbanArea: 15.9, population: 900000, severity: 3, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'lowland', evacuationRoute: [[72.8859, 19.088], [72.892, 19.093], [72.898, 19.098]], buildings: generateBuildings([72.88, 19.082], [72.891, 19.093], 24, 12), boundary: generateBoundary([72.88, 19.082], [72.891, 19.093]) },
  { id: 'M/W', name: 'M/W (Chembur West)', code: 'M/W', center: [72.8894, 19.0379], elevation: 11.5, twi: 10.72, urbanArea: 12.8, population: 410000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'midland', evacuationRoute: [[72.8894, 19.0379], [72.895, 19.042], [72.901, 19.046]], buildings: generateBuildings([72.884, 19.032], [72.894, 19.043], 26, 14), boundary: generateBoundary([72.884, 19.032], [72.894, 19.043]) },
  { id: 'M/E', name: 'M/E (Govandi / Mankhurd)', code: 'M/E', center: [72.9299, 19.0432], elevation: 7.8, twi: 11.95, urbanArea: 32.5, population: 810000, severity: 3, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'lowland', evacuationRoute: [[72.9299, 19.0432], [72.936, 19.048], [72.942, 19.052]], buildings: generateBuildings([72.924, 19.037], [72.935, 19.048], 22, 11), boundary: generateBoundary([72.924, 19.037], [72.935, 19.048]) },
  { id: 'N', name: 'N (Ghatkopar)', code: 'N', center: [72.9294, 19.0880], elevation: 15.7, twi: 10.15, urbanArea: 25.8, population: 620000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'midland', evacuationRoute: [[72.9294, 19.088], [72.935, 19.093], [72.941, 19.097]], buildings: generateBuildings([72.923, 19.082], [72.934, 19.093], 24, 12), boundary: generateBoundary([72.923, 19.082], [72.934, 19.093]) },
  { id: 'P/S', name: 'P/S (Goregaon)', code: 'P/S', center: [72.8576, 19.1559], elevation: 14.2, twi: 10.58, urbanArea: 24.3, population: 460000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'midland', evacuationRoute: [[72.8576, 19.1559], [72.864, 19.16], [72.87, 19.165]], buildings: generateBuildings([72.852, 19.15], [72.863, 19.161], 25, 13), boundary: generateBoundary([72.852, 19.15], [72.863, 19.161]) },
  { id: 'P/N', name: 'P/N (Malad)', code: 'P/N', center: [72.8327, 19.1882], elevation: 12.3, twi: 10.82, urbanArea: 19.1, population: 940000, severity: 2, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'coastal', evacuationRoute: [[72.8327, 19.1882], [72.839, 19.193], [72.845, 19.197]], buildings: generateBuildings([72.827, 19.182], [72.838, 19.193], 24, 12), boundary: generateBoundary([72.827, 19.182], [72.838, 19.193]) },
  { id: 'R/S', name: 'R/S (Kandivali)', code: 'R/S', center: [72.8562, 19.1998], elevation: 18.4, twi: 9.85, urbanArea: 17.8, population: 700000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'highland', evacuationRoute: [[72.8562, 19.1998], [72.862, 19.204], [72.868, 19.208]], buildings: generateBuildings([72.85, 19.194], [72.861, 19.205], 22, 11), boundary: generateBoundary([72.85, 19.194], [72.861, 19.205]) },
  { id: 'R/C', name: 'R/C (Borivali)', code: 'R/C', center: [72.8332, 19.2324], elevation: 22.1, twi: 9.72, urbanArea: 36.2, population: 570000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'highland', evacuationRoute: [[72.8332, 19.2324], [72.839, 19.237], [72.845, 19.241]], buildings: generateBuildings([72.828, 19.226], [72.838, 19.238], 20, 10), boundary: generateBoundary([72.828, 19.226], [72.838, 19.238]) },
  { id: 'R/N', name: 'R/N (Dahisar)', code: 'R/N', center: [72.8661, 19.2548], elevation: 16.5, twi: 9.94, urbanArea: 18.0, population: 430000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'highland', evacuationRoute: [[72.8661, 19.2548], [72.872, 19.259], [72.877, 19.263]], buildings: generateBuildings([72.861, 19.249], [72.871, 19.26], 18, 9), boundary: generateBoundary([72.861, 19.249], [72.871, 19.26]) },
  { id: 'S', name: 'S (Bhandup / Powai)', code: 'S', center: [72.9274, 19.1317], elevation: 28.5, twi: 9.60, urbanArea: 64.0, population: 740000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'midland', evacuationRoute: [[72.9274, 19.1317], [72.933, 19.136], [72.939, 19.14]], buildings: generateBuildings([72.922, 19.126], [72.932, 19.137], 24, 12), boundary: generateBoundary([72.922, 19.126], [72.932, 19.137]) },
  { id: 'T', name: 'T (Mulund)', code: 'T', center: [72.9442, 19.1639], elevation: 14.8, twi: 9.88, urbanArea: 45.4, population: 410000, severity: 1, rainfall3day: 186.4, soilMoisture: 0.41, landSurfaceTemp: 26.3, wardType: 'midland', evacuationRoute: [[72.9442, 19.1639], [72.95, 19.168], [72.956, 19.172]], buildings: generateBuildings([72.939, 19.158], [72.949, 19.169], 20, 10), boundary: generateBoundary([72.939, 19.158], [72.949, 19.169]) },
];

function generateBoundary(
  sw: [number, number],
  ne: [number, number]
): [number, number][] {
  const points: [number, number][] = [];
  const segments = 12;
  const lngRange = ne[0] - sw[0];
  const latRange = ne[1] - sw[1];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const wobble = Math.sin(t * Math.PI * 3) * 0.001;
    points.push([sw[0] + t * lngRange + wobble, sw[1]]);
  }
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wobble = Math.cos(t * Math.PI * 2) * 0.001;
    points.push([ne[0] + wobble, sw[1] + t * latRange]);
  }
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wobble = Math.sin(t * Math.PI * 4) * 0.0008;
    points.push([ne[0] - t * lngRange + wobble, ne[1]]);
  }
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const wobble = Math.cos(t * Math.PI * 2) * 0.001;
    points.push([sw[0] + wobble, ne[1] - t * latRange]);
  }
  return points;
}

function generateBuildings(
  sw: [number, number],
  ne: [number, number],
  maxHeight: number,
  minHeight: number
): { coordinates: number[][]; height: number }[] {
  const buildings: { coordinates: number[][]; height: number }[] = [];
  const count = 15 + Math.floor(Math.random() * 10);
  const lngRange = ne[0] - sw[0];
  const latRange = ne[1] - sw[1];

  for (let i = 0; i < count; i++) {
    const cx = sw[0] + Math.random() * lngRange;
    const cy = sw[1] + Math.random() * latRange;
    const w = 0.0003 + Math.random() * 0.0008;
    const h = 0.0003 + Math.random() * 0.0006;
    const height = minHeight + Math.random() * (maxHeight - minHeight);

    buildings.push({
      coordinates: [
        [cx - w, cy - h],
        [cx + w, cy - h],
        [cx + w, cy + h],
        [cx - w, cy + h],
        [cx - w, cy - h],
      ],
      height,
    });
  }
  return buildings;
}

// Time series data for the slider from climate service (June 01 to September 30, 2024)
import { getTimeSeriesForPeriod } from './climate-service';

export interface TimeSeriesPoint {
  day: number;
  date: string;
  rainfall_3day_sum: number;
  rainfall_daily?: number;
  soil_moisture: number;
  land_surface_temp: number;
}

export const timeSeriesData: TimeSeriesPoint[] = getTimeSeriesForPeriod(2024, 'monsoon');

// Pure monochrome high-contrast severity color mapping (shades of black, zinc, and white)
export const severityColors: Record<number, { fill: string; stroke: string; label: string; bg: string }> = {
  0: { fill: 'rgba(255, 255, 255, 0.05)', stroke: '#52525B', label: 'Nominal', bg: 'bg-white/[0.04] border-white/10 text-zinc-400' },
  1: { fill: 'rgba(255, 255, 255, 0.12)', stroke: '#71717A', label: 'Watch', bg: 'bg-white/[0.08] border-white/15 text-zinc-300' },
  2: { fill: 'rgba(255, 255, 255, 0.22)', stroke: '#A1A1AA', label: 'Elevated', bg: 'bg-white/[0.14] border-white/20 text-white' },
  3: { fill: 'rgba(255, 255, 255, 0.40)', stroke: '#FFFFFF', label: 'Critical', bg: 'bg-white text-black border-white font-bold' },
};

export const severityColorHex: Record<number, string> = {
  0: '#52525B',
  1: '#71717A',
  2: '#A1A1AA',
  3: '#FFFFFF',
};

// Generate GeoJSON for all ward boundaries
export function getWardGeoJSON() {
  return {
    type: 'FeatureCollection' as const,
    features: mumbaiWards.map((ward) => ({
      type: 'Feature' as const,
      properties: {
        id: ward.id,
        name: ward.name,
        code: ward.code,
        severity: ward.severity,
        elevation: ward.elevation,
        twi: ward.twi,
        wardType: ward.wardType,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [ward.boundary],
      },
    })),
  };
}

// Generate building GeoJSON for a specific ward
export function getBuildingGeoJSON(wardId: string) {
  const ward = mumbaiWards.find((w) => w.id === wardId);
  if (!ward) return null;
  return {
    type: 'FeatureCollection' as const,
    features: ward.buildings.map((b, i) => ({
      type: 'Feature' as const,
      properties: { height: b.height, id: i },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [b.coordinates],
      },
    })),
  };
}

// Generate evacuation route GeoJSON
export function getEvacuationRouteGeoJSON(wardId: string) {
  const ward = mumbaiWards.find((w) => w.id === wardId);
  if (!ward) return null;
  return {
    type: 'Feature' as const,
    properties: { wardId },
    geometry: {
      type: 'LineString' as const,
      coordinates: ward.evacuationRoute,
    },
  };
}

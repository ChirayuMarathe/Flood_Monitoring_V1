// Pune Ward Data - 15 Administrative Zones with simplified boundaries and flood metrics

import { Ward } from './mumbai-data';

const PUNE_CENTER = [73.8567, 18.5204];

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

export const puneWards: Ward[] = [
  {
    id: 'p1', name: 'Shivajinagar', code: 'SN', center: [73.8553, 18.5314],
    elevation: 560, twi: 6.2, urbanArea: 10.2, population: 185000,
    severity: 1, rainfall3day: 95, soilMoisture: 0.35, landSurfaceTemp: 29.8,
    wardType: 'midland',
    evacuationRoute: [[73.8553, 18.5314], [73.8580, 18.5340], [73.8620, 18.5360]],
    buildings: generateBuildings([73.852, 18.528], [73.859, 18.535], 40, 20),
    boundary: generateBoundary([73.852, 18.528], [73.859, 18.535]),
  },
  {
    id: 'p2', name: 'Kothrud', code: 'KT', center: [73.8073, 18.5074],
    elevation: 580, twi: 5.8, urbanArea: 14.5, population: 320000,
    severity: 0, rainfall3day: 78, soilMoisture: 0.30, landSurfaceTemp: 29.2,
    wardType: 'highland',
    evacuationRoute: [[73.8073, 18.5074], [73.8110, 18.5100], [73.8150, 18.5130]],
    buildings: generateBuildings([73.803, 18.504], [73.812, 18.511], 35, 15),
    boundary: generateBoundary([73.803, 18.504], [73.812, 18.511]),
  },
  {
    id: 'p3', name: 'Hadapsar', code: 'HD', center: [73.9260, 18.5018],
    elevation: 545, twi: 8.5, urbanArea: 18.2, population: 410000,
    severity: 3, rainfall3day: 220, soilMoisture: 0.62, landSurfaceTemp: 31.5,
    wardType: 'lowland',
    evacuationRoute: [[73.9260, 18.5018], [73.9300, 18.5050], [73.9340, 18.5080]],
    buildings: generateBuildings([73.922, 18.498], [73.930, 18.506], 30, 12),
    boundary: generateBoundary([73.922, 18.498], [73.930, 18.506]),
  },
  {
    id: 'p4', name: 'Hinjewadi', code: 'HJ', center: [73.7380, 18.5912],
    elevation: 610, twi: 5.2, urbanArea: 20.1, population: 280000,
    severity: 0, rainfall3day: 68, soilMoisture: 0.25, landSurfaceTemp: 28.5,
    wardType: 'highland',
    evacuationRoute: [[73.7380, 18.5912], [73.7420, 18.5940], [73.7460, 18.5960]],
    buildings: generateBuildings([73.734, 18.588], [73.742, 18.595], 45, 25),
    boundary: generateBoundary([73.734, 18.588], [73.742, 18.595]),
  },
  {
    id: 'p5', name: 'Baner', code: 'BN', center: [73.7870, 18.5596],
    elevation: 590, twi: 6.0, urbanArea: 12.8, population: 250000,
    severity: 1, rainfall3day: 105, soilMoisture: 0.38, landSurfaceTemp: 29.5,
    wardType: 'midland',
    evacuationRoute: [[73.7870, 18.5596], [73.7900, 18.5620], [73.7940, 18.5650]],
    buildings: generateBuildings([73.783, 18.556], [73.791, 18.563], 50, 30),
    boundary: generateBoundary([73.783, 18.556], [73.791, 18.563]),
  },
  {
    id: 'p6', name: 'Katraj', code: 'KJ', center: [73.8618, 18.4564],
    elevation: 570, twi: 7.8, urbanArea: 9.5, population: 175000,
    severity: 2, rainfall3day: 165, soilMoisture: 0.52, landSurfaceTemp: 30.8,
    wardType: 'lowland',
    evacuationRoute: [[73.8618, 18.4564], [73.8650, 18.4590], [73.8690, 18.4620]],
    buildings: generateBuildings([73.858, 18.453], [73.866, 18.460], 25, 10),
    boundary: generateBoundary([73.858, 18.453], [73.866, 18.460]),
  },
  {
    id: 'p7', name: 'Sinhagad Road', code: 'SR', center: [73.8150, 18.4770],
    elevation: 600, twi: 7.2, urbanArea: 11.0, population: 220000,
    severity: 2, rainfall3day: 175, soilMoisture: 0.48, landSurfaceTemp: 30.2,
    wardType: 'midland',
    evacuationRoute: [[73.8150, 18.4770], [73.8180, 18.4800], [73.8220, 18.4830]],
    buildings: generateBuildings([73.811, 18.474], [73.819, 18.481], 30, 14),
    boundary: generateBoundary([73.811, 18.474], [73.819, 18.481]),
  },
  {
    id: 'p8', name: 'Deccan Gymkhana', code: 'DG', center: [73.8415, 18.5180],
    elevation: 565, twi: 6.8, urbanArea: 7.5, population: 130000,
    severity: 1, rainfall3day: 110, soilMoisture: 0.40, landSurfaceTemp: 30.0,
    wardType: 'midland',
    evacuationRoute: [[73.8415, 18.5180], [73.8440, 18.5200], [73.8480, 18.5230]],
    buildings: generateBuildings([73.838, 18.515], [73.845, 18.521], 35, 18),
    boundary: generateBoundary([73.838, 18.515], [73.845, 18.521]),
  },
  {
    id: 'p9', name: 'Koregaon Park', code: 'KP', center: [73.8930, 18.5362],
    elevation: 555, twi: 7.5, urbanArea: 8.2, population: 145000,
    severity: 2, rainfall3day: 180, soilMoisture: 0.55, landSurfaceTemp: 30.5,
    wardType: 'lowland',
    evacuationRoute: [[73.8930, 18.5362], [73.8960, 18.5390], [73.9000, 18.5410]],
    buildings: generateBuildings([73.889, 18.533], [73.897, 18.540], 40, 22),
    boundary: generateBoundary([73.889, 18.533], [73.897, 18.540]),
  },
  {
    id: 'p10', name: 'Viman Nagar', code: 'VN', center: [73.9150, 18.5670],
    elevation: 558, twi: 6.5, urbanArea: 13.0, population: 260000,
    severity: 1, rainfall3day: 98, soilMoisture: 0.36, landSurfaceTemp: 29.8,
    wardType: 'midland',
    evacuationRoute: [[73.9150, 18.5670], [73.9180, 18.5700], [73.9210, 18.5720]],
    buildings: generateBuildings([73.911, 18.564], [73.919, 18.571], 38, 20),
    boundary: generateBoundary([73.911, 18.564], [73.919, 18.571]),
  },
  {
    id: 'p11', name: 'Pimpri-Chinchwad', code: 'PC', center: [73.7988, 18.6298],
    elevation: 575, twi: 6.0, urbanArea: 25.0, population: 520000,
    severity: 1, rainfall3day: 90, soilMoisture: 0.32, landSurfaceTemp: 29.0,
    wardType: 'midland',
    evacuationRoute: [[73.7988, 18.6298], [73.8020, 18.6320], [73.8060, 18.6350]],
    buildings: generateBuildings([73.795, 18.626], [73.803, 18.634], 35, 16),
    boundary: generateBoundary([73.795, 18.626], [73.803, 18.634]),
  },
  {
    id: 'p12', name: 'Wakad', code: 'WK', center: [73.7620, 18.5990],
    elevation: 605, twi: 5.5, urbanArea: 10.8, population: 195000,
    severity: 0, rainfall3day: 72, soilMoisture: 0.28, landSurfaceTemp: 28.8,
    wardType: 'highland',
    evacuationRoute: [[73.7620, 18.5990], [73.7650, 18.6020], [73.7690, 18.6040]],
    buildings: generateBuildings([73.758, 18.596], [73.766, 18.603], 42, 22),
    boundary: generateBoundary([73.758, 18.596], [73.766, 18.603]),
  },
  {
    id: 'p13', name: 'Mundhwa', code: 'MW', center: [73.9310, 18.5310],
    elevation: 548, twi: 8.8, urbanArea: 11.5, population: 200000,
    severity: 3, rainfall3day: 235, soilMoisture: 0.65, landSurfaceTemp: 31.8,
    wardType: 'lowland',
    evacuationRoute: [[73.9310, 18.5310], [73.9340, 18.5340], [73.9380, 18.5360]],
    buildings: generateBuildings([73.927, 18.528], [73.935, 18.535], 28, 12),
    boundary: generateBoundary([73.927, 18.528], [73.935, 18.535]),
  },
  {
    id: 'p14', name: 'Warje', code: 'WJ', center: [73.8020, 18.4860],
    elevation: 585, twi: 6.5, urbanArea: 9.0, population: 165000,
    severity: 1, rainfall3day: 100, soilMoisture: 0.37, landSurfaceTemp: 29.5,
    wardType: 'midland',
    evacuationRoute: [[73.8020, 18.4860], [73.8050, 18.4890], [73.8090, 18.4920]],
    buildings: generateBuildings([73.798, 18.483], [73.806, 18.490], 32, 15),
    boundary: generateBoundary([73.798, 18.483], [73.806, 18.490]),
  },
  {
    id: 'p15', name: 'Yerawada', code: 'YW', center: [73.8850, 18.5580],
    elevation: 555, twi: 7.0, urbanArea: 10.5, population: 210000,
    severity: 2, rainfall3day: 155, soilMoisture: 0.45, landSurfaceTemp: 30.3,
    wardType: 'lowland',
    evacuationRoute: [[73.8850, 18.5580], [73.8880, 18.5610], [73.8920, 18.5640]],
    buildings: generateBuildings([73.881, 18.555], [73.889, 18.562], 36, 18),
    boundary: generateBoundary([73.881, 18.555], [73.889, 18.562]),
  },
];

// Generate GeoJSON for all Pune ward boundaries
export function getPuneWardGeoJSON() {
  return {
    type: 'FeatureCollection' as const,
    features: puneWards.map((ward) => ({
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

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
    id: 'p1', name: 'Aundh', code: 'P01', center: [73.7950, 18.5511],
    elevation: 575, twi: 6.0, urbanArea: 16.2, population: 260000,
    severity: 1, rainfall3day: 105, soilMoisture: 0.38, landSurfaceTemp: 29.5,
    wardType: 'midland',
    evacuationRoute: [[73.7950, 18.5511], [73.7990, 18.5540], [73.8050, 18.5580]],
    buildings: generateBuildings([73.791, 18.547], [73.799, 18.555], 40, 20),
    boundary: generateBoundary([73.791, 18.547], [73.799, 18.555]),
  },
  {
    id: 'p2', name: 'Ghole Road', code: 'P02', center: [73.8404, 18.5293],
    elevation: 560, twi: 6.4, urbanArea: 10.5, population: 195000,
    severity: 1, rainfall3day: 110, soilMoisture: 0.40, landSurfaceTemp: 29.8,
    wardType: 'midland',
    evacuationRoute: [[73.8404, 18.5293], [73.8440, 18.5320], [73.8490, 18.5350]],
    buildings: generateBuildings([73.836, 18.525], [73.844, 18.533], 35, 18),
    boundary: generateBoundary([73.836, 18.525], [73.844, 18.533]),
  },
  {
    id: 'p3', name: 'Kothrud Karveroad', code: 'P03', center: [73.7952, 18.5092],
    elevation: 580, twi: 5.8, urbanArea: 15.0, population: 330000,
    severity: 0, rainfall3day: 80, soilMoisture: 0.30, landSurfaceTemp: 29.2,
    wardType: 'highland',
    evacuationRoute: [[73.7952, 18.5092], [73.7990, 18.5120], [73.8040, 18.5150]],
    buildings: generateBuildings([73.791, 18.505], [73.799, 18.513], 35, 15),
    boundary: generateBoundary([73.791, 18.505], [73.799, 18.513]),
  },
  {
    id: 'p4', name: 'Warje Karvenagar', code: 'P04', center: [73.8043, 18.4889],
    elevation: 585, twi: 6.5, urbanArea: 11.2, population: 180000,
    severity: 1, rainfall3day: 100, soilMoisture: 0.37, landSurfaceTemp: 29.5,
    wardType: 'midland',
    evacuationRoute: [[73.8043, 18.4889], [73.8080, 18.4920], [73.8120, 18.4950]],
    buildings: generateBuildings([73.800, 18.485], [73.808, 18.493], 32, 15),
    boundary: generateBoundary([73.800, 18.485], [73.808, 18.493]),
  },
  {
    id: 'p5', name: 'Dhole Patil Rd', code: 'P05', center: [73.9034, 18.5265],
    elevation: 555, twi: 7.2, urbanArea: 12.0, population: 170000,
    severity: 2, rainfall3day: 160, soilMoisture: 0.50, landSurfaceTemp: 30.5,
    wardType: 'lowland',
    evacuationRoute: [[73.9034, 18.5265], [73.9070, 18.5290], [73.9120, 18.5320]],
    buildings: generateBuildings([73.899, 18.522], [73.907, 18.530], 40, 22),
    boundary: generateBoundary([73.899, 18.522], [73.907, 18.530]),
  },
  {
    id: 'p6', name: 'Yerawda - Sangamwadi', code: 'P06', center: [73.8996, 18.5841],
    elevation: 555, twi: 7.0, urbanArea: 14.5, population: 240000,
    severity: 2, rainfall3day: 155, soilMoisture: 0.46, landSurfaceTemp: 30.3,
    wardType: 'lowland',
    evacuationRoute: [[73.8996, 18.5841], [73.9030, 18.5870], [73.9080, 18.5900]],
    buildings: generateBuildings([73.895, 18.580], [73.904, 18.588], 36, 18),
    boundary: generateBoundary([73.895, 18.580], [73.904, 18.588]),
  },
  {
    id: 'p7', name: 'Nagar Road', code: 'P07', center: [73.9207, 18.5568],
    elevation: 558, twi: 6.2, urbanArea: 18.0, population: 310000,
    severity: 1, rainfall3day: 95, soilMoisture: 0.35, landSurfaceTemp: 29.8,
    wardType: 'midland',
    evacuationRoute: [[73.9207, 18.5568], [73.9240, 18.5590], [73.9290, 18.5620]],
    buildings: generateBuildings([73.916, 18.552], [73.925, 18.561], 38, 20),
    boundary: generateBoundary([73.916, 18.552], [73.925, 18.561]),
  },
  {
    id: 'p8', name: 'Kasba - Vishrambaugwada', code: 'P08', center: [73.8533, 18.5114],
    elevation: 562, twi: 6.8, urbanArea: 6.5, population: 140000,
    severity: 2, rainfall3day: 135, soilMoisture: 0.44, landSurfaceTemp: 30.2,
    wardType: 'midland',
    evacuationRoute: [[73.8533, 18.5114], [73.8570, 18.5140], [73.8610, 18.5170]],
    buildings: generateBuildings([73.849, 18.508], [73.857, 18.515], 40, 20),
    boundary: generateBoundary([73.849, 18.508], [73.857, 18.515]),
  },
  {
    id: 'p9', name: 'Tilak Road', code: 'P09', center: [73.8241, 18.4728],
    elevation: 565, twi: 6.7, urbanArea: 8.0, population: 155000,
    severity: 2, rainfall3day: 140, soilMoisture: 0.45, landSurfaceTemp: 30.1,
    wardType: 'midland',
    evacuationRoute: [[73.8241, 18.4728], [73.8280, 18.4760], [73.8320, 18.4790]],
    buildings: generateBuildings([73.820, 18.469], [73.828, 18.476], 35, 18),
    boundary: generateBoundary([73.820, 18.469], [73.828, 18.476]),
  },
  {
    id: 'p10', name: 'Sahakarnagar', code: 'P10', center: [73.8543, 18.4896],
    elevation: 570, twi: 7.1, urbanArea: 9.8, population: 190000,
    severity: 2, rainfall3day: 150, soilMoisture: 0.48, landSurfaceTemp: 30.0,
    wardType: 'midland',
    evacuationRoute: [[73.8543, 18.4896], [73.8580, 18.4920], [73.8620, 18.4950]],
    buildings: generateBuildings([73.850, 18.486], [73.858, 18.493], 30, 14),
    boundary: generateBoundary([73.850, 18.486], [73.858, 18.493]),
  },
  {
    id: 'p11', name: 'Bibwewadi', code: 'P11', center: [73.8701, 18.4796],
    elevation: 568, twi: 6.0, urbanArea: 11.5, population: 210000,
    severity: 1, rainfall3day: 90, soilMoisture: 0.33, landSurfaceTemp: 29.4,
    wardType: 'midland',
    evacuationRoute: [[73.8701, 18.4796], [73.8740, 18.4820], [73.8790, 18.4850]],
    buildings: generateBuildings([73.866, 18.476], [73.874, 18.483], 35, 16),
    boundary: generateBoundary([73.866, 18.476], [73.874, 18.483]),
  },
  {
    id: 'p12', name: 'Bhavani Peth', code: 'P12', center: [73.8676, 18.5101],
    elevation: 560, twi: 6.5, urbanArea: 7.2, population: 160000,
    severity: 1, rainfall3day: 105, soilMoisture: 0.36, landSurfaceTemp: 29.7,
    wardType: 'midland',
    evacuationRoute: [[73.8676, 18.5101], [73.8710, 18.5130], [73.8750, 18.5160]],
    buildings: generateBuildings([73.864, 18.507], [73.871, 18.513], 36, 18),
    boundary: generateBoundary([73.864, 18.507], [73.871, 18.513]),
  },
  {
    id: 'p13', name: 'Hadapsar', code: 'P13', center: [73.9299, 18.4832],
    elevation: 545, twi: 8.5, urbanArea: 22.0, population: 430000,
    severity: 3, rainfall3day: 225, soilMoisture: 0.64, landSurfaceTemp: 31.5,
    wardType: 'lowland',
    evacuationRoute: [[73.9299, 18.4832], [73.9340, 18.4860], [73.9390, 18.4890]],
    buildings: generateBuildings([73.925, 18.479], [73.934, 18.487], 30, 12),
    boundary: generateBoundary([73.925, 18.479], [73.934, 18.487]),
  },
  {
    id: 'p14', name: 'Dhankawadi', code: 'P14', center: [73.8578, 18.4525],
    elevation: 572, twi: 7.8, urbanArea: 12.5, population: 220000,
    severity: 2, rainfall3day: 170, soilMoisture: 0.54, landSurfaceTemp: 30.8,
    wardType: 'lowland',
    evacuationRoute: [[73.8578, 18.4525], [73.8610, 18.4550], [73.8660, 18.4580]],
    buildings: generateBuildings([73.854, 18.449], [73.862, 18.456], 25, 10),
    boundary: generateBoundary([73.854, 18.449], [73.862, 18.456]),
  },
  {
    id: 'p15', name: 'Kondhwa Wanavdi', code: 'P15', center: [73.8964, 18.4788],
    elevation: 565, twi: 7.5, urbanArea: 15.0, population: 290000,
    severity: 2, rainfall3day: 175, soilMoisture: 0.52, landSurfaceTemp: 30.6,
    wardType: 'lowland',
    evacuationRoute: [[73.8964, 18.4788], [73.9000, 18.4810], [73.9040, 18.4840]],
    buildings: generateBuildings([73.892, 18.475], [73.900, 18.482], 30, 15),
    boundary: generateBoundary([73.892, 18.475], [73.900, 18.482]),
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

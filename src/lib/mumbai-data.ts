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
  {
    id: '1', name: 'A (Colaba)', code: 'A', center: [72.8312, 18.9167],
    elevation: 5.2, twi: 8.91, urbanArea: 8.4, population: 150000,
    severity: 1, rainfall3day: 120, soilMoisture: 0.42, landSurfaceTemp: 31.2,
    wardType: 'coastal',
    evacuationRoute: [[72.8312, 18.9167], [72.8350, 18.9200], [72.8400, 18.9250], [72.8450, 18.9300]],
    buildings: generateBuildings([72.829, 18.914], [72.834, 18.920], 35, 25),
    boundary: generateBoundary([72.829, 18.914], [72.834, 18.920]),
  },
  {
    id: '2', name: 'B (Churchgate)', code: 'B', center: [72.8281, 18.9372],
    elevation: 6.8, twi: 7.84, urbanArea: 12.1, population: 210000,
    severity: 1, rainfall3day: 115, soilMoisture: 0.38, landSurfaceTemp: 30.8,
    wardType: 'coastal',
    evacuationRoute: [[72.8281, 18.9372], [72.8320, 18.9400], [72.8380, 18.9430]],
    buildings: generateBuildings([72.825, 18.934], [72.832, 18.941], 45, 35),
    boundary: generateBoundary([72.825, 18.934], [72.832, 18.941]),
  },
  {
    id: '3', name: 'C (Marine Drive)', code: 'C', center: [72.8235, 18.9432],
    elevation: 4.1, twi: 9.45, urbanArea: 6.8, population: 95000,
    severity: 2, rainfall3day: 185, soilMoisture: 0.56, landSurfaceTemp: 30.5,
    wardType: 'coastal',
    evacuationRoute: [[72.8235, 18.9432], [72.8280, 18.9460], [72.8330, 18.9480]],
    buildings: generateBuildings([72.821, 18.941], [72.827, 18.946], 40, 30),
    boundary: generateBoundary([72.821, 18.941], [72.827, 18.946]),
  },
  {
    id: '4', name: 'D (Nariman Point)', code: 'D', center: [72.8198, 18.9268],
    elevation: 3.2, twi: 10.12, urbanArea: 5.2, population: 78000,
    severity: 2, rainfall3day: 195, soilMoisture: 0.61, landSurfaceTemp: 31.0,
    wardType: 'coastal',
    evacuationRoute: [[72.8198, 18.9268], [72.8240, 18.9300], [72.8280, 18.9340]],
    buildings: generateBuildings([72.817, 18.924], [72.823, 18.930], 50, 40),
    boundary: generateBoundary([72.817, 18.924], [72.823, 18.930]),
  },
  {
    id: '5', name: 'E (Byculla)', code: 'E', center: [72.8385, 18.9715],
    elevation: 11.3, twi: 7.21, urbanArea: 14.6, population: 285000,
    severity: 0, rainfall3day: 85, soilMoisture: 0.31, landSurfaceTemp: 32.1,
    wardType: 'midland',
    evacuationRoute: [[72.8385, 18.9715], [72.8420, 18.9750], [72.8470, 18.9780]],
    buildings: generateBuildings([72.835, 18.968], [72.843, 18.976], 30, 18),
    boundary: generateBoundary([72.835, 18.968], [72.843, 18.976]),
  },
  {
    id: '6', name: 'F/N (Worli)', code: 'F/N', center: [72.8156, 19.0173],
    elevation: 8.9, twi: 8.33, urbanArea: 16.3, population: 320000,
    severity: 1, rainfall3day: 140, soilMoisture: 0.45, landSurfaceTemp: 31.5,
    wardType: 'coastal',
    evacuationRoute: [[72.8156, 19.0173], [72.8200, 19.0200], [72.8260, 19.0220]],
    buildings: generateBuildings([72.812, 19.014], [72.820, 19.021], 35, 22),
    boundary: generateBoundary([72.812, 19.014], [72.820, 19.021]),
  },
  {
    id: '7', name: 'G/N (Dadar)', code: 'G/N', center: [72.8428, 19.0185],
    elevation: 14.6, twi: 6.88, urbanArea: 11.8, population: 245000,
    severity: 0, rainfall3day: 72, soilMoisture: 0.28, landSurfaceTemp: 32.4,
    wardType: 'midland',
    evacuationRoute: [[72.8428, 19.0185], [72.8470, 19.0220], [72.8520, 19.0250]],
    buildings: generateBuildings([72.840, 19.016], [72.847, 19.022], 28, 16),
    boundary: generateBoundary([72.840, 19.016], [72.847, 19.022]),
  },
  {
    id: '8', name: 'H/E (Mahim)', code: 'H/E', center: [72.8411, 19.0378],
    elevation: 7.2, twi: 8.76, urbanArea: 9.5, population: 185000,
    severity: 1, rainfall3day: 155, soilMoisture: 0.48, landSurfaceTemp: 31.8,
    wardType: 'coastal',
    evacuationRoute: [[72.8411, 19.0378], [72.8450, 19.0410], [72.8510, 19.0440]],
    buildings: generateBuildings([72.838, 19.035], [72.845, 19.041], 32, 20),
    boundary: generateBoundary([72.838, 19.035], [72.845, 19.041]),
  },
  {
    id: '9', name: 'H/W (Bandra)', code: 'H/W', center: [72.8353, 19.0594],
    elevation: 10.5, twi: 7.92, urbanArea: 18.7, population: 365000,
    severity: 1, rainfall3day: 130, soilMoisture: 0.41, landSurfaceTemp: 31.9,
    wardType: 'coastal',
    evacuationRoute: [[72.8353, 19.0594], [72.8390, 19.0630], [72.8440, 19.0660]],
    buildings: generateBuildings([72.832, 19.056], [72.840, 19.063], 38, 25),
    boundary: generateBoundary([72.832, 19.056], [72.840, 19.063]),
  },
  {
    id: '10', name: 'K/E (Kurla)', code: 'K/E', center: [72.8762, 19.0728],
    elevation: 6.3, twi: 9.15, urbanArea: 22.1, population: 410000,
    severity: 2, rainfall3day: 210, soilMoisture: 0.59, landSurfaceTemp: 32.6,
    wardType: 'lowland',
    evacuationRoute: [[72.8762, 19.0728], [72.8800, 19.0760], [72.8850, 19.0800]],
    buildings: generateBuildings([72.872, 19.069], [72.881, 19.077], 25, 14),
    boundary: generateBoundary([72.872, 19.069], [72.881, 19.077]),
  },
  {
    id: '11', name: 'K/W (Andheri)', code: 'K/W', center: [72.8313, 19.1197],
    elevation: 8.6, twi: 9.37, urbanArea: 22.1, population: 520000,
    severity: 3, rainfall3day: 280, soilMoisture: 0.72, landSurfaceTemp: 33.1,
    wardType: 'lowland',
    evacuationRoute: [[72.8313, 19.1197], [72.8350, 19.1230], [72.8400, 19.1270], [72.8460, 19.1300]],
    buildings: generateBuildings([72.827, 19.116], [72.836, 19.124], 22, 12),
    boundary: generateBoundary([72.827, 19.116], [72.836, 19.124]),
  },
  {
    id: '12', name: 'L (Kandivali)', code: 'L', center: [72.8462, 19.2013],
    elevation: 18.4, twi: 6.52, urbanArea: 15.3, population: 295000,
    severity: 0, rainfall3day: 68, soilMoisture: 0.25, landSurfaceTemp: 32.2,
    wardType: 'highland',
    evacuationRoute: [[72.8462, 19.2013], [72.8500, 19.2050], [72.8550, 19.2080]],
    buildings: generateBuildings([72.843, 19.198], [72.850, 19.205], 20, 10),
    boundary: generateBoundary([72.843, 19.198], [72.850, 19.205]),
  },
  {
    id: '13', name: 'M (Borivali)', code: 'M', center: [72.8565, 19.2307],
    elevation: 22.1, twi: 5.98, urbanArea: 19.8, population: 380000,
    severity: 0, rainfall3day: 55, soilMoisture: 0.22, landSurfaceTemp: 31.8,
    wardType: 'highland',
    evacuationRoute: [[72.8565, 19.2307], [72.8600, 19.2340], [72.8650, 19.2370]],
    buildings: generateBuildings([72.853, 19.228], [72.861, 19.234], 18, 8),
    boundary: generateBoundary([72.853, 19.228], [72.861, 19.234]),
  },
  {
    id: '14', name: 'N (Goregaon)', code: 'N', center: [72.8503, 19.1633],
    elevation: 15.7, twi: 6.89, urbanArea: 16.9, population: 310000,
    severity: 0, rainfall3day: 75, soilMoisture: 0.27, landSurfaceTemp: 32.0,
    wardType: 'midland',
    evacuationRoute: [[72.8503, 19.1633], [72.8540, 19.1670], [72.8590, 19.1700]],
    buildings: generateBuildings([72.847, 19.160], [72.854, 19.167], 22, 12),
    boundary: generateBoundary([72.847, 19.160], [72.854, 19.167]),
  },
  {
    id: '15', name: 'P/S (Malad)', code: 'P/S', center: [72.8421, 19.1793],
    elevation: 12.3, twi: 7.45, urbanArea: 17.2, population: 330000,
    severity: 0, rainfall3day: 82, soilMoisture: 0.30, landSurfaceTemp: 32.3,
    wardType: 'midland',
    evacuationRoute: [[72.8421, 19.1793], [72.8460, 19.1830], [72.8510, 19.1860]],
    buildings: generateBuildings([72.839, 19.176], [72.846, 19.183], 24, 13),
    boundary: generateBoundary([72.839, 19.176], [72.846, 19.183]),
  },
  {
    id: '16', name: 'R/C (Bhandup)', code: 'R/C', center: [72.9372, 19.1532],
    elevation: 9.8, twi: 8.14, urbanArea: 13.5, population: 260000,
    severity: 1, rainfall3day: 145, soilMoisture: 0.44, landSurfaceTemp: 32.5,
    wardType: 'lowland',
    evacuationRoute: [[72.9372, 19.1532], [72.9410, 19.1570], [72.9460, 19.1600]],
    buildings: generateBuildings([72.934, 19.150], [72.941, 19.157], 20, 11),
    boundary: generateBoundary([72.934, 19.150], [72.941, 19.157]),
  },
  {
    id: '17', name: 'R/N (Mulund)', code: 'R/N', center: [72.9483, 19.1785],
    elevation: 20.5, twi: 6.12, urbanArea: 14.1, population: 270000,
    severity: 0, rainfall3day: 62, soilMoisture: 0.24, landSurfaceTemp: 31.6,
    wardType: 'highland',
    evacuationRoute: [[72.9483, 19.1785], [72.9520, 19.1820], [72.9570, 19.1850]],
    buildings: generateBuildings([72.945, 19.176], [72.952, 19.182], 19, 9),
    boundary: generateBoundary([72.945, 19.176], [72.952, 19.182]),
  },
  {
    id: '18', name: 'S (BKC)', code: 'S', center: [72.8658, 19.0689],
    elevation: 12.1, twi: 7.08, urbanArea: 10.2, population: 180000,
    severity: 0, rainfall3day: 90, soilMoisture: 0.33, landSurfaceTemp: 32.8,
    wardType: 'midland',
    evacuationRoute: [[72.8658, 19.0689], [72.8700, 19.0720], [72.8750, 19.0750]],
    buildings: generateBuildings([72.863, 19.066], [72.870, 19.073], 55, 45),
    boundary: generateBoundary([72.863, 19.066], [72.870, 19.073]),
  },
  {
    id: '19', name: 'T (Vikhroli)', code: 'T', center: [72.9228, 19.0762],
    elevation: 8.1, twi: 8.62, urbanArea: 21.5, population: 390000,
    severity: 1, rainfall3day: 165, soilMoisture: 0.51, landSurfaceTemp: 32.3,
    wardType: 'lowland',
    evacuationRoute: [[72.9228, 19.0762], [72.9260, 19.0800], [72.9310, 19.0830]],
    buildings: generateBuildings([72.919, 19.073], [72.927, 19.080], 18, 9),
    boundary: generateBoundary([72.919, 19.073], [72.927, 19.080]),
  },
  {
    id: '20', name: 'N/W (Juhu)', code: 'N/W', center: [72.8268, 19.0982],
    elevation: 5.8, twi: 9.28, urbanArea: 11.5, population: 195000,
    severity: 2, rainfall3day: 220, soilMoisture: 0.63, landSurfaceTemp: 31.4,
    wardType: 'coastal',
    evacuationRoute: [[72.8268, 19.0982], [72.8310, 19.1020], [72.8360, 19.1050]],
    buildings: generateBuildings([72.823, 19.095], [72.831, 19.102], 30, 18),
    boundary: generateBoundary([72.823, 19.095], [72.831, 19.102]),
  },
  {
    id: '21', name: 'P/N (Vile Parle)', code: 'P/N', center: [72.8368, 19.1008],
    elevation: 11.9, twi: 7.34, urbanArea: 13.8, population: 255000,
    severity: 0, rainfall3day: 78, soilMoisture: 0.29, landSurfaceTemp: 32.1,
    wardType: 'midland',
    evacuationRoute: [[72.8368, 19.1008], [72.8410, 19.1040], [72.8460, 19.1070]],
    buildings: generateBuildings([72.833, 19.098], [72.841, 19.104], 28, 15),
    boundary: generateBoundary([72.833, 19.098], [72.841, 19.104]),
  },
  {
    id: '22', name: 'Dindoshi (Goregaon E)', code: 'DS', center: [72.8615, 19.1658],
    elevation: 16.2, twi: 6.75, urbanArea: 15.8, population: 300000,
    severity: 0, rainfall3day: 70, soilMoisture: 0.26, landSurfaceTemp: 32.0,
    wardType: 'midland',
    evacuationRoute: [[72.8615, 19.1658], [72.8650, 19.1690], [72.8700, 19.1720]],
    buildings: generateBuildings([72.858, 19.163], [72.866, 19.169], 21, 11),
    boundary: generateBoundary([72.858, 19.163], [72.866, 19.169]),
  },
  {
    id: '23', name: 'Shivadi', code: 'SH', center: [72.8468, 18.9532],
    elevation: 4.8, twi: 9.68, urbanArea: 10.8, population: 175000,
    severity: 2, rainfall3day: 200, soilMoisture: 0.58, landSurfaceTemp: 31.1,
    wardType: 'coastal',
    evacuationRoute: [[72.8468, 18.9532], [72.8510, 18.9570], [72.8560, 18.9600]],
    buildings: generateBuildings([72.844, 18.950], [72.851, 18.957], 35, 22),
    boundary: generateBoundary([72.844, 18.950], [72.851, 18.957]),
  },
  {
    id: '24', name: 'Chembur', code: 'CH', center: [72.8908, 19.0538],
    elevation: 13.5, twi: 7.15, urbanArea: 14.9, population: 285000,
    severity: 1, rainfall3day: 125, soilMoisture: 0.39, landSurfaceTemp: 32.2,
    wardType: 'midland',
    evacuationRoute: [[72.8908, 19.0538], [72.8950, 19.0570], [72.9000, 19.0600]],
    buildings: generateBuildings([72.887, 19.051], [72.895, 19.057], 26, 14),
    boundary: generateBoundary([72.887, 19.051], [72.895, 19.057]),
  },
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

// Time series data for the slider (simulating 30 days of monsoon)
export interface TimeSeriesPoint {
  day: number;
  date: string;
  rainfall_3day_sum: number;
  soil_moisture: number;
  land_surface_temp: number;
}

export const timeSeriesData: TimeSeriesPoint[] = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  date: `2024-07-${String(i + 1).padStart(2, '0')}`,
  rainfall_3day_sum: Math.round(50 + Math.sin(i * 0.4) * 80 + Math.random() * 60),
  soil_moisture: Math.round((0.2 + Math.sin(i * 0.3) * 0.25 + Math.random() * 0.1) * 100) / 100,
  land_surface_temp: Math.round((30 + Math.sin(i * 0.5) * 3 + Math.random() * 2) * 10) / 10,
}));

// Severity color mapping
export const severityColors: Record<number, { fill: string; stroke: string; label: string; bg: string }> = {
  0: { fill: 'rgba(34, 197, 94, 0.3)', stroke: '#22c55e', label: 'No Risk', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  1: { fill: 'rgba(234, 179, 8, 0.3)', stroke: '#eab308', label: 'Low', bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
  2: { fill: 'rgba(249, 115, 22, 0.35)', stroke: '#f97316', label: 'Moderate', bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
  3: { fill: 'rgba(239, 68, 68, 0.4)', stroke: '#ef4444', label: 'Critical', bg: 'bg-red-500/10 border-red-500/30 text-red-400' },
};

export const severityColorHex: Record<number, string> = {
  0: '#22c55e',
  1: '#eab308',
  2: '#f97316',
  3: '#ef4444',
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

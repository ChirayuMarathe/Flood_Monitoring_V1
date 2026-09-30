// Navi Mumbai Ward Data - Major Administrative Zones & Nodes with boundaries and flood metrics

import { Ward } from './mumbai-data';

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
  const count = 16 + Math.floor(Math.random() * 8);
  const lngRange = ne[0] - sw[0];
  const latRange = ne[1] - sw[1];

  for (let i = 0; i < count; i++) {
    const cx = sw[0] + Math.random() * lngRange;
    const cy = sw[1] + Math.random() * latRange;
    const w = 0.0003 + Math.random() * 0.0007;
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

export const naviMumbaiWards: Ward[] = [
  {
    id: 'nm1', name: 'Vashi', code: 'VSH', center: [72.9984, 19.0771],
    elevation: 4.2, twi: 9.8, urbanArea: 14.2, population: 260000,
    severity: 2, rainfall3day: 160, soilMoisture: 0.58, landSurfaceTemp: 30.5,
    wardType: 'coastal',
    evacuationRoute: [[72.9984, 19.0771], [73.0030, 19.0800], [73.0100, 19.0850]],
    buildings: generateBuildings([72.992, 19.071], [73.005, 19.083], 45, 18),
    boundary: generateBoundary([72.992, 19.071], [73.005, 19.083]),
  },
  {
    id: 'nm2', name: 'Nerul', code: 'NRL', center: [73.0169, 19.0330],
    elevation: 5.6, twi: 9.2, urbanArea: 18.5, population: 310000,
    severity: 2, rainfall3day: 145, soilMoisture: 0.52, landSurfaceTemp: 30.2,
    wardType: 'coastal',
    evacuationRoute: [[73.0169, 19.0330], [73.0220, 19.0370], [73.0290, 19.0410]],
    buildings: generateBuildings([73.010, 19.026], [73.024, 19.040], 50, 20),
    boundary: generateBoundary([73.010, 19.026], [73.024, 19.040]),
  },
  {
    id: 'nm3', name: 'CBD Belapur', code: 'BLP', center: [73.0380, 19.0180],
    elevation: 6.8, twi: 8.5, urbanArea: 16.0, population: 220000,
    severity: 1, rainfall3day: 130, soilMoisture: 0.46, landSurfaceTemp: 30.0,
    wardType: 'coastal',
    evacuationRoute: [[73.0380, 19.0180], [73.0430, 19.0220], [73.0500, 19.0260]],
    buildings: generateBuildings([73.032, 19.012], [73.045, 19.024], 60, 25),
    boundary: generateBoundary([73.032, 19.012], [73.045, 19.024]),
  },
  {
    id: 'nm4', name: 'Airoli', code: 'ARL', center: [72.9935, 19.1579],
    elevation: 4.8, twi: 9.5, urbanArea: 15.3, population: 240000,
    severity: 2, rainfall3day: 150, soilMoisture: 0.54, landSurfaceTemp: 30.1,
    wardType: 'coastal',
    evacuationRoute: [[72.9935, 19.1579], [72.9980, 19.1620], [73.0040, 19.1660]],
    buildings: generateBuildings([72.987, 19.151], [73.000, 19.165], 42, 16),
    boundary: generateBoundary([72.987, 19.151], [73.000, 19.165]),
  },
  {
    id: 'nm5', name: 'Kopar Khairane', code: 'KPK', center: [73.0084, 19.1033],
    elevation: 5.1, twi: 9.1, urbanArea: 12.8, population: 230000,
    severity: 2, rainfall3day: 140, soilMoisture: 0.50, landSurfaceTemp: 30.3,
    wardType: 'lowland',
    evacuationRoute: [[73.0084, 19.1033], [73.0130, 19.1070], [73.0190, 19.1110]],
    buildings: generateBuildings([73.002, 19.097], [73.015, 19.110], 40, 18),
    boundary: generateBoundary([73.002, 19.097], [73.015, 19.110]),
  },
  {
    id: 'nm6', name: 'Ghansoli', code: 'GNS', center: [73.0050, 19.1250],
    elevation: 5.4, twi: 8.9, urbanArea: 13.5, population: 210000,
    severity: 1, rainfall3day: 125, soilMoisture: 0.44, landSurfaceTemp: 29.9,
    wardType: 'lowland',
    evacuationRoute: [[73.0050, 19.1250], [73.0100, 19.1290], [73.0160, 19.1330]],
    buildings: generateBuildings([72.999, 19.119], [73.012, 19.131], 38, 16),
    boundary: generateBoundary([72.999, 19.119], [73.012, 19.131]),
  },
  {
    id: 'nm7', name: 'Sanpada', code: 'SPD', center: [73.0110, 19.0620],
    elevation: 6.2, twi: 8.6, urbanArea: 9.8, population: 170000,
    severity: 1, rainfall3day: 115, soilMoisture: 0.42, landSurfaceTemp: 30.0,
    wardType: 'lowland',
    evacuationRoute: [[73.0110, 19.0620], [73.0160, 19.0660], [73.0220, 19.0700]],
    buildings: generateBuildings([73.005, 19.056], [73.018, 19.068], 45, 20),
    boundary: generateBoundary([73.005, 19.056], [73.018, 19.068]),
  },
  {
    id: 'nm8', name: 'Turbhe', code: 'TRB', center: [73.0250, 19.0780],
    elevation: 8.5, twi: 7.8, urbanArea: 14.0, population: 190000,
    severity: 1, rainfall3day: 110, soilMoisture: 0.40, landSurfaceTemp: 30.6,
    wardType: 'midland',
    evacuationRoute: [[73.0250, 19.0780], [73.0300, 19.0820], [73.0360, 19.0860]],
    buildings: generateBuildings([73.019, 19.072], [73.032, 19.084], 32, 14),
    boundary: generateBoundary([73.019, 19.072], [73.032, 19.084]),
  },
  {
    id: 'nm9', name: 'Seawoods - Darave', code: 'SWD', center: [73.0190, 19.0120],
    elevation: 7.2, twi: 8.3, urbanArea: 11.2, population: 180000,
    severity: 1, rainfall3day: 120, soilMoisture: 0.43, landSurfaceTemp: 29.8,
    wardType: 'coastal',
    evacuationRoute: [[73.0190, 19.0120], [73.0240, 19.0160], [73.0300, 19.0200]],
    buildings: generateBuildings([73.013, 19.006], [73.026, 19.018], 52, 22),
    boundary: generateBoundary([73.013, 19.006], [73.026, 19.018]),
  },
  {
    id: 'nm10', name: 'Kharghar', code: 'KHG', center: [73.0680, 19.0430],
    elevation: 11.5, twi: 7.2, urbanArea: 22.0, population: 350000,
    severity: 0, rainfall3day: 95, soilMoisture: 0.36, landSurfaceTemp: 29.2,
    wardType: 'midland',
    evacuationRoute: [[73.0680, 19.0430], [73.0730, 19.0470], [73.0800, 19.0510]],
    buildings: generateBuildings([73.061, 19.036], [73.076, 19.050], 55, 24),
    boundary: generateBoundary([73.061, 19.036], [73.076, 19.050]),
  },
  {
    id: 'nm11', name: 'Ulwe', code: 'ULW', center: [73.0250, 18.9780],
    elevation: 3.5, twi: 10.2, urbanArea: 16.5, population: 195000,
    severity: 3, rainfall3day: 210, soilMoisture: 0.68, landSurfaceTemp: 31.0,
    wardType: 'coastal',
    evacuationRoute: [[73.0250, 18.9780], [73.0300, 18.9820], [73.0380, 18.9880]],
    buildings: generateBuildings([73.018, 18.971], [73.032, 18.985], 40, 18),
    boundary: generateBoundary([73.018, 18.971], [73.032, 18.985]),
  },
  {
    id: 'nm12', name: 'Digha', code: 'DGH', center: [72.9980, 19.1820],
    elevation: 7.8, twi: 8.0, urbanArea: 8.5, population: 140000,
    severity: 1, rainfall3day: 110, soilMoisture: 0.39, landSurfaceTemp: 29.7,
    wardType: 'midland',
    evacuationRoute: [[72.9980, 19.1820], [73.0030, 19.1860], [73.0090, 19.1900]],
    buildings: generateBuildings([72.992, 19.176], [73.005, 19.188], 30, 14),
    boundary: generateBoundary([72.992, 19.176], [73.005, 19.188]),
  },
  {
    id: 'nm13', name: 'Kamothe - Mansarovar', code: 'KMT', center: [73.0880, 19.0150],
    elevation: 6.5, twi: 8.7, urbanArea: 15.0, population: 260000,
    severity: 2, rainfall3day: 155, soilMoisture: 0.53, landSurfaceTemp: 30.1,
    wardType: 'lowland',
    evacuationRoute: [[73.0880, 19.0150], [73.0930, 19.0190], [73.0990, 19.0230]],
    buildings: generateBuildings([73.081, 19.009], [73.095, 19.021], 46, 20),
    boundary: generateBoundary([73.081, 19.009], [73.095, 19.021]),
  },
  {
    id: 'nm14', name: 'Panvel Old City', code: 'PNV', center: [73.1120, 18.9910],
    elevation: 8.0, twi: 8.4, urbanArea: 19.5, population: 380000,
    severity: 2, rainfall3day: 165, soilMoisture: 0.55, landSurfaceTemp: 30.4,
    wardType: 'lowland',
    evacuationRoute: [[73.1120, 18.9910], [73.1170, 18.9950], [73.1230, 18.9990]],
    buildings: generateBuildings([73.105, 18.984], [73.119, 18.998], 38, 16),
    boundary: generateBoundary([73.105, 18.984], [73.119, 18.998]),
  },
  {
    id: 'nm15', name: 'Taloja Industrial Belt', code: 'TLJ', center: [73.1080, 19.0680],
    elevation: 12.0, twi: 6.9, urbanArea: 24.0, population: 190000,
    severity: 0, rainfall3day: 85, soilMoisture: 0.32, landSurfaceTemp: 29.5,
    wardType: 'midland',
    evacuationRoute: [[73.1080, 19.0680], [73.1130, 19.0720], [73.1200, 19.0760]],
    buildings: generateBuildings([73.101, 19.061], [73.115, 19.075], 28, 12),
    boundary: generateBoundary([73.101, 19.061], [73.115, 19.075]),
  },
];

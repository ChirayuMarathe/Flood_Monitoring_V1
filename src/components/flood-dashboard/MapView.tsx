'use client';

import { useEffect, useRef } from 'react';
import { Map, NavigationControl, ScaleControl } from 'maplibre-gl';
import { Deck } from '@deck.gl/core';
import { GeoJsonLayer, PolygonLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import { useFloodStore } from '@/store/flood-store';
import { mumbaiWards, getWardGeoJSON } from '@/lib/mumbai-data';

import 'maplibre-gl/dist/maplibre-gl.css';

const MUMBAI_CENTER: [number, number] = [72.8777, 19.076];
const MUMBAI_BOUNDS: [[number, number], [number, number]] = [
  [72.75, 18.85],
  [73.0, 19.30],
];

function getWardFill(severity: number): [number, number, number, number] {
  switch (severity) {
    case 0: return [16, 185, 129, 25];
    case 1: return [245, 158, 11, 35];
    case 2: return [245, 158, 11, 55];
    case 3: return [239, 68, 68, 70];
    default: return [16, 185, 129, 25];
  }
}

function getWaterColor(severity: number): [number, number, number, number] {
  switch (severity) {
    case 1: return [245, 158, 11, 30];
    case 2: return [239, 120, 40, 50];
    case 3: return [239, 68, 68, 70];
    default: return [245, 158, 11, 30];
  }
}

function getWaterHeight(severity: number): number {
  return severity === 3 ? 600 : severity === 2 ? 350 : severity === 1 ? 120 : 0;
}

function buildLayers(
  wardSeverities: Record<string, number>,
  selectedWardId: string | null,
  setSelectedWard: (id: string | null) => void
) {
  const geojson = getWardGeoJSON();
  const layers: any[] = [];

  // Ward boundary fills — subtle, understated
  layers.push(
    new GeoJsonLayer({
      id: 'ward-boundaries-fill',
      data: geojson,
      filled: true,
      getFillColor: (f: any) => {
        const sev = wardSeverities[f.properties.id] ?? f.properties.severity ?? 0;
        return getWardFill(sev);
      },
      getLineColor: [255, 255, 255, 15],
      getLineWidth: 1,
      pickable: true,
      onClick: (info) => {
        if (info.object?.properties?.id) {
          setSelectedWard(String(info.object.properties.id));
        }
      },
      autoHighlight: true,
      highlightColor: [255, 255, 255, 25],
    })
  );

  // Ward boundary lines
  layers.push(
    new GeoJsonLayer({
      id: 'ward-boundaries-line',
      data: geojson,
      stroked: true,
      filled: false,
      getLineColor: (f: any) => {
        if (String(f.properties.id) === selectedWardId) return [245, 158, 11, 180];
        return [255, 255, 255, 12];
      },
      getLineWidth: (f: any) => (String(f.properties.id) === selectedWardId ? 2 : 0.5),
    })
  );

  // Water flood overlay — amber/red volumetric
  const floodWards = mumbaiWards.filter((w) => {
    const sev = wardSeverities[w.id] ?? w.severity;
    return sev >= 1;
  });

  if (floodWards.length > 0) {
    const waterFeatures = floodWards.map((w) => {
      const sev = wardSeverities[w.id] ?? w.severity;
      return {
        type: 'Feature',
        properties: { severity: sev, wardId: w.id },
        geometry: { type: 'Polygon', coordinates: [w.boundary] },
      };
    });

    layers.push(
      new GeoJsonLayer({
        id: 'water-overlay',
        data: { type: 'FeatureCollection', features: waterFeatures },
        filled: true,
        extruded: true,
        getFillColor: (f: any) => getWaterColor(f.properties.severity),
        getElevation: (f: any) => getWaterHeight(f.properties.severity),
        getLineColor: (f: any) => {
          const s = f.properties.severity;
          if (s === 3) return [239, 68, 68, 50];
          if (s === 2) return [245, 158, 11, 40];
          return [245, 158, 11, 25];
        },
        getLineWidth: 1,
      })
    );
  }

  // Buildings for selected ward — dark charcoal with subtle edge lighting
  if (selectedWardId) {
    const ward = mumbaiWards.find((w) => w.id === selectedWardId);
    if (ward) {
      layers.push(
        new PolygonLayer({
          id: 'buildings',
          data: ward.buildings.map((b) => ({ polygon: b.coordinates, height: b.height })),
          extruded: true,
          getPolygon: (d: any) => d.polygon,
          getElevation: (d: any) => d.height,
          getFillColor: [30, 33, 40, 220],
          getLineColor: [60, 65, 75, 120],
          getLineWidth: 0.8,
          pickable: true,
        })
      );

      // Evacuation route — amber neon
      if (ward.evacuationRoute.length > 1) {
        layers.push(
          new PathLayer({
            id: 'evacuation-route',
            data: [{ path: ward.evacuationRoute }],
            getPath: (d: any) => d.path,
            getColor: [245, 158, 11, 200],
            getWidth: 3,
            widthMinPixels: 2,
          })
        );

        layers.push(
          new ScatterplotLayer({
            id: 'evacuation-waypoints',
            data: ward.evacuationRoute.map((c) => ({ position: c })),
            getPosition: (d: any) => d.position,
            getRadius: 4,
            getFillColor: [245, 158, 11, 230],
          })
        );
      }

      // Ward center pin — amber glow
      layers.push(
        new ScatterplotLayer({
          id: 'ward-center',
          data: [{ position: ward.center }],
          getPosition: (d: any) => d.position,
          getRadius: 7,
          getFillColor: [245, 158, 11, 230],
        })
      );
    }
  }

  return layers;
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const deckRef = useRef<Deck | null>(null);
  const initRef = useRef(false);

  const wardSeverities = useFloodStore((s) => s.wardSeverities);
  const selectedWardId = useFloodStore((s) => s.selectedWardId);
  const setSelectedWard = useFloodStore((s) => s.setSelectedWard);
  const updateSeverities = useFloodStore((s) => s.updateSeverities);

  // Update deck layers when data changes
  useEffect(() => {
    if (!deckRef.current || !mapRef.current) return;
    const layers = buildLayers(wardSeverities, selectedWardId, setSelectedWard);
    deckRef.current.setProps({ layers });
  }, [wardSeverities, selectedWardId, setSelectedWard]);

  // Initialize map (once)
  useEffect(() => {
    if (initRef.current || !mapContainer.current) return;
    initRef.current = true;

    const map = new Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'Mumbai Flood Dark',
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
          },
        },
        layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 22 }],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: MUMBAI_CENTER,
      zoom: 11,
      pitch: 45,
      bearing: -10,
      antialias: true,
      maxBounds: MUMBAI_BOUNDS,
    });

    map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    mapRef.current = map;

    // Wait for map to load, then initialize deck.gl with shared GL context
    map.on('load', () => {
      const mapCanvas = map.getCanvas() as HTMLCanvasElement;
      const layers = buildLayers(
        useFloodStore.getState().wardSeverities,
        useFloodStore.getState().selectedWardId,
        useFloodStore.getState().setSelectedWard
      );
      deckRef.current = new Deck({
        canvas: mapCanvas,
        initialViewState: {
          longitude: MUMBAI_CENTER[0],
          latitude: MUMBAI_CENTER[1],
          zoom: 11,
          pitch: 45,
          bearing: -10,
        },
        controller: false,
        layers,
      });

      // Sync deck view with map after every frame
      const syncView = () => {
        if (!mapRef.current || !deckRef.current) return;
        const { lng, lat } = mapRef.current.getCenter();
        deckRef.current.setProps({
          viewState: {
            longitude: lng,
            latitude: lat,
            zoom: mapRef.current.getZoom(),
            pitch: mapRef.current.getPitch(),
            bearing: mapRef.current.getBearing(),
          },
        });
      };

      mapRef.current.on('move', syncView);
      mapRef.current.on('zoom', syncView);
      mapRef.current.on('rotate', syncView);
      mapRef.current.on('pitch', syncView);
      mapRef.current.on('render', syncView);
    });

    updateSeverities();

    return () => {
      deckRef.current?.finalize();
      map.remove();
    };
  }, []);

  // Fly to ward on selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedWardId) return;
    const ward = mumbaiWards.find((w) => w.id === selectedWardId);
    if (!ward) return;
    map.flyTo({
      center: ward.center as [number, number],
      zoom: 14,
      pitch: 50,
      duration: 1500,
      essential: true,
    });
  }, [selectedWardId]);

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
}

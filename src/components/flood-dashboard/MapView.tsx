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
    case 0: return [34, 197, 94, 40];
    case 1: return [234, 179, 8, 50];
    case 2: return [249, 115, 22, 60];
    case 3: return [239, 68, 68, 80];
    default: return [34, 197, 94, 40];
  }
}

function getWaterHeight(severity: number): number {
  return severity === 3 ? 800 : severity === 2 ? 500 : severity === 1 ? 200 : 0;
}

function buildLayers(
  wardSeverities: Record<string, number>,
  selectedWardId: string | null,
  setSelectedWard: (id: string | null) => void
) {
  const geojson = getWardGeoJSON();
  const layers: ReturnType<typeof GeoJsonLayer>[] = [];

  // Ward boundary fills
  layers.push(
    new GeoJsonLayer({
      id: 'ward-boundaries-fill',
      data: geojson,
      filled: true,
      getFillColor: (f: any) => {
        const sev = wardSeverities[f.properties.id] ?? f.properties.severity ?? 0;
        return getWardFill(sev);
      },
      getLineColor: [255, 255, 255, 30],
      getLineWidth: 1,
      pickable: true,
      onClick: (info) => {
        if (info.object?.properties?.id) {
          setSelectedWard(String(info.object.properties.id));
        }
      },
      autoHighlight: true,
      highlightColor: [255, 255, 255, 40],
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
        if (String(f.properties.id) === selectedWardId) return [212, 168, 83, 200];
        return [255, 255, 255, 20];
      },
      getLineWidth: (f: any) => (String(f.properties.id) === selectedWardId ? 2.5 : 1),
    })
  );

  // Water flood overlay
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
        getFillColor: (f: any) => {
          const sev = f.properties.severity;
          if (sev === 3) return [59, 130, 246, 90];
          if (sev === 2) return [59, 130, 246, 60];
          return [59, 130, 246, 35];
        },
        getElevation: (f: any) => getWaterHeight(f.properties.severity),
        getLineColor: [59, 130, 246, 40],
        getLineWidth: 1,
      })
    );
  }

  // Buildings for selected ward
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
          getFillColor: [232, 196, 160, 200],
          getLineColor: [200, 170, 140, 100],
          getLineWidth: 0.5,
          pickable: true,
        })
      );

      if (ward.evacuationRoute.length > 1) {
        layers.push(
          new PathLayer({
            id: 'evacuation-route',
            data: [{ path: ward.evacuationRoute }],
            getPath: (d: any) => d.path,
            getColor: [0, 255, 136, 220],
            getWidth: 4,
            widthMinPixels: 3,
          })
        );

        layers.push(
          new ScatterplotLayer({
            id: 'evacuation-waypoints',
            data: ward.evacuationRoute.map((c) => ({ position: c })),
            getPosition: (d: any) => d.position,
            getRadius: 5,
            getFillColor: [0, 255, 136, 255],
          })
        );
      }

      layers.push(
        new ScatterplotLayer({
          id: 'ward-center',
          data: [{ position: ward.center }],
          getPosition: (d: any) => d.position,
          getRadius: 8,
          getFillColor: [212, 168, 83, 255],
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
    if (!deckRef.current && !mapContainer.current) return;

    const layers = buildLayers(wardSeverities, selectedWardId, setSelectedWard);

    if (deckRef.current) {
      deckRef.current.setProps({ layers });
    } else if (mapContainer.current) {
      deckRef.current = new Deck({
        canvas: 'deck-canvas',
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
    }
  }, [wardSeverities, selectedWardId, setSelectedWard]);

  // Sync deck view with map
  useEffect(() => {
    const map = mapRef.current;
    const deck = deckRef.current;
    if (!map || !deck) return;

    const syncView = () => {
      const { lng, lat } = map.getCenter();
      deck.setProps({
        viewState: {
          longitude: lng,
          latitude: lat,
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          transitionDuration: 300,
        },
      });
    };

    map.on('move', syncView);
    map.on('zoom', syncView);
    map.on('rotate', syncView);
    map.on('pitch', syncView);
    return () => {
      map.off('move', syncView);
      map.off('zoom', syncView);
      map.off('rotate', syncView);
      map.off('pitch', syncView);
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
    updateSeverities();

    return () => {
      map.remove();
      deckRef.current?.finalize();
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="absolute inset-0" />
      <canvas
        id="deck-canvas"
        className="absolute inset-0"
        style={{ touchAction: 'none', pointerEvents: 'none' }}
      />
    </div>
  );
}

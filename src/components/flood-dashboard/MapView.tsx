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

function getSevAlpha(severity: number): number {
  return severity === 3 ? 55 : severity === 2 ? 35 : severity === 1 ? 20 : 10;
}

function buildLayers(
  wardSeverities: Record<string, number>,
  selectedWardId: string | null,
  setSelectedWard: (id: string | null) => void,
  setPopupPosition: (pos: { x: number; y: number } | null) => void
) {
  const geojson = getWardGeoJSON();
  const layers: any[] = [];

  // Ward boundary fills — monochrome with intensity based on severity
  layers.push(
    new GeoJsonLayer({
      id: 'ward-boundaries-fill',
      data: geojson,
      filled: true,
      getFillColor: (f: any) => {
        const sev = wardSeverities[f.properties.id] ?? 0;
        if (sev === 3) return [217, 68, 68, 40];
        return [91, 141, 239, getSevAlpha(sev)];
      },
      getLineColor: [255, 255, 255, 8],
      getLineWidth: 1,
      pickable: true,
      onClick: (info) => {
        if (info.object?.properties?.id) {
          setSelectedWard(String(info.object.properties.id));
          if (info.coordinate) {
            setPopupPosition({ x: info.x, y: info.y });
          }
        }
      },
      autoHighlight: true,
      highlightColor: [91, 141, 239, 30],
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
        if (String(f.properties.id) === selectedWardId) return [91, 141, 239, 180];
        return [255, 255, 255, 8];
      },
      getLineWidth: (f: any) => (String(f.properties.id) === selectedWardId ? 2 : 0.5),
    })
  );

  // Water flood overlay for severity >= 2
  const floodWards = mumbaiWards.filter((w) => {
    const sev = wardSeverities[w.id] ?? w.severity;
    return sev >= 2;
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
          const s = f.properties.severity;
          if (s === 3) return [217, 68, 68, 45];
          return [91, 141, 239, 30];
        },
        getElevation: (f: any) => (f.properties.severity === 3 ? 500 : 250),
        getLineColor: [91, 141, 239, 15],
        getLineWidth: 1,
      })
    );
  }

  // 3D Buildings for all wards
  mumbaiWards.forEach((ward) => {
    const isSelected = ward.id === selectedWardId;
    layers.push(
      new PolygonLayer({
        id: `buildings-${ward.id}`,
        data: ward.buildings.map((b) => ({ polygon: b.coordinates, height: b.height })),
        extruded: true,
        getPolygon: (d: any) => d.polygon,
        getElevation: (d: any) => d.height,
        getFillColor: isSelected ? [30, 35, 50, 220] : [20, 24, 32, 160],
        getLineColor: isSelected ? [60, 68, 90, 100] : [36, 40, 50, 60],
        getLineWidth: 0.5,
        pickable: false,
      })
    );
  });

  // Ward center markers — simple circles, monochrome + red for critical
  layers.push(
    new ScatterplotLayer({
      id: 'ward-markers',
      data: mumbaiWards.map((w) => ({
        position: w.center,
        severity: wardSeverities[w.id] ?? 0,
        id: w.id,
        isSelected: w.id === selectedWardId,
      })),
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => (d.isSelected ? 100 : 70),
      getFillColor: (d: any) => {
        if (d.severity === 3) return [217, 68, 68, 200];
        if (d.isSelected) return [91, 141, 239, 220];
        return [139, 145, 158, 140];
      },
      getLineColor: [11, 13, 18, 180],
      getLineWidth: 2,
      stroked: true,
      pickable: true,
      onClick: (info) => {
        if (info.object?.id) {
          setSelectedWard(String(info.object.id));
          setPopupPosition({ x: info.x, y: info.y });
        }
      },
    })
  );

  // Evacuation route for selected ward
  if (selectedWardId) {
    const ward = mumbaiWards.find((w) => w.id === selectedWardId);
    if (ward && ward.evacuationRoute.length > 1) {
      layers.push(
        new PathLayer({
          id: 'evacuation-route',
          data: [{ path: ward.evacuationRoute }],
          getPath: (d: any) => d.path,
          getColor: [91, 141, 239, 160],
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
          getFillColor: [91, 141, 239, 200],
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
  const setPopupPosition = useFloodStore((s) => s.setPopupPosition);
  const updateSeverities = useFloodStore((s) => s.updateSeverities);

  useEffect(() => {
    if (!deckRef.current || !mapRef.current) return;
    const layers = buildLayers(wardSeverities, selectedWardId, setSelectedWard, setPopupPosition);
    deckRef.current.setProps({ layers });
  }, [wardSeverities, selectedWardId, setSelectedWard, setPopupPosition]);

  useEffect(() => {
    if (initRef.current || !mapContainer.current) return;
    initRef.current = true;

    const map = new Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'Flood Monitor',
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
      zoom: 11.5,
      pitch: 50,
      bearing: -12,
      antialias: true,
      maxBounds: MUMBAI_BOUNDS,
      dragRotate: true,
      touchZoomRotate: true,
    });

    map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    mapRef.current = map;

    map.on('load', () => {
      const mapCanvas = map.getCanvas() as HTMLCanvasElement;
      const layers = buildLayers(
        useFloodStore.getState().wardSeverities,
        useFloodStore.getState().selectedWardId,
        useFloodStore.getState().setSelectedWard,
        useFloodStore.getState().setPopupPosition
      );
      deckRef.current = new Deck({
        canvas: mapCanvas,
        initialViewState: {
          longitude: MUMBAI_CENTER[0],
          latitude: MUMBAI_CENTER[1],
          zoom: 11.5,
          pitch: 50,
          bearing: -12,
        },
        controller: false,
        layers,
      });

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedWardId) return;
    const ward = mumbaiWards.find((w) => w.id === selectedWardId);
    if (!ward) return;
    map.flyTo({
      center: ward.center as [number, number],
      zoom: 14,
      pitch: 50,
      bearing: -12,
      duration: 1200,
      essential: true,
    });
  }, [selectedWardId]);

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
}

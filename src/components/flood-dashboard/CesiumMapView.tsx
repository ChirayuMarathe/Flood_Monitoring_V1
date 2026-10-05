'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import {
  Viewer,
  Ion,
  createOsmBuildingsAsync,
  UrlTemplateImageryProvider,
  Cartesian3,
  Math as CesiumMath,
  Color,
  SunLight,
  CustomShader,
  LightingModel,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Entity,
  ColorMaterialProperty,
} from 'cesium';
import { useFloodStore } from '@/store/flood-store';
import { WardLayer } from '@/lib/gis/WardLayer';
import { CITY_CENTERS } from '@/lib/gis/WardData';
import { flyToCity, flyToWard, initCameraControls } from '@/lib/gis/cameraController';

const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN || '';

import { loadCityTileset, loadOsmBuildingsTileset } from '@/lib/gis/BuildingTileset';
import WardTagLayer from './WardTagLayer';

export default function CesiumMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const wardLayerRef = useRef<WardLayer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const tilesetsRef = useRef<Map<string, Cesium.Cesium3DTileset>>(new Map());
  const photorealRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const osmBuildingsRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const initRef = useRef(false);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, name: string, city: string } | null>(null);
  const [wardAnchors, setWardAnchors] = useState<{ wardId: string; position: Cesium.Cartesian3 }[]>([]);

  const activeCity = useFloodStore((s) => s.activeCity);
  const selectedWardId = useFloodStore((s) => s.selectedWardId);
  const setSelectedWard = useFloodStore((s) => s.setSelectedWard);
  const wardRiskProfiles = useFloodStore((s) => s.wardRiskProfiles);
  const buildingMode = useFloodStore((s) => s.buildingMode);
  const ragPanelOpen = useFloodStore((s) => s.ragPanelOpen);

  // Helper to clip the tileset to the selected ward only (removes all external analytical buildings)
  const applyBuildingClipping = useCallback(() => {
    const tileset = tilesetsRef.current.get(activeCity) || osmBuildingsRef.current;
    const wardLayer = wardLayerRef.current;
    if (!tileset) return;

    if (buildingMode === 'off') {
      tileset.show = false;
      tileset.clippingPolygons = undefined as any;
      return;
    }

    if (selectedWardId) {
      const positions = wardLayer?.getWardBoundaryPositions(selectedWardId);
      if (positions && positions.length >= 3) {
        tileset.clippingPolygons = new Cesium.ClippingPolygonCollection({
          polygons: [new Cesium.ClippingPolygon({ positions })],
          inverse: true, // preserves ONLY buildings inside the ward boundary, clips all others
          quality: 1.0,
        });
        tileset.show = true;
        return;
      }
    }

    // When no specific ward is selected, show buildings for the city
    tileset.clippingPolygons = undefined as any;
    tileset.show = true;
  }, [activeCity, selectedWardId, buildingMode]);

  useEffect(() => {
    applyBuildingClipping();
  }, [applyBuildingClipping]);

  // Handle city switching — fly camera to new city and ensure ONLY active city's wards are visible
  useEffect(() => {
    const viewer = viewerRef.current;
    const wardLayer = wardLayerRef.current;
    if (!viewer || !wardLayer || !activeCity || !mapReady) return;

    wardLayer.loadCity(activeCity as any).then(() => {
      // Only make the active city visible, hide all other cities to eliminate extra load
      for (const c of ['mumbai', 'pune', 'navi_mumbai'] as const) {
        wardLayer.setCityVisible(c, c === activeCity);
      }
      setWardAnchors(wardLayer.getWardAnchors(activeCity as any));
      flyToCity(viewer, activeCity);
    }).catch(err => {
      console.warn(`[CesiumMapView] Failed to switch to city ${activeCity}:`, err);
    });
  }, [activeCity, mapReady]);

  // Ward-specific local building layer: loads strictly the active city's local tileset
  // and dynamically clips to only the selected ward
  useEffect(() => {
    let cancelled = false;
    const viewer = viewerRef.current;
    if (!viewer || !mapReady) return;

    // The globe is ALWAYS visible so terrain and satellite imagery remain crystal clear
    viewer.scene.globe.show = true;

    if (photorealRef.current) photorealRef.current.show = false;
    if (osmBuildingsRef.current) osmBuildingsRef.current.show = false;

    if (buildingMode === 'off') {
      for (const ts of tilesetsRef.current.values()) ts.show = false;
      setLoadingProgress(null);
      return;
    }

    if (tilesetsRef.current.has(activeCity)) {
      applyBuildingClipping();
      return;
    }

    loadCityTileset(viewer, activeCity, {
      onProgress: (pending, processing) => {
        if (cancelled) return;
        const outstanding = pending + processing;
        if (outstanding === 0) {
          setLoadingProgress(100);
          setTimeout(() => { if (!cancelled) setLoadingProgress(null); }, 400);
        } else {
          setLoadingProgress(Math.max(5, 100 - outstanding * 4));
        }
      },
    }).then(async (localTileset) => {
      if (cancelled) return;
      setLoadingProgress(null);
      if (localTileset) {
        console.log(`[Buildings] Local ward 3D tiles for '${activeCity}' loaded successfully`);
        tilesetsRef.current.set(activeCity, localTileset);
        applyBuildingClipping();
      } else {
        console.log(`[Buildings] Local tiles not available, loading Cesium OSM Buildings for ${activeCity}`);
        const osmTs = await loadOsmBuildingsTileset(viewer);
        if (cancelled || !osmTs) return;
        osmBuildingsRef.current = osmTs;
        tilesetsRef.current.set(activeCity, osmTs);
        applyBuildingClipping();
      }
    }).catch(async (err) => {
      if (!cancelled) {
        console.warn(`[Buildings] Local tileset error, attempting OSM Buildings fallback:`, err);
        setLoadingProgress(null);
        const osmTs = await loadOsmBuildingsTileset(viewer);
        if (cancelled || !osmTs) return;
        osmBuildingsRef.current = osmTs;
        tilesetsRef.current.set(activeCity, osmTs);
        applyBuildingClipping();
      }
    });

    return () => { cancelled = true; };
  }, [buildingMode, activeCity, mapReady, applyBuildingClipping]);

  // React to ward selection (pinned wards, ward clicks in sidebar)
  const getSelectedWard = useFloodStore((s) => s.selectedWard);

  useEffect(() => {
    if (!viewerRef.current || !selectedWardId) return;
    
    const ward = getSelectedWard();
    if (ward && ward.center) {
      flyToWard(viewerRef.current, {
        centroidLat: ward.center[1],
        centroidLng: ward.center[0]
      });
    }
  }, [selectedWardId, getSelectedWard]);

  // React to ward layer visibility changes — useEffect subscription to avoid re-rendering canvas
  const wardLayerVisibility = useFloodStore((s) => s.wardLayerVisibility);
  useEffect(() => {
    const wardLayer = wardLayerRef.current;
    if (!wardLayer) return;

    wardLayer.setCityVisible('mumbai', wardLayerVisibility.mumbai);
    wardLayer.setCityVisible('pune', wardLayerVisibility.pune);
    wardLayer.setCityVisible('navi_mumbai', wardLayerVisibility.navi_mumbai);
  }, [wardLayerVisibility]);

  // React to risk profile changes and update map pins
  useEffect(() => {
    const wardLayer = wardLayerRef.current;
    if (!wardLayer) return;
    
    wardLayer.updateFromProfiles(wardRiskProfiles);
  }, [wardRiskProfiles, mapReady]); // Depend on mapReady to ensure initial severities are painted when ward layers finish loading

  // React to fill mode changes
  const wardFillMode = useFloodStore((s) => s.wardFillMode);
  useEffect(() => {
    const wardLayer = wardLayerRef.current;
    if (!wardLayer) return;

    wardLayer.setFillMode(wardFillMode);
  }, [wardFillMode]);

  // Initialize viewer
  useEffect(() => {
    if (initRef.current || !containerRef.current || !CESIUM_TOKEN) return;
    initRef.current = true;
    tilesetsRef.current.clear(); // old tilesets belong to the destroyed viewer
    let cancelled = false;

    (window as any).CESIUM_BASE_URL = '/cesium';
    Ion.defaultAccessToken = CESIUM_TOKEN;

    const viewer = new Viewer(containerRef.current, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      animation: false,
      fullscreenButton: false,
      vrButton: false,
      projectionPicker: false,
      requestRenderMode: false,
      shouldAnimate: true,
      msaaSamples: 2,
    });

    viewerRef.current = viewer;
    initCameraControls(viewer);

    if (process.env.NODE_ENV !== 'production') {
      // Handy for poking at the scene from the console while developing.
      (window as any).cesiumViewer = viewer;
    }

    // Use Esri World Imagery
    viewer.imageryLayers.removeAll();
    const esriImagery = new UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maximumLevel: 19,
      credit: 'Esri, Maxar, Earthstar Geographics',
    });
    viewer.imageryLayers.addImageryProvider(esriImagery);

    // Restore base globe
    viewer.scene.globe.show = true;
    viewer.scene.globe.depthTestAgainstTerrain = false;

    // High-performance scene settings (disabled heavy shadow maps for smooth 60 FPS)
    viewer.shadows = false;
    viewer.terrainShadows = Cesium.ShadowMode.DISABLED;
    viewer.resolutionScale = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.25) : 1.0;
    viewer.scene.globe.baseColor = Color.fromCssColorString('#0B0D12');
    viewer.scene.globe.enableLighting = true;
    viewer.scene.light = new SunLight();
    
    // Lock clock to 10:00 AM IST (4:30 UTC) for clear ambient daylight
    viewer.clock.currentTime = Cesium.JulianDate.fromIso8601('2024-07-15T04:30:00Z');
    viewer.clock.shouldAnimate = false;
    
    if (viewer.scene.verticalExaggeration !== undefined) {
      viewer.scene.verticalExaggeration = 1.3;
    }
    
    if (viewer.scene.postProcessStages) {
      viewer.scene.postProcessStages.fxaa.enabled = true;
    }

    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0002;
    viewer.scene.highDynamicRange = false;
    viewer.scene.globe.showGroundAtmosphere = true;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
    }
    
    try {
      viewer.scene.globe.showWaterEffect = true;
    } catch (e) {}

    const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
    if (creditContainer) {
      creditContainer.style.background = 'transparent';
      creditContainer.style.opacity = '0.4';
      creditContainer.style.fontSize = '9px';
    }

    // Initialize the multi-city WardLayer and load initial city first for instant display
    const wardLayer = new WardLayer(viewer);
    wardLayerRef.current = wardLayer;

    const initialCity = useFloodStore.getState().activeCity || 'mumbai';

    // Fast path: load initial city first (<150ms) so map is interactive immediately
    wardLayer.loadCity(initialCity as any).then(() => {
      console.log(`[CesiumMapView] Initial city '${initialCity}' loaded — map ready`);
      setMapReady(true);
      
      wardLayer.setCityVisible(initialCity as any, true);
      setWardAnchors(wardLayer.getWardAnchors(initialCity as any));
      useFloodStore.getState().initRiskData();
    }).catch(err => console.error('[CesiumMapView] Ward layer load failed:', err));
    
    // Fly to initial city
    const center = CITY_CENTERS[initialCity as keyof typeof CITY_CENTERS] || CITY_CENTERS.mumbai;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(center.lng, center.lat, center.altitude),
      orientation: {
        heading: CesiumMath.toRadians(15.0),
        pitch: CesiumMath.toRadians(-35.0), // 3D tilt
        roll: 0,
      },
      duration: 0,
    });

    // Hover Handler
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handlerRef.current = handler;
    
    let hoveredEntity: Entity | null = null;
    let originalMaterial: any = null;

    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.endPosition);
      
      // Reset previous hover (but not if it's the selected entity)
      if (hoveredEntity && hoveredEntity.polygon && originalMaterial) {
        wardLayer.unhighlightWard(hoveredEntity, originalMaterial);
        hoveredEntity = null;
        originalMaterial = null;
        setHoverInfo(null);
      }

      if (defined(picked) && picked.id instanceof Entity && wardLayer.isWardEntity(picked.id)) {
        const pickedEntity = picked.id as Entity;
        hoveredEntity = pickedEntity;
        originalMaterial = wardLayer.highlightWard(pickedEntity);
        
        const info = wardLayer.getWardInfo(pickedEntity);
        if (info) {
          const cityLabel = info.city === 'navi_mumbai' ? 'Navi Mumbai' : 
                           info.city.charAt(0).toUpperCase() + info.city.slice(1);
          setHoverInfo({
            x: movement.endPosition.x,
            y: movement.endPosition.y,
            name: info.wardCode !== info.wardName 
              ? `${info.wardCode} — ${info.wardName}` 
              : info.wardName,
            city: cityLabel,
          });
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Click Handler — select ward, emit to store
    handler.setInputAction((click: any) => {
      const picked = viewer.scene.pick(click.position);

      if (defined(picked) && picked.id instanceof Entity && wardLayer.isWardEntity(picked.id)) {
        const info = wardLayer.selectWard(picked.id);
        if (info) {
          useFloodStore.getState().setSelectedBoundaryWard({
            city: info.city,
            wardId: info.wardId,
            wardName: info.wardName,
            wardCode: info.wardCode,
          });
          useFloodStore.getState().setSelectedWard(info.wardId);
          useFloodStore.getState().clearRAGMessages();
          if (!useFloodStore.getState().ragPanelOpen) {
            useFloodStore.getState().toggleRAGPanel();
          }
        }
      } else {
        // Click on empty space — clear selection
        wardLayer.clearSelection();
        useFloodStore.getState().setSelectedBoundaryWard(null);
        useFloodStore.getState().setSelectedWard(null);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      cancelled = true;
      handlerRef.current?.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
      handlerRef.current?.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      handlerRef.current?.destroy();
      wardLayerRef.current?.destroy();
      for (const ts of tilesetsRef.current.values()) {
        viewer.scene.primitives.remove(ts);
      }
      tilesetsRef.current.clear();
      if (photorealRef.current) {
        viewer.scene.primitives.remove(photorealRef.current);
        photorealRef.current = null;
      }
      if (osmBuildingsRef.current) {
        viewer.scene.primitives.remove(osmBuildingsRef.current);
        osmBuildingsRef.current = null;
      }
      viewer.destroy();
      initRef.current = false;
    };
  }, []);

  if (!CESIUM_TOKEN) {
    return (
      <div className="absolute inset-0 bg-[#0B0D12] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <p className="text-[14px] text-[#E1E4EA] font-medium mb-2">Cesium Token Required</p>
          <p className="text-[12px] text-[#525866]">
            Add your Cesium Ion token to <code className="text-[#5B8DEF]">.env</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0 bg-transparent pointer-events-auto" />
      
      {!mapReady && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A]/90 border border-white/10 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#5EA977]/30 border-t-[#5EA977] rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-gray-300">Loading Ward Boundaries...</p>
        </div>
      )}

      {loadingProgress !== null && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#0A0A0A]/90 border border-white/10 backdrop-blur-md px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3 w-80 z-50">
          <div className="flex justify-between w-full text-xs font-medium text-gray-300">
            <span>Loading 3D Buildings...</span>
            <span className="text-[#5EA977]">{Math.round(loadingProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#5EA977] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Reset View Button */}
      {mapReady && (
        <button
          onClick={() => {
            if (viewerRef.current && activeCity) {
              flyToCity(viewerRef.current, activeCity);
            }
          }}
          className={`absolute bottom-6 z-20 bg-[#0A0A0A]/90 hover:bg-white text-white/90 hover:text-black border border-white/10 hover:border-white backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all duration-300 flex items-center gap-2 shadow-xl group cursor-pointer ${
            ragPanelOpen ? 'right-[440px]' : 'right-6'
          }`}
        >
          <svg className="w-3.5 h-3.5 group-hover:-rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Reset View
        </button>
      )}

      {mapReady && <WardTagLayer viewer={viewerRef.current} anchors={wardAnchors} />}

      {/* Tooltip for Hover */}
      {hoverInfo && (
        <div 
          className="absolute pointer-events-none px-3 py-2 bg-[#0A0A0A]/85 backdrop-blur-md border border-[#ffffff1a] rounded-lg text-white text-sm whitespace-nowrap z-50 transition-opacity duration-75"
          style={{ 
            left: hoverInfo.x + 15, 
            top: hoverInfo.y + 15 
          }}
        >
          <div className="font-medium text-[13px]">{hoverInfo.name}</div>
          <div className="text-[10px] text-[#9CA3AF] mt-0.5">{hoverInfo.city}</div>
        </div>
      )}
    </div>
  );
}

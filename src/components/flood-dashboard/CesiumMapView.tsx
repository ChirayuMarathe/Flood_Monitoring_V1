'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import {
  Viewer,
  Ion,
  UrlTemplateImageryProvider,
  Cartesian3,
  Math as CesiumMath,
  Color,
  SunLight,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Entity,
  ColorMaterialProperty,
} from 'cesium';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { WardLayer } from '@/lib/gis/WardLayer';
import { CITY_CENTERS, MUMBAI_OBJECTID_TO_CODE } from '@/lib/gis/WardData';
import { flyToCity, flyToWard, initCameraControls, CITY_CAMERA_VIEWS } from '@/lib/gis/cameraController';
import { wardProfileKey } from '@/lib/risk/WardRiskProfile';
import wardTopography from '@/lib/ward-topography.json';

const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN || '';

import { BuildingLayer } from '@/lib/gis/BuildingLayer';
import WardTagLayer from './WardTagLayer';
import { usePredictions } from '@/hooks/usePredictions';

interface HoverWardDetails {
  x: number;
  y: number;
  wardId: string;
  wardCode: string;
  wardName: string;
  city: string;
  rainfall3Day: number;
  rainfallDaily?: number;
  soilMoisture: number;
  temp?: number;
  susceptibility?: number;
  elevation?: number;
  twi?: number;
  riskProb?: number;
  rfProb?: number;
  gbmProb?: number;
  alertLevel?: string;
}

export default function CesiumMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const wardLayerRef = useRef<WardLayer | null>(null);
  const buildingLayerRef = useRef<BuildingLayer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const initRef = useRef(false);

  const [hoverInfo, setHoverInfo] = useState<HoverWardDetails | null>(null);
  const [wardAnchors, setWardAnchors] = useState<{ wardId: string; position: Cesium.Cartesian3 }[]>([]);

  const activeCity = useFloodStore((s) => s.activeCity);
  const selectedWardId = useFloodStore((s) => s.selectedWardId);
  const setSelectedWard = useFloodStore((s) => s.setSelectedWard);
  const wardRiskProfiles = useFloodStore((s) => s.wardRiskProfiles);
  const buildingMode = useFloodStore((s) => s.buildingMode);
  const ragPanelOpen = useFloodStore((s) => s.ragPanelOpen);
  const currentTimeData = useFloodStore((s) => s.currentTimeData);
  const td = currentTimeData ? currentTimeData() : null;
  const rainfallMax = td?.rainfall_3day_sum ?? 0;
  const soilMoisture = td?.soil_moisture ?? 0.3;
  const { wardMap, snapshot } = usePredictions(rainfallMax, soilMoisture);

  const wardMapRef = useRef(wardMap);
  wardMapRef.current = wardMap;
  const tdRef = useRef(td);
  tdRef.current = td;


  // Handle city switching — fly camera immediately to new city and ensure ONLY active city's wards are visible
  useEffect(() => {
    const viewer = viewerRef.current;
    const wardLayer = wardLayerRef.current;
    if (!viewer || !activeCity || !mapReady) return;

    setHoverInfo(null);

    // Immediately trigger camera fly-to so navigation feels instantaneous
    flyToCity(viewer, activeCity);

    if (wardLayer) {
      // Mark all other cities as hidden and active city visible
      for (const c of ['mumbai', 'pune', 'navi_mumbai'] as const) {
        wardLayer.setCityVisible(c, c === activeCity);
      }

      wardLayer.loadCity(activeCity as any).then(() => {
        // Enforce visibility again once loaded
        for (const c of ['mumbai', 'pune', 'navi_mumbai'] as const) {
          wardLayer.setCityVisible(c, c === activeCity);
        }
        setWardAnchors(wardLayer.getWardAnchors(activeCity as any));
      }).catch(err => {
        console.warn(`[CesiumMapView] Failed to switch to city ${activeCity}:`, err);
      });
    }
  }, [activeCity, mapReady]);

  // 3D Extruded Digital Twin Buildings Layer
  useEffect(() => {
    const buildingLayer = buildingLayerRef.current;
    if (!buildingLayer || !mapReady) return;

    if (buildingMode === 'off') {
      buildingLayer.setVisible(false);
      setLoadingProgress(null);
      return;
    }

    buildingLayer.setVisible(true);
    setLoadingProgress(50);
    buildingLayer.loadCityBuildings(activeCity).then(() => {
      setLoadingProgress(100);
      setTimeout(() => setLoadingProgress(null), 300);
    }).catch(err => {
      console.warn(`[Buildings] Failed to load 3D buildings for ${activeCity}:`, err);
      setLoadingProgress(null);
    });
  }, [buildingMode, activeCity, mapReady]);

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

  // React to ML predictions and risk profile changes
  useEffect(() => {
    const wardLayer = wardLayerRef.current;
    if (!wardLayer || !mapReady) return;

    if (wardMap && wardMap.size > 0) {
      wardLayer.updateFromPredictions(wardMap);
    } else {
      wardLayer.updateFromProfiles(wardRiskProfiles);
    }
  }, [wardMap, wardRiskProfiles, mapReady]);

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

    // Initialize 3D Digital Twin Buildings Layer
    const buildingLayer = new BuildingLayer(viewer);
    buildingLayerRef.current = buildingLayer;

    const initialCity = useFloodStore.getState().activeCity || 'mumbai';

    // Fast path: load initial city first (<150ms) so map is interactive immediately
    wardLayer.loadCity(initialCity as any).then(() => {
      console.log(`[CesiumMapView] Initial city '${initialCity}' loaded — map ready`);
      setMapReady(true);
      
      wardLayer.setCityVisible(initialCity as any, true);
      setWardAnchors(wardLayer.getWardAnchors(initialCity as any));
      useFloodStore.getState().initRiskData();
    }).catch(err => console.error('[CesiumMapView] Ward layer load failed:', err));
    
    // Fly to initial city using CITY_CAMERA_VIEWS preset
    const view = CITY_CAMERA_VIEWS[initialCity] || CITY_CAMERA_VIEWS.mumbai;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(view.lng, view.lat, view.altitude),
      orientation: {
        heading: CesiumMath.toRadians(view.heading || 0),
        pitch: CesiumMath.toRadians(view.pitch || -38.0), // 3D tilt
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
          const store = useFloodStore.getState();
          const cleanKey = info.wardId.replace(/^(mumbai|pune|navi_mumbai)_/, '');
          const bareKey = wardProfileKey(info.wardId);

          const obs =
            store.wardDailyObservations[info.wardCode] ||
            store.wardDailyObservations[info.wardId] ||
            store.wardDailyObservations[cleanKey] ||
            store.wardDailyObservations[`BMC_${info.wardCode}`] ||
            store.wardDailyObservations[`NMMC_${info.wardName}`] ||
            store.wardDailyObservations[bareKey];

          const profile =
            store.wardRiskProfiles[info.wardId] ||
            store.wardRiskProfiles[bareKey] ||
            store.wardRiskProfiles[info.wardCode] ||
            store.wardRiskProfiles[cleanKey];

          const cityWards = getWardsForCity(info.city as any);
          const resolvedCode = (info.city === 'mumbai' && MUMBAI_OBJECTID_TO_CODE[cleanKey])
            ? MUMBAI_OBJECTID_TO_CODE[cleanKey]
            : cleanKey;

          const staticWard = cityWards.find((w) =>
            w.id === info.wardId ||
            w.code === info.wardCode ||
            w.id === cleanKey ||
            w.code === cleanKey ||
            w.id === resolvedCode ||
            w.code === resolvedCode ||
            w.id === bareKey ||
            w.code === bareKey ||
            w.name.toLowerCase().startsWith(info.wardCode.toLowerCase() + ' ') ||
            w.name.toLowerCase().startsWith(info.wardCode.toLowerCase() + ' (') ||
            w.name.toLowerCase().startsWith(cleanKey.toLowerCase() + ' ') ||
            w.name.toLowerCase().startsWith(cleanKey.toLowerCase() + ' (')
          );

          const currentMap = wardMapRef.current;
          const pred =
            currentMap.get(info.wardCode) ||
            currentMap.get(info.wardId) ||
            currentMap.get(cleanKey) ||
            currentMap.get(resolvedCode) ||
            (staticWard?.code ? currentMap.get(staticWard.code) : undefined) ||
            (staticWard?.id ? currentMap.get(staticWard.id) : undefined) ||
            currentMap.get(`BMC_${resolvedCode}`) ||
            currentMap.get(`BMC_${info.wardCode}`) ||
            currentMap.get(`mumbai_${resolvedCode}`) ||
            currentMap.get(`mumbai_${info.wardCode}`) ||
            currentMap.get(`navi_mumbai_${info.wardCode}`) ||
            currentMap.get(`pune_${info.wardCode}`);

          const cityLabel = info.city === 'navi_mumbai' ? 'Navi Mumbai' : 
                           info.city.charAt(0).toUpperCase() + info.city.slice(1);

          const topoMap = wardTopography as Record<string, any>;
          const topo =
            topoMap[info.wardId.toLowerCase()] ||
            topoMap[cleanKey.toLowerCase()] ||
            topoMap[info.wardName.toLowerCase()] ||
            topoMap[info.wardCode.toLowerCase()] ||
            topoMap[`${info.city}_${info.wardCode}`.toLowerCase()] ||
            topoMap[`${info.city}_${cleanKey}`.toLowerCase()] ||
            topoMap[`${info.city}_${info.wardName}`.toLowerCase()] ||
            topoMap[`nmmc_${info.wardCode}`.toLowerCase()] ||
            topoMap[`pune_${info.wardCode}`.toLowerCase()] ||
            topoMap[`bmc_${info.wardCode}`.toLowerCase()];

          const currentTime = tdRef.current;
          const r3d = obs?.r3d ?? profile?.rainfall3DaySum ?? currentTime?.rainfall_3day_sum ?? 0;
          const rDaily = obs?.rmax ?? currentTime?.rainfall_daily ?? (r3d / 3);
          const soil = obs?.soil ?? profile?.soilMoisture ?? currentTime?.soil_moisture ?? 0.35;
          const temp = obs?.temp ?? currentTime?.land_surface_temp ?? 26.5;
          const susc = obs?.susc ?? topo?.susceptibility ?? 96.5;
          const elevation = topo?.elevation ?? staticWard?.elevation ?? profile?.elevationMean ?? 5.5;
          const twi = topo?.twi ?? staticWard?.twi ?? profile?.twiMean ?? 8.9;

          const wardSev =
            store.wardSeverities[info.wardId] ??
            store.wardSeverities[info.wardCode] ??
            store.wardSeverities[cleanKey] ??
            profile?.overallSeverity;

          let effectiveAlertLevel = pred?.alert_level || (wardSev === 3 ? 'critical' : wardSev === 2 ? 'red' : wardSev === 1 ? 'amber' : 'green');
          if (wardSev === 3 && effectiveAlertLevel !== 'critical') {
            effectiveAlertLevel = 'critical';
          } else if (wardSev === 2 && (effectiveAlertLevel === 'green' || effectiveAlertLevel === 'amber')) {
            effectiveAlertLevel = 'red';
          } else if (wardSev === 1 && effectiveAlertLevel === 'green') {
            effectiveAlertLevel = 'amber';
          }

          setHoverInfo({
            x: movement.endPosition.x,
            y: movement.endPosition.y,
            wardId: info.wardId,
            wardCode: info.wardCode,
            wardName: staticWard?.name || info.wardName,
            city: cityLabel,
            rainfall3Day: r3d,
            rainfallDaily: rDaily,
            soilMoisture: soil,
            temp,
            susceptibility: susc,
            elevation,
            twi,
            riskProb: pred ? pred.type3_prob : undefined,
            rfProb: pred ? pred.rf_prob : undefined,
            gbmProb: pred ? pred.gbm_prob : undefined,
            alertLevel: effectiveAlertLevel,
          });
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Click Handler — select ward, emit to store
    handler.setInputAction((click: any) => {
      let targetEntity: Entity | null = null;
      try {
        const pickedObjects = viewer.scene.drillPick(click.position, 10);
        for (const obj of pickedObjects) {
          if (defined(obj) && obj.id instanceof Entity) {
            let ent = obj.id;
            if (ent.properties?.isWardBoundaryLine) {
              const wid = ent.properties?.wardId?.getValue();
              const poly = wid ? wardLayer.getWardPolygonEntity(wid) : null;
              if (poly) ent = poly;
            }
            if (wardLayer.isWardEntity(ent)) {
              targetEntity = ent;
              break;
            }
          }
        }
      } catch {
        // Fallback to single pick if drillPick is unsupported in current context
      }

      if (!targetEntity) {
        const picked = viewer.scene.pick(click.position);
        if (defined(picked) && picked.id instanceof Entity) {
          let ent = picked.id;
          if (ent.properties?.isWardBoundaryLine) {
            const wid = ent.properties?.wardId?.getValue();
            const poly = wid ? wardLayer.getWardPolygonEntity(wid) : null;
            if (poly) ent = poly;
          }
          if (wardLayer.isWardEntity(ent)) {
            targetEntity = ent;
          }
        }
      }

      if (targetEntity) {
        const info = wardLayer.selectWard(targetEntity);
        if (info) {
          const cityWards = getWardsForCity(info.city as any);
          const cleanKey = info.wardId.replace(/^(mumbai|pune|navi_mumbai)_/, '');
          const resolvedCode = (info.city === 'mumbai' && MUMBAI_OBJECTID_TO_CODE[cleanKey])
            ? MUMBAI_OBJECTID_TO_CODE[cleanKey]
            : cleanKey;
          const cleanName = cleanKey.replace(/^Admin Ward\s+\d+\s*/i, '').trim().toLowerCase();
          const staticWard = cityWards.find((w) =>
            w.id === info.wardId ||
            w.code === info.wardCode ||
            w.id === cleanKey ||
            w.code === cleanKey ||
            w.id === resolvedCode ||
            w.code === resolvedCode ||
            w.name.toLowerCase() === cleanName ||
            cleanKey.toLowerCase().includes(w.name.toLowerCase())
          );
          const resolvedName = staticWard?.name || info.wardName;
          const targetWardId = staticWard?.id || resolvedCode || info.wardId;

          useFloodStore.getState().setSelectedBoundaryWard({
            city: info.city,
            wardId: targetWardId,
            wardName: resolvedName,
            wardCode: staticWard?.code || resolvedCode || info.wardCode,
          });
          useFloodStore.getState().setSelectedWard(targetWardId);
          useFloodStore.getState().clearRAGMessages();
          if (!useFloodStore.getState().ragPanelOpen) {
            useFloodStore.getState().toggleRAGPanel();
          }
        }
      } else {
        // Click on empty space — clear polygon highlight on map without wiping Emergency Terminal ward data
        wardLayer.clearSelection();
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      cancelled = true;
      handlerRef.current?.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
      handlerRef.current?.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      handlerRef.current?.destroy();
      wardLayerRef.current?.destroy();
      buildingLayerRef.current?.destroy();
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

      {mapReady && <WardTagLayer viewer={viewerRef.current} anchors={wardAnchors} wardMap={wardMap} />}

      {/* Comprehensive Dynamic Hover HUD Card with Full Decimals & All Key Factors */}
      {hoverInfo && (
        <div 
          className="absolute pointer-events-none px-4 py-3 bg-black/95 backdrop-blur-2xl border border-white/20 rounded-2xl text-white shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 min-w-[260px] max-w-[330px] transition-all duration-75 select-none"
          style={{ 
            left: Math.min(hoverInfo.x + 18, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 350), 
            top: Math.max(20, Math.min(hoverInfo.y - 40, (typeof window !== 'undefined' ? window.innerHeight : 800) - 290))
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10 gap-2">
            <div>
              <div className="font-bold text-[14px] text-white tracking-tight flex items-center gap-1.5 font-clash">
                <span>{hoverInfo.wardName || hoverInfo.wardCode}</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">{hoverInfo.city}</div>
            </div>
            {hoverInfo.alertLevel && (
              <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                hoverInfo.alertLevel === 'critical'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : hoverInfo.alertLevel === 'red'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                  : hoverInfo.alertLevel === 'amber'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>
                {hoverInfo.alertLevel === 'red' ? 'ELEVATED' : hoverInfo.alertLevel === 'amber' ? 'WATCH' : hoverInfo.alertLevel === 'critical' ? 'CRITICAL' : 'NOMINAL'}
              </span>
            )}
          </div>

          {/* Metric Grid with exact decimal pointers */}
          <div className="mt-2.5 space-y-1.5 text-[11px] font-mono">
            {/* Rainfall 3-Day & Peak */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">
                3-Day Rain:
              </span>
              <span className="font-bold text-white tabular-nums">
                {hoverInfo.rainfall3Day.toFixed(2)} mm
              </span>
            </div>

            {hoverInfo.rainfallDaily !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">
                  Peak Daily Rain:
                </span>
                <span className="font-semibold text-zinc-200 tabular-nums">
                  {hoverInfo.rainfallDaily.toFixed(2)} mm
                </span>
              </div>
            )}

            {/* Soil Moisture */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">
                Soil Moisture:
              </span>
              <span className="font-semibold text-zinc-200 tabular-nums">
                {hoverInfo.soilMoisture.toFixed(3)} ({(hoverInfo.soilMoisture * 100).toFixed(1)}%)
              </span>
            </div>

            {/* Land Surface Temp */}
            {hoverInfo.temp !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">
                  Surface Temp:
                </span>
                <span className="font-semibold text-zinc-300 tabular-nums">
                  {hoverInfo.temp.toFixed(1)} °C
                </span>
              </div>
            )}

            {/* Topography: Elevation & TWI */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-zinc-400">
                Elevation / TWI:
              </span>
              <span className="font-semibold text-zinc-300 tabular-nums">
                {hoverInfo.elevation !== undefined ? `${hoverInfo.elevation.toFixed(1)}m` : '--'} · TWI {hoverInfo.twi !== undefined ? hoverInfo.twi.toFixed(2) : '--'}
              </span>
            </div>

            {/* Susceptibility */}
            {hoverInfo.susceptibility !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">
                  Susceptibility:
                </span>
                <span className="font-semibold text-zinc-300 tabular-nums">
                  {hoverInfo.susceptibility.toFixed(2)} / 100
                </span>
              </div>
            )}

            {/* ML Ensemble Prediction */}
            {hoverInfo.riskProb !== undefined && (
              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between bg-white/[0.03] -mx-4 -mb-3 px-4 py-2 rounded-b-2xl">
                <span className="text-[10px] text-zinc-400 font-semibold">
                  ML Flood Risk:
                </span>
                <span className="text-[13px] font-bold text-white tabular-nums">
                  {(hoverInfo.riskProb * 100).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

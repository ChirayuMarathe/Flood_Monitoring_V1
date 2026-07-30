'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import {
  Viewer,
  Ion,
  createWorldTerrainAsync,
  createOsmBuildingsAsync,
  IonImageryProvider,
  GeoJsonDataSource,
  Color,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Cartesian3,
  Cartesian2,
  Math as CesiumMath,
  HeightReference,
  ColorMaterialProperty,
  ConstantProperty,
  Entity,
  JulianDate,
  UrlTemplateImageryProvider,
  ImageryLayer,
  Cartographic,
  Cesium3DTileStyle,
  NearFarScalar,
  LabelStyle,
  VerticalOrigin,
  DirectionalLight,
  SunLight,
} from 'cesium';
import { useFloodStore } from '@/store/flood-store';
import { mumbaiWards, getWardGeoJSON } from '@/lib/mumbai-data';

const MUMBAI_CENTER = { lng: 72.8777, lat: 19.076 };
const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN || '';

function getSeverityColor(severity: number, alpha: number = 0.35): Color {
  switch (severity) {
    case 3: return new Color(0.85, 0.27, 0.27, alpha);   // red
    case 2: return new Color(0.36, 0.55, 0.94, alpha);   // blue
    case 1: return new Color(0.55, 0.57, 0.62, alpha);   // muted grey
    default: return new Color(0.36, 0.55, 0.94, 0.08);   // very faint blue
  }
}

function getSeverityOutline(severity: number): Color {
  switch (severity) {
    case 3: return new Color(0.85, 0.27, 0.27, 0.8);
    case 2: return new Color(0.36, 0.55, 0.94, 0.5);
    case 1: return new Color(0.55, 0.57, 0.62, 0.3);
    default: return new Color(1, 1, 1, 0.06);
  }
}

export default function CesiumMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const wardDataSourceRef = useRef<GeoJsonDataSource | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const initRef = useRef(false);

  const wardSeverities = useFloodStore((s) => s.wardSeverities);
  const selectedWardId = useFloodStore((s) => s.selectedWardId);
  const setSelectedWard = useFloodStore((s) => s.setSelectedWard);
  const setPopupPosition = useFloodStore((s) => s.setPopupPosition);
  const setCriticalAlert = useFloodStore((s) => s.setCriticalAlert);

  // Update ward entity colors when severities change
  const updateWardColors = useCallback(() => {
    const ds = wardDataSourceRef.current;
    if (!ds) return;
    const entities = ds.entities.values;
    for (const entity of entities) {
      const wardId = entity.properties?.id?.getValue(JulianDate.now());
      if (!wardId) continue;
      const sev = wardSeverities[String(wardId)] ?? 0;
      const isSelected = String(wardId) === selectedWardId;

      if (entity.polygon) {
        entity.polygon.material = new ColorMaterialProperty(
          isSelected
            ? new Color(0.36, 0.55, 0.94, 0.45)
            : getSeverityColor(sev)
        );
        entity.polygon.outlineColor = new ConstantProperty(
          isSelected
            ? new Color(0.36, 0.55, 0.94, 0.9)
            : getSeverityOutline(sev)
        );
        entity.polygon.outlineWidth = new ConstantProperty(isSelected ? 3 : 1);

        // Water extrusion for flood-affected wards
        if (sev >= 2) {
          const waterHeight = sev === 3 ? 15 : 8; // exaggerated for visibility on terrain
          entity.polygon.height = new ConstantProperty(0);
          entity.polygon.extrudedHeight = new ConstantProperty(waterHeight);
          entity.polygon.heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
          entity.polygon.extrudedHeightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        } else {
          entity.polygon.extrudedHeight = undefined;
          entity.polygon.height = new ConstantProperty(0);
          entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        }
      }
    }
  }, [wardSeverities, selectedWardId]);

  useEffect(() => {
    updateWardColors();
  }, [updateWardColors]);

  // Fly to selected ward
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedWardId) return;
    const ward = mumbaiWards.find((w) => w.id === selectedWardId);
    if (!ward) return;

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(ward.center[0], ward.center[1], 300),
      orientation: {
        heading: CesiumMath.toRadians(45),
        pitch: CesiumMath.toRadians(-15),
        roll: 0,
      },
      duration: 1.5,
    });

    // Check if critical
    const sev = wardSeverities[selectedWardId] ?? 0;
    if (sev >= 3) {
      setCriticalAlert(true);
    }
  }, [selectedWardId, wardSeverities, setCriticalAlert]);

  // Initialize viewer
  useEffect(() => {
    if (initRef.current || !containerRef.current || !CESIUM_TOKEN) return;
    initRef.current = true;

    // Set Cesium base URL and token
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

    console.log('Cesium initialized! Container dimensions:', {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });

    viewerRef.current = viewer;

    // Remove default imagery and add dark basemap
    viewer.imageryLayers.removeAll();
    const darkTiles = new UrlTemplateImageryProvider({
      url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      credit: 'CARTO, OSM Contributors',
    });
    viewer.imageryLayers.addImageryProvider(darkTiles);

    // Enable real terrain
    createWorldTerrainAsync().then((terrain) => {
      viewer.scene.terrainProvider = terrain;
      viewer.scene.globe.depthTestAgainstTerrain = true;
      console.log('Cesium terrain loaded');
    }).catch(err => {
      console.error('Failed to load Cesium terrain:', err);
    });

    // Add OSM Buildings
    createOsmBuildingsAsync().then((osmBuildings) => {
      viewer.scene.primitives.add(osmBuildings);
      // Style buildings for visibility — light grey with slight transparency
      try {
        osmBuildings.style = new Cesium3DTileStyle({
          color: "color('rgb(130, 140, 160)', 0.8)",
        });
      } catch (e) {
        // Style not critical
      }
    }).catch(() => {
      // OSM Buildings optional, continue without
      console.warn('OSM Buildings not available');
    });

    // Scene settings — enable lighting for shadows and depth
    viewer.scene.globe.baseColor = Color.fromCssColorString('#0B0D12');
    viewer.scene.backgroundColor = Color.fromCssColorString('#0B0D12');
    viewer.scene.globe.enableLighting = true;
    try {
      viewer.scene.light = new DirectionalLight({
        direction: Cartesian3.normalize(
          new Cartesian3(0.5, -0.5, -0.7),
          new Cartesian3()
        ),
        intensity: 2.0,
      });
    } catch (e) {
      // DirectionalLight may not be available in all versions, use SunLight fallback
      viewer.scene.light = new SunLight();
    }
    viewer.scene.fog.enabled = false;
    viewer.scene.highDynamicRange = false;
    viewer.scene.globe.showGroundAtmosphere = true;

    // Hide credits bar background but keep attribution
    const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
    if (creditContainer) {
      creditContainer.style.background = 'transparent';
      creditContainer.style.opacity = '0.4';
      creditContainer.style.fontSize = '9px';
    }

    // Load ward boundary GeoJSON
    const geojson = getWardGeoJSON();
    GeoJsonDataSource.load(geojson, {
      stroke: Color.WHITE.withAlpha(0.1),
      fill: new Color(0.36, 0.55, 0.94, 0.1),
      strokeWidth: 1,
      clampToGround: true,
    }).then((ds) => {
      viewer.dataSources.add(ds);
      wardDataSourceRef.current = ds;

      // Apply initial colors
      const entities = ds.entities.values;
      for (const entity of entities) {
        if (entity.polygon) {
          entity.polygon.outline = new ConstantProperty(false); // Outlines unsupported on terrain
          entity.polygon.height = new ConstantProperty(0);
          entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        }
      }

      // Update with current severities
      const state = useFloodStore.getState();
      const severities = state.wardSeverities;
      for (const entity of entities) {
        const wardId = entity.properties?.id?.getValue(JulianDate.now());
        if (!wardId) continue;
        const sev = severities[String(wardId)] ?? 0;
        if (entity.polygon) {
          entity.polygon.material = new ColorMaterialProperty(getSeverityColor(sev));
          entity.polygon.outlineColor = new ConstantProperty(getSeverityOutline(sev));
        }
      }
    });

    // Add ward center markers as point entities
    for (const ward of mumbaiWards) {
      const sev = useFloodStore.getState().wardSeverities[ward.id] ?? 0;
      viewer.entities.add({
        id: `marker-${ward.id}`,
        position: Cartesian3.fromDegrees(ward.center[0], ward.center[1]),
        point: {
          pixelSize: 8,
          color: sev >= 3 ? Color.fromCssColorString('#D94444') : Color.fromCssColorString('#5B8DEF'),
          outlineColor: Color.fromCssColorString('#0B0D12'),
          outlineWidth: 2,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: ward.code,
          font: '11px sans-serif',
          fillColor: Color.fromCssColorString('#C1C5CD'),
          outlineColor: Color.fromCssColorString('#0B0D12'),
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.BOTTOM,
          pixelOffset: new Cartesian2(0, -14),
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new NearFarScalar(1000, 1, 50000, 0.4),
        },
        properties: { wardId: ward.id, wardName: ward.name },
      });
    }

    // Click handler
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handlerRef.current = handler;

    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.position);
      if (defined(picked) && picked.id) {
        let wardId: string | null = null;

        // Check if it's a marker entity
        if (picked.id instanceof Entity) {
          const props = picked.id.properties;
          if (props?.wardId) {
            wardId = String(props.wardId.getValue(JulianDate.now()));
          }
          // Check if it's a ward polygon from GeoJSON
          if (!wardId && props?.id) {
            wardId = String(props.id.getValue(JulianDate.now()));
          }
        }

        if (wardId) {
          setSelectedWard(wardId);
          setPopupPosition({ x: movement.position.x, y: movement.position.y });
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // Initial camera — safe overhead view to guarantee visibility
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(72.8777, 19.0760, 15000), // Mumbai Center, 15km high
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-60),
        roll: 0,
      },
      duration: 0,
    });

    return () => {
      handlerRef.current?.destroy();
      viewer.destroy();
      initRef.current = false;
    };
  }, [setSelectedWard, setPopupPosition, setCriticalAlert]);

  if (!CESIUM_TOKEN) {
    return (
      <div className="absolute inset-0 bg-[#0B0D12] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <p className="text-[14px] text-[#E1E4EA] font-medium mb-2">Cesium Token Required</p>
          <p className="text-[12px] text-[#525866]">
            Add your Cesium Ion token to <code className="text-[#5B8DEF]">.env</code> as{' '}
            <code className="text-[#5B8DEF]">NEXT_PUBLIC_CESIUM_TOKEN</code>
          </p>
          <p className="text-[10px] text-[#525866] mt-2">
            Sign up free at ion.cesium.com
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
    />
  );
}

'use client';

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import {
  Viewer,
  Ion,
  createWorldTerrainAsync,
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
} from 'cesium';
import { useFloodStore } from '@/store/flood-store';
import { WardLayer } from '@/lib/gis/WardLayer';
import { useState } from 'react';

const MUMBAI_CENTER = { lng: 72.8777, lat: 19.076 };
const PUNE_CENTER = { lng: 73.8567, lat: 18.5204 };
const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN || '';

export default function CesiumMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const wardLayerRef = useRef<WardLayer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const initRef = useRef(false);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, name: string } | null>(null);

  const activeCity = useFloodStore((s) => s.activeCity) as 'mumbai' | 'pune';

  // Handle city switching — reload authentic ward boundaries and fly camera
  useEffect(() => {
    const viewer = viewerRef.current;
    const wardLayer = wardLayerRef.current;
    if (!viewer || !wardLayer) return;

    // Load new city's raw boundary GeoJSON
    wardLayer.loadCityWards(activeCity);

    // Fly to new city
    const center = activeCity === 'pune' ? PUNE_CENTER : MUMBAI_CENTER;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(center.lng, center.lat, activeCity === 'pune' ? 25000 : 25000),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-90), // Top-down view for boundaries
        roll: 0,
      },
      duration: 2.0,
    });
  }, [activeCity]);

  // Initialize viewer
  useEffect(() => {
    if (initRef.current || !containerRef.current || !CESIUM_TOKEN) return;
    initRef.current = true;

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

    // Use Esri World Imagery
    viewer.imageryLayers.removeAll();
    const esriImagery = new UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maximumLevel: 19,
      credit: 'Esri, Maxar, Earthstar Geographics',
    });
    viewer.imageryLayers.addImageryProvider(esriImagery);

    // Enable terrain
    createWorldTerrainAsync().then((terrain) => {
      viewer.scene.terrainProvider = terrain;
      viewer.scene.globe.depthTestAgainstTerrain = true;
    }).catch(err => console.error('Failed to load terrain:', err));

    // Add OSM Buildings with Custom Shader
    createOsmBuildingsAsync().then((osmBuildings) => {
      osmBuildings.customShader = new CustomShader({
        lightingModel: LightingModel.PBR,
        fragmentShaderText: `
          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
          
          void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
            vec3 positionMC = fsInput.attributes.positionMC;
            vec3 normalEC = fsInput.attributes.normalEC;
            
            vec2 bldgId = floor(positionMC.xz / 8.0);
            float hash = fract(sin(dot(bldgId, vec2(127.1, 311.7))) * 43758.5453);
            
            vec3 wallColor;
            if (hash < 0.125) wallColor = vec3(0.95, 0.92, 0.85);
            else if (hash < 0.25) wallColor = vec3(0.88, 0.82, 0.72);
            else if (hash < 0.375) wallColor = vec3(0.85, 0.70, 0.55);
            else if (hash < 0.5) wallColor = vec3(0.92, 0.85, 0.82);
            else if (hash < 0.625) wallColor = vec3(0.78, 0.84, 0.90);
            else if (hash < 0.75) wallColor = vec3(0.90, 0.88, 0.80);
            else if (hash < 0.875) wallColor = vec3(0.82, 0.80, 0.75);
            else wallColor = vec3(0.94, 0.90, 0.78);
            
            float weathering = noise(positionMC.xz * 2.0) * 0.08;
            wallColor -= vec3(weathering);
            
            float verticalness = 1.0 - abs(dot(normalEC, vec3(0.0, 0.0, 1.0)));
            
            if (verticalness > 0.3) {
              float ux = abs(normalEC.x);
              float uy = abs(normalEC.y);
              vec2 wallUV = ux > uy ? positionMC.yz : positionMC.xz;
              
              float floorHeight = 3.2;
              float windowWidth = 2.5;
              float heightAboveGround = wallUV.y;
              
              if (heightAboveGround < 4.0) {
                float shopBayPos = mod(wallUV.x, 3.5) / 3.5;
                bool isShopWindow = shopBayPos > 0.08 && shopBayPos < 0.92 && heightAboveGround > 0.8 && heightAboveGround < 3.2;
                if (isShopWindow) {
                  material.diffuse = vec3(0.12, 0.14, 0.18);
                  material.roughness = 0.1;
                } else {
                  material.diffuse = wallColor * 0.55;
                  material.roughness = 0.9;
                }
                return;
              }
              
              float floorPos = mod(wallUV.y, floorHeight) / floorHeight;
              float bayPos = mod(wallUV.x, windowWidth) / windowWidth;
              
              float windowMarginV = 0.18;
              float windowMarginH = 0.22;
              float slabThickness = 0.08;
              
              bool isWindow = bayPos > windowMarginH && bayPos < (1.0 - windowMarginH) && floorPos > (windowMarginV + slabThickness) && floorPos < (1.0 - windowMarginV);
              bool isSlab = floorPos < slabThickness;
              
              float frameThick = 0.03;
              bool isFrame = !isWindow && ((bayPos > (windowMarginH - frameThick) && bayPos < (1.0 - windowMarginH + frameThick) && floorPos > (windowMarginV + slabThickness - frameThick) && floorPos < (1.0 - windowMarginV + frameThick)));
              
              float windowId = floor(wallUV.x / windowWidth) + floor(wallUV.y / floorHeight) * 37.0;
              bool isAC = fract(sin(windowId * 45.17) * 23421.6315) > 0.7 && bayPos > 0.75 && bayPos < 0.95 && floorPos > 0.15 && floorPos < 0.28;
              
              bool isBalcony = fract(sin(windowId * 78.3) * 12345.678) > 0.5 && floorPos > (windowMarginV + slabThickness - 0.02) && floorPos < (windowMarginV + slabThickness + 0.04) && bayPos > 0.1 && bayPos < 0.9;
              
              if (isWindow) {
                material.diffuse = vec3(0.15, 0.22, 0.32);
                material.roughness = 0.1;
                float brightness = 0.5 + 0.5 * fract(sin(windowId * 12.9898) * 43758.5453);
                material.diffuse *= brightness;
                material.diffuse = mix(material.diffuse, wallColor * 0.25, 0.15);
              } else if (isAC) {
                material.diffuse = vec3(0.45, 0.45, 0.43);
                material.roughness = 0.6;
              } else if (isFrame) {
                material.diffuse = wallColor * 0.5;
                material.roughness = 0.8;
              } else if (isBalcony) {
                material.diffuse = wallColor * 0.6;
                material.roughness = 0.85;
              } else if (isSlab) {
                material.diffuse = wallColor * 0.65;
                material.roughness = 0.85;
              } else {
                float wallNoise = noise(wallUV * 8.0) * 0.04;
                material.diffuse = wallColor - vec3(wallNoise);
                material.roughness = 0.7;
              }
            } else {
              material.diffuse = material.diffuse * 0.85;
              material.roughness = 0.9;
            }
          }
        `,
      });
      viewer.scene.primitives.add(osmBuildings);
    }).catch(() => console.warn('OSM Buildings not available'));

    // Scene settings
    viewer.scene.globe.baseColor = Color.fromCssColorString('#0B0D12');
    viewer.scene.globe.enableLighting = true;
    viewer.scene.light = new SunLight();
    
    // Lock clock to 10:00 AM IST (4:30 UTC)
    viewer.clock.currentTime = Cesium.JulianDate.fromIso8601('2024-07-15T04:30:00Z');
    viewer.clock.shouldAnimate = false;
    
    if (viewer.scene.verticalExaggeration !== undefined) {
      viewer.scene.verticalExaggeration = 1.5;
    }
    
    if (viewer.scene.postProcessStages) {
      viewer.scene.postProcessStages.fxaa.enabled = true;
    }

    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.00012;
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

    // Initialize the new modular WardLayer
    wardLayerRef.current = new WardLayer(viewer);
    
    // Load initial city
    const initialCity = useFloodStore.getState().activeCity as 'mumbai' | 'pune';
    wardLayerRef.current.loadCityWards(initialCity);
    
    // Fly to initial city
    const center = initialCity === 'pune' ? PUNE_CENTER : MUMBAI_CENTER;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(center.lng, center.lat, 25000), // High altitude to see full boundary
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-90), // Top-down
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
      
      // Reset previous hover
      if (hoveredEntity && hoveredEntity.polygon && originalMaterial) {
        hoveredEntity.polygon.material = originalMaterial;
        hoveredEntity = null;
        originalMaterial = null;
        setHoverInfo(null);
      }

      if (defined(picked) && picked.id instanceof Entity && picked.id.polygon) {
        hoveredEntity = picked.id;
        originalMaterial = hoveredEntity.polygon.material;
        
        // Highlight material (brighter blue fill)
        hoveredEntity.polygon.material = new ColorMaterialProperty(new Color(0.2, 0.6, 1.0, 0.4));
        
        const props = hoveredEntity.properties;
        const wardName = props?.normalizedWardName?.getValue(viewer.clock.currentTime);
        const wardCode = props?.normalizedWardCode?.getValue(viewer.clock.currentTime);
        
        if (wardName) {
          setHoverInfo({
            x: movement.endPosition.x,
            y: movement.endPosition.y,
            name: wardCode && wardCode !== wardName ? `${wardCode} - ${wardName}` : wardName
          });
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    return () => {
      handlerRef.current?.destroy();
      wardLayerRef.current?.removeLayer();
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
      <div 
        ref={containerRef} 
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
      />
      
      {/* Tooltip for Hover */}
      {hoverInfo && (
        <div 
          className="absolute pointer-events-none px-3 py-1.5 bg-[#0A0A0A]/80 backdrop-blur-md border border-[#ffffff1a] rounded-md text-white text-sm font-medium whitespace-nowrap z-50 transition-opacity duration-75"
          style={{ 
            left: hoverInfo.x + 15, 
            top: hoverInfo.y + 15 
          }}
        >
          {hoverInfo.name}
        </div>
      )}
    </div>
  );
}

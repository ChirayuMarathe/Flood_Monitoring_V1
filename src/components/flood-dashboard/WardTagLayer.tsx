'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as Cesium from 'cesium';
import { useFloodStore } from '@/store/flood-store';
import { wardProfileKey, type HazardType, type WardRiskProfile } from '@/lib/risk/WardRiskProfile';

/**
 * Floating geolocation tags: real DOM cards anchored to ward centroids in the
 * 3D scene. Positions are written straight to element styles from Cesium's
 * preRender, never through React state — re-rendering a hundred cards every
 * frame would stall the map.
 */

const SEVERITY: Record<number, { color: string; label: string }> = {
  0: { color: '#22C55E', label: 'NORMAL' },
  1: { color: '#EAB308', label: 'WATCH' },
  2: { color: '#F97316', label: 'ELEVATED' },
  3: { color: '#EF4444', label: 'CRITICAL' },
};

const HAZARD_LABEL: Record<HazardType, string> = {
  rainfall_overflow: 'Rainfall overflow',
  topographic_pooling: 'Pooling basin',
  tidal_backflow: 'Tidal backflow',
  river_overflow: 'River overflow',
  compound: 'Compound risk',
};

/** Tags are only legible from reasonably close, and only worth the clutter for real risk. */
const MAX_TAG_DISTANCE_M = 40_000;
const MAX_VISIBLE_TAGS = 14;

// Keep in step with HazardPins.getHeight so cards land on top of their pillar.
const PILLAR_BASE_M = 500;
const PILLAR_PER_SEVERITY_M = 666;

interface Props {
  viewer: Cesium.Viewer | null;
  anchors: { wardId: string; position: Cesium.Cartesian3 }[];
}

export default function WardTagLayer({ viewer, anchors }: Props) {
  const wardRiskProfiles = useFloodStore((s) => s.wardRiskProfiles);
  const activeCity = useFloodStore((s) => s.activeCity);
  const setSelectedWard = useFloodStore((s) => s.setSelectedWard);
  const elementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Highest-risk wards first — those are the ones worth a card on screen.
  const tags = useMemo(() => {
    const scratchNormal = new Cesium.Cartesian3();
    const scratchOffset = new Cesium.Cartesian3();

    return anchors
      .map((a) => ({ ...a, profile: wardRiskProfiles[wardProfileKey(a.wardId)] as WardRiskProfile | undefined }))
      .filter((t): t is typeof t & { profile: WardRiskProfile } =>
        !!t.profile && t.profile.city === activeCity)
      .sort((a, b) => b.profile.overallSeverity - a.profile.overallSeverity)
      .slice(0, MAX_VISIBLE_TAGS)
      .map((t) => {
        // Sit the card on top of the ward's hazard pillar rather than at ground
        // level, so the two read as one object. Mirrors HazardPins.getHeight.
        Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(t.position, scratchNormal);
        Cesium.Cartesian3.multiplyByScalar(
          scratchNormal, PILLAR_BASE_M + t.profile.overallSeverity * PILLAR_PER_SEVERITY_M, scratchOffset
        );
        const position = Cesium.Cartesian3.add(t.position, scratchOffset, new Cesium.Cartesian3());
        return { ...t, position };
      });
  }, [anchors, wardRiskProfiles, activeCity]);

  useEffect(() => {
    if (!viewer || tags.length === 0) return;

    const scratch = new Cesium.Cartesian2();
    const camPos = new Cesium.Cartesian3();
    const normal = new Cesium.Cartesian3();
    const toCamera = new Cesium.Cartesian3();

    const update = () => {
      if (viewer.isDestroyed()) return;
      Cesium.Cartesian3.clone(viewer.camera.positionWC, camPos);

      for (const tag of tags) {
        const el = elementsRef.current.get(tag.wardId);
        if (!el) continue;

        const distance = Cesium.Cartesian3.distance(camPos, tag.position);
        // Drop tags on the far side of the globe: the surface normal at the
        // anchor points away from the camera once it's over the horizon.
        Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(tag.position, normal);
        Cesium.Cartesian3.subtract(camPos, tag.position, toCamera);
        const visible =
          distance < MAX_TAG_DISTANCE_M && Cesium.Cartesian3.dot(normal, toCamera) > 0;

        if (!visible) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          continue;
        }

        const win = Cesium.SceneTransforms.worldToWindowCoordinates(
          viewer.scene, tag.position, scratch
        );
        if (!win) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          continue;
        }

        // Fade out over the last quarter of the range instead of popping off.
        const fade = Math.min(1, (MAX_TAG_DISTANCE_M - distance) / (MAX_TAG_DISTANCE_M * 0.25));
        el.style.transform = `translate3d(${Math.round(win.x)}px, ${Math.round(win.y)}px, 0) translate(-50%, -100%)`;
        el.style.opacity = String(fade);
        el.style.pointerEvents = 'auto';
      }
    };

    const remove = viewer.scene.preRender.addEventListener(update);
    update();
    return () => remove();
  }, [viewer, tags]);

  if (!viewer) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
      {tags.map(({ wardId, profile }) => {
        const sev = SEVERITY[profile.overallSeverity];
        const urgent =
          profile.estimatedTimeToThresholdHours !== null &&
          profile.estimatedTimeToThresholdHours < 6;

        return (
          <div
            key={wardId}
            ref={(el) => {
              if (el) elementsRef.current.set(wardId, el);
              else elementsRef.current.delete(wardId);
            }}
            onClick={() => setSelectedWard(wardId)}
            className="absolute top-0 left-0 will-change-transform cursor-pointer select-none"
            style={{ opacity: 0, transition: 'opacity 180ms ease-out' }}
          >
            <div
              className="rounded-lg border bg-[#0A0A0A]/90 backdrop-blur-md shadow-2xl px-2.5 py-2 min-w-[132px]"
              style={{ borderColor: `${sev.color}55` }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgent ? 'animate-pulse' : ''}`}
                  style={{ background: sev.color, boxShadow: `0 0 6px ${sev.color}` }}
                />
                <span className="text-[11px] font-semibold text-white leading-none truncate">
                  {profile.wardName}
                </span>
              </div>

              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-[15px] font-semibold tabular-nums leading-none" style={{ color: sev.color }}>
                  {profile.rainfall3DaySum.toFixed(0)}
                </span>
                <span className="text-[9px] text-gray-500">mm / 3d</span>
              </div>

              <div className="mt-1 text-[9px] font-medium tracking-wide" style={{ color: sev.color }}>
                {sev.label}
              </div>
              <div className="text-[9px] text-gray-400 leading-tight">
                {HAZARD_LABEL[profile.primaryHazard]}
              </div>

              {urgent && (
                <div className="mt-1 text-[9px] font-mono text-[#EF4444]">
                  {profile.estimatedTimeToThresholdHours! < 1
                    ? '<1h to threshold'
                    : `~${profile.estimatedTimeToThresholdHours!.toFixed(0)}h to threshold`}
                </div>
              )}
            </div>

            {/* leader line down to the anchor point */}
            <div
              className="mx-auto w-px"
              style={{ height: 14, background: `linear-gradient(${sev.color}, transparent)` }}
            />
          </div>
        );
      })}
    </div>
  );
}

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

const SEVERITY: Record<number, { color: string; label: string; bgBadge: string; textBadge: string }> = {
  0: { color: '#71717A', label: 'NOMINAL', bgBadge: 'bg-white/[0.04]', textBadge: 'text-zinc-400' },
  1: { color: '#A1A1AA', label: 'WATCH', bgBadge: 'bg-white/[0.10]', textBadge: 'text-zinc-200' },
  2: { color: '#E4E4E7', label: 'ELEVATED', bgBadge: 'bg-white/[0.20]', textBadge: 'text-white' },
  3: { color: '#FFFFFF', label: 'CRITICAL', bgBadge: 'bg-white', textBadge: 'text-black font-bold' },
};

const HAZARD_LABEL: Record<HazardType, string> = {
  rainfall_overflow: 'Rainfall overflow',
  topographic_pooling: 'Pooling basin',
  tidal_backflow: 'Tidal backflow',
  river_overflow: 'River overflow',
  compound: 'Compound risk',
};

/** Tags are only legible from reasonably close, and only worth the clutter for real risk. */
const MAX_TAG_DISTANCE_M = 35_000;
const MAX_VISIBLE_TAGS = 8;

// Sit right above ground level (no cylinders anymore, hovering cleanly over ward polygons)
const HOVER_BASE_M = 60;
const HOVER_PER_SEVERITY_M = 35;

interface Props {
  viewer: Cesium.Viewer | null;
  anchors: { wardId: string; position: Cesium.Cartesian3 }[];
}

export default function WardTagLayer({ viewer, anchors }: Props) {
  const wardRiskProfiles = useFloodStore((s) => s.wardRiskProfiles);
  const activeCity = useFloodStore((s) => s.activeCity);
  const setSelectedWard = useFloodStore((s) => s.setSelectedWard);
  const elementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Show only elevated/critical risk wards first to keep UI clean and eliminate clutter/lag
  const tags = useMemo(() => {
    const scratchNormal = new Cesium.Cartesian3();
    const scratchOffset = new Cesium.Cartesian3();

    return anchors
      .map((a) => ({ ...a, profile: wardRiskProfiles[wardProfileKey(a.wardId)] as WardRiskProfile | undefined }))
      .filter((t): t is typeof t & { profile: WardRiskProfile } =>
        !!t.profile && t.profile.city === activeCity && t.profile.overallSeverity >= 1)
      .sort((a, b) => b.profile.overallSeverity - a.profile.overallSeverity)
      .slice(0, MAX_VISIBLE_TAGS)
      .map((t) => {
        // Sit the card slightly above the ground polygon
        Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(t.position, scratchNormal);
        Cesium.Cartesian3.multiplyByScalar(
          scratchNormal, HOVER_BASE_M + t.profile.overallSeverity * HOVER_PER_SEVERITY_M, scratchOffset
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
        const sev = SEVERITY[profile.overallSeverity] || SEVERITY[0];
        const isCritical = profile.overallSeverity === 3;
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
              className={`rounded-xl border bg-black/90 backdrop-blur-xl shadow-[0_16px_36px_rgba(0,0,0,0.8)] px-3 py-2 min-w-[136px] transition-all hover:border-white/60 ${
                isCritical ? 'border-white ring-1 ring-white/30' : 'border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-white/10">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCritical ? 'bg-white shadow-[0_0_8px_#ffffff] animate-ping' : 'bg-zinc-400'}`}
                  />
                  <span className="text-[11px] font-semibold text-white leading-none truncate">
                    {profile.wardName}
                  </span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono ${sev.bgBadge} ${sev.textBadge}`}>
                  {sev.label}
                </span>
              </div>

              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className={`text-[14px] font-semibold tabular-nums leading-none ${isCritical ? 'text-white' : 'text-zinc-200'}`}>
                    {profile.rainfall3DaySum.toFixed(0)}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">mm/3d</span>
                </div>
                <div className="text-[9px] text-zinc-400 leading-tight truncate text-right">
                  {HAZARD_LABEL[profile.primaryHazard]}
                </div>
              </div>

              {urgent && (
                <div className="mt-1.5 pt-1 border-t border-white/10 text-[9px] font-mono text-zinc-300 flex items-center justify-between">
                  <span className="text-zinc-500">Threshold:</span>
                  <span className="text-white font-semibold">
                    {profile.estimatedTimeToThresholdHours! < 1
                      ? '<1h surge'
                      : `~${profile.estimatedTimeToThresholdHours!.toFixed(0)}h`}
                  </span>
                </div>
              )}
            </div>

            {/* Subtle leader line down to the polygon centroid */}
            <div
              className="mx-auto w-px"
              style={{ height: 10, background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)' }}
            />
          </div>
        );
      })}
    </div>
  );
}

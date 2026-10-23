'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as Cesium from 'cesium';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { wardProfileKey, type HazardType, type WardRiskProfile } from '@/lib/risk/WardRiskProfile';
import { MUMBAI_OBJECTID_TO_CODE } from '@/lib/gis/WardData';
import type { WardPrediction } from '@/lib/prediction-service';

/**
 * Floating geolocation tags: real DOM cards anchored to ward centroids in the
 * 3D scene. Driven dynamically by the Type 3 RF+GBM ensemble predictions and
 * operational thresholds from thresholds.json.
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

const MAX_TAG_DISTANCE_M = 20_000;
const MAX_VISIBLE_TAGS = 3;

const HOVER_BASE_M = 60;
const HOVER_PER_SEVERITY_M = 35;

interface Props {
  viewer: Cesium.Viewer | null;
  anchors: { wardId: string; position: Cesium.Cartesian3 }[];
  wardMap?: Map<string, WardPrediction>;
}

export default function WardTagLayer({ viewer, anchors, wardMap }: Props) {
  const wardRiskProfiles = useFloodStore((s) => s.wardRiskProfiles);
  const livePredictions = useFloodStore((s) => s.livePredictions);
  const wardDailyObservations = useFloodStore((s) => s.wardDailyObservations);
  const activeCity = useFloodStore((s) => s.activeCity);
  const setSelectedWard = useFloodStore((s) => s.setSelectedWard);
  const elementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Show ONLY critical risk wards on zoom, capped to top 3 to prevent visual overlap
  const tags = useMemo(() => {
    const scratchNormal = new Cesium.Cartesian3();
    const scratchOffset = new Cesium.Cartesian3();

    const seenAnchors = new Set<string>();
    const uniqueAnchors = anchors.filter((a) => {
      const k = a.wardId;
      if (!k || seenAnchors.has(k)) return false;
      seenAnchors.add(k);
      return true;
    });

    const cityWards = getWardsForCity(activeCity);

    const candidates = uniqueAnchors
      .map((a) => {
        const bareKey = wardProfileKey(a.wardId);
        const cleanKey = a.wardId.replace(/^(mumbai|pune|navi_mumbai)_/, '');
        const resolvedCode = (activeCity === 'mumbai' && MUMBAI_OBJECTID_TO_CODE[cleanKey])
          ? MUMBAI_OBJECTID_TO_CODE[cleanKey]
          : cleanKey;

        const staticWard = cityWards.find((w) =>
          w.id === a.wardId ||
          w.code === a.wardId ||
          w.id === bareKey ||
          w.code === bareKey ||
          w.id === cleanKey ||
          w.code === cleanKey ||
          w.id === resolvedCode ||
          w.code === resolvedCode
        );

        const profile = (
          wardRiskProfiles[resolvedCode] ||
          wardRiskProfiles[bareKey] ||
          wardRiskProfiles[a.wardId] ||
          wardRiskProfiles[cleanKey] ||
          wardRiskProfiles[`mumbai_${resolvedCode}`]
        ) as WardRiskProfile | undefined;

        const pred =
          wardMap?.get(resolvedCode) ||
          wardMap?.get(a.wardId) ||
          wardMap?.get(bareKey) ||
          wardMap?.get(cleanKey) ||
          (staticWard?.code ? wardMap?.get(staticWard.code) : undefined) ||
          (staticWard?.id ? wardMap?.get(staticWard.id) : undefined) ||
          (staticWard?.name ? wardMap?.get(staticWard.name) : undefined) ||
          wardMap?.get(`pune_${cleanKey}`) ||
          wardMap?.get(`Pune_${cleanKey}`) ||
          wardMap?.get(`mumbai_${resolvedCode}`) ||
          livePredictions[resolvedCode] ||
          livePredictions[a.wardId] ||
          livePredictions[bareKey] ||
          livePredictions[cleanKey] ||
          (profile?.wardName ? livePredictions[profile.wardName] : undefined);

        // Strictly align severity with real AIDT ML ensemble alert_level when available
        const sev = pred
          ? (pred.alert_level === 'critical' ? 3 : pred.alert_level === 'red' ? 2 : pred.alert_level === 'amber' ? 1 : 0)
          : (profile?.overallSeverity ?? 0);

        return {
          ...a,
          profile,
          pred,
          severity: sev,
          staticWard,
        };
      });

    // STRICT: Only show CRITICAL wards on zoom (priority to live ML prediction)
    const criticalOnly = candidates.filter(
      (t) => t.pred ? t.pred.alert_level === 'critical' : t.severity === 3
    );

    return criticalOnly
      .sort((a, b) => {
        const probA = a.pred?.type3_prob ?? (a.severity / 3);
        const probB = b.pred?.type3_prob ?? (b.severity / 3);
        return probB - probA;
      })
      .slice(0, MAX_VISIBLE_TAGS)
      .map((t) => {
        Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(t.position, scratchNormal);
        Cesium.Cartesian3.multiplyByScalar(
          scratchNormal, HOVER_BASE_M + t.severity * HOVER_PER_SEVERITY_M, scratchOffset
        );
        const position = Cesium.Cartesian3.add(t.position, scratchOffset, new Cesium.Cartesian3());
        return { ...t, position };
      });
  }, [anchors, wardRiskProfiles, livePredictions, activeCity]);

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
      {tags.map((tag, idx) => {
        const { wardId, profile, pred, severity } = tag;
        const sev = SEVERITY[severity] || SEVERITY[0];
        const isCritical = severity === 3;
        const cityWards = getWardsForCity(activeCity);
        const cleanKey = wardId.replace(/^(mumbai|pune|navi_mumbai)_/, '');
        const resolvedCode = (activeCity === 'mumbai' && MUMBAI_OBJECTID_TO_CODE[cleanKey])
          ? MUMBAI_OBJECTID_TO_CODE[cleanKey]
          : cleanKey;
        const bareKey = wardProfileKey(wardId);
        const staticWard = cityWards.find((w) =>
          w.id === wardId ||
          w.code === wardId ||
          w.id === bareKey ||
          w.code === bareKey ||
          w.id === cleanKey ||
          w.code === cleanKey ||
          w.id === resolvedCode ||
          w.code === resolvedCode
        );
        const displayName = staticWard?.name || profile?.wardName || pred?.ward_code || resolvedCode;

        const obs =
          wardDailyObservations[resolvedCode] ||
          wardDailyObservations[bareKey] ||
          wardDailyObservations[wardId] ||
          wardDailyObservations[cleanKey] ||
          wardDailyObservations[`BMC_${resolvedCode}`] ||
          wardDailyObservations[`BMC_${bareKey}`] ||
          wardDailyObservations[`NMMC_${bareKey}`] ||
          wardDailyObservations[`Pune_${bareKey}`];

        const fallbackRain = useFloodStore.getState().currentTimeData()?.rainfall_3day_sum ?? 186.4;
        const r3dVal = obs?.r3d ?? profile?.rainfall3DaySum ?? fallbackRain;
        const probText = pred
          ? `${(pred.type3_prob * 100).toFixed(1)}%`
          : `${r3dVal.toFixed(2)}mm`;

        return (
          <div
            key={`${wardId}-${idx}`}
            ref={(el) => {
              if (el) elementsRef.current.set(wardId, el);
              else elementsRef.current.delete(wardId);
            }}
            onClick={() => {
              const selKey = staticWard?.id || resolvedCode || wardId;
              setSelectedWard(selKey);
              if (staticWard) {
                useFloodStore.getState().setSelectedBoundaryWard({
                  city: activeCity,
                  wardId: selKey,
                  wardName: staticWard.name,
                  wardCode: staticWard.code,
                });
              }
            }}
            className="absolute top-0 left-0 will-change-transform cursor-pointer select-none pointer-events-auto"
            style={{ opacity: 0, transition: 'opacity 180ms ease-out', pointerEvents: 'auto' }}
          >
            <div
              className={`rounded-xl border bg-black/95 backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.85)] px-3 py-2 min-w-[155px] transition-all hover:border-white/60 ${
                isCritical ? 'border-white ring-1 ring-white/30' : 'border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-white/10">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCritical ? 'bg-white shadow-[0_0_8px_#ffffff] animate-ping' : 'bg-zinc-400'}`}
                  />
                  <span className="text-[11px] font-semibold text-white leading-none truncate">
                    {displayName}
                  </span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono font-semibold ${
                    pred?.alert_level === 'critical' || severity === 3
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : pred?.alert_level === 'red' || severity === 2
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : pred?.alert_level === 'amber' || severity === 1
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {pred ? pred.alert_level.toUpperCase() : sev.label}
                </span>
              </div>

              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className={`text-[15px] font-bold font-clash tabular-nums leading-none ${isCritical ? 'text-white' : 'text-zinc-200'}`}>
                    {probText}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">{pred ? 'flood risk' : '3d rain'}</span>
                </div>
                {pred ? (
                  <div className="text-[9px] text-zinc-400 font-mono text-right">
                    RF: {(pred.rf_prob * 100).toFixed(0)}% · GBM: {(pred.gbm_prob * 100).toFixed(0)}%
                  </div>
                ) : (
                  <div className="text-[9px] text-zinc-400 leading-tight truncate text-right">
                    {profile?.primaryHazard ? HAZARD_LABEL[profile.primaryHazard] : 'Basin Surge'}
                  </div>
                )}
              </div>

              {/* Factors subrow: Rainfall & Soil Moisture with full decimal pointers */}
              {profile && (
                <div className="mt-1.5 pt-1 border-t border-white/10 text-[9.5px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>Rain: {profile.rainfall3DaySum.toFixed(2)}mm</span>
                  <span>Soil: {(profile.soilMoisture * 100).toFixed(1)}%</span>
                </div>
              )}

              {pred && (
                <div className="mt-1 pt-1 border-t border-white/10 text-[9px] font-mono flex items-center justify-between">
                  <span className="text-zinc-500">ML Alert:</span>
                  <span
                    className={
                      pred.alert_level === 'critical'
                        ? 'text-red-400 font-semibold'
                        : pred.alert_level === 'red'
                        ? 'text-orange-400 font-semibold'
                        : pred.alert_level === 'amber'
                        ? 'text-yellow-300 font-semibold'
                        : 'text-emerald-400 font-medium'
                    }
                  >
                    {pred.alert_level === 'critical'
                      ? 'Critical Surge (>85%)'
                      : pred.alert_level === 'red'
                      ? 'Elevated Risk (>45%)'
                      : pred.alert_level === 'amber'
                      ? 'Watch Status (>20%)'
                      : 'Safe Margin'}
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

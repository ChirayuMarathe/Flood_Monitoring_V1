"use client";
import { useEffect, useRef } from "react";
import createGlobe from "cobe";

// ─── Financial hub markers (exact copy from ChainFund Globe.jsx) ──────────
const MARKERS = [
  { location: [12.9716, 77.5946] as [number, number], size: 0.055 },  // Bangalore
  { location: [40.7128, -74.006] as [number, number], size: 0.06 },   // New York
  { location: [51.5074, -0.1278] as [number, number], size: 0.055 },  // London
  { location: [1.3521, 103.8198] as [number, number], size: 0.05 },   // Singapore
  { location: [35.6762, 139.6503] as [number, number], size: 0.045 }, // Tokyo
  { location: [25.2048, 55.2708] as [number, number], size: 0.045 },  // Dubai
  { location: [37.7749, -122.4194] as [number, number], size: 0.05 }, // San Francisco
  { location: [22.3193, 114.1694] as [number, number], size: 0.045 }, // Hong Kong
  { location: [48.8566, 2.3522] as [number, number], size: 0.04 },    // Paris
  { location: [-23.5505, -46.6333] as [number, number], size: 0.04 }, // São Paulo
  { location: [55.7558, 37.6176] as [number, number], size: 0.04 },   // Moscow
  { location: [19.076, 72.8777] as [number, number], size: 0.045 },   // Mumbai
];

export function CobeGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(1.15);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const tryInit = () => {
      if (destroyed) return;
      
      const width = canvas.offsetWidth;
      
      // If canvas has no width yet, retry after a frame
      if (width < 10) {
        retryTimer = setTimeout(tryInit, 100);
        return;
      }

      // Clean up previous instance if any
      if (globeRef.current) {
        globeRef.current.destroy();
        globeRef.current = null;
      }

      const pixelRatio = Math.min(window.devicePixelRatio, 2);

      globeRef.current = createGlobe(canvas, {
        devicePixelRatio: pixelRatio,
        width: width * 2,
        height: width * 2,
        phi: phiRef.current,
        theta: 0.30,          // ~17° downward tilt
        dark: 1,
        diffuse: 1.7,         // softer diffuse
        mapSamples: 22000,
        mapBrightness: 4.8,   // subdued dot brightness
        baseColor: [0.06, 0.06, 0.07],
        markerColor: [1.0, 1.0, 1.0],
        glowColor: [0.42, 0.42, 0.50],
        scale: 1,
        markers: MARKERS,
        onRender: (state) => {
          if (destroyed) return;
          phiRef.current += 0.0020;  // slow rotation
          state.phi = phiRef.current;
          state.width = width * 2;
          state.height = width * 2;
        },
      });

      // Fade in
      setTimeout(() => {
        if (canvas && !destroyed) {
          canvas.style.opacity = "1";
        }
      }, 200);
    };

    // Wait one frame for layout, then try
    requestAnimationFrame(() => {
      tryInit();
    });

    // Also handle resize
    const onResize = () => {
      tryInit();
    };
    window.addEventListener("resize", onResize);

    return () => {
      destroyed = true;
      clearTimeout(retryTimer);
      window.removeEventListener("resize", onResize);
      globeRef.current?.destroy();
      globeRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        opacity: 0,
        transition: "opacity 1.2s ease",
        contain: "layout paint size",
      }}
      aria-hidden="true"
    />
  );
}

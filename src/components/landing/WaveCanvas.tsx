"use client";
import { useEffect, useRef } from "react";

const WAVE_PALETTE = [
  { offset: 0, amplitude: 70, frequency: 0.003, color: "rgba(255,255,255,0.45)", opacity: 0.28 },
  { offset: Math.PI / 2, amplitude: 90, frequency: 0.0026, color: "rgba(255,255,255,0.30)", opacity: 0.20 },
  { offset: Math.PI, amplitude: 60, frequency: 0.0034, color: "rgba(200,200,200,0.25)", opacity: 0.15 },
  { offset: Math.PI * 1.5, amplitude: 80, frequency: 0.0022, color: "rgba(160,160,160,0.15)", opacity: 0.12 },
  { offset: Math.PI * 2, amplitude: 55, frequency: 0.004, color: "rgba(255,255,255,0.10)", opacity: 0.08 },
];

export function WaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number, time = 0;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouseInfluence = prefersReduced ? 10 : 65;
    const radius = prefersReduced ? 160 : 300;
    const smoothing = prefersReduced ? 0.04 : 0.09;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const c = { x: canvas.width / 2, y: canvas.height / 2 };
      mouseRef.current = targetMouse.current = { ...c };
    };
    const onMove = (e: MouseEvent) => { targetMouse.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => {
      const c = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      mouseRef.current = targetMouse.current = { ...c };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const drawWave = (wave: any) => {
      ctx.save();
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 4) {
        const dx = x - mouseRef.current.x;
        const dy = canvas.height / 2 - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / radius);
        const mouseEffect =
          influence * mouseInfluence *
          Math.sin(time * 0.001 + x * 0.01 + wave.offset);

        const y =
          canvas.height / 2 +
          Math.sin(x * wave.frequency + time * 0.002 + wave.offset) * wave.amplitude +
          Math.sin(x * wave.frequency * 0.4 + time * 0.003) * (wave.amplitude * 0.45) +
          mouseEffect;

        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = wave.color;
      ctx.globalAlpha = wave.opacity;
      ctx.shadowBlur = 20;
      ctx.shadowColor = wave.color;
      ctx.stroke();
      ctx.restore();
    };

    const animate = () => {
      time += 1;
      mouseRef.current.x += (targetMouse.current.x - mouseRef.current.x) * smoothing;
      mouseRef.current.y += (targetMouse.current.y - mouseRef.current.y) * smoothing;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      WAVE_PALETTE.forEach(drawWave);

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}

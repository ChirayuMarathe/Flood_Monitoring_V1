"use client";
import React, { useEffect, useRef } from 'react';
import { ArrowRight, ChevronDown, ShieldAlert, Activity } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CobeGlobe } from './CobeGlobe';
import { TopNavbar } from '../layout/TopNavbar';

const WAVE_PALETTE = [
  { offset: 0, amplitude: 70, frequency: 0.003, color: "rgba(255,255,255,0.55)", opacity: 0.38 },
  { offset: Math.PI / 2, amplitude: 90, frequency: 0.0026, color: "rgba(255,255,255,0.40)", opacity: 0.26 },
  { offset: Math.PI, amplitude: 60, frequency: 0.0034, color: "rgba(200,200,200,0.35)", opacity: 0.20 },
  { offset: Math.PI * 1.5, amplitude: 80, frequency: 0.0022, color: "rgba(160,160,160,0.20)", opacity: 0.16 },
  { offset: Math.PI * 2, amplitude: 55, frequency: 0.004, color: "rgba(255,255,255,0.12)", opacity: 0.12 },
];

const WaveCanvas = () => {
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
      ctx.lineWidth = 2;
      ctx.strokeStyle = wave.color;
      ctx.globalAlpha = wave.opacity;
      ctx.shadowBlur = 28;
      ctx.shadowColor = wave.color;
      ctx.stroke();
      ctx.restore();
    };

    const animate = () => {
      time += 1;
      mouseRef.current.x += (targetMouse.current.x - mouseRef.current.x) * smoothing;
      mouseRef.current.y += (targetMouse.current.y - mouseRef.current.y) * smoothing;

      ctx.fillStyle = "#000000"; // Changed back to true black for exact Chainfund matching
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
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.9, staggerChildren: 0.14 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
};

export default function HeroSection() {
  const globeWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = globeWrapRef.current;
    const handleScroll = () => {
      if (!el) return;
      el.style.transform = `translateY(calc(-50% + ${window.scrollY * 0.08}px))`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-satoshi overflow-hidden flex flex-col relative">
      
      {/* Navbar Section */}
      <TopNavbar />

      {/* =========================================
          2. HERO SECTION
          ========================================= */}
      <main className="relative flex-grow flex items-center w-full overflow-hidden mt-[-80px]"> 
        
        {/* Wave Background */}
        <WaveCanvas />

        {/* Globe Layer */}
        <div
          ref={globeWrapRef}
          className="absolute pointer-events-none hidden lg:block"
          style={{
            right: "-10%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "min(80vw, 1040px)",
            aspectRatio: "1 / 1",
            zIndex: 2,
          }}
        >
          <div style={{ width: "100%", height: "100%", transform: "rotate(-10deg) scale(1.06)", transformOrigin: "center center" }}>
            <CobeGlobe />
          </div>
        </div>

        {/* Gradients */}
        <div
          className="absolute inset-0 pointer-events-none hidden lg:block"
          style={{
            zIndex: 3,
            background: "linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.42) 18%, rgba(0,0,0,0.28) 42%, rgba(0,0,0,0.06) 68%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 3,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 18%, transparent 80%, rgba(0,0,0,0.75) 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none hidden lg:block"
          style={{
            zIndex: 3,
            background: "radial-gradient(ellipse 52% 72% at 73% 50%, transparent 36%, rgba(0,0,0,0.22) 60%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* Content (Framer Motion) */}
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-start w-full relative z-10 pt-32 lg:pt-0">
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full lg:w-[55%] flex flex-col gap-8 z-20"
          >
            
            <motion.div variants={itemVariants} className="flex flex-col gap-6">
              <span className="text-[11px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                AI-Driven • Real-Time • Predictive
              </span>
              
              <h1 className="text-6xl lg:text-[80px] leading-[1.05] font-medium font-clash tracking-tight">
                Predict the <br />
                Future <br />
                <span className="text-gray-500">of Flooding.</span>
              </h1>

              <p className="text-gray-400 text-base lg:text-lg max-w-[28rem] leading-relaxed mt-2">
                An AI-powered digital twin for Mumbai. Real-time ward-level severity predictions, dynamic evacuation routing, and actionable emergency alerts based on 34 years of climate data.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mt-2">
              <Link href="/map" className="group flex items-center justify-center gap-2 bg-white text-[#0A0A0A] px-7 py-3.5 rounded-full font-medium hover:bg-gray-200 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.12)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]">
                Launch Simulation 
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/dashboard" className="flex items-center justify-center px-7 py-3.5 rounded-full font-medium border border-white/15 text-white/60 hover:text-white/80 hover:border-white/30 transition-all duration-300">
                View Live Wards
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500 tracking-[0.15em] uppercase mt-6 border-b border-white/10 pb-8">
              <span className="hover:text-white cursor-pointer transition-colors">3D Topography</span>
              <span className="w-[1px] h-3 bg-white/20"></span>
              <span className="hover:text-white cursor-pointer transition-colors">Weather Triggers</span>
              <span className="w-[1px] h-3 bg-white/20"></span>
              <span className="hover:text-white cursor-pointer transition-colors">RAG Alerts</span>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-start gap-0 mt-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-[32px] font-bold font-clash text-white">24</span>
                <span className="text-[9px] uppercase tracking-[0.15em] text-gray-500">Monitored Wards</span>
              </div>
              
              <span className="block w-[1px] h-[36px] bg-white/10 mx-8 mt-2" />
              
              <div className="flex flex-col gap-1.5">
                <span className="text-[32px] font-bold font-clash text-white">&lt; 1s</span>
                <span className="text-[9px] uppercase tracking-[0.15em] text-gray-500">AI Prediction</span>
              </div>
              
              <span className="block w-[1px] h-[36px] bg-white/10 mx-8 mt-2" />
              
              <div className="flex flex-col gap-1.5">
                <span className="text-[32px] font-bold font-clash text-white">34-Yr</span>
                <span className="text-[9px] uppercase tracking-[0.15em] text-gray-500">Climate Model</span>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </main>
      
      {/* =========================================
          3. FLOATING CORNER BUTTONS
          ========================================= */}
      <button className="absolute bottom-8 left-8 w-10 h-10 bg-white rounded-full flex items-center justify-center text-black shadow-lg z-50 hover:scale-105 transition-transform cursor-pointer">
        <ShieldAlert className="w-5 h-5" />
      </button>

      <button className="absolute bottom-8 right-8 w-10 h-10 bg-[#0A0A0A] border border-white/20 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] z-50 hover:bg-white/10 transition-colors cursor-pointer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"></path></svg>
      </button>
    </div>
  );
}

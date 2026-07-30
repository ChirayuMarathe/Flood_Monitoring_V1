'use client';

import { useState, useEffect, useRef } from 'react';

export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [mounted, setMounted] = useState(false);
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    setMounted(true);
    setDisplay(value);
    prevRef.current = value;
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const start = prevRef.current;
    const end = value;
    if (start === end) return;
    const duration = 400;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prevRef.current = value;
  }, [value, mounted]);

  // During SSR and initial render, show a placeholder that won't cause hydration mismatch
  if (!mounted) {
    return <span suppressHydrationWarning>{value.toFixed(decimals)}</span>;
  }

  return <span>{display.toFixed(decimals)}</span>;
}

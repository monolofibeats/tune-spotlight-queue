import { useEffect, useRef } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  baseX: number; // wave position (0-1)
  baseY: number; // random offset for chaotic state
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  waveOffset: number;
  floatOffset: number;
  floatSpeed: number;
}

function parseHslTriplet(input: string) {
  const parts = input.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", ""));
  const l = Number(parts[2].replace("%", ""));
  if (![h, s, l].every(Number.isFinite)) return null;
  return { h, s, l };
}

function makeHslaFromCssVar(varName: string) {
  const css = getComputedStyle(document.documentElement).getPropertyValue(varName);
  const parsed = parseHslTriplet(css);
  if (!parsed) return (a: number) => `hsla(50, 100%, 50%, ${a})`;
  return (a: number) => `hsla(${parsed.h}, ${parsed.s}%, ${parsed.l}%, ${a})`;
}

export function SoundwaveBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const scrollRef = useRef({ progress: 0, velocity: 0, lastY: 0 });
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // Initialize particles spread across screen
    const count = 100;
    particlesRef.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      baseX: i / count, // evenly distributed for wave
      baseY: 0.3 + Math.random() * 0.4, // random y for chaotic state
      x: Math.random(),
      y: Math.random(),
      vx: 0,
      vy: 0,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.5 + 0.3,
      waveOffset: Math.random() * Math.PI * 2,
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.3 + Math.random() * 0.5,
    }));

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hsla = makeHslaFromCssVar("--primary");

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(1, scrollY / maxScroll) : 0;
      const velocity = Math.abs(scrollY - scrollRef.current.lastY) / 20;
      
      scrollRef.current = {
        progress,
        velocity: Math.min(1, velocity),
        lastY: scrollY,
      };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });

    const draw = () => {
      timeRef.current += 1 / 60;
      const t = timeRef.current;
      
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const scroll = scrollRef.current;
      const ps = particlesRef.current;
      
      // Formation increases as user scrolls (0 = chaotic, 1 = wave)
      const formation = scroll.progress;
      // Wave amplitude decreases as it forms (big chaos → tight wave)
      const waveAmplitude = 0.15 * (1 - formation * 0.6);
      // Wave speed increases with scroll velocity
      const waveSpeed = 2 + scroll.velocity * 5;

      // Decay scroll velocity
      scrollRef.current.velocity *= 0.95;

      for (const p of ps) {
        // Wave target position (structured soundwave)
        const waveY = 0.5 + Math.sin(p.baseX * Math.PI * 4 + t * waveSpeed + p.waveOffset) * waveAmplitude;
        const waveX = p.baseX;

        // Chaotic floating motion
        const floatX = Math.sin(t * p.floatSpeed + p.floatOffset) * 0.15;
        const floatY = Math.cos(t * p.floatSpeed * 0.7 + p.floatOffset) * 0.2;
        const chaoticX = p.baseX + floatX;
        const chaoticY = p.baseY + floatY;

        // Blend between chaotic and wave based on formation
        let targetX = chaoticX + (waveX - chaoticX) * formation;
        let targetY = chaoticY + (waveY - chaoticY) * formation;

        // Cursor interaction (attraction when close)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.2) {
          const pull = 0.02 * (1 - dist / 0.2) * (1 - formation * 0.7);
          targetX += dx * pull;
          targetY += dy * pull;
        }

        // Smooth movement toward target
        const easing = 0.03 + formation * 0.02;
        p.vx += (targetX - p.x) * easing;
        p.vy += (targetY - p.y) * easing;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx;
        p.y += p.vy;

        // Keep in bounds
        p.x = Math.max(0, Math.min(1, p.x));
        p.y = Math.max(0.1, Math.min(0.9, p.y));
      }

      // Draw connection lines between adjacent particles (more visible as wave forms)
      ctx.save();
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3 + formation * 0.4;
      for (let i = 0; i < ps.length - 1; i++) {
        const a = ps[i];
        const b = ps[i + 1];
        const dist = Math.abs(a.x - b.x);
        if (dist < 0.05) {
          ctx.strokeStyle = hsla(0.3);
          ctx.beginPath();
          ctx.moveTo(a.x * width, a.y * height);
          ctx.lineTo(b.x * width, b.y * height);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Draw particles with glow
      ctx.save();
      ctx.shadowBlur = 12 + formation * 8;
      ctx.shadowColor = hsla(0.4);
      for (const p of ps) {
        const dynamicOpacity = p.opacity * (0.6 + formation * 0.4);
        ctx.fillStyle = hsla(dynamicOpacity);
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (!prefersReducedMotion) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

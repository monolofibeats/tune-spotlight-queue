import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";

interface Particle {
  id: number;
  baseX: number; // 0..1
  baseY: number; // 0..1
  x: number; // 0..1
  y: number; // 0..1
  size: number; // px
  opacity: number; // 0..1
  waveOffset: number;
  floatOffset: number;
  floatSpeed: number;
}

function parseHslTriplet(input: string) {
  // Expected: "50 100% 50%"
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
  const timeRef = useRef(0);

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { damping: 50, stiffness: 100 });
  const scrollVelocity = useVelocity(scrollYProgress);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 300 });

  const waveFormation = useTransform(smoothProgress, [0, 0.5, 1], [0, 0.6, 1]);
  const waveAmplitude = useTransform(smoothProgress, [0, 0.5, 1], [80, 50, 30]);
  const waveFrequency = useTransform(smoothProgress, [0, 1], [0.5, 2]);

  const gradientOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.4, 0.6, 0.8]);

  const particles = useMemo<Particle[]>(() => {
    const count = 110;
    const list: Particle[] = [];

    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        baseX: i / count,
        baseY: 0.5 + (Math.random() - 0.5) * 0.5,
        x: i / count,
        y: 0.5,
        size: Math.random() * 8 + 6,
        opacity: Math.random() * 0.25 + 0.75,
        waveOffset: Math.random() * Math.PI * 2,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 0.4,
      });
    }

    return list;
  }, []);

  const particlesRef = useRef<Particle[]>(particles);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hsla = makeHslaFromCssVar("--glow-primary");

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

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      // Keep time stable
      timeRef.current += 1 / 60;
      const t = timeRef.current;

      let formation = 0;
      let amplitude = 60;
      let frequency = 1;
      let velocity = 0;

      try {
        const f = waveFormation.get();
        const a = waveAmplitude.get();
        const fr = waveFrequency.get();
        const v = smoothVelocity.get();
        formation = Number.isFinite(f) ? f : 0;
        amplitude = Number.isFinite(a) ? a : 60;
        frequency = Number.isFinite(fr) ? fr : 1;
        velocity = Number.isFinite(v) ? Math.abs(v) * 50 : 0;
      } catch {
        // ignore
      }

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const ps = particlesRef.current;

      // Update particle positions (no React state updates)
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];

        const waveY = 0.5 + Math.sin(p.baseX * 0.1 * frequency + t * 2 + p.waveOffset) * (amplitude / 200);
        const floatX = Math.sin(t * p.floatSpeed + p.floatOffset) * 0.08;
        const floatY = Math.cos(t * p.floatSpeed * 0.7 + p.floatOffset) * 0.14;

        const chaoticX = p.baseX + floatX;
        const chaoticY = p.baseY + floatY;

        const xRaw = chaoticX + (p.baseX - chaoticX) * formation;
        const yRaw = chaoticY + (waveY - chaoticY) * formation + (velocity / 5000) * Math.sin(t * 5 + i) * 2;
        const opRaw = p.opacity * (0.85 + Math.sin(t * 2 + i * 0.1) * 0.15) * (0.7 + formation * 0.3);

        p.x = Number.isFinite(xRaw) ? Math.max(0.02, Math.min(0.98, xRaw)) : p.baseX;
        p.y = Number.isFinite(yRaw) ? Math.max(0.1, Math.min(0.9, yRaw)) : p.baseY;
        p.opacity = Number.isFinite(opRaw) ? Math.max(0.2, Math.min(1, opRaw)) : p.opacity;
      }

      // Connection lines
      ctx.save();
      ctx.lineWidth = 1;
      ctx.globalCompositeOperation = "screen";

      for (let i = 0; i < ps.length - 1; i++) {
        const a = ps[i];
        const b = ps[i + 1];
        const dx = Math.abs(a.x - b.x);
        if (dx > 0.03) continue;

        ctx.strokeStyle = hsla(Math.min(a.opacity, b.opacity) * 0.45);
        ctx.beginPath();
        ctx.moveTo(a.x * width, a.y * height);
        ctx.lineTo(b.x * width, b.y * height);
        ctx.stroke();
      }

      ctx.restore();

      // Particles
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.shadowBlur = 18;
      ctx.shadowColor = hsla(0.55);

      for (const p of ps) {
        ctx.fillStyle = hsla(p.opacity);
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (!prefersReducedMotion) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    // draw once immediately, then animate
    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [mounted, smoothVelocity, waveAmplitude, waveFormation, waveFrequency]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[2]"
      aria-hidden="true"
    >
      {/* Gradient glow */}
      <motion.div className="absolute inset-0" style={{ opacity: gradientOpacity }}>
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 50%, hsl(var(--glow-primary) / 0.14) 0%, transparent 60%)",
          }}
          animate={{ scale: [1, 1.02, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Canvas particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full mix-blend-screen"
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-screen"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--glow-primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--glow-primary)) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
    </div>
  );
}

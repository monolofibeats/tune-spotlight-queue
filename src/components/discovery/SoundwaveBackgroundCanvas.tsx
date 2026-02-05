import { useEffect, useRef } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  size: number;
  opacity: number;
  orbitAngle: number;
  orbitSpeed: number;
  orbitRadius: number;
  waveX: number; // target x position in wave (0-1)
  waveY: number; // target y position in wave (0-1)
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

// Generate waveform amplitudes similar to audio visualization
function generateWaveAmplitudes(count: number): number[] {
  const amplitudes: number[] = [];
  for (let i = 0; i < count; i++) {
    // Create a realistic waveform pattern with varying heights
    const base = Math.sin(i * 0.3) * 0.3 + 0.5;
    const noise = Math.random() * 0.3;
    const envelope = Math.sin((i / count) * Math.PI); // fade in/out at edges
    amplitudes.push((base + noise) * envelope * 0.35 + 0.05);
  }
  return amplitudes;
}

export function SoundwaveBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, lastMoveTime: 0 });
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const waveAmplitudesRef = useRef<number[]>([]);

  useEffect(() => {
    const count = 80;
    const waveAmplitudes = generateWaveAmplitudes(count);
    waveAmplitudesRef.current = waveAmplitudes;

    // Initialize particles with wave target positions
    particlesRef.current = Array.from({ length: count }, (_, i) => {
      const waveX = 0.1 + (i / count) * 0.8; // spread across 80% of screen
      const amplitude = waveAmplitudes[i];
      const waveY = 0.5; // center line

      return {
        id: i,
        x: Math.random(),
        y: Math.random(),
        vx: 0,
        vy: 0,
        baseVx: (Math.random() - 0.5) * 0.001,
        baseVy: (Math.random() - 0.5) * 0.001,
        size: Math.random() * 3 + 2,
        opacity: Math.random() * 0.4 + 0.2,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
        orbitRadius: Math.random() * 0.03 + 0.02,
        waveX,
        waveY,
      };
    });

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
        lastMoveTime: Date.now(),
      };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    const draw = () => {
      timeRef.current += 1 / 60;
      const t = timeRef.current;

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const ps = particlesRef.current;
      const waveAmps = waveAmplitudesRef.current;

      // Check if cursor is idle (not moved for 500ms)
      const timeSinceMove = Date.now() - mouse.lastMoveTime;
      const cursorIdle = timeSinceMove > 500;

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        const amplitude = waveAmps[i];

        // Animated wave target (oscillating up/down)
        const waveOffset = Math.sin(t * 2 + i * 0.2) * amplitude;
        const targetWaveY = 0.5 + waveOffset;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const attractionRadius = 0.2;
        const orbitDistance = 0.06;

        let targetVx = p.baseVx;
        let targetVy = p.baseVy;

        // Cursor interaction when not idle and cursor is near
        if (!cursorIdle && dist < attractionRadius) {
          if (dist > orbitDistance) {
            // Attract toward cursor
            const attractionStrength = 0.0004 * (1 - dist / attractionRadius);
            targetVx += dx * attractionStrength;
            targetVy += dy * attractionStrength;
          } else {
            // Orbit around cursor
            p.orbitAngle += p.orbitSpeed;
            const orbitX = Math.cos(p.orbitAngle) * p.orbitRadius;
            const orbitY = Math.sin(p.orbitAngle) * p.orbitRadius;

            targetVx = (mouse.x + orbitX - p.x) * 0.06;
            targetVy = (mouse.y + orbitY - p.y) * 0.06;
          }
        } else {
          // Return to wave formation when cursor is idle or far
          const returnStrength = cursorIdle ? 0.015 : 0.005;
          targetVx += (p.waveX - p.x) * returnStrength;
          targetVy += (targetWaveY - p.y) * returnStrength;
        }

        // Smooth velocity interpolation
        const easing = 0.08;
        p.vx += (targetVx - p.vx) * easing;
        p.vy += (targetVy - p.vy) * easing;

        p.x += p.vx;
        p.y += p.vy;

        // Soft bounds
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        p.y = Math.max(0.1, Math.min(0.9, p.y));
      }

      // Draw particles with subtle glow
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = hsla(0.4);
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

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

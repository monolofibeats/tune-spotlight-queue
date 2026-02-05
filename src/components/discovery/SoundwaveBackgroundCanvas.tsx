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
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // Initialize particles
    const count = 60;
    particlesRef.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random(),
      y: Math.random(),
      vx: 0,
      vy: 0,
      baseVx: (Math.random() - 0.5) * 0.0015,
      baseVy: (Math.random() - 0.5) * 0.0015,
      size: Math.random() * 3 + 1.5,
      opacity: Math.random() * 0.4 + 0.15,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitSpeed: (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
      orbitRadius: Math.random() * 0.03 + 0.02,
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

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const ps = particlesRef.current;

      // Update particle positions with cursor interaction
      for (const p of ps) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const attractionRadius = 0.25;
        const orbitDistance = 0.08;

        let targetVx = p.baseVx;
        let targetVy = p.baseVy;

        if (distance < attractionRadius) {
          if (distance > orbitDistance) {
            // Attract toward cursor
            const attractionStrength = 0.0003 * (1 - distance / attractionRadius);
            targetVx += dx * attractionStrength;
            targetVy += dy * attractionStrength;
          } else {
            // Orbit around cursor
            p.orbitAngle += p.orbitSpeed;
            const orbitX = Math.cos(p.orbitAngle) * p.orbitRadius;
            const orbitY = Math.sin(p.orbitAngle) * p.orbitRadius;

            const targetX = mouse.x + orbitX;
            const targetY = mouse.y + orbitY;

            targetVx = (targetX - p.x) * 0.08;
            targetVy = (targetY - p.y) * 0.08;
          }
        }

        // Smooth velocity interpolation
        const easing = 0.08;
        p.vx += (targetVx - p.vx) * easing;
        p.vy += (targetVy - p.vy) * easing;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        if (p.y < -0.05) p.y = 1.05;
        if (p.y > 1.05) p.y = -0.05;
      }

      // Draw particles
      ctx.save();
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

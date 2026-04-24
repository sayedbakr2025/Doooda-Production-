import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  life: number;
}

const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#38bdf8', '#a78bfa', '#f472b6', '#fff'];

function createParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: window.innerWidth - 60 + (Math.random() * 40 - 20),
      y: window.innerHeight - 80,
      vx: (Math.random() - 0.6) * 12,
      vy: -(Math.random() * 18 + 10),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      width: Math.random() * 10 + 6,
      height: Math.random() * 5 + 3,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
      life: 1,
    });
  }
  return particles;
}

interface ConfettiCelebrationProps {
  onDone: () => void;
}

export default function ConfettiCelebration({ onDone }: ConfettiCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = createParticles(120);

    let startTime: number | null = null;
    const DURATION = 3200;

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.life = Math.max(0, 1 - elapsed / DURATION);
        p.opacity = p.life;

        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rotation * Math.PI) / 180);
        ctx!.globalAlpha = p.opacity;
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        ctx!.restore();
      });

      if (elapsed < DURATION) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        onDone();
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}

import React, { useEffect, useRef } from 'react';

export default function CounsellingPanel({ isVisible = true }) {
  const canvasRef = useRef(null);

  // Animated gradient mesh with soft floating particles guiding toward a glowing nexus
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = canvas.parentElement.offsetWidth);
    let height = (canvas.height = canvas.parentElement.offsetHeight);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle constellation moving toward a glowing target point
    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 1,
      speedX: (Math.random() - 0.5) * 0.7,
      speedY: (Math.random() - 0.5) * 0.7,
      alpha: Math.random() * 0.6 + 0.2
    }));

    let t = 0;
    const render = () => {
      t += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Nexus glowing coordinate (around right center)
      const targetX = width * 0.7 + Math.sin(t * 0.8) * 35;
      const targetY = height * 0.48 + Math.cos(t * 0.8) * 30;

      // Draw subtle orbital rings around nexus
      ctx.save();
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.arc(targetX, targetY, r * 45 + Math.sin(t + r) * 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.12 / r})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
      }
      ctx.restore();

      // Glowing nexus center
      const gradient = ctx.createRadialGradient(targetX, targetY, 0, targetX, targetY, 140);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      gradient.addColorStop(0.4, 'rgba(37, 99, 235, 0.15)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 140, 0, Math.PI * 2);
      ctx.fill();

      // Update and draw particles forming guiding path
      particles.forEach((p, idx) => {
        // Gravitational pull toward nexus
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 30) {
          p.x += (dx / dist) * 0.6 + p.speedX;
          p.y += (dy / dist) * 0.6 + p.speedY;
        } else {
          // Reset particle to perimeter
          p.x = Math.random() < 0.5 ? 0 : width;
          p.y = Math.random() * height;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 197, 253, ${p.alpha})`;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 8;
        ctx.fill();

        // Connect nearby particles with subtle filament lines
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(96, 165, 250, ${(1 - dist2 / 80) * 0.15})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center px-4 sm:px-8 lg:px-16 overflow-hidden">
      {/* Background Canvas Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Radial backdrop glow */}
      <div
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Content Grid */}
      <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Big Headline & Copy */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Section Step Label */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-mono font-semibold tracking-widest uppercase">
            <span>Feature 01</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-slate-300">Choice Sequence Protocol</span>
          </div>

          {/* Big Outlined / Filled Headline */}
          <div className="relative">
            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black font-['Space_Grotesk'] tracking-tighter leading-none select-none">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-white">
                COUNSELLING
              </span>
            </h2>
            <div
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-transparent select-none mt-1"
              style={{
                WebkitTextStroke: '1px rgba(147, 197, 253, 0.35)',
                fontFamily: 'Space Grotesk'
              }}
            >
              DECISION ENGINE
            </div>
          </div>

          {/* One-Line Description */}
          <p className="text-xl sm:text-2xl text-slate-200 font-medium leading-relaxed max-w-xl">
            Guided JoSAA counselling, step by step.
          </p>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg">
            Say goodbye to chaotic Excel sheets. PreJOSAA models closing rank volatility across 6
            rounds to structure an airtight choice list matching your exact All India Rank.
          </p>

          {/* Qualitative Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {[
              { title: 'Ambitious', desc: 'Reach for dream IITs', tag: 'Top 15%' },
              { title: 'Target', desc: 'Realistic historical fit', tag: 'Core 50%' },
              { title: 'Safer', desc: 'Guaranteed seat safety', tag: 'Safety Net' }
            ].map((col, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm hover:border-blue-500/40 transition-colors"
              >
                <div className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider mb-1">
                  {col.tag}
                </div>
                <div className="text-sm font-bold text-white mb-0.5">{col.title}</div>
                <div className="text-xs text-slate-400">{col.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Visual Stage (Floating Simulated Preference Optimizer) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-white/[0.03] border border-white/[0.1] backdrop-blur-xl shadow-2xl shadow-blue-950/40 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-slate-300">AIR Gap Analysis</span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
                Round 1-6 Adaptive
              </span>
            </div>

            {/* Sequence preview cards */}
            <div className="space-y-2.5">
              {[
                {
                  rank: '#01',
                  college: 'IIT Bombay',
                  branch: 'Computer Science',
                  tier: 'Ambitious',
                  color: 'border-rose-500/30 text-rose-400 bg-rose-500/10'
                },
                {
                  rank: '#02',
                  college: 'IIT Roorkee',
                  branch: 'Data Science & AI',
                  tier: 'Target',
                  color: 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                },
                {
                  rank: '#03',
                  college: 'NIT Trichy',
                  branch: 'Computer Engineering',
                  tier: 'Target',
                  color: 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                },
                {
                  rank: '#04',
                  college: 'NIT Warangal',
                  branch: 'Electronics & Comm.',
                  tier: 'Safer',
                  color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                }
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between hover:bg-white/[0.05] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-blue-400">
                      {item.rank}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{item.college}</div>
                      <div className="text-[11px] text-slate-400">{item.branch}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${item.color}`}
                  >
                    {item.tier}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Auto-ordered by statistical probability</span>
              <span className="text-blue-400 font-semibold">100% Export Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

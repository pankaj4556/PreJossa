import React, { useState, useEffect } from 'react';

export default function PlacementPanel() {
  const [activeMetric, setActiveMetric] = useState('median');
  const [counterProgress, setCounterProgress] = useState(0);

  // Counter animation when in view
  useEffect(() => {
    let frame;
    let start = null;
    const duration = 1200;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounterProgress(ease);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [activeMetric]);

  const metrics = [
    { id: 'median', label: 'Median Distribution', tag: 'Most Realistic Gauge' },
    { id: 'ratio', label: 'Offer Conversion Rate', tag: 'Industry Absorption' },
    { id: 'core', label: 'Core vs Tech Share', tag: 'Discipline Retention' }
  ];

  // Bars data for comparative visualization
  const barData = [
    { label: 'Tier 1 Circuital (IIT)', heightPercent: 92, val: '88% - 96%', tier: 'S-Tier' },
    { label: 'Top 5 Core (IIT)', heightPercent: 78, val: '72% - 84%', tier: 'A-Tier' },
    { label: 'Premier NIT Circuital', heightPercent: 82, val: '79% - 88%', tier: 'A-Tier' },
    { label: 'Emerging AI Specializations', heightPercent: 88, val: '85% - 92%', tier: 'S-Tier' },
    { label: 'Regional NIT Engineering', heightPercent: 68, val: '64% - 74%', tier: 'B-Tier' }
  ];

  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center px-4 sm:px-8 lg:px-16 overflow-hidden">
      {/* Background radial glow */}
      <div
        className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[130px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Big Headline & Copy */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold tracking-widest uppercase">
            <span>Feature 04</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Comparative Analytics</span>
          </div>

          {/* Big Outlined & Filled Headline */}
          <div className="relative">
            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black font-['Space_Grotesk'] tracking-tighter leading-none select-none">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-white">
                PLACEMENT
              </span>
            </h2>
            <div
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-transparent select-none mt-1"
              style={{
                WebkitTextStroke: '1px rgba(52, 211, 153, 0.4)',
                fontFamily: 'Space Grotesk'
              }}
            >
              REALITY
            </div>
          </div>

          <p className="text-xl sm:text-2xl text-slate-200 font-medium leading-relaxed max-w-xl">
            Placement data you can actually compare.
          </p>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg">
            Don't get misled by hyped outlier packages. PreJOSAA standardizes median packages, branch
            placement ratios, and domestic trends so you make decisions based on statistical
            integrity.
          </p>

          {/* Metric Selector Pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {metrics.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveMetric(m.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none ${
                  activeMetric === m.id
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-400/50 shadow-lg shadow-emerald-950/30'
                    : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6 pt-3 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Standardized NIRF Disclosures</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <span>Zero Artificial Inflation</span>
            </div>
          </div>
        </div>

        {/* Right Column: Abstract Rising Bar/Line Chart */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-2xl">
            {/* Header with counter */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
              <div>
                <span className="text-xs font-mono text-slate-400">Institutional Benchmark</span>
                <div className="text-2xl font-bold font-['Space_Grotesk'] text-white">
                  {(counterProgress * 98.4).toFixed(1)}%
                  <span className="text-xs font-normal text-emerald-400 ml-2 font-mono">
                    Median Alignment Index
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  Reporting Standard
                </span>
                <span className="text-xs font-bold text-teal-300 font-mono">
                  MHRD / NIRF Verified
                </span>
              </div>
            </div>

            {/* Rising Abstract Bars */}
            <div className="space-y-4">
              {barData.map((bar, idx) => {
                const currentHeight = bar.heightPercent * counterProgress;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300">{bar.label}</span>
                      <span className="font-mono text-emerald-400 font-semibold">{bar.val}</span>
                    </div>

                    {/* Bar track */}
                    <div className="relative h-3.5 w-full bg-white/[0.04] rounded-full overflow-hidden p-[2px]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-sm shadow-emerald-500/40 transition-all duration-300 ease-out"
                        style={{ width: `${currentHeight}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Qualitative Spline Trajectory */}
            <div className="mt-6 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                <span>Multi-Year Absorption Curve</span>
                <span className="text-emerald-400">Historical Stability Index</span>
              </div>

              <svg className="w-full h-14" viewBox="0 0 400 50" fill="none">
                <defs>
                  <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                {/* Spline curve */}
                <path
                  d="M0 40 Q 80 35, 140 22 T 280 18 T 400 8"
                  stroke="url(#curveGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Dots along path */}
                {[
                  { cx: 80, cy: 32 },
                  { cx: 200, cy: 20 },
                  { cx: 320, cy: 14 },
                  { cx: 395, cy: 8 }
                ].map((d, i) => (
                  <circle
                    key={i}
                    cx={d.cx}
                    cy={d.cy}
                    r="3.5"
                    fill="#34d399"
                    className="animate-ping"
                    style={{ animationDuration: '3s', animationDelay: `${i * 0.4}s` }}
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

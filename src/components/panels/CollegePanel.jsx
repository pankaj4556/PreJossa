import React, { useRef } from 'react';

export default function CollegePanel() {
  const containerRef = useRef(null);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col justify-center items-center px-4 sm:px-8 lg:px-16 overflow-hidden"
    >
      {/* Layered Parallax Campus Illustration with Ken Burns Zoom */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
        {/* Layer 1 (Deep Background): Distant Horizon & Atmospheric Dome Skyline */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-[#070d1e] opacity-80"
          style={{ transform: 'scale(1.05)', transition: 'transform 10s ease-out' }}
        >
          <svg
            className="w-full h-full object-cover opacity-25"
            viewBox="0 0 1440 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Distant domes, spires, and mountain horizon */}
            <path
              d="M0 380 Q180 340 360 370 T720 330 T1080 360 T1440 320 V600 H0 Z"
              fill="#1e3a8a"
              fillOpacity="0.4"
            />
            {/* Distant Institute Domes */}
            <circle cx="280" cy="340" r="45" fill="#1d4ed8" fillOpacity="0.3" />
            <rect x="250" y="340" width="60" height="80" fill="#1d4ed8" fillOpacity="0.3" />
            <circle cx="1120" cy="330" r="55" fill="#1d4ed8" fillOpacity="0.3" />
            <rect x="1080" y="330" width="80" height="90" fill="#1d4ed8" fillOpacity="0.3" />
          </svg>
        </div>

        {/* Layer 2 (Midground): Neoclassical Campus Colonnades & Architectural Towers */}
        <div
          className="absolute inset-x-0 bottom-0 h-4/5 flex items-end opacity-70 animate-ken-burns"
          style={{
            animation: 'kenBurnsSlow 20s infinite alternate ease-in-out'
          }}
        >
          <svg
            className="w-full h-auto max-h-[380px]"
            viewBox="0 0 1440 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Main Quadrangle Facade */}
            <g fill="#0f172a" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.25">
              {/* Central Grand Hall Dome */}
              <path d="M620 180 Q720 90 820 180 Z" fill="#172554" />
              <rect x="640" y="180" width="160" height="140" fill="#0f172a" />
              {/* Colonnade Pillars */}
              {[660, 685, 710, 735, 760, 785].map((x, i) => (
                <line
                  key={i}
                  x1={x}
                  y1="190"
                  x2={x}
                  y2="310"
                  stroke="#60a5fa"
                  strokeWidth="3"
                  strokeOpacity="0.3"
                />
              ))}

              {/* Left Academic Wing */}
              <rect x="220" y="160" width="280" height="160" fill="#0c1730" />
              <line x1="220" y1="160" x2="360" y2="120" stroke="#38bdf8" strokeOpacity="0.3" />
              <line x1="360" y1="120" x2="500" y2="160" stroke="#38bdf8" strokeOpacity="0.3" />
              {/* Windows Matrix */}
              {[250, 290, 330, 370, 410, 450].map((wx) => (
                <rect
                  key={wx}
                  x={wx}
                  y="200"
                  width="18"
                  height="26"
                  rx="3"
                  fill="#93c5fd"
                  fillOpacity="0.15"
                />
              ))}

              {/* Right Research Wing */}
              <rect x="940" y="160" width="280" height="160" fill="#0c1730" />
              <line x1="940" y1="160" x2="1080" y2="120" stroke="#38bdf8" strokeOpacity="0.3" />
              <line x1="1080" y1="120" x2="1220" y2="160" stroke="#38bdf8" strokeOpacity="0.3" />
              {[970, 1010, 1050, 1090, 1130, 1170].map((wx) => (
                <rect
                  key={wx}
                  x={wx}
                  y="200"
                  width="18"
                  height="26"
                  rx="3"
                  fill="#93c5fd"
                  fillOpacity="0.15"
                />
              ))}
            </g>
          </svg>
        </div>

        {/* Layer 3 (Foreground): Modern Campus Gate and Perimeter Silhouette */}
        <div className="absolute inset-x-0 bottom-0 h-44 flex items-end opacity-90">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 1440 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Campus ground plane and illuminated avenue */}
            <path d="M0 130 Q720 110 1440 130 V180 H0 Z" fill="#050a16" />
            <path
              d="M520 180 L680 125 L760 125 L920 180 Z"
              fill="#1e293b"
              fillOpacity="0.4"
              stroke="#60a5fa"
              strokeWidth="0.8"
              strokeDasharray="4 4"
            />
            {/* Silhouette tree groves & lamp posts */}
            <circle cx="120" cy="120" r="35" fill="#030712" />
            <circle cx="160" cy="125" r="28" fill="#030712" />
            <circle cx="1320" cy="120" r="35" fill="#030712" />
            <circle cx="1280" cy="125" r="28" fill="#030712" />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes kenBurnsSlow {
          0% { transform: scale(1) translateY(0); }
          100% { transform: scale(1.08) translateY(-10px); }
        }
      `}</style>

      {/* Foreground Content */}
      <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Big Headline & Copy */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-mono font-semibold tracking-widest uppercase">
            <span>Feature 02</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">National Institute Directory</span>
          </div>

          {/* Big Outlined & Filled Headline */}
          <div className="relative">
            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black font-['Space_Grotesk'] tracking-tighter leading-none select-none">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-200 to-white">
                COLLEGE
              </span>
            </h2>
            <div
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-transparent select-none mt-1"
              style={{
                WebkitTextStroke: '1px rgba(56, 189, 248, 0.4)',
                fontFamily: 'Space Grotesk'
              }}
            >
              ECOSYSTEMS
            </div>
          </div>

          <p className="text-xl sm:text-2xl text-slate-200 font-medium leading-relaxed max-w-xl">
            Explore every IIT and NIT in one place.
          </p>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg">
            Compare campus profiles, state quotas, host cities, and historic closing rank trends
            across all 23 Indian Institutes of Technology and 31 National Institutes of Technology.
          </p>

          {/* Quick Filter Metrics */}
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
              <div className="text-xs text-slate-400 font-mono">Institutes of National Importance</div>
              <div className="text-lg font-bold text-white font-['Space_Grotesk']">
                23 IITs <span className="text-cyan-400 font-normal text-sm">+</span> 31 NITs
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
              <div className="text-xs text-slate-400 font-mono">Seat Matrix Categories</div>
              <div className="text-lg font-bold text-white font-['Space_Grotesk']">
                Home State <span className="text-slate-500 font-normal">/</span> Other State
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Campus Card Deck */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md space-y-3">
            {[
              {
                type: 'IIT',
                name: 'IIT Bombay (Powai)',
                badge: 'NIRF #03 · Engineering',
                programs: '18 Undergraduate Branches',
                highlight: 'Premier Tech Nexus',
                bg: 'from-blue-600/10 to-indigo-600/10 border-blue-500/30'
              },
              {
                type: 'IIT',
                name: 'IIT Madras (Chennai)',
                badge: 'NIRF #01 · Engineering',
                programs: '21 Specialized Programs',
                highlight: 'Top Research Citations',
                bg: 'from-cyan-600/10 to-blue-600/10 border-cyan-500/30'
              },
              {
                type: 'NIT',
                name: 'NIT Trichy (Tiruchirappalli)',
                badge: 'NIRF #09 · Engineering',
                programs: '12 B.Tech Programs',
                highlight: '#1 National Institute of Tech',
                bg: 'from-slate-800/40 to-slate-900/60 border-white/10'
              }
            ].map((inst, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl bg-gradient-to-r ${inst.bg} border backdrop-blur-xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-cyan-400/50`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-cyan-300">
                    {inst.type}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{inst.badge}</span>
                </div>
                <div className="text-base font-bold text-white mb-1">{inst.name}</div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>{inst.programs}</span>
                  <span className="text-cyan-400 font-medium">{inst.highlight}</span>
                </div>
              </div>
            ))}

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-slate-400">Looking for a specific institute?</span>
              <a
                href="/explore"
                className="text-cyan-400 font-bold hover:underline flex items-center gap-1"
              >
                Open Full Catalog
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

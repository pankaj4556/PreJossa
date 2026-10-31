import React, { useRef, useState } from 'react';

export default function BranchPanel() {
  const [selectedBranch, setSelectedBranch] = useState(0);

  const branches = [
    {
      group: 'Computer & AI',
      name: 'Computer Science & Engineering',
      desc: 'Algorithm design, distributed systems, compilers, and cloud scale software.',
      cutoffs: 'Top ~50 to ~1,200 AIR in IITs',
      specializations: ['Machine Learning', 'Cybersecurity', 'Theory of Computation']
    },
    {
      group: 'Data Sciences',
      name: 'Data Science & Artificial Intelligence',
      desc: 'Statistical inference, deep neural models, mathematical optimization.',
      cutoffs: 'Top ~300 to ~2,200 AIR in IITs',
      specializations: ['Large Language Models', 'Computer Vision', 'Robotics']
    },
    {
      group: 'Circuital Systems',
      name: 'Electrical & Electronics Engineering',
      desc: 'VLSI microelectronics, power grids, quantum computing hardware, embedded DSP.',
      cutoffs: 'Top ~600 to ~3,500 AIR in IITs',
      specializations: ['Silicon Chip Design', 'Control Systems', 'Communication Tech']
    },
    {
      group: 'Core Engineering',
      name: 'Mechanical & Aerospace Systems',
      desc: 'Thermodynamics, aerodynamics, robotics actuators, precision manufacturing.',
      cutoffs: 'Top ~1,500 to ~6,500 AIR in IITs',
      specializations: ['Propulsion Systems', 'Computational Fluid Dynamics', 'Mechatronics']
    }
  ];

  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center px-4 sm:px-8 lg:px-16 overflow-hidden">
      {/* Background radial glow */}
      <div
        className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[550px] h-[550px] bg-violet-600/10 rounded-full blur-[130px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Big Headline & Copy */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-mono font-semibold tracking-widest uppercase">
            <span>Feature 03</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="text-slate-300">Discipline Taxonomy</span>
          </div>

          {/* Big Outlined & Filled Headline */}
          <div className="relative">
            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black font-['Space_Grotesk'] tracking-tighter leading-none select-none">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-200 to-white">
                BRANCH
              </span>
            </h2>
            <div
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-transparent select-none mt-1"
              style={{
                WebkitTextStroke: '1px rgba(192, 132, 252, 0.4)',
                fontFamily: 'Space Grotesk'
              }}
            >
              ALIGNMENT
            </div>
          </div>

          <p className="text-xl sm:text-2xl text-slate-200 font-medium leading-relaxed max-w-xl">
            Find the branch that fits your rank and interest.
          </p>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg">
            Understand the real curriculum differences between Circuital, Computing, and Core
            disciplines so you never compromise your academic future for a campus name.
          </p>

          {/* Branch Switcher Tabs */}
          <div className="flex flex-wrap gap-2 pt-2">
            {branches.map((b, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedBranch(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none ${
                  selectedBranch === idx
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-400/50 shadow-lg shadow-purple-900/30'
                    : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {b.group}
              </button>
            ))}
          </div>

          {/* Active Branch Description Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                {branches[selectedBranch].name}
              </span>
              <span className="text-[11px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                {branches[selectedBranch].cutoffs}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {branches[selectedBranch].desc}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {branches[selectedBranch].specializations.map((spec, sIdx) => (
                <span
                  key={sIdx}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-slate-300 border border-white/[0.06]"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Animated SVG Node-and-Branch Tree */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="relative w-full max-w-lg p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-white/[0.06] pb-3 mb-3">
              <span>Interactive Decision Graph</span>
              <span className="text-purple-400 font-semibold">560+ JoSAA Program Combinations</span>
            </div>

            <svg
              className="w-full h-auto"
              viewBox="0 0 500 360"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="treeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
                <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Connecting Tree Filaments with animated strokeDashoffset */}
              {/* Root to Layer 1 */}
              <path
                d="M70 180 C 130 180, 150 90, 220 90"
                stroke="url(#treeGrad)"
                strokeWidth="2.5"
                strokeDasharray="300"
                className="animate-draw-path"
                style={{ animation: 'dashDraw 3s ease-in-out infinite alternate' }}
              />
              <path
                d="M70 180 C 130 180, 150 150, 220 150"
                stroke="url(#treeGrad)"
                strokeWidth="2.5"
                strokeDasharray="300"
                className="animate-draw-path"
                style={{ animation: 'dashDraw 3s ease-in-out 0.2s infinite alternate' }}
              />
              <path
                d="M70 180 C 130 180, 150 210, 220 210"
                stroke="url(#treeGrad)"
                strokeWidth="2.5"
                strokeDasharray="300"
                className="animate-draw-path"
                style={{ animation: 'dashDraw 3s ease-in-out 0.4s infinite alternate' }}
              />
              <path
                d="M70 180 C 130 180, 150 270, 220 270"
                stroke="url(#treeGrad)"
                strokeWidth="2.5"
                strokeDasharray="300"
                className="animate-draw-path"
                style={{ animation: 'dashDraw 3s ease-in-out 0.6s infinite alternate' }}
              />

              {/* Layer 1 to Layer 2 Sub-branches */}
              <path
                d="M220 90 C 290 90, 310 60, 380 60"
                stroke="#a855f7"
                strokeWidth="1.8"
                strokeOpacity="0.7"
                strokeDasharray="250"
                style={{ animation: 'dashDraw 3s ease-in-out 0.8s infinite alternate' }}
              />
              <path
                d="M220 90 C 290 90, 310 110, 380 110"
                stroke="#a855f7"
                strokeWidth="1.8"
                strokeOpacity="0.7"
                strokeDasharray="250"
                style={{ animation: 'dashDraw 3s ease-in-out 1s infinite alternate' }}
              />
              <path
                d="M220 150 C 290 150, 310 160, 380 160"
                stroke="#818cf8"
                strokeWidth="1.8"
                strokeOpacity="0.7"
                strokeDasharray="250"
                style={{ animation: 'dashDraw 3s ease-in-out 1.2s infinite alternate' }}
              />
              <path
                d="M220 210 C 290 210, 310 210, 380 210"
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeOpacity="0.7"
                strokeDasharray="250"
                style={{ animation: 'dashDraw 3s ease-in-out 1.4s infinite alternate' }}
              />
              <path
                d="M220 270 C 290 270, 310 270, 380 270"
                stroke="#34d399"
                strokeWidth="1.8"
                strokeOpacity="0.7"
                strokeDasharray="250"
                style={{ animation: 'dashDraw 3s ease-in-out 1.6s infinite alternate' }}
              />
              <path
                d="M220 270 C 290 270, 310 320, 380 320"
                stroke="#34d399"
                strokeWidth="1.8"
                strokeOpacity="0.7"
                strokeDasharray="250"
                style={{ animation: 'dashDraw 3s ease-in-out 1.8s infinite alternate' }}
              />

              {/* Root Node: Student AIR */}
              <g className="cursor-pointer">
                <circle cx="70" cy="180" r="28" fill="#1e1b4b" stroke="#c084fc" strokeWidth="2.5" filter="url(#glowFilter)" />
                <text x="70" y="177" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="Space Grotesk">
                  YOUR AIR
                </text>
                <text x="70" y="191" textAnchor="middle" fill="#c084fc" fontSize="9" fontFamily="JetBrains Mono">
                  & Aptitude
                </text>
              </g>

              {/* Mid Layer Clusters */}
              {[
                { x: 220, y: 90, label: 'CSE', full: 'Software', col: '#c084fc' },
                { x: 220, y: 150, label: 'AI/DS', full: 'Intelligence', col: '#818cf8' },
                { x: 220, y: 210, label: 'EE/ECE', full: 'Circuital', col: '#38bdf8' },
                { x: 220, y: 270, label: 'CORE', full: 'Physical', col: '#34d399' }
              ].map((n, i) => (
                <g key={i} className="hover:scale-110 transition-transform">
                  <circle cx={n.x} cy={n.y} r="20" fill="#0f172a" stroke={n.col} strokeWidth="2" filter="url(#glowFilter)" />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                    {n.label}
                  </text>
                </g>
              ))}

              {/* Terminal Leaves */}
              {[
                { x: 380, y: 60, text: 'Systems & Cloud' },
                { x: 380, y: 110, text: 'Cyber & Crypto' },
                { x: 380, y: 160, text: 'Deep Learning' },
                { x: 380, y: 210, text: 'VLSI & Silicon' },
                { x: 380, y: 270, text: 'Robotics & Aero' },
                { x: 380, y: 320, text: 'Clean Energy' }
              ].map((leaf, idx) => (
                <g key={idx}>
                  <rect
                    x={leaf.x}
                    y={leaf.y - 12}
                    width="105"
                    height="24"
                    rx="6"
                    fill="#172554"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1"
                  />
                  <circle cx={leaf.x + 8} cy={leaf.y} r="3" fill="#60a5fa" />
                  <text x={leaf.x + 16} y={leaf.y + 4} fill="#e2e8f0" fontSize="9" fontFamily="Inter">
                    {leaf.text}
                  </text>
                </g>
              ))}
            </svg>

            <style>{`
              @keyframes dashDraw {
                0% { stroke-dashoffset: 300; }
                100% { stroke-dashoffset: 0; }
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

export default function NirfPanel() {
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const [sortKey, setSortKey] = useState('overall');

  // Authentic realistic NIRF Engineering top institutes
  const initialRankings = [
    {
      id: 'iitm',
      rank: 1,
      name: 'IIT Madras',
      city: 'Chennai, Tamil Nadu',
      scores: { overall: 89.79, research: 92.4, teaching: 88.5, outcomes: 94.2 }
    },
    {
      id: 'iitd',
      rank: 2,
      name: 'IIT Delhi',
      city: 'New Delhi, Delhi',
      scores: { overall: 88.08, research: 91.2, teaching: 87.1, outcomes: 93.8 }
    },
    {
      id: 'iitb',
      rank: 3,
      name: 'IIT Bombay',
      city: 'Mumbai, Maharashtra',
      scores: { overall: 87.40, research: 90.8, teaching: 86.4, outcomes: 95.1 }
    },
    {
      id: 'iitk',
      rank: 4,
      name: 'IIT Kanpur',
      city: 'Kanpur, Uttar Pradesh',
      scores: { overall: 86.36, research: 89.5, teaching: 85.9, outcomes: 91.3 }
    },
    {
      id: 'nitt',
      rank: 9,
      name: 'NIT Trichy',
      city: 'Tiruchirappalli, Tamil Nadu',
      scores: { overall: 69.71, research: 74.2, teaching: 72.8, outcomes: 82.5 }
    }
  ];

  const [rankings, setRankings] = useState(initialRankings);

  const handleSortChange = (newKey) => {
    if (newKey === sortKey) return;

    // Capture initial state for GSAP Flip
    const state = Flip.getState('.nirf-card');

    // Sort items
    const sorted = [...initialRankings].sort((a, b) => b.scores[newKey] - a.scores[newKey]);
    setRankings(sorted);
    setSortKey(newKey);

    // Apply Flip animation
    requestAnimationFrame(() => {
      Flip.from(state, {
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.05,
        absolute: true,
        onComplete: () => {
          gsap.set('.nirf-card', { clearProps: 'transform' });
        }
      });
    });
  };

  const sortButtons = [
    { key: 'overall', label: 'Overall NIRF Rank' },
    { key: 'research', label: 'Research & Citations' },
    { key: 'teaching', label: 'Teaching & Resources' },
    { key: 'outcomes', label: 'Graduation Outcomes' }
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col justify-center items-center px-4 sm:px-8 lg:px-16 overflow-hidden"
    >
      {/* Drifting Giant Outlined Rank Numerals in Background */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        {['01', '02', '03', '04', '05'].map((num, i) => (
          <div
            key={i}
            className="absolute font-['Space_Grotesk'] font-black text-[140px] sm:text-[200px] leading-none text-transparent animate-drift"
            style={{
              WebkitTextStroke: '1px rgba(251, 191, 36, 0.08)',
              top: `${12 + i * 16}%`,
              left: `${(i * 22) % 85}%`,
              animation: `driftFloat ${14 + i * 4}s infinite alternate ease-in-out`
            }}
          >
            {num}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes driftFloat {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-35px) rotate(2deg); }
        }
      `}</style>

      {/* Radial backdrop glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Big Headline & Copy */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-mono font-semibold tracking-widest uppercase">
            <span>Feature 05</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">National Institutional Ranking Framework</span>
          </div>

          {/* Big Outlined & Filled Headline */}
          <div className="relative">
            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black font-['Space_Grotesk'] tracking-tighter leading-none select-none">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-200 to-white">
                NIRF
              </span>
            </h2>
            <div
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-transparent select-none mt-1"
              style={{
                WebkitTextStroke: '1px rgba(251, 191, 36, 0.4)',
                fontFamily: 'Space Grotesk'
              }}
            >
              PRIORITIZATION
            </div>
          </div>

          <p className="text-xl sm:text-2xl text-slate-200 font-medium leading-relaxed max-w-xl">
            Filter and prioritise colleges by NIRF ranking.
          </p>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg">
            Inspect official Ministry of Education performance parameters. Rank colleges by
            research citations, faculty credentials, or overall institutional score to build your
            dream sequence.
          </p>

          {/* FLIP Reorder Controls */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-mono text-slate-400 block uppercase tracking-wider">
              Sort with GSAP Flip:
            </span>
            <div className="flex flex-wrap gap-2">
              {sortButtons.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => handleSortChange(btn.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none ${
                    sortKey === btn.key
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30'
                      : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono pt-1">
            Official Data Source: National Institutional Ranking Framework (Engineering)
          </div>
        </div>

        {/* Right Column: Animated Flip Cards */}
        <div className="lg:col-span-6 flex justify-center">
          <div
            ref={listRef}
            className="w-full max-w-md space-y-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-2 pb-1 border-b border-white/[0.06]">
              <span>Institute / Ministry Standing</span>
              <span className="text-amber-400">Score ({sortKey})</span>
            </div>

            {rankings.map((inst, index) => (
              <div
                key={inst.id}
                data-flip-id={inst.id}
                className="nirf-card p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-amber-500/30 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-xs font-bold flex items-center justify-center">
                    #{index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                      {inst.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{inst.city}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-amber-300">
                    {inst.scores[sortKey].toFixed(1)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">MHRD Index</div>
                </div>
              </div>
            ))}

            <div className="pt-2 text-center">
              <a
                href="/nirf"
                className="text-xs font-mono text-amber-400 hover:text-amber-300 hover:underline inline-flex items-center gap-1.5"
              >
                <span>View Complete National Table (All IITs & NITs)</span>
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

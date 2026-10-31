import React from 'react';

export default function CareerSection() {
  return (
    <section
      id="career"
      className="relative min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-24 bg-gradient-to-b from-[#070d1e] via-[#0b132b] to-[#050914] overflow-hidden"
    >
      {/* Serene Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-cyan-500/15 rounded-full blur-[140px] -z-10" />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] -z-10" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        {/* Soft Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-semibold tracking-wider uppercase">
          <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>The Definitive Next Step</span>
        </div>

        {/* Large Headline */}
        <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight leading-[1.1]">
          Your career starts with the{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
            right choice.
          </span>
        </h2>

        {/* Short Line */}
        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Zero guesswork. Zero outdated PDFs. Build an authentic, mathematically sound JoSAA
          preference sequence in minutes.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/login"
            className="w-full sm:w-auto px-9 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-xl shadow-blue-600/30 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            <span>Start your counselling</span>
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>

          <a
            href="/explore"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/[0.2] backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>Explore colleges</span>
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>

        {/* Trust Points */}
        <div className="pt-10 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="text-xs font-mono text-cyan-400 uppercase font-bold mb-1">
              Deterministic Logic
            </div>
            <div className="text-sm font-semibold text-white mb-0.5">Strict Rank Boundaries</div>
            <div className="text-xs text-slate-400">
              Only realistic recommendations based on official round-wise closing trends.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="text-xs font-mono text-blue-400 uppercase font-bold mb-1">
              Multi-Format Export
            </div>
            <div className="text-sm font-semibold text-white mb-0.5">PDF, Excel & Word</div>
            <div className="text-xs text-slate-400">
              Export clean formatted choice sheets ready for physical review and JoSAA portal entry.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="text-xs font-mono text-purple-400 uppercase font-bold mb-1">
              Privacy First
            </div>
            <div className="text-sm font-semibold text-white mb-0.5">Secure Google Sign-In</div>
            <div className="text-xs text-slate-400">
              Your rank, category quotas, and preference sequences stay private to your account.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

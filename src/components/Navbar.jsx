import React, { useState, useEffect } from 'react';

export default function Navbar({ onJumpToFeature, activeFeatureIndex = 0 }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { label: 'Counselling', num: '01' },
    { label: 'Colleges', num: '02' },
    { label: 'Branches', num: '03' },
    { label: 'Placements', num: '04' },
    { label: 'NIRF', num: '05' }
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[#070d1e]/85 backdrop-blur-xl border-b border-white/[0.08] py-3.5 shadow-2xl'
          : 'bg-transparent py-5 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <a
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1"
            aria-label="PreJOSAA Homepage"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <div className="w-full h-full bg-[#070d1e] rounded-[11px] flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-lg text-white font-['Space_Grotesk'] leading-none">
                PreJOSAA
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-blue-400/80">
                Decision Engine
              </span>
            </div>
          </a>

          {/* Desktop Feature Scrub Links */}
          <nav
            aria-label="Feature navigation"
            className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-full p-1.5 backdrop-blur-md"
          >
            {features.map((feat, idx) => {
              const isActive = activeFeatureIndex === idx;
              return (
                <button
                  key={feat.num}
                  onClick={() => onJumpToFeature(idx)}
                  className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    isActive
                      ? 'text-white font-semibold bg-white/[0.1] shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                  aria-label={`Jump to ${feat.label}`}
                >
                  <span className="text-[10px] font-mono text-blue-400/70 mr-1.5">
                    {feat.num}
                  </span>
                  {feat.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <a
              href="/explore"
              className="hidden lg:inline-flex items-center text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg"
            >
              Explore Institutes
            </a>

            <a
              href="/login"
              className="relative group overflow-hidden px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Get Started
                <svg
                  className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </a>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#070d1e]/95 backdrop-blur-2xl border-b border-white/[0.08] px-6 py-5 space-y-3 animate-fade-in">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1">
            Jump to Section
          </div>
          <div className="grid grid-cols-1 gap-1">
            {features.map((feat, idx) => (
              <button
                key={feat.num}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onJumpToFeature(idx);
                }}
                className="flex items-center justify-between p-2.5 rounded-xl text-left text-sm text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <span>{feat.label}</span>
                <span className="font-mono text-xs text-blue-400">{feat.num}</span>
              </button>
            ))}
          </div>
          <div className="pt-3 border-t border-white/[0.08] flex gap-3">
            <a
              href="/explore"
              className="flex-1 py-2 text-center text-xs font-semibold rounded-lg border border-white/10 text-slate-300 hover:text-white"
            >
              Colleges
            </a>
            <a
              href="/login"
              className="flex-1 py-2 text-center text-xs font-bold rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/30"
            >
              Sign In
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

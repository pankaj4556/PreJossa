import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function Hero({ onStartScroll }) {
  const heroRef = useRef(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.hero-badge', {
        opacity: 0,
        y: -18,
        duration: 0.8,
        delay: 0.2
      })
        .from(
          '.hero-title-word',
          {
            opacity: 0,
            y: 40,
            duration: 0.9,
            stagger: 0.08,
            ease: 'expo.out'
          },
          '-=0.4'
        )
        .from(
          '.hero-subcopy',
          {
            opacity: 0,
            y: 20,
            duration: 0.7
          },
          '-=0.5'
        )
        .from(
          '.hero-actions',
          {
            opacity: 0,
            scale: 0.95,
            duration: 0.6
          },
          '-=0.4'
        )
        .from(
          '.hero-stat-pill',
          {
            opacity: 0,
            y: 15,
            stagger: 0.1,
            duration: 0.6
          },
          '-=0.3'
        )
        .from(
          '.scroll-cue',
          {
            opacity: 0,
            y: 12,
            duration: 0.8
          },
          '-=0.2'
        );
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      className="relative min-h-[92svh] flex flex-col justify-between items-center pt-28 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-gradient-to-tr from-blue-700/20 via-indigo-600/15 to-cyan-500/15 rounded-full blur-[130px] -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[90px] -z-10" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] -z-10" />

        {/* Subtle grid mesh */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center my-auto">
        {/* Editorial Pill Badge */}
        <div className="hero-badge inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-md text-blue-300 text-xs font-semibold uppercase tracking-widest mb-8 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono text-[11px] text-cyan-300">JoSAA 2025 Architecture</span>
          <span className="text-white/30">|</span>
          <span className="text-slate-300">Verified Counselling Intelligence</span>
        </div>

        {/* Headline with Space Grotesk editorial styling */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white font-['Space_Grotesk'] leading-[1.08] mb-6">
          <span className="hero-title-word inline-block">Choose</span>{' '}
          <span className="hero-title-word inline-block">your</span>{' '}
          <span className="hero-title-word inline-block bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            college
          </span>{' '}
          <br className="hidden sm:inline" />
          <span className="hero-title-word inline-block">with</span>{' '}
          <span className="hero-title-word inline-block italic font-serif font-normal text-slate-200">
            calm
          </span>{' '}
          <span className="hero-title-word inline-block bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            confidence.
          </span>
        </h1>

        {/* Subcopy */}
        <p className="hero-subcopy text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal mb-9">
          Transform complex closing rank cutoffs, NIRF credentials, and branch choices into an
          optimized, risk-balanced JoSAA preference list — tailored strictly to your rank.
        </p>

        {/* CTAs */}
        <div className="hero-actions flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <a
            href="/generator"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-bold tracking-wide text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-xl shadow-blue-600/30 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            <span>Start Choice Generator</span>
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
            className="w-full sm:w-auto px-7 py-4 rounded-2xl text-sm font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/[0.2] backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Explore 54 Institutes</span>
          </a>
        </div>

        {/* Stat badges */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 max-w-3xl mx-auto">
          {[
            { label: 'IITs & NITs', val: '23 + 31' },
            { label: 'Verified Cutoffs', val: 'Official JoSAA' },
            { label: 'Academic Branches', val: '560+' },
            { label: 'Risk Modeling', val: '3-Tier Logic' }
          ].map((stat, idx) => (
            <div
              key={idx}
              className="hero-stat-pill inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.07] text-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="font-mono text-slate-400">{stat.label}:</span>
              <span className="font-semibold text-slate-200">{stat.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Animated Scroll Cue */}
      <div className="scroll-cue relative z-10 pt-8 flex flex-col items-center">
        <button
          onClick={onStartScroll}
          className="group flex flex-col items-center gap-2 text-slate-400 hover:text-white transition-colors focus:outline-none"
          aria-label="Scroll down to feature presentation"
        >
          <span className="text-[11px] font-mono tracking-widest uppercase text-slate-400 group-hover:text-blue-400 transition-colors">
            Scroll to Discover
          </span>
          <div className="w-6 h-10 rounded-full border-2 border-slate-600 group-hover:border-blue-400 transition-colors flex justify-center p-1">
            <div className="w-1.5 h-2.5 bg-blue-400 rounded-full animate-bounce" />
          </div>
        </button>
      </div>
    </section>
  );
}

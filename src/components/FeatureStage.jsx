import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import CounsellingPanel from './panels/CounsellingPanel';
import CollegePanel from './panels/CollegePanel';
import BranchPanel from './panels/BranchPanel';
import PlacementPanel from './panels/PlacementPanel';
import NirfPanel from './panels/NirfPanel';

gsap.registerPlugin(ScrollTrigger);

export default function FeatureStage({ lenisRef, onActiveFeatureChange }) {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const scrollTriggerInstanceRef = useRef(null);
  const lastStepRef = useRef(0);
  const progressBarRef = useRef(null);

  const [activeStep, setActiveStep] = useState(0);

  const panels = [
    { id: 'counselling', num: '01', title: 'Counselling', Component: CounsellingPanel },
    { id: 'college', num: '02', title: 'College', Component: CollegePanel },
    { id: 'branch', num: '03', title: 'Branch', Component: BranchPanel },
    { id: 'placement', num: '04', title: 'Placement', Component: PlacementPanel },
    { id: 'nirf', num: '05', title: 'NIRF', Component: NirfPanel }
  ];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // 1. Desktop Experience (>= 768px): Full Pinned Scrub Stage
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const panelEls = gsap.utils.toArray('.feature-panel-layer');
        if (!panelEls.length) return;

        // Initialize panels: first visible, others below
        gsap.set(panelEls[0], {
          yPercent: 0,
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          pointerEvents: 'auto',
          zIndex: 10
        });

        for (let i = 1; i < panelEls.length; i++) {
          gsap.set(panelEls[i], {
            yPercent: 40,
            opacity: 0,
            scale: 0.92,
            filter: 'blur(10px)',
            pointerEvents: 'none',
            zIndex: 10 + i
          });
        }

        // Master Timeline attached to ScrollTrigger with scrub: 1
        const masterTl = gsap.timeline({
          scrollTrigger: {
            trigger: stageRef.current,
            pin: true,
            scrub: 1,
            start: 'top top',
            end: '+=500%',
            anticipatePin: 1,
            onUpdate: (self) => {
              const progress = self.progress;
              if (progressBarRef.current) {
                progressBarRef.current.style.height = `${Math.max(progress * 100, 6)}%`;
              }

              // Determine active step (0 to 4)
              const step = Math.min(
                Math.floor(progress * panels.length),
                panels.length - 1
              );
              if (step !== lastStepRef.current) {
                lastStepRef.current = step;
                setActiveStep(step);
                if (onActiveFeatureChange) onActiveFeatureChange(step);
              }
            }
          }
        });

        scrollTriggerInstanceRef.current = masterTl.scrollTrigger;

        // Construct scrubbed transitions between panels
        // Each transition takes equal timeline duration
        const stepDuration = 1;
        const holdDuration = 0.5;

        for (let i = 0; i < panelEls.length - 1; i++) {
          const current = panelEls[i];
          const next = panelEls[i + 1];

          // Current holds for a moment
          masterTl.to({}, { duration: holdDuration });

          // Current panel animates OFF (moves up, scales down, fades out, blurs)
          masterTl.to(
            current,
            {
              yPercent: -35,
              scale: 0.92,
              opacity: 0,
              filter: 'blur(10px)',
              pointerEvents: 'none',
              duration: stepDuration,
              ease: 'power2.inOut'
            },
            `trans-${i}`
          );

          // Next panel animates IN (from below, scales up, fades in, unblurs)
          masterTl.to(
            next,
            {
              yPercent: 0,
              scale: 1,
              opacity: 1,
              filter: 'blur(0px)',
              pointerEvents: 'auto',
              duration: stepDuration,
              ease: 'power2.inOut'
            },
            `trans-${i}`
          );
        }

        // Final hold for panel 5
        masterTl.to({}, { duration: holdDuration * 1.5 });
      });

      // 2. Mobile Experience (< 768px): Light natural stacked flow with fade-ins
      mm.add('(max-width: 767px)', () => {
        const panelEls = gsap.utils.toArray('.feature-panel-layer');
        panelEls.forEach((panel) => {
          gsap.set(panel, {
            position: 'relative',
            yPercent: 0,
            opacity: 1,
            scale: 1,
            filter: 'none',
            pointerEvents: 'auto'
          });

          gsap.from(panel, {
            scrollTrigger: {
              trigger: panel,
              start: 'top 80%',
              end: 'top 30%',
              scrub: 0.5
            },
            opacity: 0.4,
            y: 30,
            duration: 0.8
          });
        });
      });

      // 3. Prefers Reduced Motion: Simple sequential fades, zero aggressive pinning
      mm.add('(prefers-reduced-motion: reduce)', () => {
        const panelEls = gsap.utils.toArray('.feature-panel-layer');
        panelEls.forEach((panel) => {
          gsap.set(panel, {
            position: 'relative',
            yPercent: 0,
            opacity: 1,
            scale: 1,
            filter: 'none',
            pointerEvents: 'auto'
          });
        });
      });

      // Refresh ScrollTrigger once fonts and DOM settle
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 300);
    },
    { scope: stageRef }
  );

  // Jump to specific feature using Lenis
  const handleScrubToStep = (index) => {
    const st = scrollTriggerInstanceRef.current;
    if (!st || !lenisRef?.current) return;

    // Calculate target scroll position within pinned range
    const totalDistance = st.end - st.start;
    // Spread target across the 5 segments
    const targetProgress = index / (panels.length - 1);
    const targetScroll = st.start + targetProgress * totalDistance;

    lenisRef.current.scrollTo(targetScroll, {
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });
  };

  return (
    <section
      ref={stageRef}
      id="features-stage"
      className="relative w-full min-h-screen bg-[#070d1e] overflow-hidden"
    >
      {/* Slim Vertical Progress Indicator (Desktop) */}
      <div
        className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-6"
        aria-label="Features scroll progress"
      >
        {/* Step Indicator 01 / 05 */}
        <div className="font-mono text-xs tracking-widest text-slate-400">
          <span className="text-white font-bold">{panels[activeStep].num}</span>
          <span className="text-slate-600 mx-1">/</span>
          <span>05</span>
        </div>

        {/* Vertical Progress Track */}
        <div className="relative w-[2px] h-44 bg-white/[0.08] rounded-full overflow-hidden">
          <div
            ref={progressBarRef}
            className="absolute top-0 left-0 w-full bg-gradient-to-b from-blue-500 via-cyan-400 to-amber-400 rounded-full"
            style={{ height: '6%' }}
          />
        </div>

        {/* Clickable step dots */}
        <div className="flex flex-col gap-3">
          {panels.map((p, idx) => {
            const isActive = activeStep === idx;
            return (
              <button
                key={p.num}
                onClick={() => handleScrubToStep(idx)}
                className={`group relative flex items-center justify-center p-1 focus:outline-none`}
                aria-label={`Jump to ${p.title}`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-400 scale-125 shadow-lg shadow-blue-400/50'
                      : 'bg-white/20 hover:bg-white/50'
                  }`}
                />
                {/* Tooltip on hover */}
                <span className="absolute left-6 px-2 py-1 rounded bg-[#0f172a] border border-white/10 text-[10px] font-mono text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                  {p.num} {p.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pinned Stage Workspace containing stacked panel layers */}
      <div
        ref={containerRef}
        className="relative w-full h-screen md:h-screen flex items-center justify-center"
      >
        {panels.map((panel, idx) => {
          const { Component } = panel;
          return (
            <div
              key={panel.id}
              className="feature-panel-layer absolute inset-0 w-full h-full flex items-center justify-center"
            >
              <Component isVisible={activeStep === idx} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

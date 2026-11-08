import React, { useRef, useEffect, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeatureStage from './components/FeatureStage';
import CareerSection from './components/CareerSection';
import Footer from './components/Footer';
import GrainOverlay from './components/GrainOverlay';

gsap.registerPlugin(ScrollTrigger);

export default function LandingApp() {
  const lenisRef = useRef(null);
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  useEffect(() => {
    // 1. Initialize Lenis for smooth scrolling synced with GSAP ScrollTrigger
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false
    });
    lenisRef.current = lenis;

    // Connect Lenis scroll events to ScrollTrigger updates
    lenis.on('scroll', ScrollTrigger.update);

    // GSAP ticker loop for Lenis RAF synchronization
    const tickerCallback = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    // Allow graceful lag smoothing (max 500ms lag, target 33ms/30fps threshold) to prevent thread blocking
    gsap.ticker.lagSmoothing(500, 33);

    // Call ScrollTrigger.refresh safely after fonts & assets load without stacking layout queries
    let refreshed = false;
    const safeRefresh = () => {
      if (refreshed) return;
      refreshed = true;
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(safeRefresh);
    } else {
      const timer = setTimeout(safeRefresh, 300);
    }

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const handleJumpToFeature = (index) => {
    const stageEl = document.getElementById('features-stage');
    if (!stageEl || !lenisRef.current) return;

    const st = ScrollTrigger.getAll().find((s) => s.trigger === stageEl);
    if (st) {
      const totalDistance = st.end - st.start;
      const targetProgress = index / 4;
      lenisRef.current.scrollTo(st.start + targetProgress * totalDistance, {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      });
    } else {
      lenisRef.current.scrollTo(stageEl, { duration: 1.2 });
    }
  };

  const handleStartScroll = () => {
    const stageEl = document.getElementById('features-stage');
    if (stageEl && lenisRef.current) {
      lenisRef.current.scrollTo(stageEl, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#070d1e] text-slate-100 selection:bg-blue-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Subtle Grain Overlay */}
      <GrainOverlay />

      {/* Fixed Minimal Navbar */}
      <Navbar
        onJumpToFeature={handleJumpToFeature}
        activeFeatureIndex={activeFeatureIndex}
      />

      {/* Hero Section */}
      <main>
        <Hero onStartScroll={handleStartScroll} />

        {/* Pinned 5-Feature Stage */}
        <FeatureStage
          lenisRef={lenisRef}
          onActiveFeatureChange={setActiveFeatureIndex}
        />

        {/* Career Finale Section */}
        <CareerSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

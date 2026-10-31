# PreJOSAA Scroll Timeline Architecture & Extension Guide

## Overview

The landing page features a single-stage, scroll-driven storytelling experience powered by:
- **GSAP** + **ScrollTrigger** + **@gsap/react (`useGSAP`)**
- **Lenis** for momentum smooth scrolling synced 1:1 with GSAP
- **gsap.matchMedia** for responsive pinning and reduced-motion compliance

---

## 1. Timeline Structure

The master scroll mechanic is orchestrated inside [FeatureStage.jsx](file:///c:/Users/hp/OneDrive/prejossa/src/components/FeatureStage.jsx):

```javascript
// Master ScrollTrigger Timeline
const masterTl = gsap.timeline({
  scrollTrigger: {
    trigger: stageRef.current,
    pin: true,           // Pin the container to viewport
    scrub: 1,            // Smooth scrub synced with scrollbar
    start: 'top top',
    end: '+=500%',       // Total scrub distance proportional to panels
    anticipatePin: 1,
    onUpdate: (self) => {
      // Updates progress indicator and active step
    }
  }
});
```

### Motion Phases & Reversibility
1. **Initial State**:
   - Panel 1: `opacity: 1, yPercent: 0, scale: 1, filter: 'blur(0px)'`
   - Panels 2..N: `opacity: 0, yPercent: 40, scale: 0.92, filter: 'blur(10px)'`
2. **Transition Segment (scrubbed)**:
   - Panel `i` moves up (`yPercent: -35`), shrinks (`scale: 0.92`), fades out (`opacity: 0`), and blurs (`filter: 'blur(10px)'`).
   - Panel `i+1` enters from below (`yPercent: 0`), scales up (`scale: 1`), fades in (`opacity: 1`), and unblurs (`filter: 'blur(0px)'`).
3. **Exact Reverse**:
   - Because all transforms and filters are keyed linearly into a scrubbed timeline, scrolling UP executes the exact reverse animation smoothly at 60fps without desync.

---

## 2. Lenis Smooth Scrolling Sync

Smooth scrolling is attached to GSAP's RAF loop inside [LandingApp.jsx](file:///c:/Users/hp/OneDrive/prejossa/src/LandingApp.jsx):

```javascript
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);
```

When a user clicks any feature marker in the progress bar or navbar:
```javascript
const targetScroll = st.start + (index / (totalPanels - 1)) * (st.end - st.start);
lenis.scrollTo(targetScroll, { duration: 1.2 });
```

---

## 3. How to Add a 6th Feature (Step-by-Step)

Adding another feature panel takes only 3 simple steps:

### Step 1: Create the Panel Component
Create `src/components/panels/YourNewPanel.jsx`:
```jsx
import React from 'react';

export default function YourNewPanel({ isVisible }) {
  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center px-6">
      {/* Background visual (SVG/Canvas/CSS) */}
      <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="text-xs font-mono text-cyan-400">Feature 06</div>
          <h2 className="text-6xl font-black font-['Space_Grotesk'] text-white">
            SCHOLARSHIPS
          </h2>
          <p className="text-xl text-slate-200">Financial aid and tuition fee waivers across all IITs.</p>
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Register in `FeatureStage.jsx`
Import your component in `src/components/FeatureStage.jsx` and append it to the `panels` array:
```javascript
import YourNewPanel from './panels/YourNewPanel';

const panels = [
  { id: 'counselling', num: '01', title: 'Counselling', Component: CounsellingPanel },
  { id: 'college', num: '02', title: 'College', Component: CollegePanel },
  { id: 'branch', num: '03', title: 'Branch', Component: BranchPanel },
  { id: 'placement', num: '04', title: 'Placement', Component: PlacementPanel },
  { id: 'nirf', num: '05', title: 'NIRF', Component: NirfPanel },
  { id: 'scholarship', num: '06', title: 'Scholarships', Component: YourNewPanel }, // <-- Added
];
```
Adjust the ScrollTrigger end distance to reflect 6 panels:
```javascript
end: '+=600%', // increase by 100% per additional panel
```

### Step 3: Update Navigation Links
In `src/components/Navbar.jsx`, add your panel to `features`:
```javascript
{ label: 'Scholarships', num: '06' }
```
Recompile with `npm run build:landing`. The master timeline loop dynamically generates the extra transition slice and updates the vertical progress scrubber automatically!

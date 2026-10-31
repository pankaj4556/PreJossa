// public/js/landing.js
// Scroll-driven 5-Stage Storytelling Landing Page Controller

document.addEventListener('DOMContentLoaded', () => {
  const storyContainer = document.getElementById('storyContainer');
  const mainContent    = document.getElementById('mainContentContainer');
  const skipBtn        = document.getElementById('skipStoryBtn');
  const progressBar    = document.getElementById('storyProgressBar');
  const enterBtn       = document.getElementById('enterSiteBtn');

  if (!storyContainer) return;

  const stages     = storyContainer.querySelectorAll('.story-stage');
  const totalStages = stages.length;
  let isTransitioning = false;
  let currentStageIdx = 0;

  // ── Session check ────────────────────────────────────────────────────────
  const showOnce = storyContainer.dataset.showOnce === 'true';
  if (showOnce && sessionStorage.getItem('josaa_story_seen') === 'true') {
    revealMain(false);
    return;
  }

  // Lock body scroll while story is active
  document.body.style.overflow = 'hidden';
  storyContainer.style.overflowY = 'scroll';

  // ── Progress bar update ──────────────────────────────────────────────────
  function updateProgress(scrollTop) {
    const maxScroll = storyContainer.scrollHeight - storyContainer.clientHeight;
    const pct = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    if (progressBar) progressBar.style.width = Math.min(pct, 100) + '%';

    // Determine which stage is most visible
    let closest = 0;
    let closestDist = Infinity;
    stages.forEach((s, i) => {
      const rect = s.getBoundingClientRect();
      const dist = Math.abs(rect.top);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    currentStageIdx = closest;
  }

  storyContainer.addEventListener('scroll', () => {
    updateProgress(storyContainer.scrollTop);
  }, { passive: true });

  // ── Dismiss story & reveal main site ────────────────────────────────────
  function revealMain(animate) {
    if (isTransitioning) return;
    isTransitioning = true;
    sessionStorage.setItem('josaa_story_seen', 'true');

    if (animate) {
      storyContainer.style.transition = 'transform 0.7s cubic-bezier(0.16,1,0.3,1), opacity 0.6s ease';
      storyContainer.style.transform  = 'translateY(-100%)';
      storyContainer.style.opacity    = '0';
      setTimeout(() => {
        storyContainer.style.display = 'none';
        document.body.style.overflow = '';
      }, 720);
    } else {
      storyContainer.style.display = 'none';
      document.body.style.overflow = '';
    }

    if (mainContent) {
      mainContent.style.opacity       = '1';
      mainContent.style.pointerEvents = 'all';

      // Kick off scroll-reveal observers for the now-visible home content
      // (PreJOSSAReveal is loaded via scroll-reveal.js in the <head>)
      if (window.PreJOSSAReveal) {
        window.PreJOSSAReveal.init(mainContent);
      }

      // Re-render Lucide icons that were hidden while content had opacity:0
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  }

  // ── Skip button ──────────────────────────────────────────────────────────
  if (skipBtn) {
    skipBtn.addEventListener('click', () => revealMain(true));
  }

  // ── "Enter PreJOSAA" CTA on Stage 5 ─────────────────────────────────────
  if (enterBtn) {
    enterBtn.addEventListener('click', () => revealMain(true));
  }

  // ── Mouse-wheel rapid-skip (user scrolls past last stage) ───────────────
  storyContainer.addEventListener('scroll', () => {
    const atBottom =
      storyContainer.scrollTop + storyContainer.clientHeight >=
      storyContainer.scrollHeight - 40;
    if (atBottom && currentStageIdx >= totalStages - 1) {
      // Slight delay so user sees Stage 5 before dismissing
      setTimeout(() => revealMain(true), 600);
    }
  }, { passive: true });

  // ── Touch swipe-up anywhere while on Stage 5 ────────────────────────────
  let touchStartY = 0;
  storyContainer.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  storyContainer.addEventListener('touchmove', e => {
    if (currentStageIdx >= totalStages - 1) {
      const delta = touchStartY - e.touches[0].clientY;
      if (delta > 60) revealMain(true);
    }
  }, { passive: true });

  // ── Keyboard: Escape skips, PageDown/ArrowDown scrolls to next stage ────
  document.addEventListener('keydown', e => {
    if (!storyContainer.isConnected || storyContainer.style.display === 'none') return;
    if (e.key === 'Escape') { revealMain(true); return; }

    const vh = window.innerHeight;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      storyContainer.scrollBy({ top: vh, behavior: 'smooth' });
    }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      storyContainer.scrollBy({ top: -vh, behavior: 'smooth' });
    }
  });

  // ── Initial progress ─────────────────────────────────────────────────────
  updateProgress(0);
});
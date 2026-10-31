/**
 * scroll-reveal.js
 * Shared scroll-triggered reveal utility for PreJOSAA.
 * Works on both the permanent home page (/home) and the post-landing
 * home-content section revealed after the story overlay.
 *
 * Strategy:
 *  - Uses IntersectionObserver (no scroll event listeners = zero jank).
 *  - Immediately marks elements visible if prefers-reduced-motion is set.
 *  - Elements become visible once, they never re-hide on scroll-up.
 *  - Safe to call multiple times (idempotent via data-reveal-init attribute).
 */

(function initScrollReveal() {
  'use strict';

  // Respect prefers-reduced-motion: reveal everything immediately
  const prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function revealAll(scope) {
    scope.querySelectorAll('.reveal-on-scroll:not(.is-visible)')
      .forEach(el => el.classList.add('is-visible'));
  }

  function setupObserver(scope) {
    if (!('IntersectionObserver' in window)) {
      // Fallback: show everything for older browsers
      revealAll(scope);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Unobserve after reveal — avoids re-triggering
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // Start revealing when 12% of element enters viewport
        threshold: 0.12,
        // Small negative margin so animation fires just before fully visible
        rootMargin: '0px 0px -40px 0px'
      }
    );

    scope.querySelectorAll('.reveal-on-scroll').forEach(el => {
      observer.observe(el);
    });

    return observer;
  }

  /**
   * Public initialiser.
   * Pass an optional root element to scope the observer (defaults to document).
   * Guards against double-initialisation via data attribute.
   */
  function init(scope) {
    scope = scope || document;
    if (scope._revealInitialised) return;
    scope._revealInitialised = true;

    if (prefersReduced) {
      revealAll(scope);
      return;
    }

    setupObserver(scope);
  }

  // Auto-init on DOMContentLoaded for the permanent home page
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(document));
  } else {
    init(document);
  }

  // Expose for programmatic use (e.g. landing.js calling it after story reveal)
  window.PreJOSSAReveal = { init };
})();

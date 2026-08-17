/* ==========================================================================
   SAVI Corporate Website - Reusable Motion & Depth JS Engine
   Product of Vinayaka Financials
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  console.log('[motion.js] loaded, found', document.querySelectorAll('[data-reveal]').length, 'data-reveal elements and', document.querySelectorAll('.tilt-card').length, 'tilt-card elements');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Scroll-Reveal Utility System
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const revealElements = document.querySelectorAll('[data-reveal]');

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);

          console.log('[reveal]', el, 'entering viewport, adding is-revealed');
          setTimeout(() => {
            el.classList.add('is-revealed');
          }, delay);

          observer.unobserve(el);
        }
      });
    }, { threshold: 0.15 });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-revealed'));
  }

  // 2. Layered Tilt-Card Mousemove Tracker (Desktop Pointer Fine Only)
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (!prefersReducedMotion && isFinePointer) {
    const tiltCards = document.querySelectorAll('.tilt-card');

    tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rx = (((y - centerY) / centerY) * -6).toFixed(2);
        const ry = (((x - centerX) / centerX) * 6).toFixed(2);
        console.log('[tilt]', 'mousemove on', e.currentTarget, '--rx:', rx, '--ry:', ry);
        const tx = (((x - centerX) / centerX) * -8).toFixed(2);
        const ty = (((y - centerY) / centerY) * -8 + 16).toFixed(2);

        card.style.setProperty('--rx', `${rx}deg`);
        card.style.setProperty('--ry', `${ry}deg`);
        card.style.setProperty('--tx', `${tx}px`);
        card.style.setProperty('--ty', `${ty}px`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--tx', '0px');
        card.style.setProperty('--ty', '12px');
      });
    });
  }

  // 3. Pinned Step Sequence Observer
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const pinSteps = document.querySelectorAll('.pin-step');

    if (pinSteps.length > 0) {
      const stepObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            pinSteps.forEach(s => s.classList.remove('active'));
            entry.target.classList.add('active');
          }
        });
      }, { threshold: 0.5 });

      pinSteps.forEach(step => stepObserver.observe(step));
    }
  } else {
    document.querySelectorAll('.pin-step').forEach(step => step.classList.add('active'));
  }
});

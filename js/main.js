/* ==========================================================================
   SAVI Corporate Website - Main JavaScript
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sticky Header Scroll Effect
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // 2. Mobile Navigation Toggle & Drawer Actions
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  const siteHeader = document.querySelector('.site-header');

  if (mobileToggle && mainNav) {
    // Append mobile action buttons if not already present in the drawer
    if (!mainNav.querySelector('.mobile-menu-ctas')) {
      const ctaContainer = document.createElement('li');
      ctaContainer.className = 'mobile-menu-ctas';
      ctaContainer.innerHTML = `
        <a href="/demo" class="btn btn-gold">Book a Demo</a>
        <a href="https://razorpay.me/@saakshisharma4719" target="_blank" rel="noopener" class="btn btn-outline-gold">Pay Online via Razorpay</a>
      `;
      mainNav.appendChild(ctaContainer);
    }

    const toggleNav = (open) => {
      const willOpen = typeof open === 'boolean' ? open : !mainNav.classList.contains('open');
      mainNav.classList.toggle('open', willOpen);
      mobileToggle.setAttribute('aria-expanded', willOpen);
      mobileToggle.innerHTML = willOpen ? '&#10005;' : '&#9776;';
      if (willOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };

    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNav();
    });

    // Close when clicking any nav item or link
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
          toggleNav(false);
        }
      });
    });

    // Close on click outside header
    document.addEventListener('click', (e) => {
      if (mainNav.classList.contains('open') && siteHeader && !siteHeader.contains(e.target)) {
        toggleNav(false);
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mainNav.classList.contains('open')) {
        toggleNav(false);
      }
    });
  }

  // 3. Highlight Active Navigation Link
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  const navLinks = document.querySelectorAll('.nav-link, .dropdown-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPath || (href !== '/' && currentPath.startsWith(href)))) {
      link.classList.add('active');
    }
  });

  // 4. Hero Floating Trace Card Mousemove Parallax (Desktop Only)
  const heroCard = document.querySelector('.hero-trace-card');
  const heroWrapper = document.querySelector('.hero-visual-wrapper');

  if (heroCard && heroWrapper) {
    const isDesktop = window.innerWidth > 992;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isDesktop && !isTouch && !prefersReducedMotion) {
      heroWrapper.addEventListener('mousemove', (e) => {
        const rect = heroWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Soft 3D tilt max 6-8 degrees
        const rotX = (((y - centerY) / centerY) * -7).toFixed(2);
        const rotY = (((x - centerX) / centerX) * 7).toFixed(2);

        heroCard.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(10px)`;
      });

      heroWrapper.addEventListener('mouseleave', () => {
        heroCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
      });
    }
  }
});


/**
 * SAVI Corporate Website - 3D Floating Financial Art & Interactive Parallax
 * Renders interactive 3D floating currency tokens (₹, $, €, £, Gold Bullion, Ledger nodes)
 * and mouse-responsive 3D card tilt effects.
 */
(function() {
  function initFloating3D() {
    // 1. Mouse Tilt Parallax for 3D Cards and Badges
    const tiltElements = document.querySelectorAll('[data-tilt-3d]');
    
    document.addEventListener('mousemove', (e) => {
      const { clientX, clientY } = e;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const deltaX = (clientX - centerX) / centerX;
      const deltaY = (clientY - centerY) / centerY;

      // Parallax float for floating currency tokens
      const floatTokens = document.querySelectorAll('.float-3d-token');
      floatTokens.forEach((token) => {
        const speed = parseFloat(token.getAttribute('data-speed') || '15');
        const depth = parseFloat(token.getAttribute('data-depth') || '20');
        const rotSpeed = parseFloat(token.getAttribute('data-rot') || '10');

        const moveX = deltaX * speed;
        const moveY = deltaY * speed;
        const rotX = -deltaY * rotSpeed;
        const rotY = deltaX * rotSpeed;

        token.style.transform = `translate3d(${moveX}px, ${moveY}px, ${depth}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      });

      // Subtle 3D tilt for hero dashboard cards
      tiltElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (clientY >= rect.top - 100 && clientY <= rect.bottom + 100) {
          const elCenterX = rect.left + rect.width / 2;
          const elCenterY = rect.top + rect.height / 2;
          const cardX = (clientX - elCenterX) / (rect.width / 2);
          const cardY = (clientY - elCenterY) / (rect.height / 2);

          el.style.transform = `perspective(1000px) rotateX(${-cardY * 4}deg) rotateY(${cardX * 4}deg) translateZ(10px)`;
        }
      });
    }, { passive: true });

    // Reset tilt on mouse leave
    document.addEventListener('mouseleave', () => {
      tiltElements.forEach(el => {
        el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
      });
      document.querySelectorAll('.float-3d-token').forEach(token => {
        token.style.transform = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloating3D);
  } else {
    initFloating3D();
  }
})();

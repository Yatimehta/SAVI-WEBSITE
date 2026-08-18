/**
 * SAVI Corporate Website - Animated Liquid Water Wave Background Canvas
 * Provides organic, elegant multi-frequency fluid wave motion behind hero & key sections.
 */
(function() {
  function initWaveCanvas() {
    // Look for existing canvas or create one in the hero section
    let canvas = document.getElementById('savi-wave-canvas');
    const heroSection = document.querySelector('.hero-section') || document.querySelector('.page-header');

    if (!canvas && heroSection) {
      canvas = document.createElement('canvas');
      canvas.id = 'savi-wave-canvas';
      canvas.className = 'savi-wave-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      heroSection.insertBefore(canvas, heroSection.firstChild);
    }

    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let animationFrameId = null;
    let mouse = { x: null, y: null, targetX: null, targetY: null };
    let time = 0;

    function resize() {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = Math.max(rect.height, 450);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Mouse tracking for subtle ripple deflection
    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        mouse.targetX = e.clientX - rect.left;
        mouse.targetY = e.clientY - rect.top;
      }
    }, { passive: true });

    // Multi-layer wave definitions with harmonic parameters
    const waves = [
      {
        frequency: 0.0035,
        speed: 0.012,
        amplitude: 28,
        yRatio: 0.65,
        colorStart: 'rgba(14, 165, 233, 0.14)', // Cyber Blue / Cyan
        colorEnd: 'rgba(7, 21, 38, 0.02)',
        lineColor: 'rgba(56, 189, 248, 0.45)',
        lineWidth: 1.5
      },
      {
        frequency: 0.005,
        speed: 0.018,
        amplitude: 38,
        yRatio: 0.72,
        colorStart: 'rgba(11, 31, 58, 0.25)', // Deep Navy
        colorEnd: 'rgba(6, 11, 25, 0.05)',
        lineColor: 'rgba(14, 165, 233, 0.35)',
        lineWidth: 1.8
      },
      {
        frequency: 0.0028,
        speed: 0.009,
        amplitude: 45,
        yRatio: 0.78,
        colorStart: 'rgba(179, 142, 79, 0.12)', // Gold Shimmer
        colorEnd: 'rgba(139, 104, 46, 0.01)',
        lineColor: 'rgba(219, 180, 111, 0.55)',
        lineWidth: 2
      },
      {
        frequency: 0.0042,
        speed: 0.015,
        amplitude: 22,
        yRatio: 0.85,
        colorStart: 'rgba(14, 165, 233, 0.08)', // Ambient Bottom Wave
        colorEnd: 'rgba(7, 13, 24, 0.3)',
        lineColor: 'rgba(14, 165, 233, 0.25)',
        lineWidth: 1.2
      }
    ];

    function draw() {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      if (mouse.targetX !== null) {
        if (mouse.x === null) {
          mouse.x = mouse.targetX;
          mouse.y = mouse.targetY;
        } else {
          mouse.x += (mouse.targetX - mouse.x) * 0.05;
          mouse.y += (mouse.targetY - mouse.y) * 0.05;
        }
      }

      // Draw each fluid wave
      waves.forEach((wave, index) => {
        const baseY = height * wave.yRatio;
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseY);

        const step = 8;
        for (let x = 0; x <= width; x += step) {
          // Base sinusoidal wave
          let y = baseY +
            Math.sin(x * wave.frequency + time * wave.speed + index) * wave.amplitude +
            Math.cos(x * (wave.frequency * 0.5) + time * (wave.speed * 0.7)) * (wave.amplitude * 0.4);

          // Interactive mouse wave deflection
          if (mouse.x !== null) {
            const dist = Math.abs(x - mouse.x);
            if (dist < 220) {
              const influence = (1 - dist / 220) * 20;
              y += Math.sin((x - mouse.x) * 0.05 + time * 0.1) * influence;
            }
          }

          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Gradient fill
        const grad = ctx.createLinearGradient(0, baseY - wave.amplitude, 0, height);
        grad.addColorStop(0, wave.colorStart);
        grad.addColorStop(1, wave.colorEnd);
        ctx.fillStyle = grad;
        ctx.fill();

        // Glowing wave crest line
        ctx.beginPath();
        for (let x = 0; x <= width; x += step) {
          let y = baseY +
            Math.sin(x * wave.frequency + time * wave.speed + index) * wave.amplitude +
            Math.cos(x * (wave.frequency * 0.5) + time * (wave.speed * 0.7)) * (wave.amplitude * 0.4);

          if (mouse.x !== null) {
            const dist = Math.abs(x - mouse.x);
            if (dist < 220) {
              const influence = (1 - dist / 220) * 20;
              y += Math.sin((x - mouse.x) * 0.05 + time * 0.1) * influence;
            }
          }

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wave.lineColor;
        ctx.lineWidth = wave.lineWidth;
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(draw);
    }

    draw();

    // Pause canvas when document is hidden to save CPU/battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        draw();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWaveCanvas);
  } else {
    initWaveCanvas();
  }
})();

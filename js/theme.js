/**
 * SAVI Corporate Website - Multi-Theme Switcher
 * Supports: 'midnight' (soothing deep navy) and 'light' (pure pearl white)
 * Robust fallback to prevent 'undefined' on any browser/device.
 */
(function() {
  const THEMES = ['midnight', 'light'];
  const THEME_ICONS = {
    midnight: '🌌',
    light: '☀️'
  };
  const THEME_LABELS = {
    midnight: 'Midnight',
    light: 'Light'
  };

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem('savi-theme');
      if (saved && THEMES.includes(saved)) {
        return saved;
      }
    } catch(e) {}
    return 'midnight';
  }

  function applyTheme(theme) {
    if (!THEMES.includes(theme)) theme = 'midnight';
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('savi-theme', theme);
    } catch(e) {}
    updateToggleButtons(theme);
  }

  function updateToggleButtons(theme) {
    if (!THEMES.includes(theme)) theme = 'midnight';
    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(btn => {
      const nextTheme = theme === 'midnight' ? 'light' : 'midnight';
      const label = THEME_LABELS[theme] || 'Midnight';
      const icon = THEME_ICONS[theme] || '🌌';
      const nextLabel = THEME_LABELS[nextTheme] || 'Light';

      btn.setAttribute('aria-label', `Current theme: ${label}. Switch to ${nextLabel} mode.`);
      btn.setAttribute('title', `Theme: ${label} (Click to toggle)`);
      btn.innerHTML = `
        <span class="theme-icon">${icon}</span>
        <span class="theme-label-text">${label}</span>
      `;
    });
  }

  function cycleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'midnight';
    const nextTheme = current === 'midnight' ? 'light' : 'midnight';
    applyTheme(nextTheme);
  }

  const initialTheme = getSavedTheme();
  applyTheme(initialTheme);

  document.addEventListener('DOMContentLoaded', () => {
    updateToggleButtons(getSavedTheme());
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        cycleTheme();
      });
    });
  });

  window.saviTheme = { applyTheme, cycleTheme, getSavedTheme };
})();

/**
 * SAVI Corporate Website - Multi-Theme Switcher
 * Supports: 'midnight' (soothing deep navy) and 'light' (pure pearl white)
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
    return localStorage.getItem('savi-theme') || 'midnight';
  }

  function applyTheme(theme) {
    if (!THEMES.includes(theme)) theme = 'midnight';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('savi-theme', theme);
    updateToggleButtons(theme);
  }

  function updateToggleButtons(theme) {
    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(btn => {
      const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length;
      const nextTheme = THEMES[nextIndex];
      btn.setAttribute('aria-label', `Current theme: ${THEME_LABELS[theme]}. Switch to ${THEME_LABELS[nextTheme]} mode.`);
      btn.setAttribute('title', `Theme: ${THEME_LABELS[theme]} (Click to toggle)`);
      btn.innerHTML = `
        <span class="theme-icon">${THEME_ICONS[theme]}</span>
        <span class="theme-label-text">${THEME_LABELS[theme]}</span>
      `;
    });
  }

  function cycleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'midnight';
    const nextIndex = (THEMES.indexOf(current) + 1) % THEMES.length;
    applyTheme(THEMES[nextIndex]);
  }

  const initialTheme = getSavedTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);

  document.addEventListener('DOMContentLoaded', () => {
    updateToggleButtons(initialTheme);
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        cycleTheme();
      });
    });
  });

  window.saviTheme = { applyTheme, cycleTheme, getSavedTheme };
})();

/**
 * SAVI Corporate Website - Multi-Theme Switcher
 * Supports: 'midnight' (default deep luxury), 'dark' (obsidian black), 'light' (pearl white)
 */
(function() {
  const THEMES = ['midnight', 'dark', 'light'];
  const THEME_ICONS = {
    midnight: '🌌',
    dark: '🌙',
    light: '☀️'
  };
  const THEME_LABELS = {
    midnight: 'Midnight',
    dark: 'Dark',
    light: 'Light'
  };

  // 1. Get saved theme or default to 'midnight' for luxury fintech look
  function getSavedTheme() {
    return localStorage.getItem('savi-theme') || 'midnight';
  }

  // 2. Apply theme to document
  function applyTheme(theme) {
    if (!THEMES.includes(theme)) theme = 'midnight';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('savi-theme', theme);
    updateToggleButtons(theme);
  }

  // 3. Update all toggle button UI states
  function updateToggleButtons(theme) {
    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(btn => {
      const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length;
      const nextTheme = THEMES[nextIndex];
      btn.setAttribute('aria-label', `Current theme: ${THEME_LABELS[theme]}. Click for ${THEME_LABELS[nextTheme]} mode.`);
      btn.setAttribute('title', `Theme: ${THEME_LABELS[theme]} (Click to toggle)`);
      btn.innerHTML = `
        <span class="theme-icon">${THEME_ICONS[theme]}</span>
        <span class="theme-label-text">${THEME_LABELS[theme]}</span>
      `;
    });
  }

  // 4. Cycle to next theme
  function cycleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'midnight';
    const nextIndex = (THEMES.indexOf(current) + 1) % THEMES.length;
    applyTheme(THEMES[nextIndex]);
  }

  // Initial immediate application before full DOM load
  const initialTheme = getSavedTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);

  // Bind events when DOM is ready
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

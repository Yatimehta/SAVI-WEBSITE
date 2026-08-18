import os
import re

HEADER_ACTIONS_HTML = '''      <div class="header-actions">
        <button type="button" class="theme-toggle-btn" aria-label="Toggle Theme">
          <span class="theme-icon">🌌</span>
          <span class="theme-label-text">Midnight</span>
        </button>
        <a href="/demo" class="btn btn-primary">Book a Demo</a>
      </div>'''

SCRIPTS_HTML = '''  <script src="/js/main.js"></script>
  <script src="/js/theme.js"></script>
  <script src="/js/wave-bg.js"></script>
  <script src="/js/floating-3d.js"></script>'''

html_files = [
    "about/index.html",
    "about/company/index.html",
    "contact/index.html",
    "demo/index.html",
    "how-it-works/index.html",
    "pricing/index.html",
    "product/index.html",
    "product/intelligence-platform/index.html",
    "product/full-platform/index.html",
    "product/capabilities/index.html",
    "resources/index.html",
    "trust/index.html",
    "who-its-for/index.html",
    "legal/privacy/index.html",
    "legal/terms/index.html",
    "legal/cookies/index.html"
]

for file_path in html_files:
    if not os.path.exists(file_path):
        print(f"Skipping missing: {file_path}")
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add Home button to main-nav if not already present
    if '<li class="nav-item"><a href="/" class="nav-link' not in content:
        content = re.sub(
            r'(<ul class="main-nav">)',
            r'\1\n          <li class="nav-item"><a href="/" class="nav-link">Home</a></li>',
            content
        )

    # 2. Add header-actions (theme button + demo CTA)
    # Replace plain <div><a href="/demo" class="btn btn-primary">Book a Demo</a></div>
    content = re.sub(
        r'<div>\s*<a href="/demo" class="btn btn-primary">Book a Demo</a>\s*</div>',
        HEADER_ACTIONS_HTML,
        content
    )

    # 3. Ensure theme.js, wave-bg.js, floating-3d.js are loaded
    if '/js/theme.js' not in content:
        content = re.sub(
            r'<script src="/js/main\.js"></script>',
            SCRIPTS_HTML,
            content
        )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Updated {file_path}")

print("All files processed.")

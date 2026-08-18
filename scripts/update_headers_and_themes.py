import os
import re

HEADER_ACTIONS_HTML = '''      <div class="header-actions">
        <button type="button" class="theme-toggle-btn" aria-label="Toggle Theme">
          <span class="theme-icon">🌌</span>
          <span class="theme-label-text">Midnight</span>
        </button>
        <a href="https://razorpay.me/@saakshisharma4719" target="_blank" rel="noopener" class="btn btn-outline-gold" style="padding: 9px 18px; font-size: 0.875rem;">Pay Online</a>
        <a href="/demo" class="btn btn-primary" style="padding: 9px 20px; font-size: 0.875rem;">Book a Demo</a>
      </div>'''

html_files = [
    "index.html",
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
    "legal/cookies/index.html",
    "download/index.html"
]

for file_path in html_files:
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add Download link to main-nav if not present
    if '<a href="/download"' not in content:
        content = re.sub(
            r'(<li class="nav-item"><a href="/pricing" class="nav-link.*?">Pricing</a></li>)',
            r'\1\n          <li class="nav-item"><a href="/download" class="nav-link">Download</a></li>',
            content
        )

    # 2. Update header-actions
    content = re.sub(
        r'<div class="header-actions">[\s\S]*?<\/div>\s*<\/div>\s*<\/header>',
        HEADER_ACTIONS_HTML + '\n    </div>\n  </header>',
        content
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Updated {file_path}")

print("All navigation & themes synced.")

import os
import re

html_files = [
    "index.html",
    "about/index.html",
    "about/company/index.html",
    "contact/index.html",
    "demo/index.html",
    "download/index.html",
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
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Cache bust css
    content = re.sub(r'href="/css/([^"?]+)(\?v=[^"]*)?"', r'href="/css/\1?v=3.8"', content)
    # Cache bust js
    content = re.sub(r'src="/js/([^"?]+)(\?v=[^"]*)?"', r'src="/js/\1?v=3.8"', content)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Busted cache in {file_path}")

print("All HTML files cache-busted.")

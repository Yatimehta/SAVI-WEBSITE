#!/usr/bin/env python3
"""
Remove <li> entries for /resources and /about/company from all HTML files.
Handles both nav and footer occurrences.
"""
import os, re, glob

root = '/Users/yatimehta/SAVI Website'

# Patterns to remove — entire <li>...</li> lines containing these hrefs
patterns = [
    # nav: <li class="nav-item"><a href="/resources" ...>Resources</a></li>
    re.compile(r'\s*<li class="nav-item"><a href="/resources"[^>]*>Resources</a></li>\n', re.IGNORECASE),
    # footer: <li><a href="/resources">Resources</a></li>
    re.compile(r'\s*<li><a href="/resources">Resources</a></li>\n', re.IGNORECASE),
    # nav dropdown: <li><a href="/about/company" class="dropdown-link">Company Information</a></li>
    re.compile(r'\s*<li><a href="/about/company"[^>]*>Company Information</a></li>\n', re.IGNORECASE),
    # footer: <li><a href="/about/company">Company Information</a></li>
    re.compile(r'\s*<li><a href="/about/company">Company Information</a></li>\n', re.IGNORECASE),
]

html_files = glob.glob(os.path.join(root, '**', '*.html'), recursive=True)
changed = []

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()
    
    content = original
    for pattern in patterns:
        content = pattern.sub('', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        changed.append(os.path.relpath(filepath, root))

print(f"Modified {len(changed)} files:")
for f in sorted(changed):
    print(f" - {f}")

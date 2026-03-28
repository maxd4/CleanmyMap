#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Targeted fix for line 4572 in app.py:
The mojibake sequence contains ''' which prematurely closes the st.write triple-quoted string.
Fix: replace the entire corrupted phrase with correct French text.
"""
import ast
import re
import sys
from pathlib import Path

APP_PY = Path(__file__).resolve().parent.parent / "app.py"

content = APP_PY.read_text(encoding="utf-8")

# The problematic section is inside a st.write('''...''') block.
# The mojibake for "où" (where) contains the byte sequence that includes
# a triple-quote, terminating the string early.
# Strategy: find the broken line and replace with clean French.

# Find the ACV section and fix all broken mojibake in it:
fixes = [
    # Line 4572: "où les déchets deviennent..."
    (
        re.compile(r"5\. \*\*La Fin de vie\*\*, o[^l\n]*les d"),
        "5. **La Fin de vie**, ou les d",
    ),
    # Line 4565: expander title mojibake
    (
        re.compile(r"'' '\.\.\.'+'  Qu'est-ce que l'ACV"),
        "\U0001f4da Qu'est-ce que l'ACV",
    ),
    # Any remaining mojibake in triple-quoted strings (cha***ne)
    (
        re.compile(r"cha[^i\n]*[^n\n]*ne alimentaire"),
        "chaine alimentaire",
    ),
]

for pattern, replacement in fixes:
    m = pattern.search(content)
    if m:
        print(f"Fixing: {repr(m.group(0)[:80])}")
        content = pattern.sub(replacement, content, count=1)
    else:
        print(f"Pattern not found (ok if already fixed): {pattern.pattern[:60]}")

# Also fix any cha***ne in the microplastics section
content = re.sub(
    r"(cha)[^i\n]{1,30}(ne alimentaire)",
    r"\1\2",
    content,
)

APP_PY.write_text(content, encoding="utf-8")
print(f"Written {len(content)} chars")

try:
    ast.parse(content)
    print("Syntax: OK")
except SyntaxError as e:
    lines = content.splitlines()
    start = max(0, e.lineno - 4)
    end = min(len(lines), e.lineno + 2)
    print(f"SYNTAX ERROR at line {e.lineno}: {e.msg}")
    for i in range(start, end):
        marker = " <<< ERROR" if i + 1 == e.lineno else ""
        print(f"  {i+1}: {repr(lines[i][:100])}{marker}")
    sys.exit(1)

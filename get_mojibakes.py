import os
import re
import json

def extract_all_mojibakes():
    mb_set = set()
    for root, _, files in os.walk('.'):
        if '.git' in root or 'CleanmyMap' in root or 'node_modules' in root: continue
        for name in files:
            if not name.endswith('.py'): continue
            path = os.path.join(root, name)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    text = f.read()
                # Find any sequence of mojibake characters starting with Ã
                # It usually consists of Ã followed by things
                for match in re.findall(r'Ã[^\sA-Za-z0-9_]{1,100}', text):
                    mb_set.add(match)
            except Exception:
                pass
                
    mojis = sorted(list(mb_set), key=len, reverse=True)
    with open('all_mojibakes.json', 'w', encoding='utf-8') as f:
        json.dump(mojis, f, ensure_ascii=False, indent=2)
    print(f"Extracted {len(mojis)} unique mojibakes.")

if __name__ == "__main__":
    extract_all_mojibakes()

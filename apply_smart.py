import os
import json

def apply_repair():
    with open('smart_mapping.json', 'r', encoding='utf-8') as f:
        cmap = json.load(f)

    # Sort keys by length descending to replace longest mojibake strings first
    sorted_mojibakes = sorted(cmap.keys(), key=len, reverse=True)

    EXTS = {'.py', '.md', '.json', '.txt', '.js', '.csv', '.cjs'}
    IGNORE_DIRS = {'.git', 'node_modules', 'Playwright', 'CleanmyMap-sync', '__pycache__', 'env', 'venv'}

    count = 0
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for name in files:
            ext = os.path.splitext(name)[1].lower()
            if ext in EXTS:
                path = os.path.join(root, name)
                if ext == '.csv' or ext == '.json': 
                    if 'ui_inventory.baseline.json' not in name:
                        continue 
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        text = f.read()
                        
                    if 'Ã' not in text:
                        continue
                        
                    original_text = text
                    
                    for mb in sorted_mojibakes:
                        text = text.replace(mb, cmap[mb])
                    
                    if text != original_text:
                        with open(path, 'w', encoding='utf-8', newline='\n') as f:
                            f.write(text)
                        print(f"Repaired: {path}")
                        count += 1
                except Exception as e:
                    pass
    print(f"Repaired {count} files total.")

if __name__ == "__main__":
    apply_repair()

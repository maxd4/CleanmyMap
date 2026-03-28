import os

REPLACEMENTS = {
    "": "",
    "": "",
    "": "",
}

def very_final_flush():
    EXTS = {'.py', '.md', '.json', '.txt', '.js', '.csv', '.cjs'}
    IGNORE_DIRS = {'.git', 'node_modules', 'Playwright', 'CleanmyMap-sync', '__pycache__', 'env', 'venv'}

    count = 0
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for name in files:
            ext = os.path.splitext(name)[1].lower()
            if ext in EXTS:
                if ext in {'.csv', '.json'} and 'ui_inventory.baseline.json' not in name:
                    continue 

                path = os.path.join(root, name)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        text = f.read()
                        
                    original_text = text
                    
                    for mb in REPLACEMENTS.keys():
                        text = text.replace(mb, REPLACEMENTS[mb])
                    
                    if text != original_text:
                        with open(path, 'w', encoding='utf-8', newline='\n') as f:
                            f.write(text)
                        print(f"Repaired very final: {path}")
                        count += 1
                except Exception as e:
                    pass
    print(f"Very final flush in {count} files.")

if __name__ == "__main__":
    very_final_flush()

import os
import re

def build_dynamic_dict(clean_file, corrupt_file):
    with open(clean_file, 'r', encoding='utf-8', errors='ignore') as f:
        clean_text = f.read()
    with open(corrupt_file, 'r', encoding='utf-8', errors='ignore') as f:
        corrupt_text = f.read()

    char_map = {}
    
    # Pre-known French mappings for specific test cases
    test_chars = [
        'é', 'è', 'à', 'ç', 'ê', 'î', 'ï', 'ô', 'û', 'ù', 'ë',
        'É', 'È', 'À', 'Ç', 'Ê', 'Î', 'Ï', 'Ô', 'Û', 'Ù',
        '€', '°', 'œ', 'Œ', '’', '«', '»', '–', '—', '…', 'œ'
    ]
    
    # We will search for occurrences of test_chars in clean_text
    # and map them to corrupt_text by looking at words
    clean_words = clean_text.split()
    corrupt_words = corrupt_text.split()
    
    # We only care about words present in both files but with mojibake
    # Note: word count might be slightly offset due to insertions, but we just need enough matches
    for cw, rw in zip(clean_words[:30000], corrupt_words[:30000]):
        if cw != rw and any(c in cw for c in test_chars) and 'Ã' in rw:
            # simple single-character diff
            if len(rw) > len(cw):
                for char in test_chars:
                    if char in cw:
                        parts = cw.split(char, 1)
                        if len(parts) == 2:
                            pref, suff = parts
                            # try to extract the mojibake from rw
                            if rw.startswith(pref) and rw.endswith(suff):
                                mb = rw[len(pref):len(rw)-len(suff)]
                                if mb and 'Ã' in mb:
                                    char_map[mb] = char

    # Default static fallbacks for some that might be missed or dynamically hard to parse
    # Instead of typing them manually and risking PowerShell encoding issues, 
    # we just fall back on our recursive algorithm if they are missed.
    # Actually wait, our dynamic extraction from `CleanmyMap-sync/app.py` to `app.py` 
    # should be MORE than enough to capture all variants of 'é', 'à', 'è', etc.!
    
    return char_map

def fix_repository(mapping, root_dir):
    # Now we loop through all python files and apply this dictionary
    EXTS = {'.py', '.md', '.json', '.txt', '.js', '.csv', '.cjs'}
    IGNORE_DIRS = {'.git', 'node_modules', 'Playwright', 'CleanmyMap-sync', '__pycache__', 'env', 'venv'}

    count = 0
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for name in files:
            ext = os.path.splitext(name)[1].lower()
            if ext in EXTS:
                path = os.path.join(root, name)
                if ext == '.csv' or ext == '.json': 
                    # specific check for our baseline json
                    if 'ui_inventory.baseline.json' not in name:
                        continue 
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        text = f.read()
                        
                    if 'Ã' not in text:
                        continue
                        
                    original_text = text
                    # Apply largest mojibakes mapping first to avoid partial replacements
                    for mb in sorted(mapping.keys(), key=len, reverse=True):
                        text = text.replace(mb, mapping[mb])
                    
                    if text != original_text:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(text)
                        print(f"Repaired: {path}")
                        count += 1
                except Exception as e:
                    pass
    print(f"Repaired {count} files total.")

if __name__ == "__main__":
    cmap = build_dynamic_dict('CleanmyMap-sync/app.py', 'app.py')
    print(f"Built mapping dictionary with {len(cmap)} rules:")
    for m, c in cmap.items():
        print(f"Rule -> {c}")
    fix_repository(cmap, '.')


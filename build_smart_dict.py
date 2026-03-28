import difflib
import json
import re

def build_smart():
    with open('CleanmyMap-sync/app.py', 'r', encoding='utf-8') as f:
        clean = f.read()
    with open('app.py', 'r', encoding='utf-8') as f:
        corrupted = f.read()

    # To avoid memory issues with SequenceMatcher on 5000 lines, 
    # we chunk by functions or classes
    clean_blocks = clean.split('def ')
    corrupt_blocks = corrupted.split('def ')
    
    mapping = {}
    
    # We only care about matching blocks with the same function name
    # This aligns the code perfectly!
    clean_dict = {}
    for b in clean_blocks:
        if not b: continue
        name = b.split('(')[0].strip()
        clean_dict[name] = b
        
    for b in corrupt_blocks:
        if not b: continue
        name = b.split('(')[0].strip()
        if name in clean_dict:
            c = clean_dict[name]
            # Now we diff the two blocks
            matcher = difflib.SequenceMatcher(None, c, b)
            for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                if tag == 'replace' or tag == 'insert':
                    orig = c[i1:i2]
                    curr = b[j1:j2]
                    
                    if 'Ã' in curr:
                        # Ensure we map exactly the accented character and not standard code changes
                        # Since standard code changes shouldn't contain `Ã`
                        # We try to extract just the exact replace if it's flanked correctly
                        if orig and len(orig) == 1 and curr.startswith('Ã'):
                            mapping[curr] = orig
                        elif len(orig) == 2 and curr.startswith('Ã'):
                            mapping[curr] = orig
                            
    # Now extend mapping for known French characters we can guess via recursive repair
    test_chars = [
        'é', 'è', 'à', 'ç', 'ê', 'î', 'ï', 'ô', 'û', 'ù', 'ë',
        'É', 'È', 'À', 'Ç', 'Ê', 'Î', 'Ï', 'Ô', 'Û', 'Ù',
        '€', '°', 'œ', 'Œ', '’', '«', '»', '–', '—', '…', 'œ'
    ]
    
    known = {}
    for c in test_chars:
        s = c
        for _ in range(5):
            try:
                s = s.encode('utf-8').decode('cp1252')
            except Exception:
                break
        known[s] = c
    
    mapping.update({k: v for k, v in known.items() if 'Ã' in k})

    with open('smart_mapping.json', 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
        
    print(f"Extracted {len(mapping)} rules.")

if __name__ == "__main__":
    build_smart()

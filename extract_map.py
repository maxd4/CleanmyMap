import difflib
import re

def build_mapping():
    with open('app_dd.py', 'r', encoding='utf-8', errors='ignore') as f:
        old_lines = f.readlines()
    with open('app_feeb.py', 'r', encoding='utf-8', errors='ignore') as f:
        new_lines = f.readlines()

    mapping = {}
    
    # We will just look at lines that share prefix but differ in accented characters
    for old_l, new_l in zip(old_lines[:5000], new_lines[:5000]):
        if old_l == new_l:
            continue
            
        old_words = re.findall(r'[^\s\.\,;"\':\(\)\[\]\{\}]+', old_l)
        new_words = re.findall(r'[^\s\.\,;"\':\(\)\[\]\{\}]+', new_l)
        
        if len(old_words) == len(new_words):
            for ow, nw in zip(old_words, new_words):
                if ow != nw and 'Ã' in nw:
                    # found a mapping
                    mapping[nw] = ow

    # also try to extract individual character mappings
    char_map = {}
    for k, v in mapping.items():
        if len(v) == 1:
            char_map[k] = v
            continue
        # simple alignment for single accented char inside a word
        if len(k) > len(v) and v.isalpha():
            for i, c in enumerate(v):
                if c not in k:
                    # we found the replaced char `c`
                    # let's find the mojibake. it starts at index i in `k`.
                    parts_k = k.split(v[:i], 1)
                    if len(parts_k) > 1:
                        remainder = parts_k[1]
                        parts2 = remainder.split(v[i+1:], 1)
                        if len(parts2) > 1:
                            mojibake = parts2[0]
                            char_map[mojibake] = c

    # Fallback mappings for known accented characters if not found
    print(f"Found {len(char_map)} character mappings:")
    for m, c in char_map.items():
        print(f"  {repr(m)} -> {repr(c)}")

    return char_map

if __name__ == "__main__":
    build_mapping()

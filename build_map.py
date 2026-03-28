import re
import codecs

def repair_bytes(text):
    current = text
    for _ in range(10):
        try:
            raw = current.encode('cp1252', errors='ignore')
            unmojibaked = raw.decode('utf-8')
            if current == unmojibaked:
                break
            current = unmojibaked
        except Exception:
            break
    return current

def build_mojibake_map(src_file):
    with open(src_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find long mojibake sequences
    mojibake_pattern = re.compile(r'(?:Ã[^\sA-Za-z0-9]+)+')
    matches = set(mojibake_pattern.findall(content))
    
    replacements = {}
    for m in matches:
        fixed = repair_bytes(m)
        if fixed != m and '\\' not in fixed and not fixed.startswith('Ã'):
            replacements[m] = fixed
    return replacements

if __name__ == "__main__":
    reps = build_mojibake_map("app_feeb.py")
    print(f"Found {len(reps)} mapping rules.")
    for k, v in list(reps.items())[:20]:
        print(f"{repr(k)} -> {repr(v)}")

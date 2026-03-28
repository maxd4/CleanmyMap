import sys
import codecs
from pathlib import Path

# Try to use ftfy
try:
    import ftfy
except ImportError:
    ftfy = None

def load_file(path_str):
    with open(path_str, 'rb') as f:
        return f.read()

def repair_bytes(data):
    # Try decoding assuming the bytes are actually utf-8 but stored wrong
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        text = data.decode('cp1252', errors='replace')
        
    if ftfy is not None:
        return ftfy.fix_text(text)
    
    # manual loop
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

if __name__ == "__main__":
    src = "app_feeb.py"
    data = load_file(src)
    fixed = repair_bytes(data)
    
    with open("app_feeb_fixed.py", "w", encoding="utf-8") as f:
        f.write(fixed)
    
    import re
    mojibake_pattern = re.compile(r"Ã")
    count = len(mojibake_pattern.findall(fixed))
    print(f"Remaining mojibake markers: {count}")
    
    with open("app_feeb_fixed_excerpt.txt", "w", encoding="utf-8") as f:
        f.write(fixed[3000:4000])


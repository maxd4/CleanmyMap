import subprocess
import difflib
import re
import json

def read_old():
    # Read dd09cfd version correctly, ensuring utf-8 decodes it
    raw = subprocess.check_output(['git', 'show', 'dd09cfd:app.py'])
    return raw.decode('utf-8', errors='ignore')

def read_new():
    with open('app.py', 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def build_map():
    old = read_old()
    new = read_new()
    
    # We find quoted strings
    old_strings = re.findall(r'["\'](.*?)["\']', old)
    new_strings = re.findall(r'["\'](.*?)["\']', new)
    
    mapping = {}
    
    # If a string in old has an accented character, its corresponding string in new is mojibake
    for s_old in set(old_strings):
        if not re.search(r'[^\x00-\x7F]', s_old): continue # skip ascii
        if len(s_old) < 5: continue
        
        # we try to find the match in new by searching prefix and suffix
        prefix = s_old[:3]
        suffix = s_old[-3:]
        
        for s_new in set(new_strings):
            if s_new.startswith(prefix) and s_new.endswith(suffix) and len(s_old) < len(s_new):
                # found match
                diffs = difflib.SequenceMatcher(None, s_old, s_new).get_opcodes()
                for tag, i1, i2, j1, j2 in diffs:
                    if tag == 'replace':
                        orig = s_old[i1:i2]
                        moj = s_new[j1:j2]
                        if len(orig) == 1 and 'Ã' in moj:
                            mapping[moj] = orig
                            
    print("Found Mappings:")
    for k, v in mapping.items():
        print(f"  {repr(k)} -> {repr(v)}")
        
    with open('mojibake.json', 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False)

if __name__ == "__main__":
    build_map()

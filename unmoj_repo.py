import os
from pathlib import Path

# The core recursive repair function
def repair_bytes(text):
    current = text
    # Safety bounds for the loop
    for _ in range(15):
        try:
            raw = current.encode('cp1252', errors='ignore')
            unmojibaked = raw.decode('utf-8')
            if current == unmojibaked:
                break
            current = unmojibaked
        except Exception:
            break
            
    # Also perform typical direct replacements that might have been mangled differently
    replacements = {
        'é': 'é', 'è': 'è', 'Ã\xa0': 'à', 'ç': 'ç', 'ê': 'ê', 
        'Ã\xae': 'î', 'Ã\xaf': 'ï', 'Ã\xb4': 'ô', 'Ã\xbb': 'û', 'Ã\xb9': 'ù',
        'Ã\xab': 'ë', 'Ã\x89': 'É', 'Ã\x88': 'È', 'Ã\x80': 'À', 'Ã\x87': 'Ç',
        ''': "'", ''': "'", ''': "'", '"': '"', '"': '"',
        '-': '-', '-': '-', '...': '...', '°': '°', '·': '·',
        # Common mojibake strings from previous iterations
        'é': 'é', 'è': 'è', 'à': 'à', 'à§': 'ç', 'à´': 'ô',
        'à®': 'î', 'à»': 'û', 'à¹': 'ù', 'à¯': 'ï', 'à«': 'ë',
        
        # And very specific long ones that we might encounter and `encode` misses due to `ignore`
        '’’ ’’ ’’à¢Ã¢â€šÂ¬ ’’ ’Ã‚Â¢à¢’Å¡Ã‚Â¬Ãƒ...Ã‚Â¡’’à¢Ã¢â€šÂ¬Ã…Â¡’’Å¡šÃ‚Â©': 'é',
        '’’ ’’ ’’à¢Ã¢â€šÂ¬ ’’ ’Ã‚Â¢à¢’Å¡Ã‚Â¬Ãƒ...Ã‚Â¡’’à¢Ã¢â€šÂ¬Ã…Â¡  ': 'à ',
        '’’ ’’ ’’à¢Ã¢â€šÂ¬ ’’ ’Ã‚Â¢à¢’Å¡Ã‚Â¬Ãƒ...Ã‚Â¡’’à¢Ã¢â€šÂ¬Ã…Â¡’’Å¡šÃ‚Â¨': 'è',
        '’’ ’’ ’’à¢Ã¢â€šÂ¬Ã…Â¡’’Å¡š°’’ \'...\ƒÆ’’à¢Ã¢â€šÂ¬Ã…Â¡’s’’ \'...\ƒÆ’’à¢Ã¢â€šÂ¬Ã…Â¡’’’ ’Ã‚Â¢à¢’Å¡Ã‚Â¬Ãƒ...Ã‚Â¡’’à¢Ã¢â€šÂ¬Ã…Â¡’': '€',
        '’’ ’’ ’’à¢Ã¢â€šÂ¬Ã…Â¡’’’ ’’’’Ã‚Â¢à¢’Å¡Ã‚Â¬Ãƒ...Ã‚Â¡’’’à¢Ã¢â€šÂ¬Ã…Â¡ ' : ' - ',
    }
    for k, v in replacements.items():
        if k in current:
            current = current.replace(k, v)
            
    return current

EXTS = {'.py', '.md', '.json', '.txt', '.js', '.csv'}
IGNORE_DIRS = {'.git', 'node_modules', 'Playwright', 'CleanmyMap-sync', '__pycache__'}

def process_file(filepath):
    # Only process if it's text
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        try:
            with open(filepath, 'r', encoding='cp1252') as f:
                content = f.read()
        except Exception:
            return False # Skip binary
            
    if 'Ã' not in content:
        return False
        
    fixed_content = repair_bytes(content)
    
    if fixed_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        return True
    return False

if __name__ == "__main__":
    count = 0
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for name in files:
            ext = os.path.splitext(name)[1].lower()
            if ext in EXTS:
                path = os.path.join(root, name)
                if process_file(path):
                    print(f"Repaired: {path}")
                    count += 1
    print(f"Total files repaired: {count}")

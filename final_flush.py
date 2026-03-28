import os

REPLACEMENTS = {
    # French words broken into specific chunks
    "Établissement": "Établissement",
    "îchissez": "îchissez",
    "înement": "înement",
    "ôle.": "ôle.",
    "ômes": "ômes",
    "ôté": "ôté",
    "ôme": "ôme",
    "îne": "îne",
    "ût": "ût",
    "ôle": "ôle",
    "entraînement": "entraînement",
    "entra": "entra",
    "contr": "contr",
    "rafra": "rafra",
    "dipl": "dipl",
    "bin": "bin",
    "cha": "cha",
    "co": "co",
    "km": "km",
    "CO": "CO",
    "N°": "N°",
    
    # Emojis and symbols
    "📍": "📍",
    "📆": "📆",
    "📆": "📆",
    "📆": "📆",
    "€": "€",
    "°C,": "°C,",
    "°C": "°C",
    
    # Random accents
    "é": "é",
    "é": "é",
    "e": "e",
    "e": "e",
    "s": "s",
    "°": "°",
    
    # Last resort garbage flush for emoji fragments that didn't map fully
    "înes": "înes",
    "...": "...",
    "...": "...",
    "": "",
    "": "",
    "": "",
    "": "",
    "": "",
    "": "",
    "": "",
    "": "",
    "": "",
    "": "",
    "": "",
    "": "",
    "": "",
    "ô": "ô",  # Usually in pôle, dôme
    "": "",
    "ê": "ê",
    "î": "î",
    "": "",
    "²": "²",
    "": "",
    "": "",
    "": "",
    "": "",
    "·": "·",
    "°": "°",
    "’": "’",
    "": "",
    "": "",
    "’": "’",
    
    # Catching the rest
    "o": "o",
    "c": "c",
    "N": "N",
    "2": "2",
    "1": "1",
    "5": "5",
    "R": "R",
    "": "",
    "": "",
    "": "",
    "’": "’",
}

def final_flush():
    EXTS = {'.py', '.md', '.json', '.txt', '.js', '.csv', '.cjs'}
    IGNORE_DIRS = {'.git', 'node_modules', 'Playwright', 'CleanmyMap-sync', '__pycache__', 'env', 'venv'}

    sorted_keys = sorted(REPLACEMENTS.keys(), key=len, reverse=True)

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
                        
                    if 'Ã' not in text:
                        continue
                        
                    original_text = text
                    
                    for mb in sorted_keys:
                        text = text.replace(mb, REPLACEMENTS[mb])
                    
                    if text != original_text:
                        with open(path, 'w', encoding='utf-8', newline='\n') as f:
                            f.write(text)
                        print(f"Repaired: {path}")
                        count += 1
                except Exception as e:
                    pass
    print(f"Flushed mojibakes in {count} files.")

if __name__ == "__main__":
    final_flush()

import re

file_path = r"C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\plans\rapport_impact\impact_IA.md"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== LIENS MARKDOWN CLASSIQUES (navigation) ===")
# [texte](http...) hors citation quarto
for i, line in enumerate(lines):
    # Ignore lines that are already citekey, or yaml header
    if re.search(r'\]\(https?://', line) and not line.startswith('citation-style'):
        print(f"L{i+1}: {line.rstrip()[:150]}")

print("\n=== SOURCES RÉSIDUELLES (listes de sources manuelles) ===")
for i, line in enumerate(lines):
    # Lines starting with - [[N]] or - [N] with URL
    if re.match(r'^\s*-\s*\[\[?\d+', line):
        print(f"L{i+1}: {line.rstrip()[:150]}")

print("\n=== RÉFÉRENCES DÉFINITIONS MARKDOWN ([key]: url) ===")
for i, line in enumerate(lines):
    if re.match(r'^\[[\w\-]+\]:\s+https?://', line):
        print(f"L{i+1}: {line.rstrip()[:150]}")

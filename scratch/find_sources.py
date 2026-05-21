import re

file_path = r"C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\plans\rapport_impact\impact_IA.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find lines defining a source, e.g. "- [1] Author, Title" or "[1]: http..."
source_defs = []
for i, line in enumerate(content.split('\n')):
    if re.match(r'^[\-\s]*\[\[?\d+\]?\]?[:\)]?\s', line):
        source_defs.append(f"Line {i+1}: {line.strip()}")

print(f"Found {len(source_defs)} source definitions:")
for d in source_defs:
    print(d)

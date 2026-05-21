import re

file_path = r"C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\plans\rapport_impact\impact_IA.md"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

final_lines = []
for line in lines:
    if not re.match(r'^\s*-\s*\[@', line):
        final_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(final_lines)

print("Cleanup successful.")

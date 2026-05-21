import re

file_path = r"C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\plans\rapport_impact\impact_IA.md"
bib_path = r"C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\plans\rapport_impact\references.bib"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Match: - [[1]](https://...) Author, *Title*...
# Or: - [[1]](<https://...>) Author, *Title*...
# Or: - [[1]] (https://...) Author...
source_def_re = re.compile(r'^\s*-\s*\[\[?(\d+)\]?\]?(?:\s*\([^)]+\))?\s*(.*)')

blocks = []
current_block = []
start_idx = -1

for i, line in enumerate(lines):
    match = source_def_re.match(line)
    if match:
        if start_idx == -1:
            start_idx = i
        current_block.append((match.group(1), line.strip(), match.group(2)))
    else:
        if line.strip() == "" and start_idx != -1:
            pass # continue block
        elif start_idx != -1:
            blocks.append((start_idx, i, current_block))
            start_idx = -1
            current_block = []

if start_idx != -1:
    blocks.append((start_idx, len(lines), current_block))

# Existing keys
existing_keys = set()
with open(bib_path, "r", encoding="utf-8") as f:
    bib_content = f.read()
    for m in re.finditer(r'@misc\{([^,]+),', bib_content):
        existing_keys.add(m.group(1))

new_bib_entries = []

def make_key(text, keys_used):
    words = re.findall(r'[a-zA-Z]+', text)
    base = "_".join(words[:3]).lower()
    if not base:
        base = "source"
    key = base
    counter = 1
    while key in keys_used:
        key = f"{base}_{counter}"
        counter += 1
    keys_used.add(key)
    return key

lines_to_delete = set()

for start_idx, end_idx, defs in blocks:
    mapping = {}
    for num, full_line, text_part in defs:
        key = make_key(text_part, existing_keys)
        mapping[num] = f"[@{key}]"
        
        # Extract URL if present in full_line
        url_match = re.search(r'\((https?://[^)]+)\)', full_line)
        url = url_match.group(1).strip('<>') if url_match else ""
        
        title_match = re.search(r'\*(.*?)\*', text_part)
        title = title_match.group(1) if title_match else text_part[:50] + "..."
        author = text_part.split('*')[0].strip(' -,') if '*' in text_part else text_part[:20]
        
        entry = f"@misc{{{key},\n  author = {{{author}}},\n  title = {{{title}}},\n"
        if url: entry += f"  url = {{{url}}},\n"
        entry += f"  note = {{Source locale}}\n}}\n"
        new_bib_entries.append(entry)
        
    for i in range(max(0, start_idx - 250), start_idx):
        if i in lines_to_delete: continue
        new_line = lines[i]
        for num, citekey in mapping.items():
            # Match [[1]] or [1] (be careful not to match markdown links blindly, but we only have numbers)
            new_line = re.sub(r'\[\[' + num + r'\]\](?:\([^)]+\))?', citekey, new_line)
            new_line = re.sub(r'\[\s*' + num + r'\s*\]', citekey, new_line)
            
        if new_line != lines[i]:
            lines[i] = new_line
            
    for i in range(start_idx, end_idx):
        lines_to_delete.add(i)

final_lines = [line for i, line in enumerate(lines) if i not in lines_to_delete]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(final_lines)

with open(bib_path, "a", encoding="utf-8") as f:
    f.write("\n" + "\n".join(new_bib_entries))

print(f"Processed {len(blocks)} remaining source blocks. Added {len(new_bib_entries)} new entries.")

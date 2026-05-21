import re
import os

file_path = r"C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\plans\rapport_impact\impact_IA.md"
bib_path = r"C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\plans\rapport_impact\references.bib"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Regex to detect a source definition: e.g. "- [1] Author, Title..." or "[1] Author..."
source_def_re = re.compile(r'^[\-\s]*\[\[?(\d+)\]?\]?[:\)]?\s+(.*)')
# To match citations in text like [1], [2], [[1]], [1][2]
# We'll do this carefully per section

blocks = [] # stores (start_idx, end_idx, list_of_defs)
current_block = []
start_idx = -1

for i, line in enumerate(lines):
    match = source_def_re.match(line)
    if match:
        if start_idx == -1:
            start_idx = i
        current_block.append((match.group(1), match.group(2)))
    else:
        # if we hit a blank line, it might be the end of a block
        if line.strip() == "" and start_idx != -1:
            pass # continue block if next line is a source
        elif start_idx != -1:
            # End of block
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
    # take first 3 words of text
    words = re.findall(r'\w+', text)
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

# Process backwards so line indices don't shift when we delete blocks
# Actually, since we just replace strings and remove lines, let's build a new list of lines
lines_to_delete = set()
replacements = {} # line_idx -> new_line_string

for start_idx, end_idx, defs in blocks:
    # Build bib entries and a mapping for this block: '1' -> '@key'
    mapping = {}
    for num, text in defs:
        # Check if text strongly matches an existing entry? For safety, let's just make a new one to avoid losing info.
        key = make_key(text, existing_keys)
        mapping[num] = f"[@{key}]"
        
        # Parse title roughly
        title_match = re.search(r'\*(.*?)\*', text)
        title = title_match.group(1) if title_match else text[:50] + "..."
        url_match = re.search(r'\[.*?\]\((http.*?)\)', text)
        url = url_match.group(1) if url_match else ""
        # author is before first *
        author = text.split('*')[0].strip(' -,') if '*' in text else text[:20]
        
        entry = f"@misc{{{key},\n  author = {{{author}}},\n  title = {{{title}}},\n"
        if url: entry += f"  url = {{{url}}},\n"
        entry += f"  note = {{Source locale}}\n}}\n"
        new_bib_entries.append(entry)
        
    # Now look backwards from start_idx up to 200 lines to replace [num] or [[num]]
    # We want to replace [1], [2], [[1]], [1][2]
    # We'll use a regex replacement function on the lines
    for i in range(max(0, start_idx - 200), start_idx):
        if i in lines_to_delete: continue
        original = lines[i]
        new_line = original
        for num, citekey in mapping.items():
            # Replace [[num]] -> citekey
            new_line = re.sub(r'\[\[' + num + r'\]\](?:\(http[^\)]+\))?', citekey, new_line)
            # Replace [num] -> citekey (if not preceded or followed by [ a-zA-Z] to avoid markdown links)
            # Actually, standard is [1]
            new_line = re.sub(r'\[\s*' + num + r'\s*\]', citekey, new_line)
            
        if new_line != original:
            lines[i] = new_line
            
    # Mark block lines for deletion
    for i in range(start_idx, end_idx):
        lines_to_delete.add(i)

# Reconstruct file
final_lines = [line for i, line in enumerate(lines) if i not in lines_to_delete]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(final_lines)

with open(bib_path, "a", encoding="utf-8") as f:
    f.write("\n" + "\n".join(new_bib_entries))

print(f"Processed {len(blocks)} source blocks. Added {len(new_bib_entries)} new entries to bibliography.")
print("Updated impact_IA.md successfully!")

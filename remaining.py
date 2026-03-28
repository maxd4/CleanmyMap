import re
import json

with open('app.py', 'r', encoding='utf-8') as f:
    text = f.read()

# find all words containing Ã
words = re.findall(r'[A-Za-z0-9_]*Ã[^\s<>"\'\(\)\[\]\{\}]+', text)
unique_words = list(set(words))
unique_words.sort(key=len, reverse=True)

with open('remaining_mojibake.json', 'w', encoding='utf-8') as f:
    json.dump(unique_words, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(unique_words)} unique remaining corrupted words.")

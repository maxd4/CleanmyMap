import re
from collections import Counter

with open('app.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Find strings of contiguous non-ASCII/special characters starting with Ã
matches = re.findall(r'Ã[^\sA-Za-z0-9\.\,\:\;\!\?\(\)\[\]\{\}\+\-\=\*\/\&\%\$\#\@\^\~\`\|\'\"<>]+', text)
c = Counter(matches)
for k, v in c.most_common(50):
    print(f"{repr(k)}: {v}")

import ftfy
import re

with open('app.py', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Try ftfy's fix_text which recursively fixes mojibake
# It might produce lossy characters but let's see how many
fixed = ftfy.fix_text(text)

# Let's see what is printed at the download_button label
idx = fixed.find('download_button')
print("After ftfy:")
print(repr(fixed[idx:idx+200]))

# Let's see how many \'\'\' occurrences we have
import collections
c = collections.Counter(re.findall(r"[']+", fixed))
print("\nQuotes frequencies:")
print(c.most_common(10))

import ftfy
import os

with open('app.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's find a snippet containing mojibake
idx = text.find('download_button(')
snippet = text[idx:idx+200]

print("ORIGINAL:")
print(repr(snippet))

fixed_snippet = ftfy.fix_text(snippet)

print("FIXED BY FTFY:")
print(repr(fixed_snippet))

with open('app_ftfy_fixed.py', 'w', encoding='utf-8') as f:
    f.write(ftfy.fix_text(text))

# Also check for differences in text length as ftfy can compress the mojibake
fixed_text = ftfy.fix_text(text)
print("FTFY fixed full file. Original len:", len(text), "Fixed len:", len(fixed_text))

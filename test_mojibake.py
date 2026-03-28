import os
import re

def reverse_mojibake(text: str) -> str:
    # the algorithm to reverse utf-8 -> cp1252 -> utf-8 ...
    # we know the file is already read as utf-8 strings containing things like ’’
    current = text
    attempts = 0
    while True:
        try:
            # Try to encode as cp1252, then decode as utf-8
            raw = current.encode('cp1252')
            unmojibaked = raw.decode('utf-8')
            if current == unmojibaked:
                break
            current = unmojibaked
            attempts += 1
        except UnicodeError:
            break
            
    return current, attempts

with open('app.py', 'r', encoding='utf-8') as f:
    text = f.read()

fixed, attempts = reverse_mojibake(text)
print(f"Attempts: {attempts}")

idx = text.find('download_button')
print("ORIGINAL:")
print(repr(text[idx:idx+200]))

idx2 = fixed.find('download_button')
print("FIXED:")
print(repr(fixed[idx2:idx2+200]))

with open('app_fixed.py', 'w', encoding='utf-8') as f:
    f.write(fixed)

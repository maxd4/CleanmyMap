import difflib
import re
import json

def get_sentences(text):
    return [s.strip() for s in re.split(r'[\n]+', text) if len(s.strip()) > 5]

def extract_mappings():
    with open('app_dd.py', 'r', encoding='utf-8', errors='ignore') as f:
        old_text = f.read()
    with open('app_feeb.py', 'r', encoding='utf-8', errors='ignore') as f:
        new_text = f.read()

    # Find unique words
    old_words = set(re.findall(r'\b[\w]+\b', old_text.lower()))
    
    # We want to extract mappings. Let's find specific strings that exist in both but differ
    old_strings = re.findall(r'["\'](.*?)["\']', old_text)
    new_strings = re.findall(r'["\'](.*?)["\']', new_text)
    
    mapping = {}
    
    # O(N^2) search bounded since we match by length
    for o_s in set(old_strings):
        if len(o_s) < 3 or o_s in new_text: continue
        o_words = o_s.split()
        if len(o_words) == 0: continue
        
        # find matching new string by first/last word
        for n_s in set(new_strings):
            if 'Ã' not in n_s: continue
            n_words = n_s.split()
            if len(o_words) == len(n_words) and o_words[0] == n_words[0] and o_words[-1] == n_words[-1]:
                # Extract word-by-word mapping
                for ow, nw in zip(o_words, n_words):
                    if ow != nw:
                        if nw not in mapping:
                            mapping[nw] = ow

    # From word mappings, extract char mappings
    char_map = {
        # default ones we know
        "é": "é",
        "è": "è",
        "Ã\xa0": "à",
        "ç": "ç",
        "ê": "ê",
        "Ã\xae": "î",
        "Ã\xaf": "ï",
        "Ã\xb4": "ô",
        "Ã\xbb": "û",
        "Ã\xb9": "ù",
        "Ã\xab": "ë",
        "Ã\x89": "É",
        "Ã\x88": "È",
        "Ã\x80": "À",
        "Ã\x87": "Ç",
    }
    
    # Expand map with our findings
    for n_word, o_word in mapping.items():
        if len(n_word) > len(o_word):
            # try to extract prefix/suffix
            i = 0
            while i < len(o_word) and i < len(n_word) and o_word[i] == n_word[i]:
                i += 1
            j_o = len(o_word) - 1
            j_n = len(n_word) - 1
            while j_o >= i and j_n >= i and o_word[j_o] == n_word[j_n]:
                j_o -= 1
                j_n -= 1
                
            if i <= j_o and i <= j_n:
                char_map[n_word[i:j_n+1]] = o_word[i:j_o+1]

    # Clean up empty
    if '' in char_map: del char_map['']
    
    with open('char_map.json', 'w', encoding='utf-8') as f:
        json.dump(char_map, f, indent=2, ensure_ascii=False)
        
    for k, v in char_map.items():
        print(f"{repr(k)} -> {repr(v)}")

if __name__ == "__main__":
    extract_mappings()

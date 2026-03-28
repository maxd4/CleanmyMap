import ftfy
import sys

def test_ftfy_to_file():
    with open('app.py', 'r', encoding='utf-8') as f:
        text = f.read()

    fixed = ftfy.fix_text(text)
    
    with open('app_ftfy.py', 'w', encoding='utf-8') as f:
        f.write(fixed)
        
if __name__ == "__main__":
    test_ftfy_to_file()

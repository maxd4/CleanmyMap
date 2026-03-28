import ast
import ftfy

def repair_python_file(src_path, dst_path):
    with open(src_path, 'r', encoding='utf-8') as f:
        source = f.read()
    
    # We apply ftfy only to the raw text, but wait, ftfy can safely run over the entire python file
    # because it only changes mojibake sequences.
    # Let's verify if ftfy breaks python syntax.
    
    fixed_source = ftfy.fix_text(source)
    
    with open(dst_path, 'w', encoding='utf-8') as f:
        f.write(fixed_source)
        
    try:
        ast.parse(fixed_source)
        return True
    except SyntaxError as e:
        print(f"Syntax error after fixing {src_path}: {e}")
        return False

if __name__ == "__main__":
    if repair_python_file("app.py", "app_repaired.py"):
        print("Successfully repaired app.py and parsed without SyntaxError")
    else:
        print("Reparation caused a SyntaxError")

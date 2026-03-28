import sys

def replace_lines(filename, start_line, end_line, new_content):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # lines is 0-indexed. L504 is index 503. L1690 is index 1689.
    # We want to keep everything before L504 (index 0 to 502)
    # We want to replace L504 to L1690 (inclusive)
    # We want to keep everyting after L1690 (index 1690 onwards)
    before = lines[:start_line-1]
    after = lines[end_line:]
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(before)
        f.write(new_content)
        f.writelines(after)

styling_call = """# --- DESIGN SYSTEM & PWA ---
st.markdown('<link rel="manifest" href="/manifest.json">', unsafe_allow_html=True)
st.markdown('<meta name="apple-mobile-web-app-capable" content="yes" />', unsafe_allow_html=True)
st.markdown('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />', unsafe_allow_html=True)

# Inject Global Styles from Design System
inject_base_css()
inject_visual_polish(st.session_state.theme_mode)
"""

if __name__ == "__main__":
    replace_lines('app.py', 504, 1690, styling_call)
    print("Refactoring of app.py styling successful.")

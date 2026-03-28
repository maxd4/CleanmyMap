import sys

def remove_test_data(filename, start_line, end_line):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Python is 0-indexed. L895 is index 894.
    before = lines[:start_line-1]
    after = lines[end_line:]
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(before)
        f.write("# TEST_DATA is now imported from src.fixtures.test_data\n")
        f.writelines(after)

if __name__ == "__main__":
    # In previous view_file, TEST_DATA started at 895 and ended at 1135
    remove_test_data('app.py', 895, 1135)
    print("Redundant TEST_DATA removed from app.py.")

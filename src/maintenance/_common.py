from pathlib import Path

TEXT_EXTENSIONS = {".py", ".md", ".txt", ".json", ".yml", ".yaml", ".js", ".cjs", ".toml"}
IGNORED_DIRS = {
    ".git",
    "__pycache__",
    ".pytest_cache",
    "node_modules",
    "playwright-report",
    "test-results",
    "output",
    "CleanmyMap-sync",
    "data",
}

def iter_text_files(root: Path) -> list[Path]:
    """Uniform iteration over project text files across maintenance systems."""
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        if any(part in IGNORED_DIRS for part in path.parts):
            continue
        files.append(path)
    return files

from __future__ import annotations

import os
from pathlib import Path

TEXT_EXTENSIONS = {
    ".py",
    ".md",
    ".txt",
    ".json",
    ".yml",
    ".yaml",
    ".js",
    ".cjs",
    ".mjs",
    ".toml",
    ".ini",
    ".cfg",
    ".ps1",
    ".sh",
}
IGNORED_DIRS = {
    ".git",
    ".next",
    ".pytest_cache",
    "__pycache__",
    "artifacts",
    "build",
    "cache",
    "CleanmyMap-sync",
    "data",
    "legacy",
    "node_modules",
    "output",
    "playwright-report",
    "runtime",
    "test-results",
}


def iter_text_files(root: Path) -> list[Path]:
    """Uniform iteration over project text files across maintenance systems."""
    files: list[Path] = []
    for current_root, dirnames, filenames in os.walk(root):
        # Prune expensive/unrelated trees before descending.
        dirnames[:] = [name for name in dirnames if name not in IGNORED_DIRS]
        current = Path(current_root)
        for filename in filenames:
            path = current / filename
            if path.suffix.lower() not in TEXT_EXTENSIONS:
                continue
            files.append(path)
    return files

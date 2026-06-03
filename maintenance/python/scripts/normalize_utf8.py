from __future__ import annotations

import argparse
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

UTF8_BOM = b"\xef\xbb\xbf"
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
    ".css",
    ".html",
    ".csv",
    ".ini",
    ".cfg",
    ".sh",
    ".ps1",
}


def _latin1(raw: bytes) -> str:
    return raw.decode("latin-1")


MOJIBAKE_CORRECTIONS = {
    _latin1(b"\xe2\x80\x99"): "'",
    _latin1(b"\xe2\x80\x98"): "'",
    _latin1(b"\xe2\x80\x9c"): '"',
    _latin1(b"\xe2\x80\x9d"): '"',
    _latin1(b"\xe2\x80\x93"): "-",
    _latin1(b"\xe2\x80\x94"): "-",
    _latin1(b"\xe2\x80\xa6"): "...",
    _latin1(b"\xc2\xb0"): "\u00b0",
    _latin1(b"\xc2\xb7"): "\u00b7",
    _latin1(b"\xc2\xa0"): " ",
}

MOJIBAKE_MARKERS = (
    _latin1(b"\xc3"),
    _latin1(b"\xc2"),
    _latin1(b"\xe2\x80\x99"),
    _latin1(b"\xe2\x80\x98"),
    _latin1(b"\xe2\x80\x9c"),
    _latin1(b"\xe2\x80\x9d"),
    _latin1(b"\xe2\x80\x93"),
    _latin1(b"\xe2\x80\x94"),
    _latin1(b"\xe2\x80\xa6"),
    "\ufffd",
)

SMART_PUNCTUATION_CORRECTIONS = {
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u00a0": " ",
}


@dataclass(slots=True)
class FileNormalizationResult:
    path: Path
    had_bom: bool
    encoding_issue: bool
    mojibake_issue: bool
    original_text: str
    normalized_text: str

    @property
    def changed(self) -> bool:
        return self.had_bom or self.encoding_issue or self.mojibake_issue or (self.original_text != self.normalized_text)


def _decode_bytes(raw: bytes) -> tuple[str, bool, bool]:
    had_bom = raw.startswith(UTF8_BOM)
    try:
        return raw.decode("utf-8-sig"), had_bom, False
    except UnicodeDecodeError:
        for fallback in ("cp1252", "latin-1"):
            try:
                return raw.decode(fallback), had_bom, True
            except UnicodeDecodeError:
                continue
    return raw.decode("utf-8", errors="replace"), had_bom, True


def _mojibake_score(text: str) -> int:
    return sum(text.count(marker) for marker in MOJIBAKE_MARKERS)


def _try_redecode(text: str, source_encoding: str) -> str | None:
    try:
        return text.encode(source_encoding, errors="strict").decode("utf-8", errors="strict")
    except UnicodeError:
        return None


def _apply_direct_replacements(text: str) -> tuple[str, bool]:
    fixed = text
    changed = False
    for corrections in (MOJIBAKE_CORRECTIONS, SMART_PUNCTUATION_CORRECTIONS):
        for src, dst in corrections.items():
            if src in fixed:
                fixed = fixed.replace(src, dst)
                changed = True
    return fixed, changed


def repair_mojibake_text(text: str) -> tuple[str, bool]:
    fixed, changed = _apply_direct_replacements(text)
    current_score = _mojibake_score(fixed)

    if current_score > 0:
        best = fixed
        best_score = current_score
        for source_encoding in ("latin-1", "cp1252"):
            candidate = _try_redecode(fixed, source_encoding)
            if candidate is None:
                continue
            candidate_score = _mojibake_score(candidate)
            if candidate_score < best_score:
                best = candidate
                best_score = candidate_score

        if best is not fixed:
            fixed = best
            changed = True

        if best_score > 0:
            second = _try_redecode(fixed, "latin-1")
            if second is not None and _mojibake_score(second) < best_score:
                fixed = second
                changed = True

    fixed2, changed2 = _apply_direct_replacements(fixed)
    return fixed2, changed or changed2


def analyze_file(path: Path) -> FileNormalizationResult:
    raw = path.read_bytes()
    decoded, had_bom, encoding_issue = _decode_bytes(raw)
    repaired, mojibake_issue = repair_mojibake_text(decoded)
    normalized = repaired
    return FileNormalizationResult(
        path=path,
        had_bom=had_bom,
        encoding_issue=encoding_issue,
        mojibake_issue=mojibake_issue,
        original_text=decoded,
        normalized_text=normalized,
    )


def _git_tracked_files(root: Path) -> list[Path]:
    completed = subprocess.run(
        ["git", "-C", str(root), "ls-files"],
        check=True,
        capture_output=True,
        text=True,
    )
    files: list[Path] = []
    for rel in completed.stdout.splitlines():
        rel = rel.strip()
        if not rel:
            continue
        path = (root / rel).resolve()
        if path.is_file():
            files.append(path)
    return files


def _is_text_file(path: Path) -> bool:
    return path.suffix.lower() in TEXT_EXTENSIONS


def normalize_repo(root: Path, write: bool, candidates: Iterable[Path] | None = None) -> list[FileNormalizationResult]:
    results: list[FileNormalizationResult] = []
    files = list(candidates) if candidates is not None else _git_tracked_files(root)
    for path in files:
        if not _is_text_file(path):
            continue
        result = analyze_file(path)
        if result.changed and write:
            path.write_text(result.normalized_text, encoding="utf-8", newline="\n")
        results.append(result)
    return results


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Normalize tracked text files to UTF-8 (without BOM) and deterministic mojibake fixes."
    )
    parser.add_argument("--root", default=".", help="Project root (default: current directory).")
    parser.add_argument("--check", action="store_true", help="Check mode: fail if normalization would change files.")
    parser.add_argument("--write", action="store_true", help="Write normalized content to files.")
    parser.add_argument(
        "--max-report",
        type=int,
        default=20,
        help="Maximum number of changed files printed in stdout (default: 20).",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    root = Path(args.root).resolve()

    if args.check and args.write:
        parser.error("Use either --check or --write, not both.")

    write_mode = bool(args.write)
    results = normalize_repo(root=root, write=write_mode)
    changed = [r for r in results if r.changed]

    mode = "write" if write_mode else "check"
    print(f"[encoding] UTF-8 normalization ({mode}) on tracked text files")
    print(f"[encoding] scanned={len(results)} changed={len(changed)}")

    if changed:
        max_report = max(0, int(args.max_report))
        for result in changed[:max_report]:
            rel = result.path.relative_to(root).as_posix()
            reasons = []
            if result.had_bom:
                reasons.append("bom")
            if result.encoding_issue:
                reasons.append("non_utf8")
            if result.mojibake_issue:
                reasons.append("mojibake")
            print(f" - {rel}: {', '.join(reasons) if reasons else 'content_diff'}")
        remaining = len(changed) - max_report
        if remaining > 0:
            print(f"[encoding] ... {remaining} additional changed files omitted (use --max-report to adjust).")

    if args.check:
        return 1 if changed else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

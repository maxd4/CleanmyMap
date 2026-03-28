from __future__ import annotations

from collections.abc import Iterable
import re

# Markers frequently found in historical mojibake chains.
MOJIBAKE_MARKERS = ("Ã", "â€", "Â", "脙", "Γ")
SAFE_REPLACEMENTS = {
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u00a0": " ",
}

_PATCHED = False


def _contains_mojibake(text: str) -> bool:
    return any(marker in text for marker in MOJIBAKE_MARKERS)


def _mojibake_score(text: str) -> int:
    marker_hits = sum(text.count(marker) for marker in MOJIBAKE_MARKERS)
    control_hits = sum(1 for ch in text if 0x80 <= ord(ch) <= 0x9F or ord(ch) == 0xFFFD)
    return marker_hits + control_hits


def repair_mojibake_text(value):
    if not isinstance(value, str) or not value:
        return value

    text = "".join(ch for ch in value if ch in ("\n", "\t") or ord(ch) >= 0x20)
    # Remove apostrophes injected inside mojibake byte-sequences.
    text = re.sub(r"(?<=[^\x00-\x7F])'(?=[^\x00-\x7F])", "", text)
    for src, dst in SAFE_REPLACEMENTS.items():
        text = text.replace(src, dst)

    if not _contains_mojibake(text):
        return text

    best = text
    best_score = _mojibake_score(best)

    # Iterate across likely source encodings and keep only improvements.
    for _ in range(4):
        improved = False
        for source_encoding in ("cp1252", "latin-1"):
            for encode_errors, decode_errors in (("strict", "strict"), ("ignore", "ignore")):
                try:
                    candidate = best.encode(source_encoding, errors=encode_errors).decode("utf-8", errors=decode_errors)
                except UnicodeError:
                    continue
                candidate_score = _mojibake_score(candidate)
                if candidate_score < best_score:
                    best = candidate
                    best_score = candidate_score
                    improved = True
        if not improved:
            break

    best = re.sub(r"(?<=[^\x00-\x7F])'(?=[^\x00-\x7F])", "", best)
    for src, dst in SAFE_REPLACEMENTS.items():
        best = best.replace(src, dst)
    return best


def _clean_streamlit_arg(value):
    if isinstance(value, str):
        return repair_mojibake_text(value)
    if isinstance(value, (list, tuple)):
        cleaned = [repair_mojibake_text(v) if isinstance(v, str) else v for v in value]
        return type(value)(cleaned)
    return value


def patch_streamlit_text_api(st_module) -> None:
    global _PATCHED
    if _PATCHED:
        return

    targets = (
        "title",
        "header",
        "subheader",
        "caption",
        "text",
        "markdown",
        "write",
        "success",
        "warning",
        "error",
        "info",
        "toast",
        "button",
        "download_button",
        "text_input",
        "text_area",
        "selectbox",
        "multiselect",
        "radio",
        "checkbox",
        "toggle",
    )

    for name in targets:
        original = getattr(st_module, name, None)
        if not callable(original) or getattr(original, "__cm_text_patched__", False):
            continue

        def wrapper(*args, __original=original, **kwargs):
            if args:
                args = list(args)
                args[0] = _clean_streamlit_arg(args[0])
                args = tuple(args)

            for key in ("label", "help", "placeholder"):
                if key in kwargs:
                    kwargs[key] = _clean_streamlit_arg(kwargs[key])

            if "options" in kwargs and isinstance(kwargs["options"], Iterable):
                kwargs["options"] = _clean_streamlit_arg(kwargs["options"])

            return __original(*args, **kwargs)

        wrapper.__cm_text_patched__ = True
        setattr(st_module, name, wrapper)

    _PATCHED = True

from __future__ import annotations

from src.database import get_submissions_by_status


def fetch_approved_submissions() -> list[dict]:
    return get_submissions_by_status("approved")


def fetch_pending_submissions() -> list[dict]:
    return get_submissions_by_status("pending")

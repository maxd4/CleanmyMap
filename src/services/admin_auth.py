from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Mapping


@dataclass(frozen=True)
class AdminAuthPolicy:
    max_attempts: int = 5
    lockout_minutes: int = 15
    backoff_max_seconds: int = 30


def is_allowed_admin_email(email: str | None, allowed_emails: set[str]) -> bool:
    if not email:
        return False
    if not allowed_emails:
        return False
    return email.strip().lower() in allowed_emails


def is_allowlist_config_valid(allowed_emails: set[str], require_allowlist: bool = True) -> bool:
    if not require_allowlist:
        return True
    return bool(allowed_emails)


def parse_lock_until(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def remaining_lock_minutes(lock_until: datetime, now: datetime | None = None) -> int:
    current = now or datetime.now()
    if current >= lock_until:
        return 0
    return max(1, int((lock_until - current).total_seconds() // 60) + 1)


def compute_backoff_seconds(failed_attempts: int, max_seconds: int = 30) -> int:
    if failed_attempts <= 0:
        return 0
    return min(2 ** (failed_attempts - 1), max_seconds)


def compute_next_lock_until(
    failed_attempts: int,
    policy: AdminAuthPolicy,
    now: datetime | None = None,
) -> datetime:
    current = now or datetime.now()
    if failed_attempts >= policy.max_attempts:
        return current + timedelta(minutes=policy.lockout_minutes)
    return current + timedelta(seconds=compute_backoff_seconds(failed_attempts, policy.backoff_max_seconds))


def get_e2e_admin_email_fallback(env: Mapping[str, str] | None = None) -> str | None:
    source = dict(env or os.environ)
    e2e_mode = str(source.get("CLEANMYMAP_E2E_MODE", "0")).strip().lower() in {"1", "true", "yes", "on"}
    if not e2e_mode:
        return None
    email = str(source.get("CLEANMYMAP_E2E_ADMIN_EMAIL", "")).strip().lower()
    return email or None

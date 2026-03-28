from datetime import datetime

from src.services.admin_auth import (
    AdminAuthPolicy,
    compute_backoff_seconds,
    compute_next_lock_until,
    get_e2e_admin_email_fallback,
    is_allowlist_config_valid,
    is_allowed_admin_email,
    parse_lock_until,
    remaining_lock_minutes,
)


def test_admin_email_allowlist_logic():
    assert is_allowed_admin_email("admin@example.com", {"admin@example.com"})
    assert not is_allowed_admin_email("other@example.com", {"admin@example.com"})
    assert not is_allowed_admin_email("anyone@example.com", set())


def test_backoff_is_exponential_and_capped():
    assert compute_backoff_seconds(1, max_seconds=30) == 1
    assert compute_backoff_seconds(3, max_seconds=30) == 4
    assert compute_backoff_seconds(10, max_seconds=30) == 30


def test_lock_until_uses_lockout_after_max_attempts():
    now = datetime(2026, 3, 27, 12, 0, 0)
    policy = AdminAuthPolicy(max_attempts=5, lockout_minutes=15, backoff_max_seconds=30)
    lock_until = compute_next_lock_until(5, policy=policy, now=now)
    assert int((lock_until - now).total_seconds()) == 15 * 60


def test_parse_lock_until_and_remaining_minutes():
    now = datetime(2026, 3, 27, 12, 0, 0)
    lock_until = datetime(2026, 3, 27, 12, 10, 0)
    parsed = parse_lock_until(lock_until.isoformat())
    assert parsed == lock_until
    assert remaining_lock_minutes(lock_until, now=now) == 11


def test_allowlist_config_validation():
    assert not is_allowlist_config_valid(set(), require_allowlist=True)
    assert is_allowlist_config_valid({"admin@example.com"}, require_allowlist=True)
    assert is_allowlist_config_valid(set(), require_allowlist=False)


def test_e2e_admin_email_fallback_only_when_mode_enabled():
    assert get_e2e_admin_email_fallback(
        {"CLEANMYMAP_E2E_MODE": "0", "CLEANMYMAP_E2E_ADMIN_EMAIL": "admin@test.local"}
    ) is None
    assert (
        get_e2e_admin_email_fallback(
            {"CLEANMYMAP_E2E_MODE": "1", "CLEANMYMAP_E2E_ADMIN_EMAIL": "Admin@Test.Local"}
        )
        == "admin@test.local"
    )

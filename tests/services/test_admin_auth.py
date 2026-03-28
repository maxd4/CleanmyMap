import pytest
from datetime import datetime, timedelta
from src.services.admin_auth import (
    AdminAuthPolicy,
    remaining_lock_minutes,
    compute_backoff_seconds,
    compute_next_lock_until,
    is_allowed_admin_email
)

def test_admin_auth_policy_default():
    """Test policy default values."""
    p = AdminAuthPolicy()
    assert p.max_attempts == 5
    assert p.lockout_minutes == 15

def test_remaining_lock_minutes():
    """Test calculations for lockout countdown."""
    now = datetime.now()
    lock_until = now + timedelta(minutes=5, seconds=30)
    # 5.5 minutes -> 6 minutes remaining
    assert remaining_lock_minutes(lock_until, now) == 6
    
    # 0 minutes remaining
    assert remaining_lock_minutes(now - timedelta(minutes=1), now) == 0

def test_compute_backoff_seconds():
    """Test exponential backoff progression."""
    # 2^(1-1) = 1
    assert compute_backoff_seconds(1) == 1
    # 2^(2-1) = 2
    assert compute_backoff_seconds(2) == 2
    # 2^(3-1) = 4
    assert compute_backoff_seconds(3) == 4
    # Max backoff = 30
    assert compute_backoff_seconds(10, max_seconds=30) == 30

def test_compute_next_lock_until():
    """Test transition from backoff to full lockout."""
    p = AdminAuthPolicy(max_attempts=3, lockout_minutes=15)
    now = datetime.now()
    
    # Under max attempts: small backoff (2^(2-1) = 2s)
    lock3 = compute_next_lock_until(2, p, now)
    assert (lock3 - now).total_seconds() == 2
    
    # At max attempts: 15 minutes lockout
    lock4 = compute_next_lock_until(3, p, now)
    assert (lock4 - now).total_seconds() == 15 * 60

def test_is_allowed_admin_email():
    """Test email authorized list check."""
    allowed = {"admin@test.com", "dev@test.com"}
    assert is_allowed_admin_email("admin@test.com", allowed) is True
    assert is_allowed_admin_email("ADMIN@TEST.COM", allowed) is True
    assert is_allowed_admin_email("user@test.com", allowed) is False
    assert is_allowed_admin_email(None, allowed) is False

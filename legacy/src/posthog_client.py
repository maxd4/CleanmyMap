"""PostHog analytics client for CleanMyMap pipeline."""
from __future__ import annotations

import os
from functools import lru_cache

from posthog import Posthog

@lru_cache(maxsize=1)
def get_client() -> Posthog:
    """Return the singleton PostHog client."""
    api_key = os.environ.get("POSTHOG_API_KEY", "")
    host = os.environ.get("POSTHOG_HOST", "https://eu.i.posthog.com")
    return Posthog(api_key, host=host)

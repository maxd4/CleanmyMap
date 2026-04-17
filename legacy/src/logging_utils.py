from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Mapping


def _to_serializable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Mapping):
        return {str(k): _to_serializable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_serializable(v) for v in value]
    return str(value)


def _emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True), file=sys.stdout, flush=True)


def log_event(
    event: str,
    severity: str,
    component: str,
    action: str | None = None,
    message: str | None = None,
    context: Mapping[str, Any] | None = None,
    error_type: str | None = None,
    **extra_context: Any,
) -> None:
    merged_context = dict(context or {})
    if extra_context:
        merged_context.update(extra_context)

    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "severity": severity.lower(),
        "component": component,
        "action": action or event,
        "message": message or "",
        "context": _to_serializable(merged_context),
    }
    if error_type:
        payload["error_type"] = error_type
    _emit(payload)


def log_exception(
    *,
    component: str,
    action: str,
    exc: Exception,
    message: str,
    context: Mapping[str, Any] | None = None,
    severity: str = "error",
) -> None:
    log_event(
        event="exception",
        severity=severity,
        component=component,
        action=action,
        error_type=type(exc).__name__,
        message=message,
        context=context,
    )


def log_perf(component: str, action: str, duration_ms: float, context: Mapping[str, Any] | None = None) -> None:
    if os.getenv("CLEANMYMAP_DEBUG_PERF", "0").strip().lower() not in {"1", "true", "yes", "on"}:
        return
    log_event(
        event="performance",
        severity="debug",
        component=component,
        action=action,
        message=f"{duration_ms:.2f}ms",
        context=context,
    )

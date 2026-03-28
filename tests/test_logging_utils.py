from __future__ import annotations

import json

from src.logging_utils import log_event


def test_log_event_emits_json_stdout(capsys):
    log_event(
        "unit_event",
        "INFO",
        "tests",
        action="emit",
        message="hello",
        context={"a": 1},
        b=2,
    )

    out = capsys.readouterr().out.strip()
    payload = json.loads(out)

    assert payload["event"] == "unit_event"
    assert payload["severity"] == "info"
    assert payload["component"] == "tests"
    assert payload["action"] == "emit"
    assert payload["message"] == "hello"
    assert payload["context"]["a"] == 1
    assert payload["context"]["b"] == 2

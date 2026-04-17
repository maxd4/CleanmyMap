from __future__ import annotations

from src.text_utils import patch_streamlit_text_api, repair_mojibake_text


def test_repair_mojibake_text_repairs_double_encoded_sequence() -> None:
    raw = "D\u00c3\u0192\u00c2\u00a9claration"
    assert repair_mojibake_text(raw) == "Déclaration"


def test_repair_mojibake_text_keeps_clean_text() -> None:
    assert repair_mojibake_text("Action propre") == "Action propre"


def test_patch_streamlit_text_api_cleans_labels_and_help() -> None:
    calls: dict[str, str | None] = {}

    class FakeStreamlit:
        def button(self, label, **kwargs):
            calls["label"] = label
            calls["help"] = kwargs.get("help")
            return True

    fake = FakeStreamlit()
    patch_streamlit_text_api(fake)
    fake.button("D\u00c3\u0192\u00c2\u00a9clarer", help="Aide d\u00c3\u0192\u00c2\u00a9grad\u00c3\u0192\u00c2\u00a9e")

    assert calls["label"] == "Déclarer"
    assert calls["help"] == "Aide dégradée"

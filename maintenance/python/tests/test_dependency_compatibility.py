import pandas as pd

from src.posthog_client import get_client


def test_maintenance_dataframe_roundtrip_uses_pyarrow_without_schema_loss(tmp_path) -> None:
    frame = pd.DataFrame(
        [
            {
                "action_date": "2026-10-18",
                "location_label": "Quai de la Loire",
                "waste_kg": 2.5,
                "cigarette_butts": 42,
            }
        ]
    )
    parquet_path = tmp_path / "maintenance-actions.parquet"

    frame.to_parquet(parquet_path, engine="pyarrow", index=False)
    restored = pd.read_parquet(parquet_path, engine="pyarrow")

    pd.testing.assert_frame_equal(restored, frame)


def test_posthog_client_exposes_the_methods_used_by_the_pipeline(monkeypatch) -> None:
    monkeypatch.setenv("POSTHOG_API_KEY", "test-key")
    monkeypatch.setenv("POSTHOG_HOST", "https://example.invalid")
    get_client.cache_clear()

    client = get_client()

    assert callable(client.capture)
    assert callable(client.shutdown)

    client.shutdown()
    get_client.cache_clear()

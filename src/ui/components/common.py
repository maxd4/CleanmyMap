import streamlit as st
from src.ui.i18n import i18n_text

def render_tab_header(icon: str, title_fr: str, title_en: str, subtitle_fr: str, subtitle_en: str, chips: list[str] = None, compact: bool = False) -> None:
    """Renders a standard Premium header for any tab."""
    chips = chips or []
    chip_html = "".join(f"<span class='section-chip'>{c}</span>" for c in chips)
    shell_class = "section-shell compact" if compact else "section-shell"
    st.markdown(
        f"""
        <section class="{shell_class} animate-in">
            <div class="section-kicker">{icon} {i18n_text("Espace", "Workspace")}</div>
            <h1 class="section-title">{icon} {i18n_text(title_fr, title_en)}</h1>
            <p class="section-subtitle">{i18n_text(subtitle_fr, subtitle_en)}</p>
            {"<div class='section-chip-row'>" + chip_html + "</div>" if chip_html else ""}
        </section>
        """,
        unsafe_allow_html=True,
    )

def render_ui_callout(icon: str, title_fr: str, title_en: str, body_fr: str, body_en: str, tone: str = "info") -> None:
    """Renders a localized callout box with different tones (info, success, warning)."""
    tone_class = f"ux-callout-{tone}" if tone in {"info", "success", "warning"} else "ux-callout-info"
    st.markdown(
        f"""
        <aside class="ux-callout {tone_class}">
            <div class="ux-callout-title">{icon} {i18n_text(title_fr, title_en)}</div>
            <p class="ux-callout-body">{i18n_text(body_fr, body_en)}</p>
        </aside>
        """,
        unsafe_allow_html=True,
    )

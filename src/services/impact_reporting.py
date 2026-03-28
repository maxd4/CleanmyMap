from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from fpdf import FPDF

from src.config import IMPACT_CONSTANTS, OUTPUT_DIR
from src.models import CriticalZoneStat
from src.utils import normalize_bool_flag, _txt


def get_impact_sources(lang: str = "fr") -> str:
    """Return bibliography text used in reports."""
    if lang == "fr":
        return (
            "methodologie et sources :\n\n"
            "- impact carbone du megot (0.014 kg CO2e) : inclut culture, fabrication du filtre "
            "en acetate de cellulose et fin de vie. Donnees alignees OMS.\n"
            "- impact eau (500L/megot) : contamination toxique documentee (Surfrider, INERIS).\n"
            "- equivalences plastiques (bancs: 50kg, pulls: 0.5kg) : extrapolations base ADEME.\n\n"
            "- eco-points (gamification interne) : formule = 10 + (temps_min/15)*10 + 5*kg + (megots/100). "
            "Cet indicateur sert au classement communautaire, pas comme unite scientifique."
        )
    return (
        "methodology and sources:\n\n"
        "- carbon impact per cigarette butt (0.014 kg CO2e): cultivation, filter manufacturing, and end-of-life. "
        "Aligned with WHO references.\n"
        "- water impact (500L/butt): toxic contamination references (Surfrider, INERIS).\n"
        "- plastic equivalents (benches: 50kg, sweaters: 0.5kg): ADEME-based extrapolations.\n\n"
        "- eco-points (internal gamification): formula = 10 + (time_min/15)*10 + 5*kg + (butts/100). "
        "Used for ranking, not as a scientific impact unit."
    )


def _txt(value) -> str:
    text = "" if value is None else str(value)
    return text.encode("latin-1", "replace").decode("latin-1")


def _safe_numeric(series_or_value, default: float = 0.0, index: pd.Index | None = None) -> pd.Series:
    if isinstance(series_or_value, pd.Series):
        return pd.to_numeric(series_or_value, errors="coerce").fillna(default)

    if index is None:
        return pd.to_numeric(pd.Series([series_or_value]), errors="coerce").fillna(default)

    repeated = pd.Series(series_or_value, index=index)
    return pd.to_numeric(repeated, errors="coerce").fillna(default)


def _bool_series(df: pd.DataFrame, column: str) -> pd.Series:
    values = df.get(column)
    if values is None:
        return pd.Series(False, index=df.index, dtype=bool)
    return values.map(normalize_bool_flag)


def get_critical_zones(df: pd.DataFrame) -> dict[str, dict[str, int]]:
    """Return recurring polluted zones with average re-pollution delay."""
    if df.empty or "date" not in df.columns or "adresse" not in df.columns:
        return {}

    work = df.copy()
    clean_mask = _bool_series(work, "est_propre")
    dirty = work.loc[~clean_mask].copy()
    if dirty.empty:
        return {}

    dirty["dt"] = pd.to_datetime(dirty["date"], errors="coerce")
    dirty = dirty.dropna(subset=["dt", "adresse"])

    critical_data: dict[str, dict[str, int]] = {}
    for addr, group in dirty.groupby("adresse"):
        if len(group) < 3:
            continue
        span_days = (group["dt"].max() - group["dt"].min()).days
        if span_days <= 0:
            continue
        avg_delay = span_days / (len(group) - 1)
        zone = CriticalZoneStat(
            address=str(addr),
            count=int(len(group)),
            avg_repollution_days=int(avg_delay),
        )
        critical_data[zone.address] = zone.to_public_dict()

    return critical_data


def get_user_badge(pseudo: str, df: pd.DataFrame) -> str:
    """Compute gamification badge from user history."""
    if not pseudo or df.empty or "nom" not in df.columns:
        return ""

    user_actions = df[df["nom"].fillna("").astype(str).str.lower() == pseudo.lower()]
    if user_actions.empty:
        return ""

    total_count = len(user_actions)
    clean_mask = _bool_series(user_actions, "est_propre")
    dirty_count = int((~clean_mask).sum())

    if "adresse" in user_actions.columns:
        in_78 = user_actions["adresse"].fillna("").astype(str).str.lower().str.contains("78|yvelines|versailles", regex=True)
        yvelines_count = int(in_78.sum())
    else:
        yvelines_count = 0

    if total_count >= 15:
        return "🔑 Legende Citoyenne (Niv. 5)"
    if total_count >= 10:
        return "🏆 Maitre du Terrain (Niv. 4)"
    if yvelines_count >= 3 or dirty_count >= 5:
        return "🌳 Gardien de la Ville (Niv. 3)"
    if total_count >= 3:
        return "🛡️ Sentinelle (Niv. 2)"
    return "🌱 Eclaireur (Niv. 1)"


def _get_material_totals(actions_df: pd.DataFrame, total_megots: int) -> tuple[float, float, float, float]:
    base_index = actions_df.index
    dechets = _safe_numeric(actions_df.get("dechets_kg", 0.0), default=0.0, index=base_index)

    plastique = _safe_numeric(actions_df.get("plastique_kg", 0.0), default=0.0, index=base_index)
    verre = _safe_numeric(actions_df.get("verre_kg", 0.0), default=0.0, index=base_index)
    metal = _safe_numeric(actions_df.get("metal_kg", 0.0), default=0.0, index=base_index)

    # Vectorized fallback when composition fields are missing or zero.
    plastique = plastique.where(plastique > 0, dechets * IMPACT_CONSTANTS["PLASTIQUE_URBAIN_RATIO"])
    verre = verre.where(verre > 0, dechets * IMPACT_CONSTANTS["VERRE_URBAIN_RATIO"])
    metal = metal.where(metal > 0, dechets * IMPACT_CONSTANTS["METAL_URBAIN_RATIO"])

    tot_megots_kg = float(total_megots) * IMPACT_CONSTANTS["POIDS_MOYEN_MEGOT_KG"]
    return float(plastique.sum()), float(verre.sum()), float(metal.sum()), float(tot_megots_kg)


def _save_plot(fig, filename: str) -> Path:
    output_path = OUTPUT_DIR / filename
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path)
    plt.close(fig)
    return output_path


def build_public_pdf(actions_df: pd.DataFrame, app_url: str, critical_zones: set | dict | None = None, lang: str = "fr") -> bytes:
    """Build a multi-page public impact PDF."""
    del app_url  # preserved in API for backward compatibility

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)

    total = len(actions_df)
    clean_mask = _bool_series(actions_df, "est_propre") if not actions_df.empty else pd.Series(dtype=bool)
    df_propres = actions_df[clean_mask].copy() if not actions_df.empty else pd.DataFrame()
    df_recoltes = actions_df[~clean_mask].copy() if not actions_df.empty else pd.DataFrame()

    propres_count = len(df_propres)
    recoltes_count = len(df_recoltes)

    total_megots = int(_safe_numeric(df_recoltes.get("megots", 0), default=0).sum()) if recoltes_count else 0
    total_dechets = float(_safe_numeric(df_recoltes.get("dechets_kg", 0), default=0.0).sum()) if recoltes_count else 0.0
    total_benevoles = int(_safe_numeric(df_recoltes.get("benevoles", 0), default=0).sum()) if recoltes_count else 0

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 26)
    pdf.cell(0, 20, _txt("Clean my Map"), ln=True, align="C")
    pdf.set_font("Helvetica", "", 16)
    pdf.cell(0, 10, _txt("Rapport d'impact citoyen & protection"), ln=True, align="C")
    pdf.ln(10)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, _txt(f"Genere le {datetime.now().strftime('%d/%m/%Y %H:%M')}"), ln=True, align="C")

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("1. Bilan des actions de depollution"), ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, _txt(f"Nombre total de recoltes validees : {recoltes_count}"), ln=True)
    pdf.cell(0, 7, _txt(f"Megots collectes : {total_megots:,}".replace(",", " ")), ln=True)
    pdf.cell(0, 7, _txt(f"Dechets collectes : {total_dechets:.1f} kg"), ln=True)
    pdf.cell(0, 7, _txt(f"Benevoles mobilises : {total_benevoles:,}".replace(",", " ")), ln=True)

    if recoltes_count and "date" in df_recoltes.columns:
        timeline = df_recoltes.copy()
        timeline["_date_sort"] = pd.to_datetime(timeline["date"], errors="coerce")
        timeline = timeline.dropna(subset=["_date_sort"])
        if not timeline.empty:
            by_month = (
                timeline.sort_values("_date_sort")
                .groupby(timeline["_date_sort"].dt.to_period("M"))["dechets_kg"]
                .sum()
                .reset_index(name="dechets_kg")
            )
            if not by_month.empty:
                by_month["month_label"] = by_month["_date_sort"].dt.strftime("%Y-%m")
                fig, ax = plt.subplots(figsize=(5, 2.5))
                ax.plot(by_month["month_label"], by_month["dechets_kg"], marker="o", color="#059669")
                ax.set_title("Evolution des recoltes (kg)")
                ax.set_xlabel("Mois")
                ax.set_ylabel("Kg")
                ax.tick_params(axis="x", rotation=45)
                fig.tight_layout()
                image_path = _save_plot(fig, "rapport_recoltes.png")
                pdf.ln(4)
                pdf.image(str(image_path), x=15, w=180)

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("2. Signalements de zones propres"), ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, _txt(f"La communaute a effectue {propres_count} signalements de zones propres."))

    if propres_count:
        recent_propres = df_propres.sort_values("date", ascending=False).head(10)
        for _, row in recent_propres.iterrows():
            pdf.cell(0, 6, _txt(f"- {row.get('date', '')} | {row.get('adresse', '')}"), ln=True)

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("3. Zones critiques a surveiller"), ln=True)
    pdf.set_font("Helvetica", "", 11)

    if critical_zones:
        if isinstance(critical_zones, dict):
            for addr, data in critical_zones.items():
                pdf.multi_cell(0, 6, _txt(f"- {addr} : {data['count']} passages, delai moyen {data['delai_moyen']} jours"))
        else:
            for zone in critical_zones:
                pdf.multi_cell(0, 6, _txt(f"- {zone}"))
    else:
        pdf.multi_cell(0, 6, _txt("Aucune zone critique identifiee sur la periode analysee."))

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("4. Recyclage et seconde vie"), ln=True)

    if total:
        tot_plastique, tot_verre, tot_metal, tot_megots_kg = _get_material_totals(actions_df, total_megots)
        bancs = int(tot_plastique / IMPACT_CONSTANTS["PLASTIQUE_POUR_BANC_KG"])
        pulls = int(tot_plastique / IMPACT_CONSTANTS["PLASTIQUE_POUR_PULL_KG"])

        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(
            0,
            6,
            _txt(
                f"Plastique estime : {tot_plastique:.1f} kg (~{bancs} bancs / {pulls} pulls).\n"
                f"Verre estime : {tot_verre:.1f} kg.\n"
                f"Metal estime : {tot_metal:.1f} kg.\n"
                f"Masse de megots : {tot_megots_kg:.1f} kg."
            ),
        )

        sizes = [tot_plastique, tot_verre, tot_metal, tot_megots_kg]
        labels = ["Plastique", "Verre", "Metal", "Megots"]
        colors = ["#22c55e", "#3b82f6", "#9ca3af", "#f97316"]
        filtered = [(l, s, c) for l, s, c in zip(labels, sizes, colors) if s > 0]
        if filtered:
            labels = [it[0] for it in filtered]
            sizes = [it[1] for it in filtered]
            colors = [it[2] for it in filtered]
            fig, ax = plt.subplots(figsize=(4.5, 4.5))
            ax.pie(sizes, labels=labels, colors=colors, autopct="%1.1f%%", startangle=90)
            ax.axis("equal")
            fig.tight_layout()
            image_path = _save_plot(fig, "rapport_recyclage.png")
            pdf.ln(4)
            pdf.image(str(image_path), x=25, w=160)

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("5. Benefice economique pour la collectivite"), ln=True)
    pdf.set_font("Helvetica", "", 11)
    tonnes = total_dechets / 1000.0
    economy = tonnes * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]
    pdf.multi_cell(
        0,
        6,
        _txt(
            f"{total_dechets:.1f} kg retires, soit {tonnes:.3f} tonne(s). "
            f"Economies potentielles estimees: {economy:,.2f} EUR."
        ),
    )

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("6. Energie citoyenne mobilisee"), ln=True)
    if total and "temps_min" in actions_df.columns and "benevoles" in actions_df.columns:
        hours = (
            _safe_numeric(actions_df["temps_min"], default=0.0)
            * _safe_numeric(actions_df["benevoles"], default=0.0)
            / 60.0
        ).sum()
    else:
        hours = 0.0
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, _txt(f"Heures cumulees de benevolat estimees: {hours:.1f} h."))

    if total:
        preview = actions_df.copy()
        if "date" in preview.columns:
            preview["_date_sort"] = pd.to_datetime(preview["date"], errors="coerce")
            preview = preview.sort_values("_date_sort", ascending=False)

        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, _txt("7. Actions recentes (extrait)"), ln=True)
        pdf.set_font("Helvetica", "", 10)

        for i, (_, row) in enumerate(preview.head(60).iterrows()):
            line = (
                f"{row.get('date', '')} | {row.get('type_lieu', 'Non specifie')} | "
                f"{row.get('adresse', '')} | "
                f"{int(pd.to_numeric(row.get('megots', 0), errors='coerce') or 0)} megots | "
                f"{float(pd.to_numeric(row.get('dechets_kg', 0), errors='coerce') or 0):.1f} kg | "
                f"propre={'oui' if normalize_bool_flag(row.get('est_propre', False)) else 'non'}"
            )
            pdf.multi_cell(0, 5, _txt(f"- {line}"))
            if (i + 1) % 25 == 0 and i < 59:
                pdf.add_page()
                pdf.set_font("Helvetica", "", 10)

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("8. Methodologie et references"), ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5, _txt(get_impact_sources(lang=lang)))

    out = pdf.output(dest="S")
    return out if isinstance(out, bytes) else out.encode("latin-1", "replace")


def build_certificat_territorial(df_ville: pd.DataFrame, nom_ville: str, critical_zones: set | dict) -> bytes:
    """Build the city-specific impact certificate."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_fill_color(240, 248, 255)
    pdf.cell(0, 15, _txt(f"certificat d'impact territorial : {nom_ville}"), ln=True, align="C", fill=True)

    nb_actions = len(df_ville)
    total_dechets = float(_safe_numeric(df_ville.get("dechets_kg", 0.0), default=0.0).sum())
    total_megots = int(_safe_numeric(df_ville.get("megots", 0), default=0).sum())
    litres_eau = total_megots * IMPACT_CONSTANTS["EAU_PROTEGEE_PER_MEGOT_L"]

    tonnes = total_dechets / 1000.0
    economy = tonnes * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]

    pdf.ln(5)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        _txt(
            f"Interventions citoyennes : {nb_actions} actions.\n"
            f"Dechets extraits : {total_dechets:.1f} kg.\n"
            f"Megots ramasses : {total_megots}.\n"
            f"Economie estimee : {economy:,.2f} EUR.\n"
            f"Eau protegee : {litres_eau:,} L."
        ),
    )

    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, _txt("Zones prioritaires identifiees"), ln=True)
    pdf.set_font("Helvetica", "", 10)

    if critical_zones:
        if isinstance(critical_zones, dict):
            for addr, data in critical_zones.items():
                pdf.multi_cell(0, 5, _txt(f"- {addr} : {data['count']} passages, delai moyen {data['delai_moyen']} jours"))
        else:
            for zone in critical_zones:
                pdf.multi_cell(0, 5, _txt(f"- {zone}"))
    else:
        pdf.multi_cell(0, 5, _txt("Aucune zone de recurrence critique detectee sur ce perimetre."))

    out = pdf.output(dest="S")
    return out if isinstance(out, bytes) else out.encode("latin-1", "replace")


def build_certificat_eco_quartier(nom_quartier: str) -> bytes:
    """Build the 'quartier preserve' certificate."""
    pdf = FPDF()
    pdf.add_page()

    pdf.set_line_width(2)
    pdf.rect(5, 5, 200, 287)

    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(0, 40, _txt("CERTIFICAT D'IMPACT CITOYEN"), ln=True, align="C")

    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(34, 197, 94)
    pdf.cell(0, 20, _txt("label eco-quartier"), ln=True, align="C")

    pdf.ln(20)
    pdf.set_font("Helvetica", "", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 10, _txt(f"Felicitations aux habitants et contributeurs de {nom_quartier} !"), align="C")

    pdf.ln(22)
    pdf.set_font("Helvetica", "I", 12)
    pdf.multi_cell(
        0,
        8,
        _txt(
            "Ce certificat atteste que ce quartier a maintenu un niveau de proprete exemplaire "
            "sur les 180 derniers jours, sans point noir recense."
        ),
        align="C",
    )

    pdf.ln(24)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, _txt("Les Brigades Vertes"), ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 10, _txt(datetime.now().strftime("%d/%m/%Y")), ln=True, align="C")

    out = pdf.output(dest="S")
    return out if isinstance(out, bytes) else out.encode("latin-1", "replace")


def get_eco_districts(df: pd.DataFrame) -> list[str]:
    """Return city labels eligible for eco-district badge."""
    if df.empty or "date" not in df.columns or "adresse" not in df.columns:
        return []

    work = df.copy()
    work["dt"] = pd.to_datetime(work["date"], errors="coerce")
    cutoff = datetime.now() - timedelta(days=180)
    recent = work[work["dt"] >= cutoff]
    if recent.empty:
        return []

    recent = recent.assign(
        est_propre_norm=recent.get("est_propre", False).map(normalize_bool_flag),
        ville=recent["adresse"].fillna("").astype(str).str.split().str[-1].str.strip().str.lower(),
    )

    eligible: list[str] = []
    for ville, group in recent.groupby("ville"):
        if not ville:
            continue
        has_clean = bool(group["est_propre_norm"].any())
        has_dirty = bool((~group["est_propre_norm"]).any())
        if has_clean and not has_dirty:
            eligible.append(ville.capitalize())
    return eligible


def get_eco_quartiers(df: pd.DataFrame) -> list[str]:
    """Return neighborhoods that are clean over last 180 days."""
    if df.empty or "date" not in df.columns or "adresse" not in df.columns:
        return []

    work = df.copy()
    work["date_dt"] = pd.to_datetime(work["date"], errors="coerce")
    cutoff = datetime.now() - timedelta(days=180)
    recent = work[work["date_dt"] >= cutoff]
    if recent.empty:
        return []

    recent = recent.assign(
        est_propre_norm=recent.get("est_propre", False).map(normalize_bool_flag),
        dechets_kg_num=_safe_numeric(recent.get("dechets_kg", 0.0), default=0.0),
    )

    labels: list[str] = []
    for addr, group in recent.groupby("adresse"):
        has_clean_signal = bool(group["est_propre_norm"].any())
        has_pollution = bool((group["dechets_kg_num"] > 0).any())
        if has_clean_signal and not has_pollution:
            labels.append(str(addr))
    return labels

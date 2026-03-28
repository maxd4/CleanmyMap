#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix all Wave 1 issues in app.py — one-shot idempotent script."""
import ast
import os
import re
import sys
from pathlib import Path

APP_PY = Path(__file__).resolve().parent.parent / "app.py"


def main() -> None:
    content = APP_PY.read_text(encoding="utf-8")
    original_len = len(content)

    # ------------------------------------------------------------------ #
    # 1. _repair_mojibake_text: clean docstring + remove dead code block  #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'(def _repair_mojibake_text\(value\):\n    """).*?(""")',
        r'\1Repare les chaines mal decodees sans impacter le texte sain.\2',
        content,
        flags=re.DOTALL,
    )
    # Remove dead code lines after the early return
    content = re.sub(
        r'(    return repair_mojibake_text\(value\)\n)\n'
        r'    markers = \(.*?\n'
        r'    if not any\(marker.*?\n'
        r'        return value\n\n'
        r'    for source_encoding in \("cp1252", "latin-1"\):\n'
        r'        try:\n'
        r'            repaired = value\.encode\(source_encoding\)\.decode\("utf-8"\)\n'
        r'            return repaired\n'
        r'        except UnicodeError:\n'
        r'            continue\n'
        r'    return value\n',
        r'\1',
        content,
        flags=re.DOTALL,
    )

    # ------------------------------------------------------------------ #
    # 2. get_impact_sources: clean docstring                              #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'(def get_impact_sources\(\):\n    """).*?(""")',
        r"\1Wrapper vers le service impact pour conserver l'API historique cote app.\2",
        content,
        flags=re.DOTALL,
    )

    # ------------------------------------------------------------------ #
    # 3. CSS comment: remove mojibake                                      #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'/\* Masquer les ancres automatiques des titres Streamlit \(liens[^*]*\*/',
        '/* Masquer les ancres automatiques des titres Streamlit (liens a cote des titres) */',
        content,
    )

    # ------------------------------------------------------------------ #
    # 4. calculate_flow_sinks: clean docstring                            #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'(Identifie les points bas \(sinks\) )o[^\n]*(les d)',
        r'\1ou les d',
        content,
    )

    # ------------------------------------------------------------------ #
    # 5. calculate_flow_sinks: add empty-graph guard                      #
    # ------------------------------------------------------------------ #
    old_guard = "    sinks = []\n    if 'elevation' not in list(G.nodes(data=True))[0][1]:"
    new_guard = (
        "    sinks = []\n"
        "    if len(G.nodes) == 0:\n"
        "        return sinks\n"
        "    if 'elevation' not in list(G.nodes(data=True))[0][1]:"
    )
    if old_guard in content:
        content = content.replace(old_guard, new_guard)

    # ------------------------------------------------------------------ #
    # 6. Legend: fix ÉTAT DES LIEUX prefix emoji                         #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'(letter-spacing:0\.05em;">)[^<]*\u00c9TAT DES LIEUX',
        lambda m: m.group(1) + '\U0001f4ca ETAT DES LIEUX',
        content,
    )

    # ------------------------------------------------------------------ #
    # 7. Legend: fix CO₂ label                                           #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'CO[^\n<]*\u00e9vit\u00e9',
        'CO\u2082 evite',
        content,
    )

    # ------------------------------------------------------------------ #
    # 8. TYPE_LIEU_OPTIONS: fix N° Boulevard                             #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'"N[^"]*Boulevard/Avenue/Place"',
        '"N\u00b0 Boulevard/Avenue/Place"',
        content,
    )

    # ------------------------------------------------------------------ #
    # 9. Preset filter: fix corrupted Établissement Engagé string        #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'type_col != "[\'\s]*\u00c9tablissement Engag\u00e9 \(Label\)"',
        'type_col != "\u00c9tablissement Engag\u00e9 (Label)"',
        content,
    )

    # ------------------------------------------------------------------ #
    # 10. Nav admin hint: fix mojibake                                    #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'i18n_text\("Validation, contr[^"]*exports\."',
        'i18n_text("Validation, controle qualite et exports."',
        content,
    )

    # ------------------------------------------------------------------ #
    # 11. Medals: fix corrupted emoji sequences                          #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'medal = "[^"]+" if i == 0 else "[^"]+" if i == 1 else "[^"]+" if i == 2 else f"#\{i\+1\}"',
        'medal = "\U0001f947" if i == 0 else "\U0001f948" if i == 1 else "\U0001f949" if i == 2 else f"#{i+1}"',
        content,
    )

    # ------------------------------------------------------------------ #
    # 12. Separator dots: fix mojibake between action stats              #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r"\{int\(row\['nb_actions'\]\)\} actions[^{]*\{row\['total_kg'\]:.1f\} kg[^{]*\{int\(row\['total_megots'\]\):,\} m[ée]gots",
        "{int(row['nb_actions'])} actions \u00b7 {row['total_kg']:.1f} kg \u00b7 {int(row['total_megots']):,} megots",
        content,
    )

    # ------------------------------------------------------------------ #
    # 13. km² labels in selectbox and sort_map                           #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'"M\u00e9gots / km[^"]*"',
        '"M\u00e9gots / km\u00b2"',
        content,
    )

    # ------------------------------------------------------------------ #
    # 14. Popup trajet: fix emoji + text                                 #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'f"<b>[^"]*Trajet d\u00e9clar\u00e9</b>',
        'f"<b>\U0001f4cd Trajet declare</b>',
        content,
    )

    # ------------------------------------------------------------------ #
    # 15. Actor description: fix mojibake                                #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r"Structure engag\u00e9e op\u00e9rant '[^']*  ",
        "Structure engagee operant a ",
        content,
    )

    # ------------------------------------------------------------------ #
    # 16. Remove duplicate GOOGLE_SHEET_URL redefinition                 #
    # ------------------------------------------------------------------ #
    content = re.sub(
        r'GOOGLE_SHEET_URL = os\.getenv\(\n'
        r'    "CLEANMYMAP_SHEET_URL",\n'
        r'    "https://docs\.google[^)]+\)\n',
        '# GOOGLE_SHEET_URL is imported from src.config \u2014 no redefinition needed.\n',
        content,
    )

    # ------------------------------------------------------------------ #
    # 17. Rubric hero subtitle: replace dev note with user-facing text   #
    # ------------------------------------------------------------------ #
    content = content.replace(
        'i18n_text("Rubrique 1 en tete: Home + Sandbox + formulaire + carte pour tester le parcours public.", "Section 1 first: Home + Sandbox + form + map for public testing.")',
        "i18n_text(\"Selectionnez une rubrique pour naviguer dans l'application.\", \"Select a section to navigate the application.\")",
    )

    # ------------------------------------------------------------------ #
    # 18. Gate TEST_DATA behind env flag                                 #
    # ------------------------------------------------------------------ #
    old_import = '    imported_actions = sheet_actions_local + TEST_DATA\n'
    new_import = (
        '    include_demo = os.getenv("CLEANMYMAP_INCLUDE_DEMO_DATA", "1").strip().lower() in {"1", "true", "yes", "on"}\n'
        '    imported_actions = sheet_actions_local + (TEST_DATA if include_demo else [])\n'
    )
    if old_import in content:
        content = content.replace(old_import, new_import)

    # ------------------------------------------------------------------ #
    # 19. Upload validation: add constants + guards                      #
    # ------------------------------------------------------------------ #
    if 'ALLOWED_IMAGE_TYPES' not in content:
        upload_const = (
            'ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}\n'
            'MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB\n\n\n'
        )
        content = content.replace(
            'def save_uploaded_image(uploaded_file, prefix="upload"):',
            upload_const + 'def save_uploaded_image(uploaded_file, prefix="upload"):',
        )
        old_body = (
            '    if uploaded_file is None:\n'
            '        return None\n'
            '    uploads_dir'
        )
        new_body = (
            '    if uploaded_file is None:\n'
            '        return None\n'
            '    file_type = getattr(uploaded_file, "type", None)\n'
            '    if file_type not in ALLOWED_IMAGE_TYPES:\n'
            '        log_event(event="upload_rejected", severity="warning", component="app",\n'
            '                  action="save_uploaded_image", message=f"Rejected: invalid type {file_type}")\n'
            '        return None\n'
            '    file_size = getattr(uploaded_file, "size", 0) or len(uploaded_file.getbuffer())\n'
            '    if file_size > MAX_UPLOAD_BYTES:\n'
            '        log_event(event="upload_rejected", severity="warning", component="app",\n'
            '                  action="save_uploaded_image", message=f"Rejected: size {file_size} > {MAX_UPLOAD_BYTES}")\n'
            '        return None\n'
            '    uploads_dir'
        )
        if old_body in content:
            content = content.replace(old_body, new_body)

    # ------------------------------------------------------------------ #
    # 20. Critical popup: sanitize place_name                            #
    # ------------------------------------------------------------------ #
    old_critical = (
        "            if score_data['score_mixte'] > 80 and not is_business:\n"
        "                folium.Marker(\n"
        "                    location=[row['lat'], row['lon']],\n"
        "                    icon=folium.Icon(color='purple', icon='exclamation-triangle', prefix='fa'),\n"
        "                    tooltip=f\"\u26a0\ufe0f Point Critique: {place_name}\",\n"
        "                    popup=f\"<b>Point critique d\u00e9tect\u00e9</b><br>{place_name}<br><small>Priorit\u00e9 \u00e9lev\u00e9e pour intervention.</small>\"\n"
        "                ).add_to(group_pollution)"
    )
    new_critical = (
        "            if score_data['score_mixte'] > 80 and not is_business:\n"
        "                safe_place_name = sanitize_html_text(str(place_name), max_len=160)\n"
        "                folium.Marker(\n"
        "                    location=[row['lat'], row['lon']],\n"
        "                    icon=folium.Icon(color='purple', icon='exclamation-triangle', prefix='fa'),\n"
        "                    tooltip=f\"\u26a0\ufe0f Point Critique: {safe_place_name}\",\n"
        "                    popup=f\"<b>Point critique detecte</b><br>{safe_place_name}<br><small>Priorite elevee pour intervention.</small>\"\n"
        "                ).add_to(group_pollution)"
    )
    if old_critical in content:
        content = content.replace(old_critical, new_critical)

    # ------------------------------------------------------------------ #
    # 21. Trash spot popup: ensure sanitize already applied fields used  #
    # ------------------------------------------------------------------ #
    old_spot = (
        "        spot_type = spot_sanitized.escaped.get(\"type_dechet\") or \"Spot\"\n"
        "        spot_reporter = spot_sanitized.escaped.get(\"reporter_name\") or \"N/A\"\n"
        "        folium.Marker(\n"
        "            [s['lat'], s['lon']],\n"
        "            popup=f\"<b>\u26a0\ufe0f {spot_type}</b><br>Signal\u00e9 par {spot_reporter}<br><i>Aidez-nous \u00e0 nettoyer !</i>\","
    )
    new_spot = (
        "        spot_type = sanitize_html_text(spot_sanitized.escaped.get(\"type_dechet\") or \"Spot\", max_len=120)\n"
        "        spot_reporter = sanitize_html_text(spot_sanitized.escaped.get(\"reporter_name\") or \"N/A\", max_len=120)\n"
        "        folium.Marker(\n"
        "            [s['lat'], s['lon']],\n"
        "            popup=f\"<b>\u26a0\ufe0f {spot_type}</b><br>Signale par {spot_reporter}<br><i>Aidez-nous a nettoyer !</i>\","
    )
    if old_spot in content:
        content = content.replace(old_spot, new_spot)

    # ------------------------------------------------------------------ #
    # 22. Trailing whitespace                                             #
    # ------------------------------------------------------------------ #
    content = content.rstrip() + "\n"

    APP_PY.write_text(content, encoding="utf-8")
    new_len = len(content)
    print(f"app.py updated: {original_len} -> {new_len} chars (delta {new_len - original_len:+d})")

    # Verify Python syntax
    try:
        ast.parse(content)
        print("Syntax check: OK")
    except SyntaxError as exc:
        print(f"SYNTAX ERROR: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()

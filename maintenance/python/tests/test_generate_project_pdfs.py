import pytest
from reportlab.platypus import HRFlowable, ListFlowable, Table

from scripts import generate_project_pdfs as pdf_module


def test_fmt_inline_escapes_markup_and_formats_bold():
    rendered = pdf_module.fmt_inline("**Important** <script> & détail")

    assert rendered == "<b>Important</b> &lt;script&gt; &amp; détail"


def test_parse_table_removes_separator_and_stops_at_non_table_line():
    rows, next_index = pdf_module.parse_table(
        ["| Nom | Valeur |", "|:---|---:|", "| vide | **long** |", "Après"],
        0,
    )

    assert rows == [["Nom", "Valeur"], ["vide", "**long**"]]
    assert next_index == 3
    assert pdf_module.parse_table(["| seul |"], 0) == ([["seul"]], 1)
    assert pdf_module.table_flow([], pdf_module.make_styles()) == []


def test_parse_markdown_visual_covers_headings_lists_table_callout_and_separator():
    styles = pdf_module.make_styles()
    story = pdf_module.parse_markdown_visual(
        """# Titre **principal**
## Sous-titre
### Détail & contexte

- Premier élément
- Second élément très long

| Nom | Valeur |
| --- | --- |
| A | B |
| C | D |

Plan d'exécution : contenu d'appel à l'action.
---
Paragraphe avec < et &.
""",
        styles,
    )

    assert any(isinstance(item, ListFlowable) for item in story)
    assert any(isinstance(item, Table) for item in story)
    assert any(isinstance(item, HRFlowable) for item in story)
    assert len(story) >= 10


def test_build_pdf_generates_real_multipage_pdf(tmp_path):
    source = tmp_path / "source.md"
    output = tmp_path / "nested" / "project.pdf"
    source.write_text(
        "# Document local\n\n" + "\n".join(
            f"## Section {index}\n\n" + ("Texte long & spécial. " * 30) + "\n"
            for index in range(1, 12)
        ),
        encoding="utf-8",
    )
    output.parent.mkdir()

    pdf_module.build_pdf(source, output, "Titre local", "Sous-titre local")

    payload = output.read_bytes()
    assert payload.startswith(b"%PDF-")
    assert len(payload) > 2_000
    assert payload.count(b"/Type /Page") >= 2


def test_build_pdf_propagates_missing_input_and_output_errors(tmp_path):
    with pytest.raises(FileNotFoundError):
        pdf_module.build_pdf(
            tmp_path / "missing.md",
            tmp_path / "out.pdf",
            "Titre",
            "Sous-titre",
        )

    source = tmp_path / "source.md"
    source.write_text("# Valide", encoding="utf-8")
    with pytest.raises(OSError):
        pdf_module.build_pdf(
            source,
            tmp_path / "missing-directory" / "out.pdf",
            "Titre",
            "Sous-titre",
        )

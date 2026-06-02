import re

file_path = r"C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\plans\rapport_impact\impact_IA.md"
bib_path = r"C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\plans\rapport_impact\references.bib"

raw_rows = [
    ("ADEME / Arcep", "2022", "Étude d'impact environnemental du numérique en France", "https://librairie.ademe.fr/consommer-autrement/5277-impact-environnemental-du-numerique-en-france.html", "institutionnelle / synthèse"),
    ("ADEME", "n.d.", "Des idées écolos pour tous les jours au bureau", "https://agirpourlatransition.ademe.fr/particuliers/bureau/bons-gestes/papier-premier-dechet-bureau", "institutionnelle"),
    ("ADEME", "2011", "Analyse comparée des impacts environnementaux de la communication par voie électronique - Complément", "https://studylibfr.com/doc/4015667/acv_ntic_synthese_resultats", "source de synthèse"),
    ("AIE (IEA)", "2024", "Electricity 2024: Analysis and forecast to 2026", "https://www.iea.org/reports/electricity-2024", "institutionnelle"),
    ("AIE (IEA)", "2024", "Energy and AI Report", "https://www.iea.org/reports/energy-and-ai", "institutionnelle"),
    ("Anthropic", "n.d.", "Towards Understanding Sycophancy in Language Models", "https://www.anthropic.com/news/towards-understanding-sycophancy-in-language-models", "laboratoire / recherche"),
    ("ANSSI", "2023", "Souveraineté numérique et Cloud", "", "institutionnelle"),
    ("Cigref / INR", "2022", "Référentiel d'écoconception de services numériques", "https://eco-conception.designersethiques.org/guide/fr/", "référentiel"),
    ("Cigref", "2021", "Souveraineté numérique : de quoi parle-t-on ?", "", "source de synthèse"),
    ("Commission Européenne", "2022", "Data Act", "https://digital-strategy.ec.europa.eu/en/policies/data-act", "institutionnelle"),
    ("Commission Européenne", "2022", "Data Governance Act", "", "institutionnelle"),
    ("European Union Research", "2021", "Cloud Vendor Lock-In: Causes, Impacts, and Solutions", "", "recherche / synthèse"),
    ("GAIA-X Association", "2024", "Technical Architecture Release 24.04", "", "architecture / gouvernance"),
    ("GreenIT.fr", "2019/2023", "L'empreinte environnementale du numérique mondial", "https://www.greenit.fr/etude-empreinte-environnementale-du-numerique-mondial/", "source de synthèse"),
    ("International AI Safety Report", "2025", "International AI Safety Report 2025", "https://internationalaisafetyreport.org/publication/international-ai-safety-report-2025", "rapport international"),
    ("King's College London", "n.d.", "King's study finds AI chose nuclear signalling in 95% of simulated crises", "https://www.kcl.ac.uk/news/artificial-intelligence-under-nuclear-pressure-first-large-scale-kings-study-reveals-how-ai-models-reason-and-escalate-under-crisis", "institutionnelle / communication scientifique"),
    ("Kenneth Payne", "2026", "AI Arms and Influence: Frontier Models Exhibit Sophisticated Reasoning in Simulated Nuclear Crises", "https://arxiv.org/abs/2602.14740", "préprint"),
    ("Li, P. et al.", "2023", "Making AI Less Thirsty: Uncovering the Secret Water Footprint of AI Models", "https://arxiv.org/abs/2304.03271", "recherche"),
    ("NIST", "n.d.", "Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile", "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence", "référentiel"),
    ("OCDE", "n.d.", "AI principles", "https://www.oecd.org/en/topics/ai-principles.html", "institutionnelle"),
    ("OpenAI", "n.d.", "Expanding on what we missed with sycophancy", "https://openai.com/index/expanding-on-sycophancy/", "fournisseur / retour d'expérience"),
    ("OpenAI", "n.d.", "Strengthening ChatGPT's responses in sensitive conversations", "https://openai.com/index/strengthening-chatgpt-responses-in-sensitive-conversations/", "fournisseur / retour d'expérience"),
    ("OpenAI", "n.d.", "Our updated Preparedness Framework", "https://openai.com/index/updating-our-preparedness-framework/", "fournisseur / cadre de sûreté"),
    ("Parlement Européen", "2024", "EU AI Act (Règlement 2024/1689)", "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689", "réglementation"),
    ("Shift Project", "2019/2023", "Pour une sobriété numérique", "https://theshiftproject.org/article/pour-une-sobriete-numerique-rapport-shift/", "source de synthèse"),
    ("Data Center Dynamics / Synergy Research Group", "2025", "Synergy Research: Neoclouds gradually increasing CIS market share, as Amazon declines", "https://www.datacenterdynamics.com/en/news/synergy-research-neoclouds-gradually-increasing-cis-market-share-as-amazon-declines/", "source secondaire de marché"),
    ("TIME", "2023", "OpenAI Used Kenyan Workers to Make ChatGPT Less Toxic", "https://time.com/6247678/openai-chatgpt-kenya-workers/", "presse documentée"),
    ("The Guardian", "2023", "It's destroyed me completely: Kenyan moderators decry toll of training of AI models", "https://www.theguardian.com/technology/2023/aug/02/ai-chatbot-training-human-toll-content-moderator-meta-openai", "presse documentée"),
    ("UNESCO", "n.d.", "Recommendation on the Ethics of Artificial Intelligence", "https://www.unesco.org/en/articles/recommendation-ethics-artificial-intelligence?hub=343", "institutionnelle"),
    ("UNITAR / ITU", "2024", "Global E-waste Monitor 2024", "https://ewastemonitor.info/the-global-e-waste-monitor-2024/", "rapport international"),
    ("WHO", "n.d.", "Children and digital dumpsites: e-waste exposure and child health", "https://www.who.int/publications/i/item/9789240023901", "institutionnelle"),
    ("Vidéo YouTube", "n.d.", "Pourquoi ChatGPT a manipulé des ados", "https://www.youtube.com/watch?v=fbAfLv7CBic", "source secondaire de cadrage"),
    ("Vidéo YouTube", "n.d.", "Il faut qu'on parle de Claude Mythos", "https://www.youtube.com/watch?v=JBaBAg4ny6U", "source secondaire de cadrage"),
    ("Vidéo YouTube", "n.d.", "Pourquoi l'IA ne remplacera pas les artistes", "https://www.youtube.com/watch?v=B_MR20jqR48", "source secondaire de cadrage"),
    ("Vidéo YouTube", "n.d.", "Le jeu dans lequel on vit est en train de changer", "https://www.youtube.com/watch?v=waoKjITpot0", "source secondaire de cadrage"),
]

keys_used = set()

def make_key(author, year):
    clean_auth = re.sub(r"[^\w\s]", "", author).strip()
    clean_auth = clean_auth.replace(" ", "_").lower()
    clean_auth = clean_auth[:15]
    if not clean_auth:
        clean_auth = "source"
    
    clean_year = re.sub(r"\D", "", year)
    if not clean_year:
        clean_year = "nd"
        
    key = f"{clean_auth}_{clean_year}"
    base_key = key
    counter = 1
    while key in keys_used:
        key = f"{base_key}_{counter}"
        counter += 1
    keys_used.add(key)
    return key

bib_entries = []
new_table_rows = []

for author, year, title, url, note in raw_rows:
    key = make_key(author, year)
    
    entry = f"@misc{{{key},\n"
    entry += f"  author = {{{author}}},\n"
    entry += f"  title = {{{title}}},\n"
    if year != "n.d.":
        entry += f"  year = {{{year}}},\n"
    if url:
        entry += f"  url = {{{url}}},\n"
    entry += f"  note = {{{note}}}\n"
    entry += "}\n"
    bib_entries.append(entry)

    # Format the Source column representation
    # **Author** (Year). *Title*. [Lien](url) if url else **Author** (Year). *Title*
    link_part = f" [Lien]({url})" if url else ""
    year_part = f" ({year})" if year != "n.d." else ""
    source_str = f"**{author}**{year_part}. *{title}*.{link_part}"
    new_table_rows.append(f"| {source_str} |")

# Write BibTeX file
with open(bib_path, "w", encoding="utf-8") as f:
    f.write("\n".join(bib_entries))

print(f"Generated {len(bib_entries)} BibTeX entries in {bib_path}")

# Read impact_IA.md
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

bib_section_match = re.search(r"# Bibliographie et Sources.*", content, re.DOTALL)
if not bib_section_match:
    print("Could not find bibliography section in impact_IA.md")
    exit(1)

# Build new bibliography section in Markdown
new_bib_markdown = """# Bibliographie et Sources

Cette table regroupe les sources globales mobilisées dans plusieurs parties du document. Les références spécifiques déjà attachées à certaines sections restent conservées à leur emplacement d'origine ou dans les annexes correspondantes.

Comme le document a été consolidé avec assistance IA, les liens externes peuvent évoluer ou devenir indisponibles après publication ; toute source cassée, référence imprécise ou erreur de citation peut être signalée à [contact@cleanmymap.fr](mailto:contact@cleanmymap.fr).

| Source |
|---|
"""

for row in new_table_rows:
    new_bib_markdown += row + "\n"

# Replace bibliography section in content
new_content = content[:bib_section_match.start()] + new_bib_markdown

# Update YAML Header
yaml_match = re.match(r"^---(.*?)---", new_content, re.DOTALL)
if yaml_match:
    yaml_inner = yaml_match.group(1)
    if "bibliography:" not in yaml_inner:
        new_yaml = yaml_inner.strip() + "\nbibliography: references.bib\ncitation-style: https://raw.githubusercontent.com/citation-style-language/styles/master/chicago-note-bibliography.csl\nnocite: |\n  @*\n"
        new_content = new_content.replace(yaml_inner, new_yaml)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated impact_IA.md successfully!")

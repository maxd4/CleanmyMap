import streamlit as st
import pandas as pd
from src.security_utils import sanitize_external_url, sanitize_html_text

def render_actors_tab(ctx):
    """
    Renders the 'Actors' tab. Consolidates logic from previous partners.py.
    """
    render_tab_header = ctx['render_tab_header']
    get_submissions_by_status = ctx['get_submissions_by_status']

    render_tab_header(
        icon="\U0001F91D",
        title_fr="Acteurs Engagés",
        title_en="Engaged Partners",
        subtitle_fr="Découvrez l'annuaire des structures agissant pour le climat et la solidarité à Paris.",
        subtitle_en="Discover the directory of organizations acting for climate and solidarity in Paris.",
        chips=["Annuaire", "Partenaires"],
    )

    # --- DONNÉES STATIQUES ---
    DATA = {
        "🌿 Environnement & Climat": [
            {"name": "Moissons Solidaires", "desc": "Lutte contre le gaspillage en récupérant les invendus des marchés.", "url": "https://moissonssolidaires.org/"},
            {"name": "Veni Verdi", "desc": "Fermes urbaines et jardins partagés pour la biodiversité.", "url": "https://veniverdi.fr/"},
            {"name": "Les Cols Verts IDF", "desc": "Agriculture urbaine et alimentation durable.", "url": "https://www.lescolsverts.fr/"},
            {"name": "PikPik Environnement", "desc": "Sensibilisation aux éco-gestes via des ateliers ludiques.", "url": "https://www.pikpik.org"},
            {"name": "Surfrider Paris", "desc": "Protection des océans et nettoyage des berges de Seine.", "url": "https://surfrider.eu"},
            {"name": "Zero Waste Paris", "desc": "Promotion du zéro déchet et de la réduction à la source.", "url": "https://zerowasteparis.fr"},
            {"name": "La REcyclerie", "desc": "Lieu d'expérimentation dédié à l'éco-responsabilité.", "url": "https://www.larecyclerie.com"},
            {"name": "Biocycle", "desc": "Collecte d'invendus en triporteur pour redistribution.", "url": "https://biocycle.fr/"},
            {"name": "Recyclerie Sportive", "desc": "Collecte et revente d'équipements sportifs de seconde main.", "url": "https://recyclerie-sportive.org/"},
            {"name": "Association Sans Murs", "desc": "Nettoyages citoyens et lutte contre la pollution plastique.", "url": "https://www.associationsansmurs.fr/"},
            {"name": "Les Brigades Vertes", "desc": "Soin des lieux et actions de terrain (Clean my Map).", "url": "https://cleanwalk.fr"}
        ],
        "⚖️ Justice Sociale & Précarité": [
            {"name": "Utopia 56", "desc": "Soutien et accueil digne pour les personnes exilées.", "url": "https://www.utopia56.org"},
            {"name": "La Cloche", "desc": "Cuisine et services solidaires pour recréer du lien entre voisins.", "url": "https://lacloche.org"},
            {"name": "ATD Quart Monde", "desc": "Lutte contre la grande pauvreté avec ceux qui la vivent.", "url": "https://www.atd-quartmonde.fr"},
            {"name": "Emmaüs Défi", "desc": "Contrats d'insertion pour sortir de la grande exclusion.", "url": "https://emmaus-defi.org/"},
            {"name": "Linkee", "desc": "Aide alimentaire solidaire pour les étudiants précaires.", "url": "https://linkee.co/"},
            {"name": "Le Chaînon Manquant", "desc": "Collecte et redistribution rapide d'invendus alimentaires.", "url": "https://lechainon-manquant.fr/"},
            {"name": "ADSF", "desc": "Santé et hygiène pour les femmes en grande précarité.", "url": "https://adsf-asso.org/"},
            {"name": "Règles Élémentaires", "desc": "Lutte contre la précarité menstruelle à Paris.", "url": "https://www.regleselementaires.com/"}
        ],
        "🌈 Mixité & Inclusion": [
            {"name": "Le Refuge", "desc": "Hébergement et accompagnement des jeunes LGBT+ isolés.", "url": "https://www.le-refuge.org"},
            {"name": "Singa", "desc": "Rencontre et entrepreneuriat entre locaux et réfugiés.", "url": "https://www.singafrance.com"},
            {"name": "Kabubu", "desc": "Inclusion sociale par le sport et la convivialité.", "url": "https://www.kabubu.fr/"},
            {"name": "Article 1", "desc": "Égalité des chances et réussite scolaire pour tous.", "url": "https://article-1.eu"},
            {"name": "Entourage", "desc": "Lien social autour des personnes sans-abri.", "url": "https://www.entourage.social/"}
        ],
        "⭐ Commerçants Engagés": [
            {"name": "Le Baranoux", "desc": "Bar collaboratif et lieu de mixité sociale (Bar Solidaire).", "url": "https://www.baranoux.fr/"},
            {"name": "La Buvette du Climat", "desc": "Cuisine engagée à l'Académie du Climat.", "url": "https://www.academieduclimat.paris/yes-we-camp/"},
            {"name": "Le Pavillon des Canaux", "desc": "Tiers-lieu culturel et solidaire au bord de l'eau.", "url": "https://www.pavillondescanaux.com/"},
            {"name": "Café Joyeux", "desc": "Emploie et forme des personnes avec handicap mental.", "url": "https://www.cafejoyeux.com/"}
        ]
    }

    # Récupération dynamique depuis la BDD
    all_approved = get_submissions_by_status('approved')
    if all_approved:
        dyn_df = pd.DataFrame(all_approved)
        for _, row in dyn_df.iterrows():
            typ = row.get('type_lieu')
            item = {
                "name": row.get('association') or row.get('nom'),
                "desc": (row.get('description') or row.get('commentaire') or "Acteur validé")[:80],
                "url": row.get('website_url') or "#"
            }
            if not item["name"]: continue
            
            if typ == "Association écologique": DATA["🌿 Environnement & Climat"].append(item)
            elif typ == "Association humanitaire et sociale": DATA["⚖️ Justice Sociale & Précarité"].append(item)
            elif typ == "Commerçant engagé": DATA["⭐ Commerçants Engagés"].append(item)

    # UI : Recherche et Filtrage
    st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
    f1, f2 = st.columns([2, 1])
    with f1:
        search = st.text_input("🔍 Rechercher un partenaire...", placeholder="Ex: Climat, Maraude, LGBTQ+, Sport...", key="partner_search")
    with f2:
        cat_filter = st.multiselect("Filtrer par catégories", list(DATA.keys()), default=list(DATA.keys()))
    st.markdown('</div>', unsafe_allow_html=True)

    for cat in cat_filter:
        items = DATA[cat]
        if search:
            items = [i for i in items if search.lower() in str(i['name']).lower() or search.lower() in str(i['desc']).lower()]
        
        if items:
            st.markdown(
                f'<h3 style="margin-top: 2rem;">{cat} <span style="font-size: 0.9rem; color: var(--text-soft); font-weight: normal;">({len(items)})</span></h3>',
                unsafe_allow_html=True,
            )
            items = sorted(items, key=lambda x: str(x['name']))
            
            cols = st.columns(3)
            for idx, item in enumerate(items):
                with cols[idx % 3]:
                    safe_name = sanitize_html_text(item.get("name", "Acteur"), max_len=90)
                    safe_desc = sanitize_html_text(item.get("desc", "Acteur validé"), max_len=240)
                    safe_url = sanitize_external_url(item.get("url"))
                    st.markdown(
                        f"""
                        <div class="premium-card animate-in" style="padding: 20px; height: 180px; margin-bottom: 20px;">
                            <h4 style="margin: 0; color: var(--primary); font-size: 1rem;">{safe_name}</h4>
                            <p style="font-size: 0.8rem; color: var(--text-soft); height: 60px; overflow: hidden; margin: 10px 0;">{safe_desc}</p>
                            <a href="{safe_url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: var(--secondary); font-size: 0.8rem; font-weight: 700;">VISITER →</a>
                        </div>
                        """,
                        unsafe_allow_html=True
                    )

    st.markdown('<div class="premium-card" style="text-align: center; background: var(--primary-soft);">💡 Vous gérez une structure engagée à Paris ? Proposez-la via l\'onglet <b>Déclaration bénévole</b> !</div>', unsafe_allow_html=True)

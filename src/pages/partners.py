import streamlit as st
import pandas as pd
from src.security_utils import sanitize_external_url, sanitize_html_text

def show_partners():
    from src.database import get_submissions_by_status
    
    st.markdown('<div class="hero-container animate-in">', unsafe_allow_html=True)
    st.markdown('<h1 class="hero-title">🤝 Acteurs Engagés</h1>', unsafe_allow_html=True)
    st.markdown('<p class="hero-subtitle">Découvrez le plus grand annuaire citoyen de Paris. Plus de <b>100 structures</b> répertoriées pour leur impact positif.</p>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

    # --- DONNÉES STATIQUES ---
    DATA = {
        "🌿 Environnement & Climat": [
            {"name": "Moissons Solidaires", "desc": "Lutte contre le gaspillage en récupérant les invendus des marchés.", "url": "https://moissonssolidaires.org/"},
            {"name": "Veni Verdi", "desc": "Fermes urbaines et jardins partagés pour la biodiversité.", "url": "https://veniverdi.fr/"},
            {"name": "Les Cols Verts IDF", "desc": "Agriculture urbaine et alimentation durable.", "url": "https://www.lescolsverts.fr/"},
            {"name": "PikPik Environnement", "desc": "Sensibilisation aux éco-gestes via des ateliers ludiques.", "url": "https://www.pikpik.org"},
            {"name": "Halte à l'Obsolescence Programmée", "desc": "Lutte contre l'obsolescence et promotion de la durabilité.", "url": "https://www.halteobsolescence.org"},
            {"name": "Zero Waste Paris", "desc": "Promotion du zéro déchet et de la réduction à la source.", "url": "https://zerowasteparis.fr"},
            {"name": "Surfrider Paris", "desc": "Protection des océans et nettoyage des berges de Seine.", "url": "https://surfrider.eu"},
            {"name": "Les Connexions", "desc": "Gestion des déchets sur les grands événements culturels.", "url": "https://lesconnexions.org"},
            {"name": "FNE Paris", "desc": "Fédération d'associations pour la protection de la nature parisienne.", "url": "https://fne-paris.fr"},
            {"name": "GoodPlanet", "desc": "Sensibilisation aux enjeux écologiques et humanisme.", "url": "https://www.goodplanet.org"},
            {"name": "ORÉE", "desc": "Réseau d'acteurs pour l'économie circulaire et l'écologie industrielle.", "url": "https://www.oree.org"},
            {"name": "La REcyclerie", "desc": "Lieu d'expérimentation dédié à l'éco-responsabilité.", "url": "https://www.larecyclerie.com"},
            {"name": "Cocyclette", "desc": "Promeut la mobilité à vélo et la transition écologique.", "url": "https://cocyclette.fr/"},
            {"name": "Biocycle", "desc": "Collecte d'invendus en triporteur pour redistribution.", "url": "https://biocycle.fr/"},
            {"name": "1000 collectes", "desc": "Ressourcerie des Batignolles et réduction des déchets.", "url": "https://laressourceriedesbatignolles.org/"},
            {"name": "Aremacs IDF", "desc": "Gestion des déchets événementiels et sensibilisation.", "url": "https://aremacs.com/antennes/paris"},
            {"name": "Ressourcerie La Mine", "desc": "Réemploi, boutique solidaire et ateliers de réparation.", "url": "https://ressourcerie-la-mine.com/"},
            {"name": "Cambrousse Atelier", "desc": "Végétalisation urbaine et bricolage éco-responsable.", "url": "https://www.cambrousse.org/"},
            {"name": "Les Invasifs", "desc": "Permaculture et jardins citoyens partagés.", "url": "https://www.lesinvasifs.com/"},
            {"name": "Recyclerie Sportive", "desc": "Collecte et revente d'équipements sportifs de seconde main.", "url": "https://recyclerie-sportive.org/"},
            {"name": "Urbanescence", "desc": "Accompagne la biodiversité et la reconnexion à la nature.", "url": "https://www.urbanescence.org/"},
            {"name": "Festival Fluctuations", "desc": "Festival fluvial sur l'écologie et la protection de l'eau.", "url": "https://fluctuations.eu/"},
            {"name": "Association Sans Murs", "desc": "Nettoyages citoyens et lutte contre la pollution plastique.", "url": "https://www.associationsansmurs.fr/"},
            {"name": "Les Brigades Vertes", "desc": "Soin des lieux et actions de terrain (Clean my Map).", "url": "https://cleanwalk.fr"}
        ],
        "⚖️ Justice Sociale & Précarité": [
            {"name": "Utopia 56", "desc": "Soutien et accueil digne pour les personnes exilées.", "url": "https://www.utopia56.org"},
            {"name": "Coallia", "desc": "Hébergement et insertion sociale des publics vulnérables.", "url": "https://www.coallia.org"},
            {"name": "La Cloche", "desc": "Cuisine et services solidaires pour recréer du lien entre voisins.", "url": "https://lacloche.org"},
            {"name": "ATD Quart Monde", "desc": "Lutte contre la grande pauvreté avec ceux qui la vivent.", "url": "https://www.atd-quartmonde.fr"},
            {"name": "Droit au Logement (DAL)", "desc": "Défense du droit au logement décent pour tous.", "url": "https://www.droitaulogement.org"},
            {"name": "Emmaüs Défi", "desc": "Contrats d'insertion pour sortir de la grande exclusion.", "url": "https://emmaus-defi.org/"},
            {"name": "Les Enfants du Canal", "desc": "Accès aux droits pour les bidonvilles et personnes à la rue.", "url": "https://www.lesenfantsducanal.fr/"},
            {"name": "La Chorba", "desc": "Repas chauds quotidiens et insertion par l'activité.", "url": "https://www.lachorba.fr/"},
            {"name": "Dans Ma Rue", "desc": "Maraudes et soins pour les sans-abri à Paris.", "url": "https://dansmarue.org/"},
            {"name": "Aurore", "desc": "Hébergement, soin et insertion sociale des précaires.", "url": "https://aurore.asso.fr/"},
            {"name": "Linkee", "desc": "Aide alimentaire solidaire pour les étudiants précaires.", "url": "https://linkee.co/"},
            {"name": "MaMaMa", "desc": "Aide d'urgence aux mères en grande difficulté.", "url": "https://www.asso-mamama.fr/"},
            {"name": "Le Chaînon Manquant", "desc": "Collecte et redistribution rapide d'invendus alimentaires.", "url": "https://lechainon-manquant.fr/"},
            {"name": "Du Beurre Dans Les Épinards", "desc": "Colis alimentaires et kits d'hygiène pour étudiants.", "url": "https://www.dubeurredansleursepinards.fr/"},
            {"name": "MIAA", "desc": "Repas complets cuisinés pour les personnes isolées.", "url": "https://www.miaa.fr/"},
            {"name": "Ptit's Dej' Solidaires", "desc": "Distribution citoyenne de petits-déjeuners.", "url": "https://ptitsdejsolidaires.wordpress.com/"},
            {"name": "Action Contre la Faim", "desc": "Programmes de nutrition et d'eau en France.", "url": "https://www.actioncontrelafaim.org/"},
            {"name": "La Gamelle de Jaurès", "desc": "Soutien alimentaire et matériel aux exilés.", "url": "https://www.lagamelledejaures.org/"},
            {"name": "ADSF", "desc": "Santé et hygiène pour les femmes en grande précarité.", "url": "https://adsf-asso.org/"},
            {"name": "Règles Élémentaires", "desc": "Lutte contre la précarité menstruelle à Paris.", "url": "https://www.regleselementaires.com/"},
            {"name": "Soie Rouge", "desc": "Protections hygiéniques lavables et éducation.", "url": "https://www.soierouge.fr/"},
            {"name": "Un Petit Bagage d'Amour", "desc": "Matériel de puériculture pour bébés précaires.", "url": "https://www.unpetitbagagedamour.org/"}
        ],
        "🌍 Humanitaire & International": [
            {"name": "Première Urgence Internationale", "desc": "Aide humanitaire d'urgence à travers le monde.", "url": "https://www.premiere-urgence.org"},
            {"name": "Médecins du Monde", "desc": "Soin et défense de l'accès à la santé pour tous.", "url": "https://www.medecinsdumonde.org"},
            {"name": "CARE France", "desc": "Lutte contre la pauvreté et émancipation des femmes.", "url": "https://www.carefrance.org"},
            {"name": "Plan International France", "desc": "Défense des droits des enfants et égalité filles-garçons.", "url": "https://www.plan-international.fr"},
            {"name": "SOS Méditerranée", "desc": "Sauvetage civil de vies humaines en mer.", "url": "https://sosmediterranee.fr"},
            {"name": "Handicap International", "desc": "Aide aux handicapés en zones de conflit et pauvreté.", "url": "https://hi.org/"},
            {"name": "Banque Alimentaire Paris", "desc": "Coordination de la chaîne de solidarité alimentaire.", "url": "https://www.bapif.fr"},
            {"name": "Restos du Cœur", "desc": "Aide alimentaire et soutien aux plus démunis par le bénévolat.", "url": "https://www.restosducoeur.org"},
            {"name": "Secours Catholique", "desc": "Solidarité active contre toutes les formes de pauvreté.", "url": "https://www.secours-catholique.org"},
            {"name": "Ordre de Malte", "desc": "Secourisme, santé et action sociale pour les fragiles.", "url": "https://www.ordredemaltefrance.org/"},
            {"name": "Cart ONG", "desc": "Gestion de l'information et cartes pour l'humanitaire.", "url": "https://www.cartong.org/"}
        ],
        "🌈 Mixité & Inclusion": [
            {"name": "Le Refuge", "desc": "Hébergement et accompagnement des jeunes LGBT+ isolés.", "url": "https://www.le-refuge.org"},
            {"name": "Singa", "desc": "Rencontre et entrepreneuriat entre locaux et réfugiés.", "url": "https://www.singafrance.com"},
            {"name": "Kodiko", "desc": "Accompagement pro des réfugiés par le mentorat.", "url": "https://www.kodiko.fr"},
            {"name": "Kabubu", "desc": "Inclusion sociale par le sport et la convivialité.", "url": "https://www.kabubu.fr/"},
            {"name": "Article 1", "desc": "Égalité des chances et réussite scolaire pour tous.", "url": "https://article-1.eu"},
            {"name": "Wintegreat", "desc": "Insertion des étudiants réfugiés dans les grandes écoles.", "url": "https://wintegreat.org"},
            {"name": "Centre LGBTQI+ de Paris", "desc": "Accueil, information et ressources.", "url": "https://www.centrelgbtparis.org"},
            {"name": "Cultures du Cœur", "desc": "Accès à la culture comme outil d'insertion.", "url": "https://www.culturesducoeur.org"},
            {"name": "L'Autre Cercle", "desc": "Inclusion des LGBT+ au travail.", "url": "https://www.autrecercle.org"},
            {"name": "Entourage", "desc": "Lien social autour des personnes sans-abri.", "url": "https://www.entourage.social/"},
            {"name": "Metishima", "desc": "Insertion par l'emploi des femmes étrangères exilées.", "url": "https://www.metishima.com/"},
            {"name": "Refugee Food", "desc": "Valorisation des talents culinaires des réfugiés.", "url": "https://refugee-food.org/"},
            {"name": "Up Sport", "desc": "Sport solidaire et inclusif pour les plus isolés.", "url": "https://www.unispourlesport.paris/"},
            {"name": "Sensations Inclusives", "desc": "Activités sportives adaptées au handicap.", "url": "https://sensations-inclusives.org/"},
            {"name": "Korhom", "desc": "Éducation citoyenne et droits humains.", "url": "https://korhom.fr/"}
        ],
        "⭐ Commerçants Engagés": [
            {"name": "Le Baranoux", "desc": "Bar collaboratif et lieu de mixité sociale (Bar Solidaire).", "url": "https://www.baranoux.fr/"},
            {"name": "La Buvette du Climat", "desc": "Cuisine engagée à l'Académie du Climat.", "url": "https://www.academieduclimat.paris/yes-we-camp/"},
            {"name": "Le Pavillon des Canaux", "desc": "Tiers-lieu culturel et solidaire au bord de l'eau.", "url": "https://www.pavillondescanaux.com/"},
            {"name": "Café Joyeux", "desc": "Emploie et forme des personnes avec handicap mental.", "url": "https://www.cafejoyeux.com/"},
            {"name": "Ground Control", "desc": "Espace de vie culturel engagé et éco-responsable.", "url": "https://www.groundcontrolparis.com/"}
        ]
    }

    # Récupération dynamique
    all_approved = get_submissions_by_status('approved')
    if all_approved:
        dyn_df = pd.DataFrame(all_approved)
        for _, row in dyn_df.iterrows():
            typ = row['type_lieu']
            item = {
                "name": row['association'],
                "desc": (row.get('description') or row.get('commentaire') or "Acteur validé")[:80],
                "url": row.get('website_url') or "#"
            }
            if typ == "Association écologique": DATA["🌿 Environnement & Climat"].append(item)
            elif typ == "Association humanitaire et sociale": DATA["⚖️ Justice Sociale & Précarité"].append(item)
            elif typ == "Commerçant engagé": DATA["⭐ Commerçants Engagés"].append(item)

    # UI : Filtrage
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
            items = [i for i in items if search.lower() in i['name'].lower() or search.lower() in i['desc'].lower()]
        
        if items:
            safe_cat = sanitize_html_text(cat, max_len=80)
            st.markdown(
                f'<h3 style="margin-top: 2rem;">{safe_cat} <span style="font-size: 0.9rem; color: var(--text-soft); font-weight: normal;">({len(items)})</span></h3>',
                unsafe_allow_html=True,
            )
            items = sorted(items, key=lambda x: x['name'])
            
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


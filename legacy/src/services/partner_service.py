import pandas as pd

# --- DONNEES STATIQUES (Savoir-faire historique) ---
STATIC_PARTNERS = {
    "🌿 Environnement & Climat": [
        {"name": "La SAUGE", "desc": "Agriculture urbaine, jardins participatifs et mobilisation citoyenne.", "url": "https://www.lasauge.fr/"},
        {"name": "Moissons Solidaires", "desc": "Lutte contre le gaspillage en recuperant les invendus des marches.", "url": "https://moissonssolidaires.org/"},
        {"name": "Veni Verdi", "desc": "Fermes urbaines et jardins partages pour la biodiversite.", "url": "https://veniverdi.fr/"},
        {"name": "AREMACS Ile-de-France", "desc": "Transition ecologique des evenements et reduction des dechets.", "url": "https://www.aremacs.com/"},
        {"name": "Les Cols Verts IDF", "desc": "Agriculture urbaine et alimentation durable.", "url": "https://www.lescolsverts.fr/"},
        {"name": "PikPik Environnement", "desc": "Sensibilisation aux eco-gestes via des ateliers ludiques.", "url": "https://www.pikpik.org"},
        {"name": "Surfrider Paris", "desc": "Protection des oceans et nettoyage des berges de Seine.", "url": "https://surfrider.eu"},
        {"name": "Zero Waste Paris", "desc": "Promotion du zero dechet et de la reduction a la source.", "url": "https://zerowasteparis.fr"},
        {"name": "La REcyclerie", "desc": "Lieu d'experimentation dedie a l'eco-responsabilite.", "url": "https://www.larecyclerie.com"},
        {"name": "Biocycle", "desc": "Collecte d'invendus en triporteur pour redistribution.", "url": "https://biocycle.fr/"},
        {"name": "Recyclerie Sportive", "desc": "Collecte et revente d'equipements sportifs de seconde main.", "url": "https://recyclerie-sportive.org/"},
        {"name": "Association Sans Murs", "desc": "Nettoyages citoyens et lutte contre la pollution plastique.", "url": "https://www.associationsansmurs.fr/"},
        {"name": "Les Brigades Vertes", "desc": "Soin des lieux et actions de terrain (Clean my Map).", "url": "https://cleanwalk.fr"},
    ],
    "⚖️ Justice Sociale & Precarite": [
        {"name": "Refugee Food", "desc": "Insertion et accueil des personnes refugiees via la cuisine.", "url": "https://www.refugee-food.org/"},
        {"name": "Utopia 56", "desc": "Soutien et accueil digne pour les personnes exilees.", "url": "https://www.utopia56.org"},
        {"name": "La Cloche", "desc": "Cuisine et services solidaires pour recreer du lien entre voisins.", "url": "https://lacloche.org"},
        {"name": "ATD Quart Monde", "desc": "Lutte contre la grande pauvrete avec ceux qui la vivent.", "url": "https://www.atd-quartmonde.fr"},
        {"name": "Ordre de Malte France", "desc": "Actions de terrain: accueil, maraudes et aide aux plus fragiles.", "url": "https://www.ordredemaltefrance.org/"},
        {"name": "Action contre la Faim", "desc": "Lutte contre la precarite et l'insecurite alimentaire.", "url": "https://www.actioncontrelafaim.org/"},
        {"name": "Emmaus Defi", "desc": "Contrats d'insertion pour sortir de la grande exclusion.", "url": "https://emmaus-defi.org/"},
        {"name": "Emmaus Alternatives", "desc": "Insertion, reemploi et accompagnement social en Ile-de-France.", "url": "https://emmaus-alternatives.org/"},
        {"name": "Linkee", "desc": "Aide alimentaire solidaire pour les etudiants precaires.", "url": "https://linkee.co/"},
        {"name": "Le Chainon Manquant", "desc": "Collecte et redistribution rapide d'invendus alimentaires.", "url": "https://lechainon-manquant.fr/"},
        {"name": "Dans Ma Rue", "desc": "Maraudes et lien social avec les personnes sans-abri a Paris.", "url": "https://www.dansmarue.org/"},
        {"name": "CASP", "desc": "Hebergement, insertion et accompagnement social a Paris.", "url": "https://www.casp.asso.fr/"},
        {"name": "Aurore", "desc": "Association engagee contre l'exclusion et le mal-logement.", "url": "https://aurore.asso.fr/"},
        {"name": "Cites Caritas", "desc": "Solutions d'hebergement et d'inclusion pour publics vulnerables.", "url": "https://www.citescaritas.fr/"},
        {"name": "Les Enfants du Canal", "desc": "Accompagnement des publics en grande exclusion et sans-abrisme.", "url": "https://www.lesenfantsducanal.fr/"},
        {"name": "ADSF", "desc": "Sante et hygiene pour les femmes en grande precarite.", "url": "https://adsf-asso.org/"},
        {"name": "Regles Elementaires", "desc": "Lutte contre la precarite menstruelle a Paris.", "url": "https://www.regleselementaires.com/"},
        {"name": "Secours Catholique Paris", "desc": "Reseau de solidarite locale pour personnes en precarite.", "url": "https://paris.secours-catholique.org/"},
        {"name": "Armee du Salut", "desc": "Soutien social, hebergement et accompagnement des publics fragiles.", "url": "https://www.armeedusalut.fr/"},
    ],
    "🌈 Mixite & Inclusion": [
        {"name": "Le Refuge", "desc": "Hebergement et accompagnement des jeunes LGBT+ isoles.", "url": "https://www.le-refuge.org"},
        {"name": "Singa", "desc": "Rencontre et entrepreneuriat entre locaux et refugies.", "url": "https://www.singafrance.com"},
        {"name": "Kabubu", "desc": "Inclusion sociale par le sport et la convivialite.", "url": "https://www.kabubu.fr/"},
        {"name": "Article 1", "desc": "Egalite des chances et reussite scolaire pour tous.", "url": "https://article-1.eu"},
        {"name": "Entourage", "desc": "Lien social autour des personnes sans-abri.", "url": "https://www.entourage.social/"},
    ],
    "⭐ Commercants Engages": [
        {"name": "Le Baranoux", "desc": "Bar collaboratif et lieu de mixite sociale (Bar Solidaire).", "url": "https://www.baranoux.fr/"},
        {"name": "La Buvette du Climat", "desc": "Cuisine engagee a l'Academie du Climat.", "url": "https://www.academieduclimat.paris/yes-we-camp/"},
        {"name": "Le Pavillon des Canaux", "desc": "Tiers-lieu culturel et solidaire au bord de l'eau.", "url": "https://www.pavillondescanaux.com/"},
        {"name": "Cafe Joyeux", "desc": "Emploie et forme des personnes avec handicap mental.", "url": "https://www.cafejoyeux.com/"},
    ],
}


def get_consolidated_partners(db_submissions):
    """
    Consolide les partenaires statiques et dynamiques.
    Retourne un dictionnaire {category: [partners]}.
    """
    # Clone pour eviter de modifier la constante
    data = {k: list(v) for k, v in STATIC_PARTNERS.items()}

    has_submissions = False
    if isinstance(db_submissions, pd.DataFrame):
        has_submissions = not db_submissions.empty
    elif db_submissions is not None:
        try:
            has_submissions = len(db_submissions) > 0
        except TypeError:
            has_submissions = False

    if has_submissions:
        dyn_df = (
            db_submissions.copy()
            if isinstance(db_submissions, pd.DataFrame)
            else pd.DataFrame(db_submissions)
        )
        for _, row in dyn_df.iterrows():
            typ = str(row.get("type_lieu") or "").strip().lower()
            item = {
                "name": row.get("association") or row.get("nom"),
                "desc": (
                    row.get("description")
                    or row.get("commentaire")
                    or "Acteur valide"
                )[:80],
                "url": row.get("website_url") or "#",
            }
            if not item["name"]:
                continue

            # Mapping categories dynamiques
            if typ in {"association ecologique", "association écologique"}:
                data["🌿 Environnement & Climat"].append(item)
            elif typ in {
                "association humanitaire et sociale",
                "association humanitaire & sociale",
            }:
                data["⚖️ Justice Sociale & Precarite"].append(item)
            elif typ in {"commercant engage", "commerçant engagé"}:
                data["⭐ Commercants Engages"].append(item)

    return data

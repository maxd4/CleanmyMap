import os
import sys
from datetime import datetime
import pandas as pd

# Ajout du path pour importer database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.database import get_submissions_by_status, get_all_subscribers, get_top_contributors

def generate_quarterly_report():
    """Génère le contenu de la newsletter trimestrielle."""
    approved_actions = get_submissions_by_status('approved')
    if not approved_actions:
        return None
    
    df = pd.DataFrame(approved_actions)
    
    # Calcul des stats d'impact
    total_megots = df['megots'].sum()
    total_kg = df['dechets_kg'].sum()
    
    # Equivalence piscines (1 piscine olympique ~ 2.5 millions de litres)
    # 1 mégot sauve 500L d'eau
    litres_sauves = total_megots * 500
    piscines = litres_sauves / 2500000
    
    # Villes concernées
    villes = []
    for addr in df['adresse'].dropna():
        # Extraction simplifiée : on prend ce qui ressemble à un nom de ville (après code postal)
        import re
        match = re.search(r'\d{5}\s+([A-Z-a-zÀ-ÿ\s]+)', str(addr))
        if match:
            villes.append(match.group(1).strip())
    
    villes_uniques = sorted(list(set(villes)))
    top_3 = get_top_contributors(3)
    
    # Template du message
    report = f"""
    la gazette des brigades - impact et protection
    --------------------------------------------
    
    quel trimestre inspirant ! grâce à votre mobilisation :
    
    impact eau : nous avons préservé l'équivalent de {piscines:.2f} piscines olympiques d'eau 
    en ramassant {total_megots:,} mégots.
    
    déchets : {total_kg:.1f} kg de matières ont été retirées de la nature.
    
    territoires : des actions ont été portées avec succès dans les villes de :
    {', '.join(villes_uniques[:10])}{" ainsi que d'autres communes." if len(villes_uniques) > 10 else "."}
    
    classement des brigadiers (top 3) :
    """
    for i, user in enumerate(top_3):
        report += f"    {i+1}. {user['nom']} : {user['total_kg']:.1f} kg collectés ({user['nb_actions']} actions)\n"
        
    report += """
    --------------------------------------------
    félicitations à toutes et tous pour votre engagement.
    continuons à veiller ensemble sur notre environnement.
    
    l'équipe Clean my Map
    """
    return report

def send_newsletter():
    report = generate_quarterly_report()
    if not report:
        print("Aucune donnée à envoyer.")
        return
    
    subscribers = get_all_subscribers()
    if not subscribers:
        print("Aucun abonné trouvé.")
        return
        
    print(f"Préparation de l'envoi à {len(subscribers)} abonnés...")
    print(report)
    
    # Ici, intégration SendGrid ou SMTP
    # SG_KEY = os.getenv("SENDGRID_API_KEY")
    # if SG_KEY:
    #     ... logique d'envoi ...
    # else:
    #     print("Variable SENDGRID_API_KEY manquante. Envoi simulé.")

if __name__ == "__main__":
    send_newsletter()

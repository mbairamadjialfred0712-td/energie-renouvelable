# Guide de défense orale — M. Joël

Date : 13/11/2026. À lire avec `NOTE_EXECUTIVE_DIRECTION_ENERGIE_RENOUVELABLE.md` et `ETAT_MATURITE_LOGICIEL_ENERGIE_RENOUVELABLE.md`.

## 1. Présentation de 2 minutes
« Nos études énergétiques mobilisent beaucoup de données — ensoleillement, vent, biomasse, besoins des populations, coûts — souvent dispersées dans des fichiers différents. Il est alors difficile de retrouver d'où vient un chiffre et de refaire un calcul.
J'ai conçu ENERGIE RENOUVELABLE pour structurer ce travail. La plateforme rassemble les données d'un territoire, garde la source de chacune, et fait les calculs avec des moteurs séparés et documentés : le photovoltaïque avec le modèle officiel PVWatts du laboratoire américain NREL, l'éolien, la batterie, la biomasse. Elle permet ensuite de comparer des scénarios et d'en faire l'analyse financière : VAN, TRI, délai de retour, coût actualisé de l'énergie.
Le logiciel ne décide pas à notre place : il rend les hypothèses visibles et les résultats vérifiables. Il fonctionne aujourd'hui en démonstration sur des données de test. La prochaine étape est un pilote sur un site réel, pour valider scientifiquement chaque moteur. »

## 2. Présentation institutionnelle de 5 minutes
1. **Contexte (45 s)** — études territoriales, multiplicité des technologies, exigence de justification auprès des décideurs et partenaires.
2. **Problème (45 s)** — données dispersées, hypothèses implicites, calculs non reproductibles, comparaisons difficiles.
3. **Solution (1 min)** — chaîne complète : données → ressources → demande → simulation → scénarios → optimisation → finance → rapport. Application web sécurisée + moteur de calcul Python hébergé séparément.
4. **Fonctionnalités (1 min)** — territoires et démographie sourcée, ressources, météo horaire, demande, moteurs PV/éolien/batterie/biomasse/CSP, comparaison, optimisation du stockage, finance, import de documents avec validation humaine.
5. **Preuves (45 s)** — 466 tests automatisés réussis, moteur en ligne et sécurisé, calculs réels exécutés sur le service hébergé (sur données de test), règles d'accès sur toutes les tables.
6. **Perspectives (45 s)** — pilote réel, validation scientifique, simulation hybride chronologique, rapports exportables.

## 3. Dix questions difficiles
1. **Pourquoi ce logiciel ?** — Pour rendre nos études traçables, homogènes et réutilisables, et pour capitaliser les données du territoire.
2. **Quel problème concret ?** — Retrouver d'où vient un chiffre, refaire un calcul identique, comparer plusieurs solutions sur la même base.
3. **Pourquoi pas Excel ?** — Excel reste utile, mais ne garantit ni la traçabilité des sources, ni le contrôle des unités, ni les droits d'accès, ni l'historique. Ici chaque calcul conserve ses entrées et sa version de modèle.
4. **Différence avec un logiciel de dimensionnement classique ?** — Il ne cherche pas à remplacer les outils spécialisés : il intègre des modèles reconnus (PVWatts v8) dans une chaîne territoriale complète, avec données, scénarios et finance au même endroit.
5. **Les calculs sont-ils fiables ?** — Les modèles sont déterministes et testés automatiquement. Leur **validation scientifique sur un cas réel reste à faire** ; c'est l'objet du pilote.
6. **Quelles sources de données ?** — Saisies et imports de l'ingénieur, ANStat et Banque mondiale pour les populations nationales, GeoNames pour les localités (estimations), séries météo importées. Chaque donnée affiche sa source et sa nature.
7. **Plusieurs technologies ?** — Oui : PV, éolien, batterie, biomasse (énergie primaire), CSP (bilan simplifié).
8. **Solutions hybrides ?** — On peut préparer et comparer côte à côte des simulations individuelles, et calculer PV + batterie heure par heure. La simulation chronologique complète multi-sources **n'est pas encore disponible**.
9. **Sécurité ?** — Comptes et rôles, règles d'accès en base sur chaque table, fichiers privés, clés gardées côté serveur, historiques. Le test d'isolation entre deux comptes autorisés reste à réaliser.
10. **Quelles validations avant exploitation ?** — Validation scientifique des moteurs, cas réel de référence, test d'isolation multi-comptes, recette de la version publiée, politique de mise à jour démographique.

## 4. Arguments de défense
- **Technique** : architecture séparée (application / base / moteur de calcul), modèles versionnés, plus de 460 tests automatisés.
- **Opérationnel** : centralisation des données, parcours guidés, réutilisation d'un projet à l'autre.
- **Scientifique** : aucun chiffre inventé ; distinction mesuré / estimé / synthétique ; modèle PV officiel NREL ; énergie primaire biomasse jamais présentée comme électricité.
- **Stratégique** : capitalisation d'un savoir-faire interne, dossiers plus défendables, base pour des partenariats.
- **Limite assumée** : le logiciel ne remplace ni l'expertise, ni les études de terrain, ni les outils spécialisés.

## 5. Démonstration recommandée (12–15 min)
| # | Montrer | Expliquer | Faire observer | Réserve à annoncer |
|---|---|---|---|---|
| 1 | Tableau de bord | Vue d'ensemble | Compteurs réels | Données QA |
| 2 | Territoires › Pays › Côte d'Ivoire | Source et méthode | 33 293 101 hab. — projection ANStat 2026 | Projection ≠ recensement |
| 3 | Suivi démographique | Comparaison Banque mondiale | Alerte des pays sans donnée | Import direct à arbitrer |
| 4 | Météo du site QA | Série horaire 8 760 h | Nature « synthétique » affichée | Non mesurée |
| 5 | Demande QA | Profil horaire | Statut validé | Demande fictive |
| 6 | Simulation PV terminée | PVWatts v8, paramètres | 15 468 kWh pour 10 kWc | Paramètres = hypothèses |
| 7 | Simulation batterie | Bilan horaire, SOC | Couverture 81,1 %, ENS 3 026 kWh | Données QA |
| 8 | Scénarios / tableau multi-scénarios | Comparaison sans agrégation | Valeurs indisponibles explicites | Pas d'hybride chronologique |
| 9 | Finance | Hypothèses visibles, VAN/TRI/LCOE | Formule affichée | Estimation ≠ devis |
| 10 | Importation | Dépôt, correction, validation | Historique | Pas d'OCR |

Prévoir 1 minute de réveil possible du moteur de calcul avant la séance.

## 6. Recommandations avant la défense officielle
- Relire et signer la grille de validation scientifique (document à créer : `GRILLE_VALIDATION_SCIENTIFIQUE.md` absent).
- Disposer d'au moins un jeu de données réel (météo mesurée, demande mesurée).
- Faire créer un second compte autorisé pour le test d'isolation.
- Recetter la version publiée.
- Trancher la politique d'import démographique (décision D1).

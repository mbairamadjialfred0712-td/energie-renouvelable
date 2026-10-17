# Dossier préalable de validation CSP — Joël

Date : 17 octobre 2026. Statut : **CONCEPTION — À VALIDER PAR L’INGÉNIEUR**.
Ce document propose un périmètre ; aucune équation CSP n’est encore implémentée, aucun résultat ni tolérance scientifique n’est validé.

## 1. Diagnostic de l’existant

- Réutilisable : API v1/schéma 1.0, registre de moteurs, validation/exécution authentifiées, client HTTP privé, contrôles admin/ingénieur, stockage des requêtes et résultats dans les tables existantes, RLS de lecture et écritures serveur protégées.
- Routes déjà disponibles : `/api/v1/health`, `/api/v1/capabilities`, `/api/v1/simulations/validate`, `/api/v1/simulations`. Aucun endpoint CSP supplémentaire nécessaire pour la répartition par moteur.
- CSP : capacité prévue `not_implemented`, aucun moteur physique enregistré, aucun formulaire CSP. PV et batterie conservés sans changement.
- Données : ressources solaires agrégées DNI/GHI/DHI avec période, unité et provenance ; fiches météo horaires UTC avec DNI, température et vent. NASA POWER fournit ici les rayonnements en Wh/m² par intervalle horaire, pas une puissance instantanée W/m². Altitude et paramètres thermo/optiques documentés ne sont pas garantis.
- Persistance : assurée par Lovable, pas par Python (`NoRepository`). Les GET Python de récupération ne constituent donc pas une récupération opérationnelle de simulations sauvegardées.
- Disponibilité : lors de l’audit précédent immédiatement avant cette conception, URL/clé moteur non configurées ; aucun déploiement Render ni parcours hébergé réussi attesté. Pas de nouvelle preuve de disponibilité dans cette conception.

## 2. Choix scientifique indispensable

### Option A — Bilan thermique prescrit, cylindro-parabolique uniquement

Modèle de bilan pédagogique/pré-étude, **non prédictif** : il utilise des performances et pertes documentées fournies par l’ingénieur. Pas de coefficients par défaut, ni comportement transféré à une tour, Fresnel ou dish.

Équations proposées, non implémentées :

1. Puissance directe de référence sur l’ouverture normale : `P_direct = DNI × A` (W).
2. Puissance captée : `Q_captée = P_direct × eta_opt_effectif`. Le rendement effectif doit expliciter le traitement des angles, cosinus, ombrage, poursuite et pertes optiques ; une efficacité à incidence normale seule n’est pas suffisante pour une série temporelle.
3. Bilan thermique signé : `Q_bilan = Q_captée − Q_pertes`. Les pertes sont fournies en W, par pas, avec source et conditions de température/fluide ; aucune corrélation de pertes inventée. Avant codage, définir le traitement des périodes où pertes > capture (arrêt, refroidissement, alimentation externe) : pas d’écrêtage silencieux à zéro.
4. Conversion brute facultative : `P_brute = Q_cycle_entrée × eta_cycle`, uniquement si la frontière de chaleur livrée au cycle et un rendement applicable à ces conditions sont documentés.
5. Net : `P_nette = P_brute − P_aux`, seulement lorsque les consommations nécessaires et la convention d’import/export sont renseignées. Sans auxiliaires connus, net indisponible, pas égal au brut.
6. Énergie de période : somme de puissances moyennes × durées ; des observations instantanées ne sont pas assimilées silencieusement à des moyennes.

Entrées à faire approuver : surface d’ouverture (m²), rendement optique effectif (fraction), pertes thermiques (W), frontières énergétiques, fluide, conditions de fonctionnement, caractère moyen/instantané du DNI, période et stratégie arrêt/refroidissement. Rendement de cycle et auxiliaires restent facultatifs mais leur absence interdit les résultats correspondants. Stockage thermique non pris en charge dans ce premier bilan : une configuration de stockage est refusée, pas ignorée.

### Option B — Modèle cylindro-parabolique physique SAM/PySAM

Utiliser `TroughPhysical`, distinct de PVWatts, avec paramètres collecteurs/récepteurs, géométrie, fluide, températures, cycle, contrôle et météo conformes au manuel. Le moteur SAM calcule les phénomènes dans son périmètre ; aucun remplacement par un rendement unique. Inventorier les groupes obligatoires et valeurs effectivement utilisées de la version PySAM installée avant de fixer le contrat. Aucun défaut SAM assimilé à une donnée fabricant.

Cette option est plus complète mais exige un dossier technique non fourni ici. Pas de modèle tour/Fresnel/dish annoncé opérationnel. Tour et Fresnel ont des modules distincts, à traiter dans une étape séparée.

## 3. Contrat temporel à approuver

- Sélection obligatoire d’un site/projet accessible et d’un jeu DNI enregistré avec source, nature, qualité, statut et références figés dans la requête.
- Proposition pour le bilan limité : pas horaire UTC, moyenne de période, bornes `[début, fin exclusive)`, intervalles complets et contigus, aucune heure manquante ni doublon. Années bissextiles conservées (8 784 heures si année entière), pas d’heure d’été en UTC. Pas d’exigence systématique de 8 760 heures pour une période courte.
- Si la donnée est une énergie Wh/m² sur un intervalle documenté, conversion vers moyenne W/m² = énergie / durée en heures, uniquement par transformation explicitement acceptée et journalisée ; pas de substitution GHI → DNI. Valeurs natives conservées.
- Pas de total annuel annoncé pour une période partielle. Les limites de longueur et le format partagé de l’API ne constituent pas une validation de couverture CSP.

## 4. Références documentaires

- Wagner & Gilman, *Technical Manual for the SAM Physical Trough Model*, NREL/TP-5500-51825 (2011) : https://doi.org/10.2172/1016437
- Documentation PySAM TroughPhysical : https://nrel-pysam.readthedocs.io/en/latest/modules/TroughPhysical.html
- Aide SAM champ cylindro-parabolique (frontières pertes optiques/thermiques) : https://natlabrockies.github.io/SAM/doc/csp-physical-trough-model/troughphysical_solar_field.html
- Tour à sels fondus : https://nrel-pysam.readthedocs.io/en/latest/modules/TcsmoltenSalt.html
- Fresnel : https://nrel-pysam.readthedocs.io/en/latest/modules/TcslinearFresnel.html
- Fresnel chaleur industrielle à vapeur directe : https://nrel-pysam.readthedocs.io/en/latest/modules/LinearFresnelDsgIph.html

Ces références ne valident pas des coefficients absents ni un bilan réduit comme reproduction du modèle SAM.

## 5. Plan après décision de l’ingénieur

1. Fixer modèle, frontières et paramètres documentés ; ajouter contrat CSP strict et versionné sans modifier les règles PV/batterie.
2. Ajouter moteur CSP séparé, validations des séries/unités/données manquantes et sorties indisponibles motivées ; conserver API et registre.
3. Ajouter un onglet CSP dans Simulations, sélection site/jeu DNI et paramètres sans défauts scientifiques ; contrôle serveur des accès et snapshots de provenance.
4. Sauvegarder par le mécanisme serveur existant, contrôler complétude/identité et afficher uniquement les résultats réellement produits, leurs sources et limites.
5. Tester entrées invalides, bilans documentés, authentification, indisponibilité, persistance et non-régression. Exécuter ensuite un parcours connecté complet lorsque le service est disponible.

## 6. Décision et preuves

- Choix du modèle : **EN ATTENTE**.
- Hypothèses/équations/coefficients : **À VALIDER PAR L’INGÉNIEUR**.
- Cas de référence et tolérances : **NON FOURNIS**, à définir avec Joël ; aucun seuil scientifique arbitraire.
- Tests CSP : **NON EXÉCUTÉS**, moteur non implémenté.
- Intégration hébergée et persistance de résultats CSP : **NON TESTÉES**.
- Décision de validation scientifique, date, auteur et version : **NON ACQUISES**.
- Aucune finance CSP, autonomie, dimensionnement automatique, optimisation hybride ou modification des autres moteurs dans cette intervention.
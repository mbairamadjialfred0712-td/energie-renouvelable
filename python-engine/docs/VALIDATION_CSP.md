# Dossier préalable de validation CSP — Joël

Date : 17 octobre 2026. Modèle `prescribed-trough-balance/1.0.0`. Statut : **IMPLÉMENTATION TECHNIQUE — À VALIDER PAR L’INGÉNIEUR**.
Joël a retenu le bilan thermique limité. Ce choix n’est pas une validation scientifique des équations, coefficients ou références numériques. Le périmètre retenu est implémenté ; aucune validation de centrale réelle n’est acquise.

## 1. Diagnostic de l’existant

- Réutilisable : API v1/schéma 1.0, registre de moteurs, validation/exécution authentifiées, client HTTP privé, contrôles admin/ingénieur, stockage des requêtes et résultats dans les tables existantes, RLS de lecture et écritures serveur protégées.
- Routes déjà disponibles : `/api/v1/health`, `/api/v1/capabilities`, `/api/v1/simulations/validate`, `/api/v1/simulations`. Aucun endpoint CSP supplémentaire nécessaire pour la répartition par moteur.
- Au début de l’audit : CSP `not_implemented`, aucun moteur ni formulaire CSP. Après choix de Joël : bilan séparé enregistré, formulaire ajouté ; disponibilité de code uniquement. PV et batterie conservés (leurs tests de registre sont adaptés à la nouvelle capacité).
- Données : ressources solaires agrégées DNI/GHI/DHI avec période, unité et provenance ; fiches météo horaires UTC avec DNI, température et vent. NASA POWER fournit ici les rayonnements en Wh/m² par intervalle horaire, pas une puissance instantanée W/m². Altitude et paramètres thermo/optiques documentés ne sont pas garantis.
- Persistance : assurée par Lovable, pas par Python (`NoRepository`). Les GET Python de récupération ne constituent donc pas une récupération opérationnelle de simulations sauvegardées.
- Disponibilité : lors de l’audit précédent immédiatement avant cette conception, URL/clé moteur non configurées ; aucun déploiement Render ni parcours hébergé réussi attesté. Pas de nouvelle preuve de disponibilité dans cette conception.

## 2. Choix scientifique indispensable

### Option A — Bilan thermique prescrit, cylindro-parabolique uniquement

Modèle de bilan pédagogique/pré-étude, **non prédictif** : il utilise des performances et pertes documentées fournies par l’ingénieur. Pas de coefficients par défaut, ni comportement transféré à une tour, Fresnel ou dish.

Équations du bilan effectivement implémentées :

1. Puissance directe de référence sur l’ouverture normale : `P_direct = DNI × A` (W).
2. Puissance captée : `Q_captée = P_direct × eta_opt_effectif`. Le rendement effectif doit expliciter le traitement des angles, cosinus, ombrage, poursuite et pertes optiques ; une efficacité à incidence normale seule n’est pas suffisante pour une série temporelle.
3. Bilan thermique signé : `Q_bilan = Q_captée − Q_pertes`. Pertes moyennes prescrites constantes en W, explicitement documentées et appliquées à chaque heure, sans prédiction HTF/température. Si un pas est négatif, la série signée est conservée mais chaleur utile et conversion électrique deviennent indisponibles sur la période : aucun arrêt, refroidissement ou chauffage externe n’est inventé, aucun écrêtage à zéro.
4. Conversion brute facultative : `P_brute = Q_utile × eta_cycle`, sous hypothèse explicite que cette chaleur est livrée au cycle et que le rendement constant fourni est applicable ; indisponible si chaleur utile non déterminable ou rendement absent.
5. Net : `P_nette = P_brute − P_aux`, seulement lorsque les consommations nécessaires et la convention d’import/export sont renseignées. Sans auxiliaires connus, net indisponible, pas égal au brut.
6. Énergie de période : somme de puissances moyennes × durées ; des observations instantanées ne sont pas assimilées silencieusement à des moyennes.

Entrées à faire approuver : surface d’ouverture (m²), rendement optique effectif (fraction), pertes thermiques (W), frontières énergétiques, fluide, conditions de fonctionnement, caractère moyen/instantané du DNI, période et stratégie arrêt/refroidissement. Rendement de cycle et auxiliaires restent facultatifs mais leur absence interdit les résultats correspondants. Stockage thermique non pris en charge dans ce premier bilan : une configuration de stockage est refusée, pas ignorée.

### Option B — Modèle cylindro-parabolique physique SAM/PySAM

Utiliser `TroughPhysical`, distinct de PVWatts, avec paramètres collecteurs/récepteurs, géométrie, fluide, températures, cycle, contrôle et météo conformes au manuel. Le moteur SAM calcule les phénomènes dans son périmètre ; aucun remplacement par un rendement unique. Inventorier les groupes obligatoires et valeurs effectivement utilisées de la version PySAM installée avant de fixer le contrat. Aucun défaut SAM assimilé à une donnée fabricant.

Cette option est plus complète mais exige un dossier technique non fourni ici. Pas de modèle tour/Fresnel/dish annoncé opérationnel. Tour et Fresnel ont des modules distincts, à traiter dans une étape séparée.

## 3. Contrat temporel à approuver

- Sélection obligatoire d’un site/projet accessible et d’un jeu DNI enregistré avec source, nature, qualité, statut et références figés dans la requête.
- Convention implémentée : pas horaire UTC, moyenne de période, bornes `[début, fin exclusive)`, intervalles complets et contigus, aucune heure manquante ni doublon. Années bissextiles conservées (8 784 heures si année entière), pas d’heure d’été en UTC. Pas d’exigence systématique de 8 760 heures pour une période courte. Seuls jours/mois complets sont agrégés ; couverture annuelle déclarée uniquement pour une année civile complète.
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

- Choix du modèle : **TERMINÉ** — bilan thermique limité sélectionné par Joël le 17 octobre 2026.
- Hypothèses/équations/coefficients : **À VALIDER PAR L’INGÉNIEUR**.
- Cas de référence et tolérances : **NON FOURNIS**, à définir avec Joël ; aucun seuil scientifique arbitraire.
- Tests CSP : cas arithmétiques construits, explicitement réservés aux tests. Exemple : DNI 800/600 W/m² sur deux heures, ouverture 100 m², capture 0,5 et pertes 1 000 W donnent 140 kWh de référence, 70 captés, 2 perdus, 68 de bilan. Ce n’est pas un jeu météo réel ni une calibration de centrale. Tolérances de comparaison flottante uniquement informatiques, pas critères scientifiques.
- Intégration hébergée et persistance de résultats CSP : **NON TESTÉES**.
- Décision de validation scientifique, date, auteur et version : **NON ACQUISES**.
- Aucune finance CSP, autonomie, dimensionnement automatique, optimisation hybride ou modification des autres moteurs dans cette intervention.

## 7. Intégration réellement réalisée et limites

- API v1 réutilisée, aucun nouvel endpoint/table/migration ; `engine=csp`, version 1.0.0. GET Python par ID reste sans dépôt ; lecture des résultats via Lovable.
- Validation CSP avant coercition des booléens/textes horaires ; paramètres inconnus et stockage refusés, unités et plages explicites. Contrat TypeScript strict avant passage au contrat partagé.
- Onglet CSP dans Simulations : projet, site via jeu météo validé, paramètres sans défaut scientifique, nature et référence par paramètre, conditions et fluide documentés. Tour/Fresnel/dish non calculés.
- Le serveur vérifie rôle admin/ingénieur et accès aux données, relit le jeu météo enregistré (le navigateur ne fournit pas une série faisant foi), vérifie site/localité/projet, puis fige provenance et conversion acceptée. Aucune réécriture du jeu natif.
- Requête/instantané figés dans `simulations.parameters`, sorties selon `simulation_results` et écritures serveur déjà protégées. Courbes de puissances réellement retournées seulement ; valeurs non calculables `null` avec motif visible. Historique conservé.
- Aucun jeu météo validé disponible dans le compte testé : aucun jeu fictif créé pour déverrouiller l’interface. Aucun résultat CSP de projet persisté ; intégration hébergée bloquée par service non configuré et données/paramètres réels à fournir.
- Température et fluide sont des conditions documentées, pas des entrées d’un solveur thermodynamique ; aucune compatibilité fabricant calculée. Efficacité et pertes constantes doivent être justifiées pour toute la période. Nuit/refroidissement et comportement à charge partielle restent non simulés.
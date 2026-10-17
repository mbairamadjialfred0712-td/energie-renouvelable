# VALIDATION BIOMASSE — PROMPT 12

## 1. Statut au 17 octobre 2026

**V1 primaire implémentée après approbation du plan par Joël.** Moteur `biomass`, version `1.0.0`, enregistré ; disponibilité du code seulement. Références physiques **À VALIDER PAR L’INGÉNIEUR**. Aucun moteur PV/CSP/éolien modifié, aucune donnée ajoutée/supprimée. Le test PV des capacités a été adapté au nouveau registre, sans toucher au modèle PV.

## 2. Données réellement disponibles

- `biomass_resources` référence `energy_resources` (localité) et un site optionnel. Projet relié par localité et instantanés d'estimation, pas directement à la fiche.
- `annual_quantity_t` stocke la quantité saisie, dont l'unité réelle est `quantity_unit` : t/an, t (matière sèche)/an, m³/an ou t/mois. Le nom de colonne ne définit pas sa base physique.
- PCI en MJ/kg ; `lhv_basis` reçu/sec et `lhv_method` optionnelle. Aucun champ PCS.
- Humidité facultative 0–100 % : **aucun champ de convention base humide/base sèche**. Aucune correction d'humidité actuelle.
- Niveaux JSON distincts dans l'unité principale : théorique, technique, durable, collectable, livrable, déjà utilisé. Pas de formule de liaison ni de source individuelle structurée.
- Fraction exploitable séparée : dénominateur et recouvrement avec les niveaux non structurés.
- Potentiel MWh saisi : donnée externe sourcée, pas un résultat calculé du nouveau moteur.
- Validation de fiche : source, quantité, dates, base si PCI renseigné ; ne garantit pas tous les prérequis de calcul.
- **Lecture réelle en base : 0 fiche biomasse, 0 validée.** Les références de stock forestier sont séparées, pas des combustibles annuels.

Sources de l'audit : modèle/formulaire biomasse, `biomass.functions.ts`, migrations, définition actuelle du RPC, `annual-energy-engine.ts`, registre Python et intégration commune des simulations. Aucune référence scientifique externe ou constructeur inventée.

## 3. Équation actuellement implémentée

Le RPC `estimate_project_energy` et le contrat annuel utilisent :

`E_elec(kWh/an) = M(t/an) × 1000 × PCI_reçu(MJ/kg) / 3,6 × f/100 × η_net × η_électrique`.

**Estimation électrique existante, pas énergie primaire.** Connexion, rôle admin/engineer, projet accessible, fiche validée, t/an reçues, PCI reçu, fraction positive, paramètres versionnés et justification exigés. Formule et données conservées dans `project_energy_production`.

Période exigée : `fin = début + 1 an − 1 jour`, pas nécessairement année civile. Technologie et frontières des deux rendements non structurées ; niveaux ignorés ; humidité non corrigée. Clause de partage des fiches biomasse dans le RPC distincte de la confidentialité des pages. Ne pas utiliser cette voie comme remplacement silencieux du moteur primaire. Comportement actuel conservé pendant cet audit.

## 4. V1 approuvée et implémentée

`E_primaire(MWh/an) = M(t/an) × PCI_reçu(MJ/kg) / 3,6`.

1 t = 1000 kg ; 1 GJ = 1000 MJ ; 1 MWh = 3,6 GJ = 3600 MJ = 1000 kWh. Le produit t × MJ/kg correspond numériquement à GJ.

Entrées requises : une seule fiche validée liée à un site et un projet de même localité, source, qualité/nature, douze mois complets datés, masse annuelle positive sur matière reçue explicitement confirmée, PCI reçu positif avec méthode/source documentées. Les natures estimées ou supposées sont conservées sans les présenter comme mesures. Le serveur reconstruit les valeurs depuis la fiche sous les droits utilisateur et ignore les valeurs du catalogue envoyées par le navigateur.

Humidité : valeur et convention documentées, confirmées dans les déclarations d'entrée du calcul ; convention jamais déduite du pourcentage. Choix base humide (eau/masse totale) ou sèche (eau/masse sèche), plage catalogue 0–100 % conservée. Aucune conversion sèche/reçue automatique. Matière sèche, volume et quantité mensuelle refusés ; toute extension requiert un modèle validé séparément.

Calcul limité à l'énergie de la **quantité recensée**, jamais à une mobilisation supposée. Afficher séparément les niveaux enregistrés. Ne multiplier aucune fraction, ne soustraire aucun usage concurrent et ne calculer aucun total mobilisable sans méthode approuvée.

Chaleur utile et électricité brute/nette : indisponibles avec motifs, aucun rendement ni procédé supposé. Aucune conversion détaillée prise en charge.

## 5. Double comptage

`safeTotal` refuse unités/bases/périodes différentes et types répétés ; ce n'est pas une preuve de disjonction physique. Deux catégories peuvent couvrir les mêmes matières. V1 : un bilan par fiche, aucun cumul entre fiches ni entre versions de simulations. Référence unique et période concordante imposées. Pas de lot physique identifié dans le catalogue ; agrégation future conditionnée à une preuve de disjonction. Le RPC annuel peut enregistrer plusieurs estimations d'une même fiche : ne pas additionner ces exécutions.

## 6. API, interface et sauvegarde

Réutiliser health/capabilities, `POST /api/v1/simulations/validate` et `POST /api/v1/simulations`, sans endpoint biomasse. Authentification clé service + identité utilisateur vérifiée, rôles et lectures utilisateur côté application, contrôle des réponses et finalisation existants.

Le Python utilise `NoRepository` : `GET /api/v1/simulations/{id}/results` n'est pas une sauvegarde persistante. La consultation doit rester dans l'application et ses tables simulations/results.

Sélection et revalidation de fiche côté serveur, entrées et déclarations figées ; aucune substitution des données du catalogue par le navigateur. Résultat primaire nommé distinctement de l'électricité, sans liaison automatique LCOE. Service absent : lancement désactivé, aucun résultat de secours.

URL/clé absentes de l'environnement inspecté. Service hébergé et parcours calcul → sauvegarde → consultation **NON TESTÉS / BLOQUÉS** ; pas de conclusion sur un autre déploiement éventuel.

## 7. Tests et cas à valider

Avant modification : **172 Python et 222 TypeScript réussis**, dont 21 modèle biomasse. Après intégration : **201 Python (29 nouveaux) et 248 TypeScript (26 nouveaux), 19 fichiers TypeScript**, tous réussis. Un avertissement de dépréciation Starlette/httpx. Tests de sources avec doublures : reconstruction des valeurs, refus de lecture, sites/projets incompatibles, déclaration absente. Tests de rôles existants réexécutés, pas de nouveaux comptes de rôle modifiés en base.

Cas arithmétiques testés, jamais des données terrain ni des insertions : 3,6 t/an × 10 MJ/kg / 3,6 = 10 MWh/an ; 1 t/an × 3,6 MJ/kg / 3,6 = 1 MWh/an = 1000 kWh/an. Une fraction de 50 % ne modifie pas le bilan recensé. Tolérance d'intégrité relative 1e-9 avec plancher 1 sur le PCI reconstruit par le bilan, distincte des incertitudes physiques à valider ; valeurs non finies ou sous-flux nul refusés.

Tests exécutés : unités/périodes/bases incompatibles, humidité/convention manquante/hors plage, quantité négative, fraction hors plage, PCI non positif, source absente, fiche non validée, conversions indisponibles, cumul refusé, réponse étrangère/incohérente au point de contrôle avant persistance, typage strict sans coercition, dépassement numérique. Service local réellement lancé avec identité Cloud authentifiée : health → validation → calcul primaire réussis ; appel anonyme refusé sans sortie. Cas arithmétique uniquement, jamais sauvegardé. Navigateur connecté : onglet, erreurs et lancement désactivé sans service/données confirmés, aucun résultat fictif ; ordinateur et petit écran sans débordement, aucune erreur navigateur. Build OK.

Encore NON TESTÉS : parcours hébergé avec vraie fiche, sauvegarde/consultation biomasse réussie et pannes réelles de finalisation ; contrôles de plusieurs rôles en base pour ce nouveau parcours. Impossible sans service configuré et données réelles validées. Les contrôles communs restent réutilisés, sans nouvelle permission ni migration.

## 8. Validation restante

Périmètre V1 approuvé : primaire recensée, tonnes annuelles reçues/PCI reçu sans fraction, convention documentée sans correction, douze mois et une fiche. Restent à Joël : vérification de la compatibilité réelle masse/PCI/humidité, qualité de l'échantillonnage et cas physiques/tolérances. Mobilisation et conversion demandent méthodes, procédés et sources validés séparément. L'approbation du périmètre ne constitue pas une validation scientifique de procédé.

## 9. Rapport final en dix points

1. **TERMINÉ — Réutilisation :** catalogue, sites/localités/projets, validation, API/transport/authentification, simulations/results et consultation existants ; aucune nouvelle table/migration/route API.
2. **TERMINÉ — Fichiers :** créés moteur Python biomasse/tests, `biomass-contract.ts`/tests, `biomass-input.ts`, `biomass-source.server.ts`/tests et formulaire ; modifiés registre, schéma commun (garde biomasse uniquement), tests de capacités, fonctions biomasse/engine, contrôle de réponse, pages simulation nouvelle/résultats/fiche, documentation/règles/feuille de route.
3. **TERMINÉ / PARTIEL — Niveaux :** énergie primaire recensée calculée ; niveaux de disponibilité enregistrés affichés ; mobilisation, chaleur utile et électricité indisponibles avec motifs.
4. **TERMINÉ — Équation/unités :** t/an × MJ/kg / 3,6 → MWh/an ; masse/PCI reçus exclusivement ; humidité documentée sans correction ni fraction appliquée.
5. **TERMINÉ / BLOQUÉ — Prérequis :** site/projet/localité cohérents, fiche validée, source/qualité/méthode PCI/période/bases requis ; aucune vraie fiche actuellement en base.
6. **PARTIEL — API/service :** endpoints communs réutilisés ; service local authentifié testé ; Render et liaison hébergée NON TESTÉS, configuration absente de l'environnement inspecté.
7. **TERMINÉ — Tests :** 201 Python = 172 existants + 29 nouveaux ; 248 TypeScript = 222 existants + 26 nouveaux, un avertissement Python ; build OK. Cas arithmétiques, pas validation de procédé.
8. **PARTIEL — Interface/persistance :** onglet connecté/refus/service absent vérifiés ; lectures côté serveur et instantanés reliés aux sauvegardes communes ; calcul → sauvegarde → consultation hébergés BLOQUÉS, pannes de persistance NON TESTÉES.
9. **À VALIDER PAR L’INGÉNIEUR — Science :** compatibilité physique, qualité, incertitudes et cas réels ; aucune preuve de durabilité, logistique ou conversion.
10. **PARTIEL — Régressions/suite :** moteurs PV/CSP/éolien inchangés, suites réussies ; fournir vraie fiche documentée/validée et configurer le service, puis contrôler calcul, sauvegarde, consultation et échecs réels. Ancien estimateur électrique conservé et distinct ; aucun branchement primaire au LCOE.
# VALIDATION BIOMASSE — PROMPT 12

## 1. Statut au 17 octobre 2026

**Audit terminé ; moteur Python biomasse NON IMPLÉMENTÉ.** Version proposée `biomass-primary/1.0.0`, non enregistrée. Conventions et références physiques **À VALIDER PAR L’INGÉNIEUR**. Aucun moteur PV/CSP/éolien modifié, aucune donnée ajoutée/supprimée.

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

## 4. V1 proposée, non implémentée

`E_primaire(MWh/an) = M(t/an) × PCI_reçu(MJ/kg) / 3,6`.

1 t = 1000 kg ; 1 GJ = 1000 MJ ; 1 MWh = 3,6 GJ = 3600 MJ = 1000 kWh. Le produit t × MJ/kg correspond numériquement à GJ.

Entrées proposées : une seule fiche validée, source, qualité/nature, douze mois complets datés, masse annuelle positive sur matière reçue explicitement confirmée, PCI reçu positif avec méthode/source documentées. Conserver les natures estimées ou supposées sans les présenter comme mesures.

Humidité : exiger une valeur et une convention documentées, confirmées dans les hypothèses du calcul ; ne pas déduire la convention du pourcentage. Aucune conversion sèche/reçue automatique. Refuser matière sèche, volume et quantité mensuelle dans cette V1 ; toute extension requiert un modèle validé séparément.

Calcul limité à l'énergie de la **quantité recensée**, jamais à une mobilisation supposée. Afficher séparément les niveaux enregistrés. Ne multiplier aucune fraction, ne soustraire aucun usage concurrent et ne calculer aucun total mobilisable sans méthode approuvée.

Chaleur utile et électricité brute/nette : indisponibles avec motifs, aucun rendement ni procédé supposé. Aucune conversion détaillée prise en charge.

## 5. Double comptage

`safeTotal` refuse unités/bases/périodes différentes et types répétés ; ce n'est pas une preuve de disjonction physique. Deux catégories peuvent couvrir les mêmes matières. V1 proposée : un bilan par fiche, aucun cumul entre fiches ni entre versions de simulations. Pas de lot physique identifié dans le catalogue ; agrégation future conditionnée à une preuve de disjonction. Le RPC annuel peut enregistrer plusieurs estimations d'une même fiche : ne pas additionner ces exécutions.

## 6. API, interface et sauvegarde

Réutiliser health/capabilities, `POST /api/v1/simulations/validate` et `POST /api/v1/simulations`, sans endpoint biomasse. Authentification clé service + identité utilisateur vérifiée, rôles et lectures utilisateur côté application, contrôle des réponses et finalisation existants.

Le Python utilise `NoRepository` : `GET /api/v1/simulations/{id}/results` n'est pas une sauvegarde persistante. La consultation doit rester dans l'application et ses tables simulations/results.

Sélection et revalidation de fiche côté serveur, entrées et déclarations figées ; aucune substitution des données du catalogue par le navigateur. Résultat primaire nommé distinctement de l'électricité, sans liaison automatique LCOE. Service absent : lancement désactivé, aucun résultat de secours.

URL/clé absentes de l'environnement inspecté. Service hébergé et parcours calcul → sauvegarde → consultation **NON TESTÉS / BLOQUÉS** ; pas de conclusion sur un autre déploiement éventuel.

## 7. Tests et cas à valider

Tests existants exécutés : **172 Python réussis**, un avertissement de dépréciation Starlette/httpx ; **222 TypeScript réussis dans 17 fichiers**, dont **21 tests du modèle biomasse**. Aucun nouveau test de moteur primaire, aucune validation physique ou hébergée.

Cas arithmétiques proposés, jamais des données terrain ni des insertions : 3,6 t/an × 10 MJ/kg / 3,6 = 10 MWh/an ; 1 t/an × 3,6 MJ/kg / 3,6 = 1 MWh/an = 1000 kWh/an. Une fraction de 50 % ne modifie pas le bilan recensé. Tolérances numériques à préciser lors de l'implémentation, distinctes des incertitudes physiques à valider.

Tests futurs : unités/périodes/bases incompatibles, humidité ou convention manquante/hors plage, quantité négative, fraction hors plage, PCI manquant/non positif, source absente, fiche non validée, conversions indisponibles, absence de cumul, réponse étrangère/incomplète, échec service/enregistrement, authentification/rôles et absence de faux résultats.

## 8. Décisions attendues de Joël

Confirmer la V1 primaire recensée seulement, tonnes annuelles reçues/PCI reçu sans fraction ; convention d'humidité documentée sans correction ; douze mois datés et une seule fiche ; mobilisation et conversions reportées jusqu'à validation des méthodes et sources. L'approbation du périmètre ne constitue pas une validation scientifique de procédé.
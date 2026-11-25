# Plan d’automatisation des simulations

## 1. Parcours cible
1. Localisation (recherche, homonymes, carte, précision affichée).
2. Récupération automatique des ressources (dossier de site, données manquantes visibles).
3. Type de projet (habitation, école, centre de santé, administration, entreprise, exploitation agricole, mini-réseau, autre).
4. Besoin énergétique : mesures ou assistant d’estimation explicitement marqué.
5. Technologies.
6. Équipements et paramètres obligatoires (fiches constructeur, choix justifiés).
7. Simulation.
8. Comparaison.
9. Finance (coûts datés).
10. Rapport.
Seules les données réellement obtenues sont préremplies ; le reste est demandé.

## 2. Alimentation des moteurs
| Moteur | Entrées automatisables | Restent à fournir | Point bloquant |
|---|---|---|---|
| PV | GHI/DNI/DHI, T, vent, altitude (PVGIS TMY 8 760 h ou NASA année) | Puissance, orientation, pertes, onduleur | Année bissextile NASA 8 784 h : politique à valider |
| Éolien | Vent 10 m horaire ; GWA long terme | Courbe turbine, hauteur moyeu | Aucune extrapolation de hauteur sans méthode validée |
| CSP | DNI horaire | Coefficients optiques/thermiques | Conversion Wh/m²→W/m² confirmée ; ne pas étendre le modèle |
| Biomasse | Statistiques FAO (contexte seulement) | Quantité mobilisable, PCI, humidité | Production agricole ≠ disponibilité |
| Batterie | — | Fiche constructeur, demande horaire | Égalité exacte des horodatages PV/demande |
| Finance | Production liée | Coûts, tarifs | Aucun coût générique comme réel |

Interdits : série horaire générée depuis une moyenne annuelle, interpolation non documentée, modification d’équation sans validation de M. Joël.

## 3. Décision temporelle requise
Options : (a) PVGIS TMY 8 760 h comme référence typique ; (b) année NASA réelle non bissextile ; (c) retrait explicite du 29 février appliqué de façon identique à PV, demande et batterie, tracé dans l’instantané.

## 4. Tests à prévoir
Adaptateurs (unités, 429, délai), cache, 8 760/8 784, refus d’extrapolation, provenance jusqu’au rapport, refus d’accès entre comptes.

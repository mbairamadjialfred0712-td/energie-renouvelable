# Dossier de validation — Moteur photovoltaïque horaire (à l'attention de l'ingénieur Joël)

Statut : **implémenté et testé techniquement ; validation scientifique par l'ingénieur EN ATTENTE.**

## 1. Modèle et version
- Modèle : **PVWatts v8**, module `Pvwattsv8` de NREL SAM, appelé via **PySAM 7.1.1.post1** (paquet `nrel-pysam`, licence BSD-3-Clause).
- Le moteur (`app/engines/pv/engine.py`, version 1.0.0) n'implémente aucune équation PV : il valide les entrées, appelle le code SAM officiel et agrège ses sorties.
- Références : NREL, *PVWatts Version 5 Manual* (Dobos, 2014, NREL/TP-6A20-62641) et notes de version PVWatts v8 / SAM : https://sam.nrel.gov/photovoltaic · https://developer.nrel.gov/docs/solar/pvwatts/ (domaine NLR mentionné dans la demande).
- Chaîne interne SAM (documentée par NREL) : position solaire, transposition Perez dans le plan, pertes angulaires (couverture), température de cellule (modèle thermique PVWatts), puissance DC avec coefficient de température selon le type de module, pertes système, rendement de l'onduleur avec écrêtage.

## 2. Entrées obligatoires (aucune valeur par défaut)
| Entrée | Unité | Plage acceptée |
|---|---|---|
| latitude / longitude | ° | ±90 / ±180 |
| elevation | m | −500 à 9 000 |
| system_capacity | kWc (DC) | 0,05 à 500 000 |
| dc_ac_ratio | – | 0,5 à 3 |
| inv_eff | % | 90 à 99,5 |
| losses | % | −5 à 99 |
| tilt | ° | 0 à 90 |
| azimuth | ° (0 = N, 90 = E, **180 = S**, 270 = O) | 0 à 360 |
| module_type | code (0 standard, 1 premium, 2 couche mince) | 0–2 |
| array_type | code (0 fixe ouvert, 1 fixe toiture, 2 suivi 1 axe, 3 1 axe rétro-suivi, 4 2 axes) | 0–4 |
| gcr | – | 0,01 à 0,99 |
| albédo | – (série horaire ou hypothèse constante) | 0 à 1 |

Séries horaires obligatoires : GHI, DNI, DHI (W/m²), température de l'air (°C), vent (m/s).
Exactement **8 760 heures**, heure locale **standard** (décalage UTC fourni), horodatage au **début** de chaque heure, 29 février retiré, aucune valeur manquante (refus, jamais de zéro), aucun doublon, ordre chronologique.

## 3. Réglages fixés par le moteur (visibles dans les métadonnées)
- Pertes neige désactivées (`en_snowloss = 0`), bifacialité 0, période d'analyse 1 an, dégradation 0 %.
- Aucune conversion d'unité. Agrégats arrondis à 3 chiffres significatifs ; séries horaires conservées.

## 4. Sorties
Série horaire AC (W et kWh), DC (W), irradiance dans le plan (W/m²), température de cellule (°C), énergie journalière, mensuelle, annuelle (sommes de la série horaire), productible (kWh/kWc), facteur de capacité SAM (base DC), irradiation annuelle dans le plan.

## 5. Tests réalisés
Données de **test uniquement** : TMY3 NREL 723170 (Greensboro, États-Unis), fourni avec pvlib — ne représente aucun site du projet.
- Cohérence agrégats/série, énergie = puissance × 1 h, nuit sans production positive, températures extrêmes (froid > chaud).
- Rejets : année incomplète, doublon, ordre, valeur manquante, valeur négative, unité K, série absente/inconnue, horodatage invalide, plage, code non entier, albédo absent.
- Contrôle croisé indépendant avec une chaîne pvlib proche (Perez, SAPM, PVWatts DC/onduleur) : écart < 8 %. **Ce n'est pas une validation** : modèles non identiques.
- Cas test (4 kWc, 20°, sud, pertes 14,08 %, onduleur 96 %, DC/AC 1,2, albédo 0,2) : 5 370 kWh/an, 1 340 kWh/kWc. Non comparé à une sortie publiée NREL pour le même fichier météo.

## 6. Points à valider par l'ingénieur avant usage professionnel
1. Adéquation de PVWatts v8 au niveau d'étude visé (pas de modèle module/onduleur détaillé, pas d'ombrage 3D).
2. Valeur des pertes système (la valeur 14,08 % des tests est le défaut NREL, non imposé par le moteur).
3. Albédo et choix du type de module selon les fiches fabricant.
4. Sources de séries horaires acceptées pour les sites africains (station, NASA POWER, PVGIS, NSRDB) et leur qualité.
5. Comparaison sur au moins un site réel avec une simulation PVWatts/SAM de référence ou des mesures de production.
6. Règle de précision affichée (3 chiffres significatifs).

## 7. Limites connues
Climat annuel unique (pas de variabilité interannuelle), pas de dégradation pluriannuelle, pas de stockage, pas de pas sub-horaire, cohérence GHI/DNI/DHI non contrôlée par le moteur.

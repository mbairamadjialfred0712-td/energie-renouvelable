# Dossier de validation — Moteur photovoltaïque horaire (à l'attention de l'ingénieur Joël)

Statut : **implémenté et testé techniquement ; validation scientifique par l'ingénieur EN ATTENTE.**

## 1. Modèle et version
- Modèle : **PVWatts v8**, module `Pvwattsv8` de NREL SAM, appelé via **PySAM 7.1.1.post1** (paquet `nrel-pysam`, licence BSD-3-Clause).
- Le moteur (`app/engines/pv/engine.py`, version 1.0.1) n'implémente aucune équation PV : il valide les entrées, appelle le code SAM officiel et agrège ses sorties. La révision 1.0.1 renforce la validation, sans changer le modèle.
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
Une année civile unique est obligatoire (1er janvier 00 h → 31 décembre 23 h). Pour une année bissextile : `leap_day_convention = omit_feb29` explicitement fourni ; les 24 heures du 29 février doivent avoir été retirées par l'utilisateur selon cette convention. Le moteur ne les retire jamais lui-même. Une série de 8 784 heures est refusée.

## 3. Réglages fixés par le moteur (visibles dans les métadonnées)
- Pertes neige désactivées (`en_snowloss = 0`), bifacialité 0, période d'analyse 1 an, dégradation 0 %.
- Aucune conversion d'unité d'entrée. Sorties SAM AC/DC en W ; conversion explicite AC moyenne horaire W × 1 h / 1 000 vers kWh. Agrégats arrondis à 3 chiffres significatifs ; séries stockées arrondies (énergie 4 décimales, puissance/POA 1, température 2, jours 3). Les petits écarts de recomposition sont donc attendus.

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

## 8. Audit du 17 octobre 2026 — preuves et états distincts
- Sources consultées : https://pypi.org/pypi/NREL-PySAM/7.1.1.post1/json (version, licence BSD 3-Clause, roues Linux CPython 3.12) ; https://github.com/NREL/pysam/blob/master/LICENSE (texte BSD 3-Clause). Conserver notice, conditions et disclaimer lors de redistribution. Aucun changement de dépendance effectué.
- Réexécution de la base historique : **28 tests PV/API réussis** dans un environnement isolé, Python 3.13 ; PySAM installé **7.1.1.post1**, pvlib **0.11.2**. Le Python 3.12 de Render n'a pas été exécuté ici ; disponibilité de sa roue vérifiée seulement.
- Après corrections : **55 tests PV/API réussis**, incluant les 28 historiques et 27 nouveaux (paramètres manquants/type/unité, année civile, convention bissextile, albédo booléen, microsecondes, exécution directe invalide, réglages fixes, corps sans Content-Length et taille invalide). Les tests API utilisent une identité simulée en laboratoire, pas un service hébergé.
- Service Render : aucune URL/clé moteur configurée dans Lovable au moment de l'audit ; aucun déploiement Render ni succès Lovable → Python hébergé vérifié. Le code présent et ces tests ne prouvent pas la mise en service.
- Non-régression complète réexécutée : **66 tests Python réussis**, dont 55 PV/API et 11 batterie existants inchangés ; **147 tests frontend réussis**, dont 30 nouveaux PV/transport. Un avertissement de dépréciation Starlette/httpx, sans échec. Version SSC réellement consultée : **306**.
- Vérification locale du service Uvicorn : health → validation → calcul PV réel avec jeton utilisateur vérifié par Lovable Cloud, sur le fichier TMY3 de test ; appel sans authentification refusé. Aucune production locale enregistrée en projet. Ce n'est ni Render ni une liaison hébergée Lovable → Python.
- Aperçu connecté : soumission incomplète refusée, puis CSV TMY3 de test soumis → simulation failed, 0 ligne de résultat, message explicite d'indisponibilité. Deux passages (avant/après durcissement des permissions), aucune erreur navigateur ; données temporaires supprimées.
- Sécurité base réellement testée : cinq écritures directes authentifiées refusées HTTP 403 (création/validation de simulation, insertion/modification/suppression de résultat), lecture propriétaire maintenue. Les scripts JS livrés au navigateur ne contiennent pas les marqueurs du transport privé (clé et en-tête du moteur), aucun appel Render direct observé.
- Validation scientifique : **toujours en attente d'une décision explicite de Joël**. Le contrôle croisé pvlib à tolérance 8 % est un test technique, pas un critère d'acceptation métier validé.

## 9. Fiche d'acceptation à compléter par Joël
| Point | Décision/preuve attendue | État |
|---|---|---|
| Modèle PVWatts v8 et limites | Niveau d'étude admis, cas exclus | En attente |
| Données météo | Source, coordonnées, année, décalage standard, unités et qualité | À documenter par site |
| NASA POWER | Données natives horaires en Wh/m² dans la fiche météo : ne pas relabeller en W/m² sans transformation explicite validée ; aucun raccord automatique introduit | À valider |
| Pertes / module / montage / albédo | Valeurs justifiées, sources, neige/bifacialité/dégradation fixées | En attente |
| Cohérence physique des rayonnements | Méthode de contrôle GHI/DNI/DHI et tolérances | Non implémentée, à arbitrer |
| Bornes conservatrices | Température −60…70 °C, vent 0…75 m/s, rayonnements bornés ; hors plage = refus, pas preuve d'impossibilité universelle | À approuver |
| Cas de référence indépendant | Même météo et mêmes paramètres dans SAM/PVWatts officiel, rapport archivé, énergie et séries comparées | Non fourni |
| Critères d'acceptation | Écarts annuels/mensuels admissibles, tolérances d'arrondi, contrôles nuit et capacité ; pas de seuil scientifique inventé | À fixer |
| Autorisation professionnelle | Auteur, date, décision, référence du rapport et version du moteur | Non accordée |

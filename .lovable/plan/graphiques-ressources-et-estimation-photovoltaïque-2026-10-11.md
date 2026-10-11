# Graphiques ressources et estimation photovoltaïque

## Graphiques éolien, biomasse et déchets
- Ajouter début et fin de période aux fiches, sans déduire de dates des anciennes périodes libres.
- Afficher les observations par localité, paramètre et fenêtre de dates, avec source et statut.
- Conserver les unités enregistrées, sans conversion, moyenne ni interpolation ; exclure explicitement les observations non datées.

## Calcul solaire par projet
- Ajouter un bouton « Estimer la production solaire » sur chaque fiche projet.
- Demander un jeu solaire validé, la puissance installée en kWc et le ratio de performance explicitement renseigné, sans valeur technique présélectionnée.
- Pour cette première estimation annuelle, accepter une irradiation annuelle documentée en kWh/m²/an sur une période annuelle complète ; refuser les jeux incomplets, rejetés ou non validés.
- Appliquer une formule déterministe : production indicative = puissance × irradiation annuelle / irradiation de référence STC (1 kW/m²) × ratio de performance.
- Présenter le résultat en kWh/an comme une estimation, non comme une production mesurée ou une simulation détaillée. Signaler l’absence de correction d’inclinaison, d’ombrage et de simulation horaire.
- Conserver chaque calcul avec source, unité, période, paramètres, hypothèses, méthode et version ; ne pas écraser les résultats précédents.

## Pré-analyse IA
- Réutiliser la pré-analyse par projet via AI Gateway en y incluant l’instantané du calcul enregistré.
- L’IA vérifie les informations manquantes, hypothèses et points à confirmer ; elle ne génère ni ne modifie le résultat calculé.

## Détails techniques
- Périodes structurées ajoutées aux tables détaillées éolien, biomasse et déchets ; table dédiée aux estimations PV historiques.
- Sélection et calcul côté serveur, contrôle des droits et de la validation du jeu à chaque exécution.
- Sélecteurs de graphiques testables côté navigateur ; moteur PV pur et versionné, indépendant de l’IA.
- Vérifier les formules et refus d’entrées invalides, puis tester le parcours connecté avec des fiches temporaires clairement identifiées et supprimées après vérification.
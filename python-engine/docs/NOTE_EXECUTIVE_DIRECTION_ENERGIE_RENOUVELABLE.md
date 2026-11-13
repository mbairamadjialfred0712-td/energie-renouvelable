# Note exécutive — Logiciel ENERGIE RENOUVELABLE

À l'attention de la Direction — préparée pour M. N'guessan Joël Dje, ingénieur en énergie, propriétaire fonctionnel. Date : 13/11/2026.

## 1. En une phrase
ENERGIE RENOUVELABLE est une plateforme web d'aide à la décision qui structure les études énergétiques territoriales — des données du territoire jusqu'à l'analyse financière — avec des calculs traçables. Elle **assiste** l'ingénieur ; elle ne le remplace pas.

## 2. Le problème traité
Les études énergétiques reposent souvent sur des fichiers dispersés, des hypothèses implicites et des calculs difficiles à reproduire. Il devient alors difficile de justifier un résultat devant un décideur ou un partenaire.

## 3. La réponse apportée
- Une base unique : territoires, ressources (solaire, vent, biomasse, déchets), météo horaire, demande, équipements, projets.
- Des moteurs de calcul séparés et versionnés : photovoltaïque (modèle officiel PVWatts v8 du NREL), éolien, batterie, biomasse (énergie primaire), solaire thermique (bilan simplifié).
- Comparaison de scénarios, optimisation limitée du stockage, analyse financière (VAN, TRI, délai de retour, LCOE, sensibilité).
- Traçabilité : chaque donnée garde sa source, sa nature (mesurée, estimée, synthétique…) et son statut de validation ; chaque calcul conserve ses entrées.
- Sécurité : comptes et rôles (administrateur, ingénieur, lecteur), règles d'accès sur les 45 tables, fichiers privés, clés gardées côté serveur.

## 4. Où en est-on ?
| Acquis vérifiés | À obtenir avant exploitation officielle |
|---|---|
| Application complète et fonctionnelle en démonstration | Validation scientifique de chaque moteur par l'ingénieur |
| 466 tests automatisés réussis (application) ; 225 tests Python documentés le 08/11 | Cas d'étude réel avec données mesurées |
| Moteur de calcul en ligne et sécurisé | Test d'isolation entre deux comptes |
| Calculs PV, éolien et batterie exécutés sur le service hébergé | Recette de la version publiée |
| Données démographiques sourcées (ANStat, Banque mondiale) | Simulation hybride multi-sources, optimisation étendue |

**Important :** les résultats montrés à ce jour proviennent de **données synthétiques de test**. Ils démontrent le fonctionnement de la chaîne, non la performance d'un site réel.

## 5. Niveau de maturité
**Prototype avancé, apte à une démonstration contrôlée.** Il n'est pas encore validé pour une exploitation officielle ni pour engager des décisions d'investissement.

## 6. Décisions attendues de la Direction
1. Autoriser une phase pilote sur un site réel avec des données mesurées.
2. Désigner les validateurs scientifiques et un second compte de test autorisé.
3. Arbitrer les priorités : simulation hybride, optimisation, rapports.
4. Valider la politique des données démographiques (import automatique ou relecture préalable).

## 7. Bénéfices attendus (non chiffrés)
Centralisation et capitalisation des données, études plus homogènes, hypothèses visibles, comparaison de technologies, dialogue facilité entre ingénieurs et décideurs. Ces bénéfices restent à mesurer pendant le pilote ; aucun gain chiffré n'est revendiqué.

# Recherche — série de 5 captures App Store pour RestoHub

_Recherche effectuée le 12 août 2026. Les carrousels App Store pouvant évoluer, les observations concurrentielles ci-dessous sont datées. Toutes les sources consultées sont des sources Apple ou des fiches officielles de l’App Store._

## Synthèse décisionnelle

- Une série de **5 captures** respecte la limite Apple de **1 à 10 captures** par appareil et localisation.
- Pour une livraison iPhone récente en portrait, un canevas de **1320 × 2868 px** est un choix sûr parmi les tailles 6,9 pouces actuellement acceptées. Apple accepte aussi 1260 × 2736 et 1290 × 2796 px.
- Les **trois premières captures** doivent suffire à expliquer RestoHub : Apple peut afficher les une à trois premières dans les résultats de recherche lorsqu’aucun aperçu vidéo ne les précède.
- Le pattern dominant des apps comparées est : **un bénéfice par capture, un titre court commençant souvent par un verbe, puis une preuve visuelle issue de l’app**.
- La direction néo-brutaliste peut différencier RestoHub, à condition que les bordures, ombres et motifs restent un cadre de marque : l’interface réelle et le message doivent rester immédiatement lisibles.

## 1. Contraintes techniques Apple

| Sujet | Exigence actuelle | Conséquence pour RestoHub |
|---|---|---|
| Nombre | De 1 à 10 captures | 5 est un volume valide et suffisamment court pour construire un récit net. |
| Formats | `.jpeg`, `.jpg` ou `.png` | Exporter en PNG ou JPEG final. |
| Transparence | Aucun canal alpha ni fond transparent | Aplatir complètement chaque composition avant l’envoi. |
| iPhone 6,9 pouces, portrait | 1260 × 2736, 1290 × 2796 ou 1320 × 2868 px | Préparer de préférence les masters en 1320 × 2868 px si les captures sources le permettent. |
| Solution de repli iPhone | Sans série 6,9 pouces, une série 6,5 pouces devient requise : 1242 × 2688 ou 1284 × 2778 px | Fournir directement la série 6,9 pouces évite de dépendre de cet ancien groupe. |
| iPad, si l’app le prend en charge | Le groupe 13 pouces est requis : 2064 × 2752 ou 2048 × 2732 px en portrait | Confirmer séparément si la fiche RestoHub déclare une compatibilité iPad ; la série iPhone ne remplace pas cette obligation. |
| Localisation | Les captures peuvent être fournies par langue ; Apple peut réutiliser la meilleure langue disponible lorsqu’une localisation manque | Prévoir une série française distincte et, plus tard, adapter les textes plutôt que les intégrer définitivement aux captures sources. |
| Mise à l’échelle | Si l’interface est identique entre tailles et localisations, Apple permet de fournir seulement les captures de plus haute résolution requises et génère les tailles inférieures | Construire un master propre et conserver des marges de sécurité autour des textes. |

Sources : [Screenshot specifications — App Store Connect Help](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) et [Upload app previews and screenshots — App Store Connect Help](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots).

## 2. Règles de contenu et de validation

Apple demande que les captures reflètent fidèlement l’expérience principale et restent à jour. Elles doivent **montrer l’app utilisée**, pas seulement un écran de connexion, un splash screen ou une affiche de marque. Les textes et éléments graphiques superposés sont explicitement permis lorsqu’ils aident à comprendre l’expérience. [App Review Guidelines, section 2.3](https://developer.apple.com/app-store/review/guidelines/)

Points de contrôle avant livraison :

- faire apparaître une vraie interface RestoHub dans chacune des cinq images ;
- ne promettre que des fonctionnalités réellement accessibles dans la version soumise ;
- utiliser des restaurants, noms d’amis, notes et comptes fictifs, jamais des données personnelles réelles ;
- disposer des droits sur toutes les photos, icônes et illustrations visibles ;
- conserver un contenu convenant à une audience 4+, même si la classification finale de l’app est supérieure ;
- ne pas introduire de logos, noms ou interfaces d’autres plateformes mobiles sans raison fonctionnelle approuvée ;
- signaler clairement tout élément payant si une capture en présente un.

Apple précise aussi que les **une à trois premières images** peuvent apparaître dans les résultats de recherche et recommande d’y placer l’essence de l’app, puis d’attribuer aux captures suivantes un bénéfice ou une fonctionnalité principale. [Creating Your Product Page — Screenshots](https://developer.apple.com/app-store/product-page/)

## 3. Principes HIG pertinents pour les titres et la composition

Ces points sont des principes de design applicables aux créations marketing, et non des dimensions techniques supplémentaires :

- **Clarté et brièveté** : choisir des mots familiers, retirer chaque mot non indispensable et privilégier une formulation directe. [HIG — Writing](https://developer.apple.com/design/human-interface-guidelines/writing)
- **Formulation active** : commencer par l’action ou le résultat aide à comprendre immédiatement la promesse.
- **Une idée à la fois** : l’information la plus importante doit apparaître en premier ; plusieurs idées gagnent à être réparties entre plusieurs écrans.
- **Hiérarchie visible** : un titre dominant, une preuve visuelle principale et peu d’éléments secondaires facilitent le balayage. [HIG — Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- **Lisibilité réduite** : utiliser un poids suffisamment fort et tester les titres à la taille réelle d’une vignette App Store, pas seulement sur le master en pleine résolution. [HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- **Contraste et redondance** : assurer un contraste net et ne pas transmettre une information uniquement par la couleur. [HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility/)
- **Personnalité utile** : la décoration doit soutenir la tâche et la compréhension. Pour RestoHub, les ombres dures, contours épais et motifs culinaires peuvent signer la marque sans concurrencer le titre ou l’écran présenté.

Si RestoHub propose un mode sombre abouti, Apple suggère d’en montrer au moins une vue. Ce n’est pas une obligation. [Creating Your Product Page — Screenshots](https://developer.apple.com/app-store/product-page/)

## 4. Observation des carrousels d’apps comparables

Les comptes et nombres de captures correspondent aux carrousels iPhone français observés le 12 août 2026.

| App officielle | Nombre observé | Départ du récit | Séquençage observé | Pattern utile |
|---|---:|---|---|---|
| [Mapstr](https://apps.apple.com/fr/app/mapstr-noubliez-aucun-lieu/id917288465) | 10 | « Enregistrez en 1 geste » | Enregistrement rapide → personnalisation de la carte → import → planification → recommandations de confiance | Verbe et bénéfice immédiat, puis approfondissement progressif de l’organisation personnelle et sociale. |
| [TheFork](https://apps.apple.com/fr/app/thefork-guide-de-restaurants/id424850908) | 10 | « L’appli de réservation de restaurants » | Proposition de valeur → découverte/réservation → filtres → offre saisonnière → photos et menu | Première image très identitaire, puis parcours de décision complet ; une couleur de marque relie toute la série. |
| [Tripadvisor](https://apps.apple.com/fr/app/tripadvisor-voyages-et-avis/id284876795) | 5 | « Découvrez les meilleurs endroits où aller » | Découverte → confiance par les avis → planification/enregistrement/réservation → réduction du risque → proximité | Exemple directement comparable au format demandé : cinq étapes, chacune associée à une raison distincte d’installer l’app. |
| [Google Maps](https://apps.apple.com/fr/app/google-maps/id585027354) | 4 | « Consultez l’état du trafic en temps réel » | Trafic → informations et avis → partage de lieux → restaurants à proximité | Titres fonctionnels très directs, fond neutre et interface largement dominante ; aucune explication longue. |

### Convergences constatées

1. **Le premier visuel vend le résultat principal**, pas un menu de fonctionnalités.
2. **Les trois premiers forment une mini-histoire autonome** : promesse, usage central, élément différenciant.
3. **Les titres sont lisibles avant l’interface** et décrivent généralement une action ou un résultat concret.
4. **Une capture correspond à une seule raison d’installer** ; les fonctions secondaires arrivent plus tard.
5. **La série possède un système visuel continu** : même typographie, position de titre, palette et traitement du téléphone.
6. **L’interface reste la preuve**. Même avec des fonds très marqués chez TheFork, Mapstr ou Tripadvisor, l’écran réel occupe une part importante de chaque composition.
7. **La fin du carrousel élargit la valeur** vers la confiance, le partage, la proximité ou la réduction du risque.

Ces convergences sont des observations et non des règles imposées par Apple.

## 5. Structure de narration à emporter dans la phase créative

Sans fixer encore les textes ni concevoir les visuels, les cinq emplacements de RestoHub peuvent être cadrés ainsi :

1. **Promesse centrale** — résultat immédiat de RestoHub, illustré par l’écran qui représente le mieux le produit.
2. **Découvrir et décider** — restaurants, informations utiles et filtres.
3. **Organiser** — listes personnelles, catégories et carte.
4. **Se souvenir** — visites, notes, plats à retenir et tags.
5. **Partager et importer** — listes d’amis, attribution par prénom et circulation des bonnes adresses.

Les trois premiers rôles doivent fonctionner sans dépendre des deux derniers. Cette structure est une inférence issue de la priorité Apple donnée aux premières captures et du séquençage commun aux quatre apps observées.

## 6. Checklist pour la prochaine phase

- [ ] Cinq masters iPhone portrait en 1320 × 2868 px.
- [ ] Une vraie vue de l’app par image.
- [ ] Un message principal par image et des titres courts, actifs et cohérents.
- [ ] Les trois premières expliquent RestoHub sans contexte supplémentaire.
- [ ] Données, profils et restaurants fictifs ou explicitement autorisés.
- [ ] Contraste testé en miniature et sans dépendre uniquement de la couleur.
- [ ] Motifs et effets néo-brutalistes derrière l’information, jamais devant.
- [ ] Exports sans transparence.
- [ ] Série iPad distincte préparée si la compatibilité iPad est déclarée.
- [ ] Textes localisés et captures revérifiées au moment de l’envoi.


# RestoHub — design system maître

`src/DESIGN.md` est la source de vérité. Ce fichier persiste les décisions issues de l’audit UI/UX pour les prochaines sessions.

## Direction

- Neo-brutalisme éditorial : carnet de terrain, zine et culture fanzine, avec une finition mobile native.
- Papier lavande, encre bleu nuit, rose acide et aplats de violet. Les surfaces sont des blocs autonomes, avec contour franc et une ombre dure ponctuelle (jamais une pile de cartes).
- Les textures (grain/halftone) restent parcimonieuses : une signature par écran suffit, afin de préserver la lisibilité, les performances et le contraste.
- Aucun gradient, glow, hero marketing, carte imbriquée ou emoji structurel.
- La tab bar est une barre iOS glass stable : `BlurView` avec le material système, safe area et overlay gérés par React Navigation. L’adaptateur expérimental `@react-navigation/bottom-tabs/unstable` est exclu avec Expo SDK 54 car `react-native-screens` n’expose pas `Tabs.Host` dans cette version.
- L’indigo porte l’action, le rose `#FF007F` signe la marque et le lavande organise les surfaces secondaires.
- Aucun orange primaire. Vert, ambre et rouge sont réservés aux états sémantiques.

## Tokens

| Rôle | Clair | Sombre |
|---|---|---|
| Toile | `#F5EFF7` | `#100D18` |
| Surface | `#FFFFFF` | `#1B1426` |
| Surface secondaire | `#E9DDF0` | `#2B2140` |
| Action | `#292C90` | `#9A9FF4` |
| Rose signature | `#FF007F` | `#FF3BA4` |
| Texte ami | `#A60062` | `#FF8BCB` |
| Lavande | `#7C4C9B` | `#C9A5DF` |
| Texte | `#17121E` | `#FAF8FB` |
| Texte secondaire | `#51485A` | `#D4C9DC` |
| Contour franc | `#17121E` | `#F8F3FF` |

La police est Inter, déjà intégrée au projet. L’échelle est 12 / 14 / 16 / 19 / 23 / 28 / 32 px et le rythme suit 4/8 px.

Les provenances utilisent huit clés stables, jamais une hexadécimale comme identité persistée : `rose`, `magenta`, `plum`, `violet`, `grape`, `indigo`, `iris`, `orchid`. Chaque clé possède une valeur claire et une valeur sombre.

## Composants

- Boutons : `Pressable`, hauteur minimale 44 pt, rayon 8 px, contour franc et ombre dure pour l’action principale. Le rose est réservé aux stickers, marqueurs et illustrations.
- Headers racines : titre et `+` icon-only de 44 pt sur la première ligne, sous-titre dessous. Le `+` de Restos disparaît quand l’état vide affiche déjà son CTA.
- Adresses : une seule surface par ligne, image ou artwork de catégorie à gauche; provenance d’un import par icône, couleur et texte, jamais par rail. Les mini-fiches indiquent aussi l’état géolocalisé, le temps de trajet et le tracé lorsque la carte est ouverte.
- Filtres : feuille courte avec sélections horizontales et préférences en lignes; jamais de mur de chips en grille.
- Fiche lieu : provenance, résumé, action itinéraire, journal privé et détails dans des blocs contrastés; galerie plein écran pour plusieurs photos. Le tracé est réservé à la mini-fiche de la carte.
- Listes : icônes Lucide sémantiques; listes personnelles et importées séparées par des groupes arrondis; outils sous forme d’une surface unique, avec une feuille radio courte pour `Système` / `Clair` / `Sombre`.
- Marqueurs : cercle + icône de catégorie pour soi; carré arrondi + initiales pour un ami. La forme et le libellé complètent la couleur.
- Formulaires : label toujours visible, validation proche du champ, ajout en deux étapes avec retour possible.
- Mode sombre : prune/indigo profond, jamais noir pur; les cartes ont un contour clair et une ombre dure pour garder leur séparation.

## Contrôles avant livraison

- Touches ≥44 pt, safe areas et tab bar réservées.
- Étiquettes d’accessibilité sur les contrôles icon-only.
- Couleur jamais utilisée seule pour transmettre la provenance ou un état.
- Pas de contenu masqué derrière la navigation fixe.
- Vérification TypeScript, configuration Expo et bundle natif.

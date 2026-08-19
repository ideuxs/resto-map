# RestoHub Design System — Aubergine & Crème

RestoHub est un carnet de bonnes adresses personnel qui permet d’enregistrer, d’organiser en listes et de partager des recommandations avec ses proches. L'interface allie la chaleur éditoriale d'un fond crème/lavande avec la rigueur d'un violet aubergine profond et des éléments structurés aux arrondis élégants (pas de forme pilule).

## Overview

Le langage de RestoHub s’articule autour d’un primaire aubergine profond (`{colors.primary}` — `#4a154b`) appliqué comme couleur dominante des boutons d'action (CTA), des bandeaux signatures, des fiches mises en avant et du logo. Autour de cet aubergine s’articule un écosystème délicat : toiles crème et lavande (`{colors.canvas-cream}` / `{colors.canvas-lavender}`) avec des dégradés atmosphériques subtils (pêche, lavande, vert poudré) posés derrière les fiches et en-têtes.

La typographie repose sur **Inter** avec un tracking négatif serré sur les grands titres pour une densité éditoriale premium, et un interlignage aéré (1.55) sur le corps de texte.

Les boutons adoptent une forme rectangulaire arrondie raffinée et ergonomique (`borderRadius: 12px` / `{rounded.button}`) avec un rembourrage équilibré, en évitant le motif "pilule".

**Principes clés :**
- **Monothéisme chromatique** : L’aubergine primaire (`#4a154b`) porte les actions majeures. Les actions secondaires utilisent le lavande doux (`#f9f0ff`). Les liens et touches d'accent ponctuels utilisent le bleu vif (`#1264a3`).
- **Toile Crème & Lavande** : Fond chaleureux (`#f4ede4`) et surfaces de cartes blanches (`#ffffff`) avec bordures fines hairline (`#e6e6e6`).
- **Boutons & Éléments Rectangulaires Arrondis (10–12px)** : Tous les boutons de l'application utilisent un rayon élégant de 10-12px (pas de pilules).
- **Tracking négatif sur les titres** : Densité visuelle soignée sur les titres (ex: `-0.768px` sur les grands titres).
- **Statistiques à fort impact** : Numéraux géants en aubergine (32–50px) sur cartes blanches épurées.
- **Composants natifs iOS préservés** : La `NativeTabs` d'Expo Router gère les onglets avec le flou glassmorphic système iOS et la teinte aubergine.

## Couleurs

### Brand & Accent
- **Aubergine** (`{colors.primary}` — `#4a154b` / sombre `#d9bdde`) : Boutons CTA pleins, sélections actives, bandeaux signatures.
- **Aubergine Deep** (`{colors.primary-deep}` — `#481a54` / sombre `#c9a5df`) : Variante profonde de l'aubergine.
- **Aubergine Press** (`{colors.primary-press}` — `#611f69` / sombre `#e7d2eb`) : État pressé / actif.
- **Aubergine Tint** (`{colors.primary-tint}` — `#592466` / sombre `#4a2850`) : Bordure sur surfaces aubergine.
- **Link Blue** (`{colors.link-blue}` — `#1264a3` / sombre `#58a6ff`) : Couleur des liens et accents d'itinéraire.

### Surfaces
- **Canvas White** (`{colors.canvas}` — `#ffffff` / sombre `#231528`) : Surface principale des cartes et fiches.
- **Canvas Cream** (`{colors.canvas-cream}` — `#f4ede4` / sombre `#150d18`) : Fond d’écran et toiles chaleureuses.
- **Canvas Lavender** (`{colors.canvas-lavender}` — `#f9f0ff` / sombre `#321e38`) : Surface des boutons secondaires et puces douces.
- **Surface Aubergine** (`{colors.surface-aubergine}` — `#4a154b` / sombre `#3b1e40`) : Cartes signatures, bannières et éléments mis en avant.
- **Hairline Border** (`{colors.hairline}` — `#e6e6e6` / sombre `#3b2342`) : Bordures fines 1px des cartes.

### Typographie & Texte
- **Ink** (`{colors.ink}` — `#1d1d1d` / sombre `#faf8fb`) : Texte principal.
- **Ink Mute** (`{colors.ink-mute}` — `#696969` / sombre `#9e8fa5`) : Texte secondaire, métadonnées, sous-titres.
- **On Primary** (`{colors.on-primary}` — `#ffffff` / sombre `#150d18`) : Texte sur bouton ou surface aubergine.
- **On Aubergine Mute** (`{colors.on-aubergine-mute}` — `#d9bdde` / sombre `#a99db2`) : Texte secondaire sur surface aubergine.

## Rayons de bordure (Shapes)

- `{rounded.sm}` : `6px` (champs de formulaires, tags)
- `{rounded.md}` : `10px` (boutons secondaires, cadres)
- `{rounded.button}` : `12px` (boutons d'action principaux)
- `{rounded.xl}` : `16px` (cartes de restaurants, cartes de listes, conteneurs)
- `{rounded.xxl}` : `24px` (grandes sections / headers)

## Composants Signatures

1. **`button-primary`** : Fond aubergine (`#4a154b`), texte blanc, typographie Inter Bold, rayon 12px, padding 14px 24px.
2. **`button-secondary`** : Fond lavande (`#f9f0ff`), texte ink (`#1d1d1d`), rayon 10px, padding 10px 20px.
3. **`card-stat`** : Carte blanche avec bordure hairline fine (`#e6e6e6`), chiffre géant en aubergine display, libellé discret en dessous.
4. **`card-aubergine-band`** : Bandeau aubergine pour les informations clés ou le plat à retenir d'une adresse.
5. **`card-restaurant`** : Carte blanche 16px avec bordure hairline, vignette soignée, badge de provenance ami, note étoilée et puce de prix.

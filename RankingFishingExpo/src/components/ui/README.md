# Primitives UI — « fiche de pesée »

Ce dossier contient le design system de RankingFishing. Chaque écran ressemble à une fiche de pesée propre : les chiffres (kg, cm, points, rang) sont les héros, la chrome s'efface.

```ts
import { Button, Sheet, WeighInStrip } from '../components/ui'; // primitives
import { colors, typography, spacing } from '../theme';                // tokens
```

Écran de démonstration (non branché dans la navigation) :
`import UICatalogScreen from '../components/ui/__catalog__/UICatalogScreen';`
Il n'est pas réexporté par `index.ts`, pour éviter un cycle de require.

---

## Règles (le DIRECTION CONTRACT résumé)

- **Vert `colors.primary`** : action, sélection, validation. **Or** : réussite uniquement (score, rang, XP, badges, Premium). Jamais d'or sur un bouton.
- Texte « or » sur fond clair : `colors.goldInk` (#8A5A00), jamais `colors.secondary` (#F9A825, qui ne fait que 2:1 sur blanc). `secondary` sert aux remplissages : barre XP, liseré, pastille.
- **Surfaces** : fond crème `colors.background`, feuilles blanches `Sheet` avec un liseré `hairline` de 1 px, **pas d'ombre**. Une seule profondeur : jamais de Sheet dans une Sheet.
- **Interdits** : emoji comme icône (utiliser `SpeciesMark`, `badgeIconFor`, Ionicons `-outline`), texte en dégradé, bordure gauche colorée, glassmorphism, petit label en capitales au-dessus d'un titre.
- **Chiffres** : toujours en `fontVariant: ['tabular-nums']` (`typography.numeric`, `metricLarge`, `metricMedium`), et formatés avec `format.ts` (virgule française, espace fine pour les milliers).
- **Cibles** ≥ 44 pt. Les contrôles plus petits (Button `sm`, Chip) portent un `hitSlop`. Utiliser le `hitSlop` exporté par le thème pour les icônes libres.
- **Mouvement** : 150 ms (pression), 200 ms (changement d'état), 250 ms (entrée de feuille). Tout respecte « Réduire les animations » via `useReduceMotion()`.
- **Fonte système** (SF / Roboto). Pas de police chargée.

## Tokens (`src/theme/index.ts`)

| Groupe | Clés utiles |
|---|---|
| Encre | `ink` (titres, corps), `inkSecondary` (métadonnées), `inkTertiary` (placeholder, « — ») |
| Marque | `primary`, `primaryDark` (pressé, texte vert sur teinte), `primaryTint` (fond sélectionné), `secondary` (or, remplissage), `goldInk` (texte or), `goldTint` (fond or) |
| Surfaces | `background` (crème), `surface` (blanc), `surfaceMuted` (pistes, squelettes), `hairline`, `outline` (contour de puce), `borderStrong` (contour de champ, 3:1) |
| États | `pressed` (voile 6 %), `scrim` (fond de modale) |
| Sémantique | `error`/`errorLight`, `success`/`successLight`, `warning`/`warningLight`, `info`/`infoLight` |
| Rangs | `medals.gold / silver / bronze` = `{ bg, border, ink }` |
| Typo | `largeTitle` 32, `title1` 26, `title2` 21, `headline` 17, `body` 16, `callout` 15, `subhead` 14, `footnote` 13, `caption` 12, `numeric`, `metricLarge` 28, `metricMedium` 20 |
| Divers | `spacing` (xxs 2 … xxl 48), `borderRadius.control` 10 / `.sheet` 14, `shadows` (quasi nulles ; `lg` réservée au toast), `motion`, `touch.minTarget`, `hitSlop` |

Les anciennes clés (`h1`…`h4`, `bodySmall`, `label`, `button`, `textPrimary`, `textSecondary`, `textDisabled`, `border`, `surfaceVariant`, `overlay`, `premium`, `premiumBg`…) existent toujours, avec les nouvelles valeurs. Pour du code neuf, préférer les nouveaux noms.

---

## Actions

### Button
Bouton texte. `md` fait 48 pt ; `sm` fait 36 pt, avec un hitSlop vertical qui porte la cible à 44 pt.

| Prop | Type | Défaut |
|---|---|---|
| `title` | string | requis |
| `onPress` | () => void | requis |
| `variant` | `'filled' \| 'tonal' \| 'outline' \| 'text' \| 'destructive'` | `'filled'` |
| `size` | `'md' \| 'sm'` | `'md'` |
| `icon` | nom Ionicons (à gauche) | — |
| `loading` | boolean (spinner, largeur conservée, `busy`) | false |
| `disabled` | boolean (opacité 0.4) | false |
| `fullWidth` | boolean | false |
| `style`, `accessibilityLabel`, `accessibilityHint`, `testID` | | |

```tsx
<Button title="Publier la prise" onPress={submit} loading={saving} fullWidth />
<Button title="Annuler" variant="text" size="sm" onPress={goBack} />
```
Un seul `filled` par écran ; `tonal` pour l'action secondaire, `outline` pour une reprise (Réessayer), `destructive` pour supprimer.

### IconButton
Bouton icône 44×44. `accessibilityLabel` est **obligatoire**.
Props : `icon`, `accessibilityLabel`, `onPress`, `variant` (`'plain' | 'tonal' | 'filled'`), `color`, `iconSize` (22), `badgeCount` (pastille rouge, 99+), `disabled`, `style`, `testID`.
```tsx
<IconButton icon="notifications-outline" accessibilityLabel="Notifications" badgeCount={3} onPress={openNotifs} />
```

### Chip
Puce de filtre, 36 pt avec hitSlop. La sélection est montrée par une coche **et** par la couleur.
Props : `label`, `selected`, `onPress`, `icon`, `count`, `disabled`, `style`, `testID`.
```tsx
<Chip label="Brochet" selected={sel} onPress={() => toggle('brochet')} count={42} />
```

### SegmentedControl
2 à 5 segments, 44 pt, curseur animé (200 ms, sans animation sous reduce motion), haptique de sélection.
Props : `options: { value, label, accessibilityLabel? }[]`, `value`, `onChange`, `accessibilityLabel`, `style`, `testID`. Le composant est générique : `T` est inféré depuis `options`.
```tsx
<SegmentedControl options={PERIODS} value={period} onChange={setPeriod} accessibilityLabel="Période du classement" />
```

### LikeButton
Cœur « J'aime », 44 pt. Au like : pop ressort d'environ 180 ms et haptique légère (natif seulement, sans effet sur le web). Sous reduce motion, simple changement d'état. Cœur plein en vert.
Props : `liked`, `onToggle(next)`, `count`, `disabled`, `style`, `testID`. **La mise à jour optimiste reste à la charge de l'écran.**
```tsx
<LikeButton liked={c.isLiked} count={c.likesCount} onToggle={(next) => dispatch(toggleLike(c.id, next))} />
```

### Touchable
Pressable de base des primitives : retour de pression en 150 ms (échelle 0.98 et/ou opacité). `style` accepte une fonction `(pressed) => style`.
Props : celles de `Pressable`, plus `scaleOnPress` (true) et `pressedOpacity` (1). À utiliser pour une carte ou une ligne pressable sur mesure.

---

## Surfaces et listes

### Sheet
Feuille blanche, liseré hairline, rayon 14, sans ombre. Avec `onPress`, elle devient pressable.
Props : `children`, `padding` (`true` = 16 / `false` = 0 pour une photo pleine largeur / nombre), `onPress`, `accessibilityLabel`, `style`, `testID`.
```tsx
<Sheet padding={false} onPress={() => nav.navigate('CaptureDetail', { id })} accessibilityLabel="Brochet de 4,2 kg par Thomas">
  …photo 4:3 + <WeighInStrip …/>
</Sheet>
```

### ListGroup + ListRow
Écran de réglages, profil, menu. `ListGroup` est une feuille avec des séparateurs automatiques (retrait aligné sur le texte).
- `ListGroup` : `header` (texte simple, pas de capitales), `footer` (note), `style`.
- `ListRow` : `title`, `subtitle`, `icon` (tuile teintée de 30 pt), `iconTone` (`'primary' | 'neutral' | 'destructive'`), `left` (nœud libre, ex. Avatar), `value` (texte à droite), `right` (nœud libre), `chevron` (automatique si `onPress`), `onPress`, `switchValue` + `onSwitchChange` (interrupteur ; toute la ligne bascule), `destructive`, `disabled`, `accessibilityHint`, `testID`. Hauteur mini : 52 pt.

```tsx
<ListGroup header="Compte" footer="Tes prises restent visibles pour tes abonnés.">
  <ListRow icon="person-outline" title="Modifier le profil" onPress={edit} />
  <ListRow icon="notifications-outline" title="Notifications" switchValue={on} onSwitchChange={setOn} />
  <ListRow icon="log-out-outline" title="Se déconnecter" destructive onPress={logout} />
</ListGroup>
```
Sur le web, le pouce de l'interrupteur reste blanc à l'état actif (`activeThumbColor` n'est passé que sur le web).

### Divider
Séparateur hairline. Props : `inset` (retrait à gauche), `vertical`, `color`, `style`.

---

## En-têtes

### ScreenHeader / LargeTitle
En-tête d'écran racine : grand titre de 32 pt à gauche, des `IconButton` à droite, et un sous-titre éventuel **sous** le titre.
- `ScreenHeader` : `title`, `subtitle`, `actions` (nœud), `safeTop` (ajoute l'inset haut si l'écran n'est pas dans un SafeAreaView), `style`.
- `LargeTitle` : le texte seul (`children`, `style`), avec le rôle `header`.
```tsx
<ScreenHeader title="Fil" actions={<><IconButton icon="search-outline" accessibilityLabel="Rechercher" onPress={…} /><IconButton icon="notifications-outline" accessibilityLabel="Notifications" onPress={…} /></>} />
```

---

## Chiffres et réussite

### Metric
Chiffre héros : valeur en chiffres tabulaires, unité plus petite, libellé dessous. Une valeur nulle s'affiche « — » et se lit « non renseigné ».
Props : `value` (string déjà formatée, ou number), `unit`, `label`, `size` (`'lg'` 28 / `'md'` 20 / `'sm'` 17), `tone` (`'ink' | 'gold' | 'primary'` ; `gold` est réservé au score et à l'XP), `align`, `style`, `testID`.
```tsx
<Metric value={formatInt(user.totalXp)} unit="XP" label="Expérience" tone="gold" size="md" />
```

### WeighInStrip — la signature
La bande de pesée : poids en héros, taille à côté, **score en or**.
Props : `weightGrams`, `lengthCm`, `score` (valeurs brutes, formatées par le composant ; null → « — »), `size` (`'lg'` pour le fil et le détail, `'compact'` pour les listes et les profils), `ruled` (hairline dessus et dessous), `style`, `testID`.
```tsx
<WeighInStrip weightGrams={c.weightGrams} lengthCm={c.sizeCm} score={c.score} ruled />
```
Unités : des **grammes** et des **centimètres**, ce qui correspond à `Capture.weightGrams` et `Capture.sizeCm` du store.

### RankBadge / RankDelta
- `RankBadge` : `rank`, `size` (`'sm'` 28 / `'md'` 32 / `'lg'` 40). Le top 3 a une tuile or / argent / bronze sobre ; au-delà, le chiffre seul en encre secondaire.
- `RankDelta` : `delta` (places gagnées > 0 en or avec une flèche montante, perdues en encre secondaire, 0 → « — »).
```tsx
<RankBadge rank={entry.rank} /> <RankDelta delta={entry.previousRank - entry.rank} />
```

### XPBar
Progression de niveau, remplissage or, animation de 250 ms (statique sous reduce motion), rôle `progressbar`.
Props : `xp` (XP totale), `nextXp`, `levelXp` (début du palier, 0), `level`, `levelName`, `compact` (barre seule), `showTotal` (ligne « 1 240 XP au total » sous la barre), `style`.
Le libellé affiche la progression **dans le niveau** (`xp - levelXp` / `nextXp - levelXp`), comme le remplissage : l'exemple ci-dessous affiche « 240 / 1 000 XP » pour 24 %.
```tsx
<XPBar xp={1240} levelXp={1000} nextXp={2000} level={4} levelName="Pêcheur confirmé" />
```

---

## Identité

### Avatar
Photo, ou initiales sur un fond teinté sobre, dont la couleur est stable par nom. Props : `username`, `uri`, `size` (40), `premium` (pastille étoile or), `accessibilityLabel` (sans libellé, l'avatar est décoratif), `style`.

### SpeciesMark
Remplace l'emoji espèce : tuile arrondie avec un monogramme (« Tf », « Ca ») ou l'icône `fish-outline`.
Props : `name`, `speciesId` (clé de couleur stable), `size` (32), `variant` (`'monogram' | 'glyph'`), `style`. Le helper `speciesMonogram(name)` est exporté.

### Logo
Tuile marine arrondie avec le poisson couronné (PNG ; le SVG source est une vectorisation automatique inexploitable). Props : `size` (72), `withWordmark` (affiche « RankingFishing » dessous), `style`. Pour l'écran de connexion et l'onboarding.

---

## États

### EmptyState
État vide qui dit quoi faire. Props : `icon`, `title`, `message`, `actionLabel` + `onAction` (bouton tonal), `style`.
```tsx
<EmptyState icon="fish-outline" title="Aucune prise pour l'instant" message="Publie ta première prise pour entrer au classement." actionLabel="Ajouter une prise" onAction={openNew} />
```

### ErrorState
Nomme le problème et la reprise. Props : `title`, `message`, `onRetry`, `retryLabel` (« Réessayer »), `retrying` (spinner), `icon`, `style`.

### Skeleton / CaptureSkeleton
- `Skeleton` : `width` ('100%'), `height` (14), `aspectRatio`, `radius` (6), `style`. Un reflet discret le balaie ; il est statique sous reduce motion. Caché des lecteurs d'écran.
- `CaptureSkeleton` : la silhouette d'une feuille de capture (ligne pêcheur, photo 4:3, bande de pesée). À répéter deux ou trois fois pendant le premier chargement du fil.

---

## Retours

### Toast / useToast
Snackbar sombre en bas de l'écran, annoncée aux lecteurs d'écran.
- `ToastProvider` : à placer **une fois**, sous `SafeAreaProvider`, autour du navigateur. Prop `bottomOffset` (72 par défaut, au-dessus de la barre d'onglets).
- `useToast()` renvoie `{ show(message, { tone?: 'neutral' | 'success' | 'error', action?: { label, onPress }, duration? }), hide() }`. Hors provider, l'appel ne fait rien (avertissement en dev).
```tsx
const toast = useToast();
toast.show('Prise publiée', { tone: 'success', action: { label: 'Voir', onPress: openCapture } });
```
**Branché** : le `ToastProvider` est monté une fois dans `App.tsx`, sous `SafeAreaProvider`, autour de `AppNavigator`.

### BadgeUnlockSheet
Le moment signature après une publication. Une feuille monte depuis le bas, avec un liseré or, le badge, son nom, l'XP gagnée et un bouton « Continuer ». Sous reduce motion, elle apparaît en fondu. L'ouverture déclenche une haptique de succès et une annonce vocale.
Props : `visible`, `onClose`, `badgeName`, `description`, `xpGained`, `icon` (Ionicons), `category` (`'progression' | 'excellence' | 'community' | 'seasonal'` → icône via `badgeIconFor`).
```tsx
<BadgeUnlockSheet visible={!!unlocked} onClose={() => setUnlocked(null)} badgeName={unlocked?.name ?? ''} category={unlocked?.category} xpGained={unlocked?.xp ?? 0} />
```
Les badges stockés en base avec un emoji : ignore l'emoji et passe `category` (ou une `icon`).

---

## Utilitaires

- `useReduceMotion()` : true si l'utilisateur a demandé moins d'animations.
- `hapticLight()`, `hapticSelection()`, `hapticSuccess()` : sans effet sur le web.
- `toneFor(key)` / `TONES` : paire `{ bg, ink }` sobre et stable pour une clé (≥ 4.5:1).
- `formatInt(12345)` → « 12 345 » ; `formatDecimal(4.25)` → « 4,3 » ; `splitWeight(4200)` → `{ value: '4,2', unit: 'kg' }` ; `splitLength`, `splitScore`, `spokenUnit`.
- Type `IoniconName` : nom d'icône Ionicons (préférer les variantes `-outline`).

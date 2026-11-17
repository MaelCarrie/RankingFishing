---
name: RankingFishing
description: Strava for fishing. Every catch reads like a clean weigh-in slip, numbers first.
colors:
  primary: "#2E7D32"
  primary-dark: "#1B5E20"
  primary-tint: "#EDF4EC"
  gold: "#F9A825"
  gold-ink: "#8A5A00"
  gold-tint: "#FEF4DC"
  ink: "#15221A"
  ink-secondary: "#4E5B52"
  ink-tertiary: "#646E66"
  cream: "#F5F5F0"
  surface: "#FFFFFF"
  surface-muted: "#EEEFE8"
  hairline: "#E2E4DA"
  outline: "#C9CEC2"
  border-strong: "#8C9589"
  error: "#C62828"
  error-light: "#FDECEA"
  warning: "#A85400"
  info: "#1565C0"
  medal-gold: "#D9A21B"
  medal-silver: "#9AA3AB"
  medal-bronze: "#B07A4A"
  brand-navy: "#021124"
typography:
  display:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "38px"
    letterSpacing: "-0.4px"
  headline:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.3px"
  title-sheet:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: "26px"
    letterSpacing: "-0.2px"
  title:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "22px"
  callout:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
  subhead:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "19px"
  label:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  caption:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  metric-large:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.3px"
    fontFeature: "tnum"
  metric-medium:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "24px"
    fontFeature: "tnum"
  button:
    fontFamily: "SF Pro, Roboto, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "20px"
rounded:
  xs: "4px"
  sm: "6px"
  control: "10px"
  sheet: "14px"
  xl: "20px"
  full: "9999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  ms: "12px"
  md: "16px"
  ml: "20px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-filled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  button-filled-pressed:
    backgroundColor: "{colors.primary-dark}"
  button-tonal:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  button-text:
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary-dark}"
  segmented-control:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.subhead}"
    rounded: "{rounded.control}"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "52px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
    padding: "16px"
  icon-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    size: "44px"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-secondary}"
  tab-bar-add:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
    size: "52px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.callout}"
    rounded: "{rounded.control}"
---

# Design System: RankingFishing

## Overview

**Creative North Star: "The Weigh-In Slip"**

Every screen reads like a clean fiche de pesée. Weight, length, score and rank are the heroes, set large in tabular figures with the unit smaller and in secondary ink. The chrome steps back. The ground is cream, content sits on white sheets edged with a 1px hairline, and there is almost no shadow. Depth comes from the hairline and the cream/white contrast, not from lift.

The palette has a strict division of labour. Green means act, select or validate. Gold means achievement: score, rank movement, XP, badges, Premium. Everything else is a deep green-black ink on cream and white. The type is the platform's own (SF on iOS, Roboto on Android) on a tight ~1.2 scale. Large titles sit flush left at the top of root screens, and icons are Ionicons outline. Built for outdoor, one-handed, sunlit use: every target is 44pt or more, text contrast is measured against WCAG, and nothing is carried by colour alone (selected chips carry a check, rank deltas carry an arrow).

The world rejects the default social-feed look: rounded shadowed cards, emoji as icons, coloured chips everywhere, a floating green blob.

**Key Characteristics:**
- Cream ground, white hairline sheets, one level of depth
- Numbers as heroes: tabular figures, small secondary-ink units, "—" for missing values
- Green for action and selection only; gold for achievement only
- Platform system type on a tight 1.2 scale with flush-left large titles
- Ionicons outline at rest; species get a monogram tile, never an emoji
- 44pt minimum targets; motion at 150/200/250ms, all of it honouring Reduce Motion

## Colors

A restrained nature palette: green-black ink on cream and white, with one action green and one achievement gold.

### Primary
- **Nature Green** (primary): filled buttons, the central "+" tab, active tab tint, selected chip edge, the like heart when filled, "Validée" marks, focused input borders. One filled button per screen.
- **Deep Fir** (primary-dark): pressed state of filled buttons, and green text on a green tint (tonal buttons, selected chips, the angler's own ranking row).
- **Pale Reed** (primary-tint): selected backgrounds. Tonal buttons, selected chips, and the pinned "Toi" row in rankings.

### Secondary
- **Trophy Gold** (gold): fills only. The XP bar, the badge-unlock sheet edge, the Premium dot on avatars, badge progress bars. At about 2:1 on white it is never used for text.
- **Weighed Amber** (gold-ink): every piece of gold *text*. The score in the weigh-in strip, positive rank deltas, badge icons, XP figures. This is the readable stand-in for gold (5.93:1 on white).
- **Gold Wash** (gold-tint): background behind achievement tiles (badge medallion, Premium hero tile, gold medal).

### Tertiary
- **Medal Gold / Silver / Bronze** (medal-gold, medal-silver, medal-bronze): only the 1.5px edges of the top-3 rank tiles and podium avatars. Each medal is paired with its own pale background and dark ink in `medals`.
- **Logo Navy** (brand-navy): only the rounded tile behind the logo on login and onboarding.

### Neutral
- **Weigh-Slip Ink** (ink): titles, body text, figures, plain icons. Also the dark toast background.
- **Bank Moss** (ink-secondary): metadata, units, labels under metrics, inactive tab tint, ranks 4 and below.
- **Faded Moss** (ink-tertiary): placeholders and the "—" of a missing value (still ≥4.5:1).
- **Cream** (cream): the ground behind every screen and stack header.
- **Sheet White** (surface): sheets, list groups, tab bar, inputs, unselected chips.
- **Muted Stone** (surface-muted): segmented-control tracks, skeletons, photo placeholders, disabled fields.
- **Hairline** (hairline): the 1px edge of every sheet, header and tab-bar border, and every separator.
- **Reed Outline** (outline): the border of unselected chips and controls.
- **Field Edge** (border-strong): input borders (≥3:1 on white).
- **Error Red** (error) with **Error Wash** (error-light): destructive buttons, field errors, error banners.

### Named Rules
**The Gold Is Earned Rule.** Gold appears only on achievement: score, rank movement, XP, badges, Premium. It never fills or tints a plain button, including on the Premium screen, whose call to action is a green filled button.

**The Gold Ink Rule.** Gold text is always gold-ink, and gold (#F9A825) is reserved for fills, edges and dots. The contract wrote "score in gold #F9A825". The build sets it in gold-ink for contrast, and the build is right.

**The Green Means Go Rule.** Green marks the thing you can press, the thing that is selected, or the thing that is validated. It is never decoration.

## Typography

**Display Font:** Platform system face (SF Pro on iOS, Roboto on Android). No font is loaded.
**Body Font:** Same system face.

**Character:** Native and quiet. Weight and tabular figures do the work a display face would do elsewhere, so the numbers read like printed scale output.

### Hierarchy
- **Display** (700, 32/38, -0.4): large flush-left title of root screens ("Accueil", "Classements"), via ScreenHeader.
- **Headline** (700, 26/32, -0.3): auth and onboarding titles, and the wordmark under the logo.
- **Title-sheet** (600, 21/26, -0.2): sheet and hero titles (badge unlock, Premium hero, empty states).
- **Title** (600, 17/22): usernames on capture sheets, species names, stack header titles, ranking scores.
- **Body** (400, 16/22): input text and body copy.
- **Callout** (400, 15/20): descriptions, list-row titles, toast messages.
- **Subhead / Label / Caption** (400, 14/19 · 13/18 · 12/16): chip and segment labels, metadata, metric labels, badges like "Toi".
- **Metric Large / Medium** (700 28/32 · 600 20/24, tabular): the weigh-in hero weight, then length and score. A 17pt 600 tabular step serves compact strips.

### Named Rules
**The Tabular Figures Rule.** Every number (weight, length, score, rank, XP, counts) uses tabular-nums and is formatted French-style (decimal comma, thin-space thousands). Units follow at a smaller size, weight 500, in ink-secondary.

**The Sentence-Case Rule.** Headers and group labels are plain sentence case. No small uppercase label sits above a title.

## Layout

Single-column phone layout with a 16px (md) gutter. Sheets inset 16px from the screen edges and stack with 12px (ms) between them. Spacing follows a 4px grid (2, 4, 8, 12, 16, 20, 24, 32, 48). Root screens open with a flush-left 32pt large title and 44pt icon buttons on the right. Pushed screens use a cream stack header with a hairline bottom and a centred 17pt title. Capture photos are full-bleed inside their sheet at 4:3. Lists are grouped inside a single sheet, with hairline separators inset to align with the text. Rankings pin the angler's own row above the tab bar, on a primary-tint ground. The tab bar is white with a hairline top and five slots. The centre slot holds a 52pt green rounded square, sitting in the bar, not floating. Minimum target is 44pt; smaller visuals (36pt chips, 36pt small buttons) get hitSlop to reach it.

## Elevation & Depth

Flat by default. Depth comes from the 1px hairline and the white-on-cream contrast. The scale has three shadows but only two appear: a whisper under the segmented-control thumb, and a real shadow for things that truly float (toasts). The tab bar and sheets carry zero shadow and zero Android elevation.

### Shadow Vocabulary
- **Whisper** (`0 1px 2px rgba(21,34,26,0.04)`, elevation 0): the sliding thumb of the segmented control.
- **Settle** (`0 2px 6px rgba(21,34,26,0.06)`, elevation 1): defined, currently unused.
- **Float** (`0 8px 24px rgba(21,34,26,0.12)`, elevation 8): toasts and anything that genuinely hovers above content.

### Named Rules
**The One Depth Rule.** A sheet never sits inside a sheet. Hierarchy inside a sheet uses hairlines and spacing.

**The Hairline Not Shadow Rule.** If a surface needs separating, give it a 1px hairline edge, not a shadow.

## Shapes

Two radii carry the system: 10px for controls (buttons, chips, inputs, icon buttons, segmented tracks, toasts, the pinned rank row) and 14px for sheets (cards, list groups, ranking lists, the "+" tab button). The badge-unlock sheet's top corners are 20px. Avatars and rank tiles are circles. Species monogram tiles round at 28% of their size. Small tags ("Toi", photo counts) use 4–6px. Borders are 1px everywhere, rising to 1.5px for medal edges and 2px for a focused input (with padding compensated so nothing jumps).

## Components

### Buttons
Text-labelled and plainly tactile, they compress to 0.98 scale over 150ms on press.
- **Shape:** gently rounded (10px), 48pt tall (md) or 36pt (sm, with vertical hitSlop to 44).
- **Filled:** primary green, white 16/600 label, 20px horizontal padding. Pressed turns primary-dark. One per screen.
- **Tonal:** primary-tint with primary-dark label. Used for the secondary action and for empty-state actions.
- **Outline:** 1px primary border and green label, for retry.
- **Text:** green label, no fill, pressed veil at 6% ink.
- **Destructive:** error red with white label.
- **Disabled:** 40% opacity. **Loading:** the spinner replaces the label and the width is kept.

### Icon Buttons
44×44 hit area, 22pt Ionicons outline in ink, radius 10 on the pressed veil. An optional red count badge caps at "99+". An accessibility label is mandatory.

### Chips
- **Style:** 36pt, white with a 1px outline border, 14pt label at 500, radius 10.
- **Selected:** primary-tint fill, primary border, primary-dark label at 600, and a leading check icon. The selection never relies on colour alone.

### Segmented Control
44pt muted-stone track, radius 10. A white thumb with a hairline edge and the Whisper shadow slides between segments in 200ms. The selected label is ink at 600, the others ink-secondary at 500.

### Cards / Containers (Sheet)
- **Corner Style:** 14px.
- **Background:** white on cream.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px hairline.
- **Internal Padding:** 16px, or 0 when a photo runs full-bleed.

### Inputs / Fields
- **Style:** white, 1px border-strong edge, radius 10, min-height 52, label above in 14/600 ink.
- **Focus:** the border turns primary and thickens to 2px, with padding compensated.
- **Error / Disabled:** error-red border; disabled fills with surface-muted.

### Navigation
- **Root header:** flush-left 32pt display title on cream, with icon buttons on the right.
- **Stack header:** cream with a hairline bottom and a centred 17/600 title.
- **Tab bar:** white with a hairline top and no shadow. Labels are 11/600, tint is primary when active and ink-secondary at rest. Icons are outline at rest and switch to the filled glyph when active. The centre "+" is a 52pt green square at radius 14, and it darkens and scales to 0.96 on press.

### Weigh-In Strip (signature)
The heart of the world. Weight leads as a 28pt bold tabular metric. Length and score follow at 20pt, separated by hairline rules. The score is in gold-ink. Each value has its unit small in ink-secondary and a footnote label beneath ("Poids", "Taille", "Score"). A compact variant (20/17pt) serves lists and profiles, and an optional ruled variant adds hairlines above and below.

### Rank Row and Rank Badge
Rows sit in one hairline sheet with inset separators, showing rank, avatar, name and metadata, and the score right-aligned in 17/600 ink tabular with a small "pts". The top 3 get circular medal tiles: a pale medal background, a 1.5px medal edge and dark medal ink. Ranks from 4 down show the bare figure in ink-secondary. The angler's own row is pinned above the tab bar on primary-tint, with a 1px primary-bordered "Toi" tag. Rank gains show in gold-ink with an up arrow. Losses show in ink-secondary.

### Badge Unlock Sheet
The single orchestrated moment. A white sheet with 20px top corners and a gold edge slides up over the ink scrim. It holds a gold-tint circular medallion with a gold edge and gold-ink icon, the badge name in 21/600, the XP gained, and a "Continuer" button. A success haptic fires. Under Reduce Motion it crossfades instead.

### Toast
Dark ink snackbar, radius 10, Float shadow, white 15pt message and a pale-green action. It sits 72pt above the bottom, clear of the tab bar.

## Do's and Don'ts

### Do:
- **Do** set every figure in tabular-nums with a smaller ink-secondary unit, and show "—" for a missing value.
- **Do** put content on white sheets with a 1px hairline (#E2E4DA) and radius 14, on the cream ground.
- **Do** write gold text in gold-ink (#8A5A00). Keep #F9A825 for fills, edges and dots.
- **Do** keep every target at 44pt or more, adding hitSlop to smaller visuals.
- **Do** use Ionicons outline for icons, and a SpeciesMark monogram or the fish glyph for species.
- **Do** use 150ms for press feedback, 200ms for state changes and 250ms for sheet entry, and honour Reduce Motion.

### Don't:
- **Don't** put gold on a plain button or use it for anything that is not an achievement.
- **Don't** use emoji as icons (badges stored with an emoji render through their category icon).
- **Don't** nest a sheet inside a sheet, or add shadow to separate surfaces; use a hairline.
- **Don't** put a small uppercase label above a title.
- **Don't** use gradient text, glassmorphism or a coloured left border on cards.
- **Don't** use more than one filled green button per screen.

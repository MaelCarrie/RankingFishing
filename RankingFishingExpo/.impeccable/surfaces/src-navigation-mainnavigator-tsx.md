---
version: 1
slug: "src-navigation-mainnavigator-tsx"
primary_target: "src/navigation/MainNavigator.tsx"
related_targets: []
---

# Surface: RankingFishing app (all authenticated screens + auth + onboarding)

Scope: every screen of the native app. Mode: Operate (Read for capture detail). Refinement of the incumbent world, not a replacement: the user pinned the palette (nature green #2E7D32, gold/amber #F9A825, cream #F5F5F0) and asked to "keep the same art direction, but more professional". Code-led (native app screen). Platform: adaptive (iOS + Android, one design), verified on Expo web at 390x844 because no simulator exists on this Linux machine.

Audience/job: passionate amateur angler, outdoors in sunlight, one-handed; logs a catch in seconds, then checks where it puts them (rank, XP, badges).

## Direction contract

THESIS: The catch is a weighed performance. Every screen reads like a clean weigh-in slip ("fiche de pesée"): the numbers (kg, cm, points, rank) are the heroes, set big in tabular figures, and the chrome steps back. It refuses the default social-feed look of rounded shadowed cards with emoji, coloured chips everywhere and a floating green blob.

OWN-WORLD: Cream ground #F5F5F0, white sheets with a 1px hairline (#E2E4DA) and almost no shadow, radius 14 for sheets and 10 for controls. Ink is a deep green-black (#15221A), with secondary ink #4E5B52 (darkened for sunlight contrast). Green #2E7D32 is used only for actions, the current selection and validation. Gold #F9A825 belongs exclusively to achievement: score, rank movement, XP, badges, Premium. It never appears on a plain button. System font (SF / Roboto), with a tight scale of 1.2; all figures use tabular-nums, with the unit set smaller and in secondary ink. Ionicons outline at 1.5 weight for every icon; no emoji used as an icon (species get a monogram tile or the fish glyph).

STORY: Open the app → see friends' catches with their weights at a glance → tap + → log a catch in under 30 s with big targets → see the XP, rank and badge outcome → check rankings, where the angler's own row is always visible and pinned.

FIRST VIEWPORT (Feed): large title "Fil" (or "Accueil") with search and bell icons at 44pt; the first capture sheet shows the angler row, a full-width photo at 4:3, then the weigh-in strip: weight in 28pt bold tabular, length and score next to it, with the score in gold. Actions (like, comment, share) are left-aligned on a 44pt row. Tab bar: white with a hairline and 5 entries; the central "+" is a 52pt green rounded square, not floating, not oversized.

FORM: refined incumbent — established-world extension. The roll was run (assigned index 3 of the grounded list); the user-pinned brief (keep the existing art direction and palette, "plus pro") beats the roll per new-work, so the incumbent world is kept and refined. seed:1faa4ed58bad7cbb

Signature interaction: the like heart does a 180ms spring pop with a haptic on native; a badge unlock after publishing slides a gold-edged sheet up with the badge and the XP gained (a single orchestrated moment, crossfade under reduce motion).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

One React Native / Expo codebase shipped to iOS and Android (Expo web is used only for automated testing). Brand and layout are shared; platform conventions (back gestures, safe areas, haptics, system sheets, Android back button) are respected per OS.

## Users

Primary: the passionate amateur angler (16–65). They log catches on the water bank, often outdoors in bright sun, frequently one-handed with wet or cold hands, sometimes on poor mobile signal. Their job: record a catch quickly and well (species, weight, length, photos), then see how it places them against friends, their region and the whole community. They are motivated by rankings, badges, XP and records.

Secondary (confirmed by the specs, not the design priority): serious competitors (carp anglers, predator anglers) who want precise stats and records; beginners discovering the hobby.

## Product Purpose

RankingFishing is a community fishing app inspired by Strava: share catches, earn badges, and rank yourself regionally and globally. It gamifies fishing and builds an active community. Success = anglers posting their catches regularly, following each other, and coming back to check their rank.

## Positioning

Strava for fishing: a catch is a scored, ranked performance (score from species, weight, length), not just a photo. Rankings by period (day, week, month, year, all-time), by species and by region, plus friend circles, are the core mechanism.

## Operating Context

- Posting happens right after the catch, outside, phone in one hand; it must be fast and forgiving.
- Browsing (feed, rankings, profiles) happens at home or between sessions.
- Social graph: follow requests (accept/decline), followers/following, 1:1 chat in realtime.
- Freemium: catch location and the spot map are Premium features.

## Capabilities and Constraints

- Stack: React Native 0.88 + Expo SDK 58 + TypeScript, React Navigation v7, Redux Toolkit, Supabase (Auth, Postgres + RLS, Storage, Realtime, Edge Functions).
- Features: email/password auth, catch feed with likes and comments, catch detail, catch publishing with up to 3 photos, profile stats and XP via SQL triggers, rankings (global / species / region / friends, by period), badges with progress, realtime chat, user search, follow system, public profiles.
- SQL migrations are applied manually by the developer in the Supabase SQL editor.
- Not yet built (needs external accounts/keys): Google OAuth, OS push notifications, Stripe/Apple Pay/Google Pay subscription, Premium spot map.
- Language: French UI only.

## Brand Commitments

- Name: RankingFishing. Logo in `Documentations/Logo/` (logo.png, logo_without_bg.svg).
- Binding palette from the user: nature green `#2E7D32`, gold/amber `#F9A825`, cream background `#F5F5F0`. The user asked to keep the existing art direction but make it more professional.
- Voice: friendly, informal French ("tu"), angler vocabulary (prise, capture, spot, carnassier, carpiste).

## Evidence on Hand

- Reference data: 15 species and 9 badges seeded in Supabase.
- Specs in `Documentations/specs/` and `Documentations/Cahier_des_charges.md`.
- No testimonials, user numbers or press exist; never fabricate them.

## Product Principles

1. Posting a catch must take seconds, one-handed, outdoors.
2. The rank is the reward: every catch should visibly move the angler somewhere (XP, rank, badge).
3. Real numbers, precisely shown: weight, length and score are the hero data.
4. Community before showing off: follow, comment and message must always be one tap away.
5. Premium adds things; it never cripples the free core loop.

## Accessibility & Inclusion

Outdoor, sunlit use: high contrast text, large touch targets (44pt+), no information carried by color alone. Respect system font scaling and reduced motion.

import { Easing, TextStyle } from 'react-native';

/**
 * Design tokens RankingFishing — « fiche de pesée ».
 *
 * Fond crème, feuilles blanches à liseré hairline, presque aucune ombre.
 * Vert = action, sélection, validation. Or = réussite uniquement
 * (score, rang, XP, badges, Premium) : jamais sur un bouton ordinaire.
 *
 * Contrastes WCAG mesurés (sur blanc / sur crème #F5F5F0) :
 *   ink #15221A           16.46 / 15.05
 *   inkSecondary #4E5B52   7.14 /  6.53
 *   inkTertiary #646E66    5.30 /  4.84   (placeholders, métadonnées)
 *   primary #2E7D32        5.13 /  4.69   (4.58 sur primaryTint)
 *   goldInk #8A5A00        5.93 /  5.42   (5.42 sur goldTint)
 *   error #C62828          5.62 /  5.14
 *   blanc sur primary      5.13 ; ink sur or #F9A825 8.35
 */
export const colors = {
  // Encre
  ink: '#15221A',
  inkSecondary: '#4E5B52',
  inkTertiary: '#646E66',

  // Marque
  primary: '#2E7D32',       // vert nature : actions, sélection, validation
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',   // état pressé des boutons pleins, texte vert sur teinte
  primaryTint: '#EDF4EC',   // vert ~9 % sur blanc : fonds sélectionnés, boutons tonal
  secondary: '#F9A825',     // or : réussite uniquement
  secondaryLight: '#FFD54F',
  secondaryDark: '#8A5A00', // = goldInk (texte or lisible)
  goldInk: '#8A5A00',       // ambre foncé pour le texte « or » sur fond clair
  goldTint: '#FEF4DC',

  // Surfaces
  background: '#F5F5F0',    // crème
  surface: '#FFFFFF',       // feuilles
  surfaceVariant: '#EDF4EC',// fond teinté vert (compat : = primaryTint)
  surfaceMuted: '#EEEFE8',  // second neutre : pistes, squelettes, champs remplis
  hairline: '#E2E4DA',      // liseré 1 px des feuilles et séparateurs
  border: '#E2E4DA',        // compat : = hairline
  outline: '#C9CEC2',       // contour des puces / contrôles non sélectionnés
  borderStrong: '#8C9589',  // contour de champ de saisie (≥ 3:1 sur blanc)

  // Texte (compat)
  textPrimary: '#15221A',
  textSecondary: '#4E5B52',
  textDisabled: '#646E66',  // sert aussi de placeholder : reste ≥ 4.5:1
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#15221A',

  // États
  pressed: 'rgba(21, 34, 26, 0.06)',
  scrim: 'rgba(21, 34, 26, 0.45)',

  // Sémantique
  error: '#C62828',
  errorLight: '#FDECEA',
  success: '#2E7D32',
  successLight: '#EDF4EC',
  warning: '#A85400',
  warningLight: '#FFF3E0',
  info: '#1565C0',
  infoLight: '#E8F0FB',

  // Rangs et paliers de badges (sobres)
  bronze: '#B07A4A',
  silver: '#9AA3AB',
  gold: '#D9A21B',
  platinum: '#C9CED1',

  // Overlay (compat)
  overlay: 'rgba(21, 34, 26, 0.45)',
  overlayLight: 'rgba(21, 34, 26, 0.12)',

  // Premium (réussite = or)
  premium: '#F9A825',
  premiumBg: '#FEF4DC',

  // Marque : fond marine du logo
  brandNavy: '#021124',
};

/** Paires fond / liseré / encre pour les médailles du top 3 (RankBadge). */
export const medals = {
  gold: { bg: '#FEF4DC', border: '#D9A21B', ink: '#8A5A00' },
  silver: { bg: '#EDEFF1', border: '#9AA3AB', ink: '#4A5560' },
  bronze: { bg: '#F4E8DC', border: '#B07A4A', ink: '#7A4A22' },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  ms: 12,
  md: 16,
  ml: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 10,      // contrôles
  lg: 14,      // feuilles
  xl: 20,
  control: 10,
  sheet: 14,
  full: 9999,
};

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Échelle serrée (~1.2), fonte système (SF / Roboto).
 * Les clés h1…button sont conservées pour le code existant.
 */
export const typography = {
  // Échelle iOS / Material
  largeTitle: { fontSize: 32, fontWeight: '700' as const, lineHeight: 38, letterSpacing: -0.4 },
  title1: { fontSize: 26, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3 },
  title2: { fontSize: 21, fontWeight: '600' as const, lineHeight: 26, letterSpacing: -0.2 },
  headline: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  callout: { fontSize: 15, fontWeight: '400' as const, lineHeight: 20 },
  subhead: { fontSize: 14, fontWeight: '400' as const, lineHeight: 19 },
  footnote: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },

  // Chiffres
  numeric: { fontVariant: tabular },
  metricLarge: { fontSize: 28, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3, fontVariant: tabular },
  metricMedium: { fontSize: 20, fontWeight: '600' as const, lineHeight: 24, fontVariant: tabular },

  // Compat (anciens noms)
  h1: { fontSize: 26, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontSize: 21, fontWeight: '600' as const, lineHeight: 26, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  h4: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 20 },
};

/**
 * Ombres quasi nulles : l'élévation passe par la bordure hairline.
 * Sur Android, elevation 0 pour sm/md (pas d'ombre grise portée).
 */
export const shadows = {
  sm: {
    shadowColor: '#15221A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 0,
  },
  md: {
    shadowColor: '#15221A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  // Réservée à ce qui flotte réellement au-dessus du contenu (toast, feuille)
  lg: {
    shadowColor: '#15221A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

/** Durées et courbes : 150 retour de pression, 200 changement d'état, 250 entrée de feuille. */
export const motion = {
  fast: 150,
  base: 200,
  slow: 250,
  easeOut: Easing.bezier(0.16, 1, 0.3, 1),
  easeInOut: Easing.bezier(0.65, 0, 0.35, 1),
  pressScale: 0.98,
};

/** Cibles tactiles. */
export const touch = {
  minTarget: 44,
};

/** hitSlop standard : étend une cible de 8 pt de chaque côté. */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

export const theme = { colors, medals, spacing, borderRadius, typography, shadows, motion, touch, hitSlop };
export default theme;

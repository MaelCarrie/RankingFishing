export const colors = {
  // Brand
  primary: '#2E7D32',       // vert nature
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  secondary: '#F9A825',     // or/ambre
  secondaryLight: '#FFD54F',
  secondaryDark: '#F57F17',

  // Surfaces
  background: '#F5F5F0',
  surface: '#FFFFFF',
  surfaceVariant: '#EFF6EE',
  border: '#D8E8D8',

  // Text
  textPrimary: '#1B2631',
  textSecondary: '#546E7A',
  textDisabled: '#90A4AE',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#1B2631',

  // Semantic
  error: '#D32F2F',
  errorLight: '#FFEBEE',
  success: '#388E3C',
  successLight: '#E8F5E9',
  warning: '#F57C00',
  warningLight: '#FFF3E0',
  info: '#1976D2',

  // Badge tiers
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',

  // Overlay
  overlay: 'rgba(27, 38, 49, 0.5)',
  overlayLight: 'rgba(27, 38, 49, 0.15)',

  // Premium
  premium: '#F9A825',
  premiumBg: '#FFF8E1',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
  caption: { fontSize: 11, fontWeight: '400' as const },
  button: { fontSize: 15, fontWeight: '600' as const, letterSpacing: 0.3 },
};

export const shadows = {
  sm: {
    shadowColor: '#1B2631',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#1B2631',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1B2631',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
};

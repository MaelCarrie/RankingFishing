// Primitives UI RankingFishing (« fiche de pesée »). Voir README.md.
export { default as Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
export { default as IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';
export { default as Sheet } from './Sheet';
export type { SheetProps } from './Sheet';
export { ListGroup, ListRow } from './ListGroup';
export type { ListGroupProps, ListRowProps } from './ListGroup';
export { default as SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentOption } from './SegmentedControl';
export { default as Chip } from './Chip';
export type { ChipProps } from './Chip';
export { default as Metric } from './Metric';
export type { MetricProps } from './Metric';
export { default as WeighInStrip } from './WeighInStrip';
export type { WeighInStripProps } from './WeighInStrip';
export { default as SpeciesMark, speciesMonogram } from './SpeciesMark';
export type { SpeciesMarkProps } from './SpeciesMark';
export { default as RankBadge, RankDelta } from './RankBadge';
export type { RankBadgeProps, RankDeltaProps } from './RankBadge';
export { default as XPBar } from './XPBar';
export type { XPBarProps } from './XPBar';
export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { default as ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';
export { default as Skeleton, CaptureSkeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';
export { default as ScreenHeader, LargeTitle } from './ScreenHeader';
export type { ScreenHeaderProps, LargeTitleProps } from './ScreenHeader';
export { default as Divider } from './Divider';
export type { DividerProps } from './Divider';
export { default as Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';
export { default as LikeButton } from './LikeButton';
export type { LikeButtonProps } from './LikeButton';
export { ToastProvider, useToast } from './Toast';
export type { ToastOptions, ToastTone, ToastProviderProps } from './Toast';
export { default as BadgeUnlockSheet, badgeIconFor } from './BadgeUnlockSheet';
export type { BadgeUnlockSheetProps, BadgeCategoryKey } from './BadgeUnlockSheet';
export { default as Logo } from './Logo';
export type { LogoProps } from './Logo';
export { default as Touchable } from './Touchable';
export type { TouchableProps } from './Touchable';

// Utilitaires
export { useReduceMotion } from './hooks';
export { hapticLight, hapticSelection, hapticSuccess } from './haptics';
export { toneFor, TONES } from './palette';
export type { Tone } from './palette';
export { formatInt, formatDecimal, splitWeight, splitLength, splitScore, spokenUnit } from './format';
export type { ValueUnit } from './format';
export type { IoniconName } from './types';

// Écran de démonstration (non branché dans la navigation) : volontairement non
// réexporté ici (il importe ce fichier, ce qui créerait un cycle de require).
// import UICatalogScreen from '<...>/components/ui/__catalog__/UICatalogScreen';

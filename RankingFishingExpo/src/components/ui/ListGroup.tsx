import React from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, spacing, typography } from '../../theme';
import Divider from './Divider';
import type { IoniconName } from './types';

/* ─── ListRow ──────────────────────────────────────────────────────────── */

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Icône Ionicons dans une tuile teintée 30 pt à gauche. */
  icon?: IoniconName;
  /** Teinte de la tuile : vert (défaut), neutre ou rouge. */
  iconTone?: 'primary' | 'neutral' | 'destructive';
  /** Contenu libre à gauche (Avatar, SpeciesMark…), remplace `icon`. */
  left?: React.ReactNode;
  /** Valeur affichée à droite (ex. « Bretagne », « 12 »). */
  value?: string;
  /** Contenu libre à droite (remplace value). */
  right?: React.ReactNode;
  /** Chevron : par défaut affiché si onPress et pas de switch. */
  chevron?: boolean;
  onPress?: () => void;
  /** Interrupteur : fournir switchValue + onSwitchChange. */
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Séparateur sous la ligne (géré automatiquement par ListGroup). */
  divider?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

const TILE = 30;
const ROW_PAD = spacing.md;

export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = 'primary',
  left,
  value,
  right,
  chevron,
  onPress,
  switchValue,
  onSwitchChange,
  destructive = false,
  disabled = false,
  divider = false,
  accessibilityHint,
  testID,
}: ListRowProps) {
  const hasSwitch = switchValue !== undefined && !!onSwitchChange;
  const showChevron = chevron ?? (!!onPress && !hasSwitch);
  const pressHandler = hasSwitch ? () => onSwitchChange!(!switchValue) : onPress;
  const leading = left ?? (icon ? (
    <View
      style={[
        styles.tile,
        iconTone === 'neutral' && { backgroundColor: colors.surfaceMuted },
        (iconTone === 'destructive' || destructive) && { backgroundColor: colors.errorLight },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={destructive || iconTone === 'destructive' ? colors.error : iconTone === 'neutral' ? colors.inkSecondary : colors.primary}
      />
    </View>
  ) : null);
  const leadingWidth = left ? 0 : icon ? TILE + spacing.ms : 0;

  const body = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.texts}>
        <Text style={[styles.title, destructive && { color: colors.error }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right ?? (value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null)}
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          disabled={disabled}
          trackColor={{ true: colors.primary, false: '#D5D8CF' }}
          thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
          ios_backgroundColor="#D5D8CF"
          // react-native-web : pouce blanc aussi à l'état actif (défaut sarcelle)
          {...(Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {})}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.inkTertiary} style={styles.chevron} />
      ) : null}
    </>
  );

  const a11yLabel = [title, subtitle, value].filter(Boolean).join(', ');

  return (
    <View>
      {pressHandler ? (
        <Pressable
          testID={testID}
          onPress={pressHandler}
          disabled={disabled}
          android_ripple={{ color: colors.pressed }}
          accessibilityRole={hasSwitch ? 'switch' : 'button'}
          accessibilityLabel={a11yLabel}
          accessibilityHint={accessibilityHint}
          accessibilityState={hasSwitch ? { checked: switchValue, disabled } : { disabled }}
          style={({ pressed }) => [
            styles.row,
            pressed && Platform.OS === 'ios' && { backgroundColor: colors.pressed },
            pressed && Platform.OS === 'web' && { backgroundColor: colors.pressed },
            disabled && styles.disabled,
          ]}
        >
          {body}
        </Pressable>
      ) : (
        <View testID={testID} style={styles.row} accessible accessibilityLabel={a11yLabel}>
          {body}
        </View>
      )}
      {divider ? <Divider inset={ROW_PAD + leadingWidth} /> : null}
    </View>
  );
}

/* ─── ListGroup ────────────────────────────────────────────────────────── */

export interface ListGroupProps {
  children: React.ReactNode;
  /** Intitulé de section (texte simple, pas en capitales). */
  header?: string;
  /** Note explicative sous le groupe. */
  footer?: string;
  style?: StyleProp<ViewStyle>;
}

/** Groupe de lignes façon réglages iOS / Material : feuille blanche, séparateurs automatiques. */
export function ListGroup({ children, header, footer, style }: ListGroupProps) {
  const items = React.Children.toArray(children).filter(React.isValidElement);
  return (
    <View style={style}>
      {header ? <Text style={styles.header} accessibilityRole="header">{header}</Text> : null}
      <View style={styles.group}>
        {items.map((child, i) => {
          const el = child as React.ReactElement<ListRowProps>;
          return React.cloneElement(el, {
            divider: el.props.divider ?? i < items.length - 1,
          });
        })}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sheet,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  header: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.inkSecondary,
    marginLeft: ROW_PAD,
    marginBottom: spacing.sm,
  },
  footer: {
    ...typography.footnote,
    color: colors.inkSecondary,
    marginHorizontal: ROW_PAD,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: ROW_PAD,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.4 },
  leading: { marginRight: spacing.ms },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, justifyContent: 'center' },
  title: { ...typography.body, color: colors.ink },
  subtitle: { ...typography.footnote, color: colors.inkSecondary, marginTop: 1 },
  value: {
    ...typography.callout,
    color: colors.inkSecondary,
    fontVariant: ['tabular-nums'],
    marginLeft: spacing.sm,
    maxWidth: '45%',
  },
  chevron: { marginLeft: spacing.xs },
});

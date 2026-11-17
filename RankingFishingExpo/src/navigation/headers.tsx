import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getHeaderTitle } from '@react-navigation/elements';
import type { NativeStackHeaderProps, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../theme';
import IconButton from '../components/ui/IconButton';
import ScreenHeader from '../components/ui/ScreenHeader';

/**
 * En-têtes de l'app (« fiche de pesée ») :
 *  - RootHeader : grand titre 32 pt pour les écrans racines (onglets) ;
 *  - InlineHeader : titre 17 pt centré + retour pour les écrans de détail.
 * Les deux : fond crème, liseré hairline en bas, aucune ombre.
 */

interface RootHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function RootHeader({ title, actions }: RootHeaderProps) {
  return <ScreenHeader title={title} actions={actions} safeTop style={styles.rootWrap} />;
}

interface InlineHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function InlineHeader({ title, onBack, right }: InlineHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.inlineWrap, { paddingTop: insets.top }]}>
      <View style={styles.inlineRow}>
        <View style={styles.side}>
          {onBack ? (
            <IconButton icon="chevron-back" iconSize={26} accessibilityLabel="Retour" onPress={onBack} />
          ) : null}
        </View>
        <Text style={styles.inlineTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </View>
  );
}

/** Adaptateur pour l'option `header` des native-stack (honore title et headerRight posés par l'écran). */
export function NativeInlineHeader({ navigation, route, options, back }: NativeStackHeaderProps) {
  const right = options.headerRight?.({ tintColor: colors.ink, canGoBack: !!back });
  return (
    <InlineHeader
      title={getHeaderTitle(options, route.name)}
      onBack={back ? navigation.goBack : undefined}
      right={right}
    />
  );
}

/** Options communes des écrans de détail d'une pile native. */
export const detailScreenOptions: NativeStackNavigationOptions = {
  header: (props) => <NativeInlineHeader {...props} />,
  contentStyle: { backgroundColor: colors.background },
};

const styles = StyleSheet.create({
  rootWrap: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  inlineWrap: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xs,
  },
  side: { width: 88, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
  inlineTitle: { ...typography.headline, color: colors.ink, flex: 1, textAlign: 'center' },
});

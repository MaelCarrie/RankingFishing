import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../store/types';
import { colors, spacing, typography } from '../../theme';
import BadgeIcon from '../badges/BadgeIcon';

interface Props {
  badges: Badge[];
  /** Texte si aucun badge obtenu. */
  emptyText: string;
  onPress?: () => void;
}

/** Rangée horizontale des badges obtenus (médaillon + nom), sans emoji. */
export default function ProfileBadgesStrip({ badges, emptyText, onPress }: Props) {
  if (badges.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {badges.map((b) => {
        const content = (
          <>
            <BadgeIcon badge={b} size={52} />
            <Text style={styles.name} numberOfLines={2}>{b.name}</Text>
          </>
        );
        return onPress ? (
          <Pressable
            key={b.id}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Badge ${b.name}, voir tous les badges`}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            {content}
          </Pressable>
        ) : (
          <View key={b.id} style={styles.item} accessible accessibilityLabel={`Badge ${b.name}`}>
            {content}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingRight: spacing.md },
  item: { width: 84, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs, borderRadius: 10 },
  pressed: { backgroundColor: colors.pressed },
  name: { ...typography.caption, color: colors.ink, textAlign: 'center', fontWeight: '500' },
  empty: { ...typography.subhead, color: colors.inkSecondary },
});

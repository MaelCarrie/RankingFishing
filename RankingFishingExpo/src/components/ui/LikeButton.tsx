import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../theme';
import { formatInt } from './format';
import { hapticLight } from './haptics';
import { useReduceMotion } from './hooks';

export interface LikeButtonProps {
  liked: boolean;
  /** Appelé avec le nouvel état. La mise à jour optimiste est à la charge de l'écran. */
  onToggle: (next: boolean) => void;
  count?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Cœur « J'aime » : pop ressort de 180 ms et haptique légère au like (natif),
 * simple changement d'état si « Réduire les animations ».
 */
export default function LikeButton({ liked, onToggle, count, disabled = false, style, testID }: LikeButtonProps) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const pop = () => {
    scale.stopAnimation();
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.25, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, stiffness: 520, damping: 14, mass: 0.6, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = () => {
    const next = !liked;
    if (next) {
      hapticLight();
      if (!reduceMotion) pop();
    }
    onToggle(next);
  };

  const label = liked ? 'Retirer le j’aime' : 'J’aime';
  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={count !== undefined ? `${label}, ${count} j’aime` : label}
      accessibilityState={{ selected: liked, disabled }}
      style={({ pressed }) => [styles.base, pressed && { opacity: 0.7 }, disabled && { opacity: 0.4 }, style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? colors.primary : colors.ink} />
      </Animated.View>
      {count !== undefined ? (
        <Text style={[styles.count, liked && { color: colors.primary }]}>{formatInt(count)}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', minWidth: 44, height: 44, paddingHorizontal: 6 },
  count: { ...typography.subhead, fontWeight: '600', color: colors.ink, marginLeft: 6, fontVariant: ['tabular-nums'] },
});

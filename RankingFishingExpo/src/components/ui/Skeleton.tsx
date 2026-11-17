import React, { useEffect, useRef, useState } from 'react';
import { Animated, DimensionValue, Easing, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius as radii, colors, spacing } from '../../theme';
import { useReduceMotion } from './hooks';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Ratio largeur / hauteur (remplace height), ex. 4 / 3 pour une photo. */
  aspectRatio?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Bloc de chargement. Reflet discret qui balaie ; statique si « Réduire les animations ». */
export default function Skeleton({ width = '100%', height = 14, aspectRatio, radius = 6, style }: SkeletonProps) {
  const reduceMotion = useReduceMotion();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion || !w) return;
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, w, x]);

  const band = Math.max(60, w * 0.6);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-band, w] });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={[{ width, ...(aspectRatio ? { aspectRatio } : { height }), borderRadius: radius, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }, style]}
    >
      {!reduceMotion && w > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, { width: band, transform: [{ translateX }] }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Squelette d'une feuille de capture (ligne pêcheur, photo 4:3, bande de pesée). */
export function CaptureSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[styles.sheet, style]}
      accessible
      accessibilityLabel="Chargement"
      accessibilityState={{ busy: true }}
    >
      <View style={styles.row}>
        <Skeleton width={36} height={36} radius={18} />
        <View style={styles.rowText}>
          <Skeleton width="45%" height={12} />
          <Skeleton width="30%" height={10} style={styles.gap} />
        </View>
      </View>
      <Skeleton aspectRatio={4 / 3} radius={0} />
      <View style={styles.strip}>
        <Skeleton width={84} height={26} />
        <Skeleton width={56} height={20} />
        <Skeleton width={56} height={20} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.sheet,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  rowText: { flex: 1, marginLeft: spacing.ms },
  gap: { marginTop: 6 },
  strip: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', padding: spacing.md },
});

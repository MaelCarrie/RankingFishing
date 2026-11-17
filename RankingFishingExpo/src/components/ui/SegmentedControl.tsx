import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { borderRadius, colors, motion, shadows, typography } from '../../theme';
import { useReduceMotion } from './hooks';
import { hapticSelection } from './haptics';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Décrit le groupe (« Période du classement »). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const HEIGHT = 44;
const PAD = 3;

/** Contrôle segmenté (périodes, onglets de classement). 2 à 5 segments. */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
  testID,
}: SegmentedControlProps<T>) {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segW = width > 0 ? (width - PAD * 2) / options.length : 0;
  const x = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (!segW) return;
    const to = index * segW;
    if (first.current || reduceMotion) {
      x.setValue(to);
      first.current = false;
      return;
    }
    Animated.timing(x, { toValue: to, duration: motion.base, easing: motion.easeOut, useNativeDriver: true }).start();
  }, [index, segW, reduceMotion, x]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      testID={testID}
      style={[styles.track, style]}
      onLayout={onLayout}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {segW > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { width: segW, transform: [{ translateX: x }] }]}
        />
      ) : null}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (!selected) {
                hapticSelection();
                onChange(o.value);
              }
            }}
            accessibilityRole="tab"
            accessibilityLabel={o.accessibilityLabel ?? o.label}
            accessibilityState={{ selected }}
            style={styles.segment}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, selected ? styles.labelSelected : null]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: HEIGHT,
    padding: PAD,
    borderRadius: borderRadius.control,
    backgroundColor: colors.surfaceMuted,
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    bottom: PAD,
    borderRadius: borderRadius.control - 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...shadows.sm,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  label: { ...typography.subhead, fontWeight: '500', color: colors.inkSecondary },
  labelSelected: { fontWeight: '600', color: colors.ink },
});

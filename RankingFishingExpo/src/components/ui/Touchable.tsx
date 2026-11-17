import React, { useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { motion } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TouchableProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: React.ReactNode;
  /** Style statique, ou fonction de l'état pressé. */
  style?: StyleProp<ViewStyle> | ((pressed: boolean) => StyleProp<ViewStyle>);
  /** Réduit l'élément à 0.98 pendant la pression (défaut : true). */
  scaleOnPress?: boolean;
  /** Opacité pendant la pression (défaut : 1, aucune variation). */
  pressedOpacity?: number;
}

/**
 * Pressable de base des primitives : retour de pression en 150 ms
 * (échelle 0.98 et/ou opacité), sur le thread natif.
 */
export default function Touchable({
  children,
  style,
  scaleOnPress = true,
  pressedOpacity = 1,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: TouchableProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState(false);

  const animate = (to: number) => {
    Animated.timing(progress, {
      toValue: to,
      duration: motion.fast,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  };

  const handleIn = (e: GestureResponderEvent) => {
    setPressed(true);
    animate(1);
    onPressIn?.(e);
  };
  const handleOut = (e: GestureResponderEvent) => {
    setPressed(false);
    animate(0);
    onPressOut?.(e);
  };

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, scaleOnPress ? motion.pressScale : 1],
  });
  const resolved = typeof style === 'function' ? style(pressed) : style;
  // L'opacité animée remplace celle du style : on la combine (ex. état désactivé à 0.4).
  const flatOpacity = StyleSheet.flatten(resolved)?.opacity;
  const baseOpacity = typeof flatOpacity === 'number' ? flatOpacity : 1;
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [baseOpacity, baseOpacity * pressedOpacity],
  });

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[resolved, { transform: [{ scale }], opacity }]}
    >
      {children}
    </AnimatedPressable>
  );
}

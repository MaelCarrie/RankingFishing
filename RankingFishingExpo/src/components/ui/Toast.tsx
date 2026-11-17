import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { borderRadius, colors, motion, shadows, spacing, typography } from '../../theme';
import { useReduceMotion } from './hooks';
import Touchable from './Touchable';

export type ToastTone = 'neutral' | 'success' | 'error';

export interface ToastOptions {
  tone?: ToastTone;
  /** Action courte (« Annuler », « Voir »). */
  action?: { label: string; onPress: () => void };
  /** Durée d'affichage en ms (défaut 3000, 5000 avec action). */
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

interface ToastApi {
  show: (message: string, options?: ToastOptions) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Retour transitoire (snackbar). Hors ToastProvider, ne fait rien. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return {
    show: (m: string) => {
      if (__DEV__) console.warn(`[useToast] ToastProvider absent, message ignoré : ${m}`);
    },
    hide: () => {},
  };
}

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Distance au bas de l'écran au-dessus de la zone sûre (défaut 72 : au-dessus de la barre d'onglets). */
  bottomOffset?: number;
}

/** À placer une fois, sous SafeAreaProvider, autour du navigateur. */
export function ToastProvider({ children, bottomOffset = 72 }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    if (timer.current) clearTimeout(timer.current);
    seq.current += 1;
    setToast({ id: seq.current, message, ...options });
    AccessibilityInfo.announceForAccessibility(message);
    const ms = options.duration ?? (options.action ? 5000 : 3000);
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const api = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={api}>
      <View style={styles.root}>
        {children}
        {toast ? <ToastView key={toast.id} toast={toast} onHide={hide} bottomOffset={bottomOffset} /> : null}
      </View>
    </ToastContext.Provider>
  );
}

const TONE_ICON = { neutral: null, success: 'checkmark-circle', error: 'alert-circle' } as const;
const TONE_COLOR = { neutral: '#FFFFFF', success: '#8FD694', error: '#FF8A80' };

function ToastView({ toast, onHide, bottomOffset }: { toast: ToastState; onHide: () => void; bottomOffset: number }) {
  const insets = useContext(SafeAreaInsetsContext);
  const reduceMotion = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: motion.base, easing: motion.easeOut, useNativeDriver: true }).start();
  }, [v]);

  const tone = toast.tone ?? 'neutral';
  const icon = TONE_ICON[tone];
  const translateY = reduceMotion ? 0 : v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        { bottom: (insets?.bottom ?? 0) + bottomOffset, opacity: v, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole={Platform.OS === 'web' ? undefined : 'alert'}>
        {icon ? <Ionicons name={icon} size={20} color={TONE_COLOR[tone]} style={styles.icon} /> : null}
        <Text style={styles.message} numberOfLines={3}>{toast.message}</Text>
        {toast.action ? (
          <Touchable
            onPress={() => { toast.action!.onPress(); onHide(); }}
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            style={styles.action}
            scaleOnPress={false}
            pressedOpacity={0.6}
          >
            <Text style={styles.actionText}>{toast.action.label}</Text>
          </Touchable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  host: { position: 'absolute', left: spacing.md, right: spacing.md },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.control,
    backgroundColor: colors.ink,
    ...shadows.lg,
  },
  icon: { marginRight: spacing.sm },
  message: { ...typography.callout, color: '#FFFFFF', flex: 1, paddingVertical: spacing.sm },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.ms, marginLeft: spacing.xs },
  actionText: { ...typography.callout, fontWeight: '600', color: '#9CD8A0' },
});

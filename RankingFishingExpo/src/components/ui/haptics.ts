import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Les retours haptiques ne font rien sur le web (Expo web sert aux tests).
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export function hapticLight(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticSelection(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

export function hapticSuccess(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

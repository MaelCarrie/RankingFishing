// ─── Préférences locales (issue #30) ─────────────────────────────────────────
//
// Les notifications push ne sont pas encore branchées (pas de compte Expo
// Push ni de table côté serveur) : les choix sont mémorisés sur l'appareil,
// par utilisateur, et serviront quand l'envoi sera en place.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPrefs {
  messages: boolean;
  followRequests: boolean;
  likesAndComments: boolean;
  badges: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  messages: true,
  followRequests: true,
  likesAndComments: true,
  badges: true,
};

const notifKey = (userId: string) => `@rankingfishing_notif_prefs:${userId}`;

export async function loadNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  try {
    const json = await AsyncStorage.getItem(notifKey(userId));
    if (!json) return DEFAULT_NOTIFICATION_PREFS;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...(JSON.parse(json) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export async function saveNotificationPrefs(userId: string, prefs: NotificationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(notifKey(userId), JSON.stringify(prefs));
  } catch {
    // stockage indisponible : le réglage reste valable pour la session
  }
}

// ─── Onboarding (issue #25) ──────────────────────────────────────────────────
// Drapeau par appareil : la présentation s'affiche une seule fois.

const ONBOARDING_KEY = '@rankingfishing_onboarding_done';

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1';
  } catch {
    // Stockage illisible : on ne bloque pas l'accès à l'app
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // ignore
  }
}

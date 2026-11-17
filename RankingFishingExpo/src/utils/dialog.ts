// ─── Dialogues multiplateformes ──────────────────────────────────────────────
//
// Alert.alert est un no-op sur react-native-web : sur web on se rabat sur
// window.alert / window.confirm pour que les tests Playwright (Expo web)
// puissent voir et accepter les dialogues.

import { Alert, Platform } from 'react-native';

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return Promise.resolve(false);
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/**
 * Attend la fin de l'animation de fermeture d'un Modal avant d'en présenter un
 * autre (sélecteur de photos, appareil photo…). Sur iOS, présenter un contrôleur
 * pendant qu'un Modal se ferme échoue en silence : la galerie ne s'ouvre pas.
 */
export function afterModalClose(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Platform.OS === 'ios' ? 450 : 80));
}

export type LeaveChoice = 'save' | 'discard' | 'cancel';

/**
 * Quitter un formulaire modifié : Enregistrer / Ne pas enregistrer / Continuer.
 * Sur web (pas d'Alert à 3 boutons), window.confirm : OK = enregistrer,
 * Annuler = quitter sans enregistrer.
 */
export function askSaveBeforeLeaving({
  title = 'Enregistrer les modifications ?',
  message = 'Tu as des changements non enregistrés.',
}: { title?: string; message?: string } = {}): Promise<LeaveChoice> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return Promise.resolve('discard');
    return Promise.resolve(window.confirm(`${title}\n\n${message}`) ? 'save' : 'discard');
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Continuer la saisie', style: 'cancel', onPress: () => resolve('cancel') },
        { text: 'Ne pas enregistrer', style: 'destructive', onPress: () => resolve('discard') },
        { text: 'Enregistrer', onPress: () => resolve('save') },
      ],
      { cancelable: true, onDismiss: () => resolve('cancel') }
    );
  });
}

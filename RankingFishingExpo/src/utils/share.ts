// ─── Partage externe d'une capture (issue #31) ──────────────────────────────

import { Platform, Share } from 'react-native';
import { Capture } from '../store/types';
import { formatWeight } from './formatting';

// Base des liens partagés. Si EXPO_PUBLIC_SHARE_BASE_URL est défini (ex. une
// page web publique), on l'utilise ; sinon on tombe sur le schéma d'app
// `rankingfishing://` (à déclarer dans app.json → "scheme" pour l'ouverture).
const SHARE_BASE_URL = process.env.EXPO_PUBLIC_SHARE_BASE_URL;

export function buildCaptureShareUrl(captureId: string): string {
  if (SHARE_BASE_URL) return `${SHARE_BASE_URL.replace(/\/$/, '')}/capture/${captureId}`;
  return `rankingfishing://capture/${captureId}`;
}

export function buildCaptureShareMessage(capture: Capture): string {
  const species = capture.species?.nameFr ?? 'Une belle prise';
  const parts = [formatWeight(capture.weightGrams)];
  if (capture.sizeCm > 0) parts.push(`${capture.sizeCm} cm`);
  return `${species} de ${parts.join(', ')} par ${capture.username} sur RankingFishing (${capture.score} pts).`;
}

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'unavailable';

/**
 * Ouvre la feuille de partage système. Sur web, utilise navigator.share si le
 * navigateur le propose, sinon copie le texte + lien dans le presse-papiers.
 */
export async function shareCaptureExternally(capture: Capture): Promise<ShareOutcome> {
  const url = buildCaptureShareUrl(capture.id);
  const message = buildCaptureShareMessage(capture);

  if (Platform.OS === 'web') {
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
    try {
      if (nav?.share) {
        await nav.share({ title: 'RankingFishing', text: message, url });
        return 'shared';
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(`${message} ${url}`);
        return 'copied';
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'dismissed';
    }
    return 'unavailable';
  }

  // iOS lit `url` séparément ; Android n'affiche que `message`, on y ajoute le lien
  const result = await Share.share(
    Platform.OS === 'ios'
      ? { message, url, title: 'RankingFishing' }
      : { message: `${message}\n${url}`, title: 'RankingFishing' },
    { dialogTitle: 'Partager la prise' }
  );
  return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
}

import React, { useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store';
import { shiftNewlyUnlocked } from '../../store/slices/badgesSlice';
import { Badge } from '../../store/types';
import BadgeUnlockSheet from '../ui/BadgeUnlockSheet';

/**
 * Branche la file `state.badges.newlyUnlocked` (alimentée et dédoublonnée par le
 * slice badges) sur la feuille signature `ui/BadgeUnlockSheet`.
 *
 * Les badges sont montrés un par un ; « Continuer » passe au suivant. Seul l'écran
 * focalisé affiche la feuille : le composant peut être monté sur plusieurs écrans
 * (Nouvelle capture, Badges) sans jamais empiler deux célébrations.
 */
export default function BadgeUnlockHost() {
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const current = useAppSelector((s) => s.badges.newlyUnlocked?.[0] ?? null);
  // Garde le dernier badge affiché pendant l'animation de fermeture
  const lastShown = useRef<Badge | null>(current);
  if (current) lastShown.current = current;
  const badge = current ?? lastShown.current;

  if (!badge) return null;

  return (
    <BadgeUnlockSheet
      visible={isFocused && !!current}
      onClose={() => dispatch(shiftNewlyUnlocked())}
      badgeName={badge.name}
      description={badge.description}
      xpGained={badge.xpReward ?? 0}
      category={badge.category}
    />
  );
}

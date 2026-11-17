import React from 'react';
import { View } from 'react-native';
import UIAvatar from '../ui/Avatar';
import { colors } from '../../theme';

/**
 * Ancienne API d'avatar, conservée pour les écrans existants.
 * Rendu délégué à `ui/Avatar` : initiales sur teinte sobre, pastille étoile or
 * pour Premium (plus d'emoji). `showBorder` ajoute un anneau de 2 pt (à l'intérieur de `size`).
 */
interface AvatarProps {
  username: string;
  uri?: string | null;
  size?: number;
  showBorder?: boolean;
  isPremium?: boolean;
  borderColor?: string;
}

export default function Avatar({ username, uri, size = 40, showBorder = false, isPremium = false, borderColor }: AvatarProps) {
  if (!showBorder) return <UIAvatar username={username} uri={uri} size={size} premium={isPremium} />;
  const ring = borderColor ?? (isPremium ? colors.secondary : colors.primary);
  return (
    <View
      style={{
        // L'anneau reste dans l'encombrement demandé (pas de décalage de mise en page)
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: ring,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <UIAvatar username={username} uri={uri} size={size - 6} premium={isPremium} />
    </View>
  );
}

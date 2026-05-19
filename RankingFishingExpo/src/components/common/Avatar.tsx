import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, borderRadius, typography } from '../../theme';
import { getInitials, getAvatarColor } from '../../utils/helpers';

interface AvatarProps {
  username: string;
  uri?: string;
  size?: number;
  showBorder?: boolean;
  isPremium?: boolean;
  borderColor?: string;
}

export default function Avatar({ username, uri, size = 40, showBorder = false, isPremium = false, borderColor }: AvatarProps) {
  const initials = getInitials(username);
  const bgColor = getAvatarColor(username);

  return (
    <View style={[
      styles.wrapper,
      { width: size, height: size, borderRadius: size / 2 },
      showBorder && { borderWidth: 2, borderColor: borderColor ?? (isPremium ? colors.premium : colors.primary) },
    ]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.placeholder, { borderRadius: size / 2, backgroundColor: bgColor }]}>
          <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
        </View>
      )}
      {isPremium && (
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumIcon}>⭐</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'visible' },
  image: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.premium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumIcon: { fontSize: 8 },
});

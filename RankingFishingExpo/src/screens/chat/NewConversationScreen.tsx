import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { openDirectConversation } from '../../store/slices/chatSlice';
import { ChatStackParamList } from '../../navigation/types';
import { UserSearchResult } from '../../api/users';
import { colors, spacing, typography, borderRadius } from '../../theme';
import ChatUserPicker from '../../components/chat/ChatUserPicker';

type Props = NativeStackScreenProps<ChatStackParamList, 'NewConversation'>;

// Nouveau message (#33) : choisir un pêcheur → ouvrir ou créer la conversation 1:1
export default function NewConversationScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(target: UserSearchResult) {
    if (!user || busyUserId) return;
    setBusyUserId(target.id);
    setError(null);
    try {
      const conversation = await dispatch(openDirectConversation({
        me: { id: user.id, username: user.username, avatar: user.avatar },
        other: { id: target.id, username: target.username, avatar: target.avatar },
      })).unwrap();
      navigation.replace('Conversation', { conversation });
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message ?? 'Impossible d\'ouvrir la conversation');
      setBusyUserId(null);
    }
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <ChatUserPicker currentUserId={user?.id} onSelect={handleSelect} busyUserId={busyUserId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.errorLight,
  },
  errorText: { ...typography.bodySmall, color: colors.textPrimary, flex: 1 },
});

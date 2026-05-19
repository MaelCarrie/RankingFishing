import React, { useEffect } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchConversations, setActiveConversation } from '../../store/slices/chatSlice';
import { Conversation } from '../../store/types';
import { ChatStackParamList } from '../../navigation/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Avatar from '../../components/common/Avatar';
import { formatRelativeDate } from '../../utils/formatting';
import { truncate } from '../../utils/helpers';

type Nav = NativeStackNavigationProp<ChatStackParamList>;

function ConversationItem({ conv, onPress }: { conv: Conversation; onPress: () => void }) {
  const isGroup = conv.type === 'group';
  const name = isGroup ? conv.name ?? 'Groupe' : conv.participantNames.find((n) => n !== 'PierreM') ?? '';
  const lastText = conv.lastMessage?.content ?? '';

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarWrapper}>
        {isGroup ? (
          <View style={[styles.groupAvatar, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="people" size={22} color="#fff" />
          </View>
        ) : (
          <Avatar username={name} uri={conv.avatar} size={50} />
        )}
        {conv.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <Text style={[styles.itemName, conv.unreadCount > 0 && styles.itemNameUnread]}>{name}</Text>
          <Text style={styles.itemDate}>{formatRelativeDate(conv.updatedAt)}</Text>
        </View>
        <Text
          style={[styles.itemLast, conv.unreadCount > 0 && styles.itemLastUnread]}
          numberOfLines={1}
        >
          {conv.lastMessage?.senderId === 'user_me' ? 'Vous : ' : ''}
          {truncate(lastText, 50)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { conversations, isLoading } = useAppSelector((s) => s.chat);

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  function openConversation(conv: Conversation) {
    dispatch(setActiveConversation(conv));
    navigation.navigate('Conversation', { conversation: conv });
  }

  if (isLoading && conversations.length === 0) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ConversationItem conv={item} onPress={() => openConversation(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptyText}>Commence à discuter avec d'autres pêcheurs !</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB nouveau message */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="create-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flexGrow: 1 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  avatarWrapper: { position: 'relative' },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: { ...typography.caption, color: '#fff', fontWeight: '900', fontSize: 10 },

  itemContent: { flex: 1 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  itemName: { ...typography.h4, color: colors.textPrimary },
  itemNameUnread: { color: colors.textPrimary, fontWeight: '900' },
  itemDate: { ...typography.caption, color: colors.textSecondary },
  itemLast: { ...typography.bodySmall, color: colors.textSecondary },
  itemLastUnread: { color: colors.textPrimary, fontWeight: '600' },

  separator: { height: 1, backgroundColor: colors.border, marginLeft: 80 },

  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyIcon: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },

  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
});

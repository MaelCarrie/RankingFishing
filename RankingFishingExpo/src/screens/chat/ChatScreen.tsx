import React, { useCallback, useEffect, useLayoutEffect } from 'react';
import {
  View, FlatList, StyleSheet, Text, Pressable, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchConversations, handleIncomingMessage } from '../../store/slices/chatSlice';
import { getConversationAvatar, getConversationTitle, subscribeToInbox } from '../../api/chat';
import { Conversation } from '../../store/types';
import { ChatStackParamList } from '../../navigation/types';
import { RootHeader } from '../../navigation/headers';
import { colors, spacing, typography } from '../../theme';
import { Avatar, EmptyState, ErrorState, IconButton, Skeleton } from '../../components/ui';
import { formatRelativeDate } from '../../utils/formatting';
import { truncate } from '../../utils/helpers';

type Nav = NativeStackNavigationProp<ChatStackParamList>;

function lastMessagePreview(conv: Conversation, myId?: string): { text: string; isCapture: boolean } {
  const last = conv.lastMessage;
  if (!last) return { text: 'Nouvelle conversation', isCapture: false };
  const isOwn = !!myId && last.senderId === myId;
  const prefix = isOwn ? 'Toi : ' : conv.type === 'group' && last.senderName ? `${last.senderName} : ` : '';
  if (last.type === 'capture') {
    const species = last.captureRef?.species;
    return { text: `${prefix}Capture partagée${species ? ` · ${species}` : ''}`, isCapture: true };
  }
  return { text: prefix + truncate(last.content ?? '', 60), isCapture: false };
}

function ConversationItem({ conv, myId, onPress }: { conv: Conversation; myId?: string; onPress: () => void }) {
  const isGroup = conv.type === 'group';
  const name = getConversationTitle(conv);
  const unread = conv.unreadCount > 0;
  const preview = lastMessagePreview(conv, myId);

  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={onPress}
      android_ripple={{ color: colors.pressed }}
      accessibilityRole="button"
      accessibilityLabel={`Conversation avec ${name}${unread ? `, ${conv.unreadCount} non lu${conv.unreadCount > 1 ? 's' : ''}` : ''}`}
      testID={`conversation-${conv.id}`}
    >
      {isGroup ? (
        <View style={styles.groupAvatar}>
          <Ionicons name="people-outline" size={22} color={colors.primaryDark} />
        </View>
      ) : (
        <Avatar username={name} uri={getConversationAvatar(conv)} size={AVATAR} />
      )}
      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <Text style={[styles.itemName, unread && styles.itemNameUnread]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.itemDate, unread && styles.itemDateUnread]}>{formatRelativeDate(conv.updatedAt)}</Text>
        </View>
        <View style={styles.itemBottom}>
          {preview.isCapture && (
            <Ionicons name="fish-outline" size={14} color={unread ? colors.ink : colors.inkSecondary} />
          )}
          <Text style={[styles.itemLast, unread && styles.itemLastUnread]} numberOfLines={1}>
            {preview.text}
          </Text>
          {unread && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ConversationSkeleton() {
  return (
    <View accessible accessibilityLabel="Chargement des conversations" accessibilityState={{ busy: true }}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={styles.item}>
          <Skeleton width={AVATAR} height={AVATAR} radius={AVATAR / 2} />
          <View style={styles.itemContent}>
            <Skeleton width="45%" height={14} />
            <Skeleton width="75%" height={12} style={styles.skeletonGap} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ChatScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { conversations, isLoading, error } = useAppSelector((s) => s.chat);
  const { user } = useAppSelector((s) => s.auth);

  const visible = conversations.filter((c) => c.lastMessage || c.type === 'group');

  const load = useCallback(() => {
    if (user?.id) dispatch(fetchConversations(user.id));
  }, [dispatch, user?.id]);

  // Recharge à chaque retour sur la liste (aperçus et non-lus à jour)
  useFocusEffect(load);

  // Temps réel : nouveaux messages de toutes mes conversations → aperçu + non-lus.
  // L'écran reste monté sous la conversation ouverte, donc l'abonnement aussi.
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToInbox(user.id, (message) => {
      dispatch(handleIncomingMessage(message));
    });
    return unsubscribe;
  }, [dispatch, user?.id]);

  // « Nouveau message » (#33) : icône d'en-tête, à la place de l'ancien bouton flottant
  useLayoutEffect(() => {
    // L'en-tête racine (RootHeader, restyle A) ne lit pas headerRight : on le
    // reconstruit ici avec l'action, en gardant le même composant.
    const newMessageButton = (
      <IconButton
        icon="create-outline"
        accessibilityLabel="Nouveau message"
        onPress={() => navigation.navigate('NewConversation')}
        testID="chat-new-message-fab"
      />
    );
    navigation.setOptions({
      headerRight: () => newMessageButton,
      header: () => <RootHeader title="Messages" actions={newMessageButton} />,
    });
  }, [navigation]);

  function openConversation(conv: Conversation) {
    navigation.navigate('Conversation', { conversation: conv });
  }

  function openNewConversation() {
    navigation.navigate('NewConversation');
  }

  let content: React.ReactNode;
  if (isLoading && visible.length === 0) {
    content = <ConversationSkeleton />;
  } else if (error && visible.length === 0) {
    content = (
      <View style={styles.state}>
        <ErrorState
          title="Messages indisponibles"
          message={`${error}\nVérifie ta connexion puis réessaie.`}
          onRetry={load}
        />
      </View>
    );
  } else {
    content = (
      <FlatList
        data={visible}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ConversationItem conv={item} myId={user?.id} onPress={() => openConversation(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && visible.length > 0}
            onRefresh={load}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.state}>
            <EmptyState
              icon="chatbubbles-outline"
              title="Aucun message"
              message="Écris à un pêcheur pour parler spots, montages ou dernières prises."
              actionLabel="Écrire un message"
              onAction={openNewConversation}
            />
          </View>
        }
        contentContainerStyle={visible.length === 0 ? styles.listEmpty : styles.list}
        style={styles.flatList}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const AVATAR = 48;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flatList: { flex: 1 },
  list: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  listEmpty: { flexGrow: 1 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    minHeight: 72,
    backgroundColor: colors.surface,
    gap: spacing.ms,
  },
  itemPressed: { backgroundColor: colors.background },
  groupAvatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemContent: { flex: 1, minWidth: 0 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm, marginBottom: 2 },
  itemName: { ...typography.headline, fontWeight: '500', color: colors.ink, flex: 1 },
  itemNameUnread: { fontWeight: '700' },
  itemDate: { ...typography.caption, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
  itemDateUnread: { color: colors.primary, fontWeight: '600' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 20 },
  itemLast: { ...typography.subhead, color: colors.inkSecondary, flex: 1 },
  itemLastUnread: { color: colors.ink, fontWeight: '500' },
  unreadPill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.xs,
  },
  unreadText: { ...typography.caption, color: colors.textOnPrimary, fontWeight: '700', fontVariant: ['tabular-nums'] },

  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: spacing.md + AVATAR + spacing.ms },
  skeletonGap: { marginTop: spacing.sm },

  state: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
});

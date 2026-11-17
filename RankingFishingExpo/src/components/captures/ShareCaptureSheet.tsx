import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Capture, Conversation } from '../../store/types';
import { useAppSelector } from '../../store';
import {
  fetchConversations, getConversationAvatar, getConversationTitle,
  getOrCreateDirectConversation, shareCaptureToConversation,
} from '../../api/chat';
import { searchUsers, UserSearchResult } from '../../api/users';
import { shareCaptureExternally } from '../../utils/share';
import { colors, spacing, typography, borderRadius } from '../../theme';
import ActionSheet from '../common/ActionSheet';
import Avatar from '../common/Avatar';

// Feuille de partage d'une capture (issue #31) :
//  1. « Envoyer à un pêcheur » → choix d'une conversation ou d'un pêcheur → chat
//  2. « Partager… » → feuille de partage système (texte + lien)

interface Props {
  capture: Capture;
  visible: boolean;
  onClose: () => void;
}

type Step = 'options' | 'recipients' | 'sent';

type Recipient =
  | { kind: 'conversation'; id: string; title: string; avatar?: string; conversation: Conversation }
  | { kind: 'user'; id: string; title: string; avatar?: string; user: UserSearchResult };

export default function ShareCaptureSheet({ capture, visible, onClose }: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const [step, setStep] = useState<Step>('options');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState('');

  useEffect(() => {
    if (visible) {
      setStep('options');
      setFeedback(null);
    }
  }, [visible]);

  async function handleExternalShare() {
    try {
      const outcome = await shareCaptureExternally(capture);
      if (outcome === 'copied') setFeedback('Lien copié dans le presse-papiers.');
      else if (outcome === 'unavailable') setFeedback("Le partage n'est pas disponible sur cet appareil.");
      else onClose();
    } catch {
      setFeedback("Le partage n'a pas pu s'ouvrir. Réessaie.");
    }
  }

  const options = [
    {
      key: 'chat',
      label: 'Envoyer à un pêcheur',
      description: capture.isDraft ? 'Publie la prise pour pouvoir l\'envoyer' : 'Dans une conversation RankingFishing',
      icon: 'paper-plane-outline' as const,
      disabled: capture.isDraft,
      onPress: () => setStep('recipients'),
    },
    {
      key: 'external',
      label: 'Partager…',
      description: 'Messagerie, réseaux sociaux, e-mail',
      icon: 'share-social-outline' as const,
      disabled: capture.isDraft,
      onPress: handleExternalShare,
    },
  ];

  const species = capture.species?.nameFr ?? 'cette prise';

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      title={step === 'recipients' ? 'Envoyer à un pêcheur' : step === 'sent' ? undefined : 'Partager la prise'}
      message={step === 'options' ? `${species} de ${capture.username}` : undefined}
      options={options}
      cancelLabel={step === 'recipients' ? 'Annuler' : 'Fermer'}
      testID="share-capture-sheet"
      footer={step === 'options' && feedback
        ? <Text style={styles.feedback} accessibilityLiveRegion="polite">{feedback}</Text>
        : undefined}
    >
      {step === 'recipients' && user ? (
        <RecipientPicker
          capture={capture}
          me={{ id: user.id, username: user.username, avatar: user.avatar }}
          onBack={() => setStep('options')}
          onSent={(name) => { setSentTo(name); setStep('sent'); }}
        />
      ) : step === 'sent' ? (
        <View style={styles.sent} accessibilityLiveRegion="polite">
          <View style={styles.sentIcon}>
            <Ionicons name="checkmark" size={28} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.sentTitle}>Prise envoyée</Text>
          <Text style={styles.sentText}>{sentTo} la verra dans ses messages.</Text>
        </View>
      ) : undefined}
    </ActionSheet>
  );
}

function RecipientPicker({
  capture, me, onBack, onSent,
}: {
  capture: Capture;
  me: { id: string; username: string; avatar?: string };
  onBack: () => void;
  onSent: (name: string) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const searchSeq = useRef(0);

  function loadConversations() {
    setLoadError(false);
    setConversations(null);
    fetchConversations(me.id)
      .then(setConversations)
      .catch(() => { setLoadError(true); setConversations([]); });
  }

  useEffect(loadConversations, [me.id]);

  // Recherche de pêcheurs (debounce 300 ms)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    const seq = ++searchSeq.current;
    setSearching(true);
    const t = setTimeout(() => {
      searchUsers(q)
        .then((r) => { if (seq === searchSeq.current) setResults(r.filter((u) => u.id !== me.id)); })
        .catch(() => { if (seq === searchSeq.current) setResults([]); })
        .finally(() => { if (seq === searchSeq.current) setSearching(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [query, me.id]);

  const recipients: Recipient[] = useMemo(() => {
    if (query.trim().length >= 2) {
      return results.map((u) => ({ kind: 'user', id: `u_${u.id}`, title: u.username, avatar: u.avatar, user: u }));
    }
    return (conversations ?? []).map((c) => ({
      kind: 'conversation', id: `c_${c.id}`, title: getConversationTitle(c), avatar: getConversationAvatar(c), conversation: c,
    }));
  }, [conversations, results, query]);

  async function send(r: Recipient) {
    if (sendingId) return;
    setSendingId(r.id);
    setSendError(null);
    try {
      const conversation = r.kind === 'conversation'
        ? r.conversation
        : await getOrCreateDirectConversation(me, { id: r.user.id, username: r.user.username, avatar: r.user.avatar });
      await shareCaptureToConversation(conversation.id, capture, { sender: me });
      onSent(r.title);
    } catch (e: any) {
      setSendError(e?.message ?? "L'envoi a échoué. Réessaie.");
    } finally {
      setSendingId(null);
    }
  }

  const isSearch = query.trim().length >= 2;

  return (
    <View style={styles.picker}>
      <Pressable
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Retour aux options de partage"
      >
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Options de partage</Text>
      </Pressable>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un pêcheur"
          placeholderTextColor={colors.inkTertiary}
          selectionColor={colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Rechercher un pêcheur"
        />
        {searching && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <Text style={styles.listTitle}>{isSearch ? 'Pêcheurs' : 'Conversations récentes'}</Text>

      {conversations === null && !isSearch ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : (
        <FlatList
          data={recipients}
          keyExtractor={(r) => r.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.recipient, pressed && styles.pressed]}
              onPress={() => send(item)}
              disabled={!!sendingId}
              accessibilityRole="button"
              accessibilityLabel={`Envoyer à ${item.title}`}
            >
              <Avatar username={item.title} uri={item.avatar} size={40} />
              <Text style={styles.recipientName} numberOfLines={1}>{item.title}</Text>
              {sendingId === item.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={styles.sendChip}>
                  <Text style={styles.sendChipText}>Envoyer</Text>
                </View>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {isSearch
                ? (searching ? 'Recherche…' : 'Aucun pêcheur trouvé.')
                : loadError
                  ? 'Impossible de charger tes conversations.'
                  : 'Pas encore de conversation : recherche un pêcheur ci-dessus.'}
            </Text>
          }
        />
      )}

      {loadError && !isSearch && (
        <Pressable
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          onPress={loadConversations}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Recharger les conversations</Text>
        </Pressable>
      )}
      {sendError && <Text style={styles.error} accessibilityRole="alert">{sendError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  feedback: { ...typography.subhead, color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xs },
  pressed: { backgroundColor: colors.pressed },

  picker: { minHeight: 320 },
  back: {
    flexDirection: 'row', alignItems: 'center', minHeight: 44, alignSelf: 'flex-start',
    paddingRight: spacing.sm, borderRadius: borderRadius.control,
  },
  backText: { ...typography.subhead, color: colors.primary, fontWeight: '600' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.control,
    borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: spacing.md - 1, minHeight: 48,
  },
  searchInput: { flex: 1, minWidth: 0, ...typography.body, color: colors.ink, paddingVertical: spacing.sm },
  listTitle: { ...typography.subhead, fontWeight: '600', color: colors.inkSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  list: { maxHeight: 340 },
  recipient: {
    flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: spacing.ms,
    paddingHorizontal: spacing.xs, borderRadius: borderRadius.control,
  },
  recipientName: { ...typography.body, fontWeight: '600', color: colors.ink, flex: 1 },
  sendChip: {
    minHeight: 32, paddingHorizontal: spacing.ms, borderRadius: borderRadius.control,
    backgroundColor: colors.primaryTint, justifyContent: 'center',
  },
  sendChipText: { ...typography.subhead, color: colors.primaryDark, fontWeight: '600' },
  empty: { ...typography.subhead, color: colors.inkSecondary, paddingVertical: spacing.lg, textAlign: 'center' },
  retry: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.control },
  retryText: { ...typography.subhead, color: colors.primary, fontWeight: '600' },
  error: { ...typography.subhead, color: colors.error, marginTop: spacing.sm, textAlign: 'center' },

  sent: { alignItems: 'center', paddingVertical: spacing.lg },
  sentIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  sentTitle: { ...typography.headline, color: colors.ink },
  sentText: { ...typography.body, color: colors.inkSecondary, marginTop: 4, textAlign: 'center' },
});

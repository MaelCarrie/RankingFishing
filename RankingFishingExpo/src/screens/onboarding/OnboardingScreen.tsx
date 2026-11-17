import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FISH_SPECIES, calculateCaptureScore } from '../../config/constants';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import SpeciesMark from '../../components/ui/SpeciesMark';
import WeighInStrip from '../../components/ui/WeighInStrip';
import RankBadge, { RankDelta } from '../../components/ui/RankBadge';
import XPBar from '../../components/ui/XPBar';
import { badgeIconFor } from '../../components/ui/BadgeUnlockSheet';
import Logo from '../../components/ui/Logo';
import { formatInt } from '../../components/ui/format';
import { markOnboardingSeen } from '../../utils/preferences';

// Présentation en 3 écrans (issue #25), affichée une seule fois par appareil.
// Les visuels sont des compositions des vrais composants de l'app (bande de
// pesée, ligne de classement, badge) avec des valeurs d'exemple.

interface Props {
  /** Fourni par AppNavigator au premier lancement ; sinon retour arrière (revoir depuis Paramètres). */
  onDone?: () => void;
}

const SLIDES = [
  {
    key: 'capture',
    title: 'Enregistre tes prises',
    text: "Espèce, poids, taille et jusqu'à 3 photos : ta prise est publiée en quelques secondes, au bord de l'eau.",
  },
  {
    key: 'rank',
    title: 'Grimpe au classement',
    text: 'Chaque prise rapporte des points. Compare-toi à tes amis, à ta région et à toute la communauté.',
  },
  {
    key: 'badge',
    title: 'Débloque des badges',
    text: "Gagne de l'XP, monte de niveau et collectionne les badges au fil de tes sorties.",
  },
] as const;

export default function OnboardingScreen({ onDone }: Props) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  async function finish() {
    await markOnboardingSeen();
    if (onDone) onDone();
    else if (navigation.canGoBack()) navigation.goBack();
  }

  function goTo(i: number) {
    setIndex(i);
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (i !== index) setIndex(Math.min(SLIDES.length - 1, Math.max(0, i)));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="onboarding">
      <View style={styles.topBar}>
        <Logo size={32} />
        {!isLast ? (
          <Button title="Passer" variant="text" size="sm" onPress={finish} testID="onboarding-skip" />
        ) : (
          <View style={styles.topBarSpacer} />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => (
          <View
            key={slide.key}
            style={[styles.page, { width }]}
            accessibilityElementsHidden={i !== index}
            importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
          >
            <View style={styles.visual} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {slide.key === 'capture' && <CaptureVisual />}
              {slide.key === 'rank' && <RankVisual />}
              {slide.key === 'badge' && <BadgeVisual />}
            </View>
            <View style={styles.copy}>
              <Text style={styles.title} accessibilityRole="header">{slide.title}</Text>
              <Text style={styles.text}>{slide.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessible accessibilityLabel={`Étape ${index + 1} sur ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button
          title={isLast ? 'Commencer à pêcher' : 'Continuer'}
          onPress={isLast ? finish : () => goTo(index + 1)}
          fullWidth
          testID="onboarding-next"
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Visuels : vrais composants, valeurs d'exemple ──────────────────────────

const PIKE = FISH_SPECIES.find((s) => s.id === 'pike') ?? FISH_SPECIES[0];
const EXAMPLE_WEIGHT = 7200;

function CaptureVisual() {
  // Pas de fausses vignettes photo : la fiche de pesée porte la prise à elle seule.
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar username="Toi" size={36} />
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>Toi</Text>
          <Text style={styles.cardMeta}>Aujourd'hui à 07:40 · Lac du Der</Text>
        </View>
      </View>
      <View style={styles.speciesRow}>
        <SpeciesMark name={PIKE.nameFr} speciesId={PIKE.id} size={40} />
        <Text style={[styles.cardTitle, styles.speciesName]}>{PIKE.nameFr}</Text>
      </View>
      <WeighInStrip
        weightGrams={EXAMPLE_WEIGHT}
        lengthCm={92}
        score={calculateCaptureScore(EXAMPLE_WEIGHT, PIKE)}
        size="lg"
        ruled
      />
      <View style={styles.cardActions}>
        <Ionicons name="heart-outline" size={22} color={colors.inkSecondary} />
        <Text style={styles.cardMeta}>12</Text>
        <Ionicons name="chatbubble-outline" size={20} color={colors.inkSecondary} style={styles.cardActionGap} />
        <Text style={styles.cardMeta}>3</Text>
      </View>
    </View>
  );
}

const RANK_ROWS = [
  { rank: 8, name: 'black_bass_33', score: 1598, me: false },
  { rank: 9, name: 'sandre_loire', score: 1521, me: false },
  { rank: 10, name: 'truite_vive', score: 1440, me: false },
  { rank: 11, name: 'carpiste_44', score: 1384, me: false },
  { rank: 12, name: 'Toi', score: 1352, me: true },
  { rank: 13, name: 'mouche_dordogne', score: 1297, me: false },
  { rank: 14, name: 'perche_rouge', score: 1236, me: false },
  { rank: 15, name: 'silure_garonne', score: 1190, me: false },
];

function RankVisual() {
  // Petit écran : 6 lignes autour de « Toi » ; sinon 8, pour remplir la hauteur.
  const { height } = useWindowDimensions();
  const rows = height >= 760 ? RANK_ROWS : RANK_ROWS.slice(1, -1);
  return (
    <View style={[styles.card, styles.cardFlush]}>
      {rows.map((r, i) => (
        <View
          key={r.rank}
          style={[styles.rankRow, r.me && styles.rankRowMe, i < rows.length - 1 && styles.rankRowDivider]}
        >
          <RankBadge rank={r.rank} size="sm" />
          <Avatar username={r.name} size={32} style={styles.rankAvatar} />
          <Text style={[styles.rankName, r.me && styles.rankNameMe]} numberOfLines={1}>{r.name}</Text>
          {r.me && <RankDelta delta={3} style={styles.rankDelta} />}
          <Text style={styles.rankScore}>{formatInt(r.score)} pts</Text>
        </View>
      ))}
    </View>
  );
}

// Prochains badges du catalogue (noms réels), affichés verrouillés
const NEXT_BADGES = [
  { name: 'Pêcheur actif', category: 'progression' },
  { name: 'Chasseur de brochets', category: 'excellence' },
  { name: 'Pêcheur de printemps', category: 'seasonal' },
] as const;

function BadgeVisual() {
  const { height } = useWindowDimensions();
  const roomy = height >= 760;
  return (
    <View style={[styles.card, styles.badgeCard]}>
      <View style={styles.badgeTile}>
        <Ionicons name={badgeIconFor('progression')} size={40} color={colors.goldInk} />
      </View>
      <Text style={styles.badgeName}>Première prise</Text>
      <Text style={styles.cardMeta}>
        Badge débloqué · <Text style={styles.badgeXp}>+50 XP</Text>
      </Text>
      <XPBar xp={160} levelXp={0} nextXp={200} level={1} levelName="Novice" style={styles.xp} />
      {roomy ? (
        <View style={styles.nextBadges}>
          <Text style={styles.nextTitle}>À débloquer</Text>
          <View style={styles.nextRow}>
            {NEXT_BADGES.map((b) => (
              <View key={b.name} style={styles.nextItem}>
                <View style={styles.nextTile}>
                  <Ionicons name={badgeIconFor(b.category)} size={24} color={colors.inkSecondary} />
                </View>
                <Text style={styles.nextName} numberOfLines={2}>{b.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    minHeight: 52,
  },
  topBarSpacer: { height: 44 },

  pager: { flex: 1 },
  // La fiche d'exemple est ancrée en bas, juste au-dessus du texte : le vide reste en haut, court
  page: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  visual: { flex: 1, justifyContent: 'flex-end', alignItems: 'stretch', paddingTop: spacing.md, paddingBottom: spacing.lg },
  copy: { minHeight: 132 },
  title: { ...typography.title1, color: colors.textPrimary, textAlign: 'center' },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    alignSelf: 'center',
    maxWidth: 360,
  },

  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.outline },
  dotActive: { width: 22, backgroundColor: colors.primary },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sheet,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
  },
  cardFlush: { padding: 0, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.ms },
  photos: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.ms },
  photo: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.control,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMain: { backgroundColor: colors.primaryTint },
  photoMainRoomy: { flex: 2 },
  photoInline: { flex: 2, flexDirection: 'row', gap: spacing.sm },
  photoStack: { flex: 1, gap: spacing.sm },
  // Empilées : les deux vignettes se partagent la hauteur de la photo principale
  photoStackItem: { aspectRatio: undefined },
  speciesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  speciesName: { marginLeft: spacing.ms },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.ms },
  cardActionGap: { marginLeft: spacing.md },
  cardHeaderText: { flex: 1, marginLeft: spacing.ms },
  cardTitle: { ...typography.headline, color: colors.textPrimary },
  cardMeta: { ...typography.footnote, color: colors.textSecondary, fontVariant: ['tabular-nums'] },

  rankRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, minHeight: 56 },
  rankRowMe: { backgroundColor: colors.primaryTint },
  rankRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  rankAvatar: { marginLeft: spacing.sm },
  rankName: { ...typography.body, color: colors.textPrimary, flex: 1, marginLeft: spacing.ms },
  rankNameMe: { fontWeight: '600', color: colors.primaryDark },
  rankDelta: { marginRight: spacing.sm },
  rankScore: { ...typography.subhead, color: colors.goldInk, fontWeight: '600', fontVariant: ['tabular-nums'] },

  badgeCard: { alignItems: 'center', paddingTop: spacing.lg },
  badgeName: { ...typography.title2, color: colors.textPrimary, marginTop: spacing.md, marginBottom: 2 },
  badgeTile: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.goldTint,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeXp: { color: colors.goldInk, fontWeight: '600' },
  xp: { marginTop: spacing.lg, alignSelf: 'stretch' },
  nextBadges: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  nextTitle: { ...typography.subhead, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.ms },
  nextRow: { flexDirection: 'row', gap: spacing.sm },
  nextItem: { flex: 1, alignItems: 'center' },
  nextTile: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextName: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
});

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../../theme';
import {
  Avatar,
  BadgeUnlockSheet,
  Button,
  CaptureSkeleton,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  LikeButton,
  ListGroup,
  ListRow,
  Logo,
  Metric,
  RankBadge,
  RankDelta,
  ScreenHeader,
  SegmentedControl,
  Sheet,
  Skeleton,
  SpeciesMark,
  ToastProvider,
  useToast,
  WeighInStrip,
  XPBar,
} from '../index';

type Period = 'day' | 'week' | 'month' | 'year' | 'all';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
  { value: 'all', label: 'Total' },
];
const SPECIES = ['Carpe', 'Brochet', 'Sandre', 'Silure', 'Truite fario', 'Perche', 'Black-bass', 'Bar'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

function CatalogContent() {
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('week');
  const [selected, setSelected] = useState<string[]>(['Brochet']);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(12);
  const [notif, setNotif] = useState(true);
  const [loading, setLoading] = useState(false);
  const [badgeOpen, setBadgeOpen] = useState(false);

  const toggleSpecies = (s: string) =>
    setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Catalogue UI"
        subtitle="Primitives du design system"
        actions={
          <>
            <IconButton icon="search-outline" accessibilityLabel="Rechercher" onPress={() => toast.show('Recherche')} />
            <IconButton icon="notifications-outline" accessibilityLabel="Notifications" badgeCount={3} onPress={() => {}} />
          </>
        }
      />

      <Section title="Logo">
        <View style={styles.rowCenter}>
          <Logo size={56} />
          <Logo size={88} withWordmark />
        </View>
      </Section>

      <Section title="Bande de pesée">
        <Sheet padding={0}>
          <View style={styles.anglerRow}>
            <Avatar username="Lucas Martin" size={36} />
            <View style={styles.anglerText}>
              <Text style={styles.anglerName}>Lucas Martin</Text>
              <Text style={styles.anglerMeta}>Brochet · Lac de Vassivière · il y a 2 h</Text>
            </View>
            <SpeciesMark name="Brochet" speciesId="pike" />
          </View>
          <View style={styles.photo}>
            <SpeciesMark name="Brochet" speciesId="pike" variant="glyph" size={56} />
          </View>
          <WeighInStrip weightGrams={4230} lengthCm={86} score={1240} style={styles.pad} />
          <Divider />
          <View style={styles.actions}>
            <LikeButton
              liked={liked}
              count={likes}
              onToggle={(next) => {
                setLiked(next);
                setLikes((n) => n + (next ? 1 : -1));
              }}
            />
            <IconButton icon="chatbubble-outline" accessibilityLabel="Commenter" onPress={() => {}} />
            <IconButton icon="share-outline" accessibilityLabel="Partager" onPress={() => {}} />
          </View>
        </Sheet>
        <Sheet style={styles.gapTop}>
          <WeighInStrip weightGrams={850} lengthCm={null} score={310} size="compact" />
        </Sheet>
      </Section>

      <Section title="Métriques">
        <Sheet>
          <View style={styles.metrics}>
            <Metric value="4,2" unit="kg" label="Record" />
            <Metric value="38" label="Captures" size="md" />
            <Metric value="2 480" unit="XP" label="Expérience" size="md" tone="gold" />
          </View>
        </Sheet>
      </Section>

      <Section title="Boutons">
        <View style={styles.wrap}>
          <Button title="Publier" icon="add" onPress={() => toast.show('Capture publiée', { tone: 'success' })} />
          <Button title="Suivre" variant="tonal" onPress={() => {}} />
          <Button title="Modifier" variant="outline" onPress={() => {}} />
          <Button title="Annuler" variant="text" onPress={() => {}} />
          <Button title="Supprimer" variant="destructive" icon="trash-outline" onPress={() => toast.show('Capture supprimée', { action: { label: 'Annuler', onPress: () => {} } })} />
        </View>
        <View style={[styles.wrap, styles.gapTop]}>
          <Button title="Petit" size="sm" onPress={() => {}} />
          <Button title="Tonal" size="sm" variant="tonal" onPress={() => {}} />
          <Button title="Désactivé" disabled onPress={() => {}} />
          <Button
            title="Chargement"
            loading={loading}
            onPress={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          />
        </View>
        <Button title="Pleine largeur" fullWidth onPress={() => {}} style={styles.gapTop} />
      </Section>

      <Section title="Contrôle segmenté et puces">
        <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} accessibilityLabel="Période du classement" />
        <View style={[styles.wrap, styles.gapTop]}>
          {SPECIES.slice(0, 5).map((s) => (
            <Chip key={s} label={s} selected={selected.includes(s)} onPress={() => toggleSpecies(s)} />
          ))}
          <Chip label="Région" icon="location-outline" count={12} onPress={() => {}} />
        </View>
      </Section>

      <Section title="Classement">
        <ListGroup>
          {[1, 2, 3, 4, 128].map((r) => (
            <ListRow
              key={r}
              left={
                <View style={styles.rankLeft}>
                  <RankBadge rank={r} />
                  <Avatar username={`Pêcheur ${r}`} size={36} premium={r === 2} style={styles.rankAvatar} />
                </View>
              }
              title={`Pêcheur ${r}`}
              subtitle={`${20 - (r % 7)} captures`}
              right={
                <View style={styles.rankRight}>
                  <Metric value={formatScore(5000 - r * 37)} unit="pts" size="sm" tone="gold" align="right" />
                  <RankDelta delta={r === 1 ? 0 : r % 2 ? 2 : -1} />
                </View>
              }
              onPress={() => {}}
            />
          ))}
        </ListGroup>
      </Section>

      <Section title="Progression">
        <Sheet>
          <XPBar xp={1240} levelXp={1000} nextXp={2000} level={4} levelName="Pêcheur confirmé" />
          <Button title="Simuler un badge" variant="tonal" onPress={() => setBadgeOpen(true)} style={styles.gapTop} />
        </Sheet>
      </Section>

      <Section title="Espèces">
        <View style={styles.wrap}>
          {SPECIES.map((s) => <SpeciesMark key={s} name={s} size={40} />)}
          <SpeciesMark name="Carpe" variant="glyph" size={40} />
        </View>
      </Section>

      <Section title="Liste groupée">
        <ListGroup header="Compte" footer="Ta position n’est visible que par toi.">
          <ListRow icon="person-outline" title="Modifier le profil" onPress={() => {}} />
          <ListRow icon="location-outline" title="Région" value="Bretagne" onPress={() => {}} />
          <ListRow icon="notifications-outline" title="Notifications" subtitle="Likes, commentaires, abonnements" switchValue={notif} onSwitchChange={setNotif} />
          <ListRow icon="log-out-outline" title="Se déconnecter" destructive onPress={() => {}} />
        </ListGroup>
      </Section>

      <Section title="Chargement">
        <CaptureSkeleton />
        <View style={styles.gapTop}>
          <Skeleton width="70%" />
          <Skeleton width="40%" style={styles.gapSmall} />
        </View>
      </Section>

      <Section title="États">
        <Sheet padding={0}>
          <EmptyState
            icon="fish-outline"
            title="Aucune capture pour l’instant"
            message="Publie ta première prise avec le bouton + : elle apparaîtra ici et te fera entrer au classement."
            actionLabel="Publier une capture"
            onAction={() => {}}
          />
        </Sheet>
        <Sheet padding={0} style={styles.gapTop}>
          <ErrorState title="Impossible de charger le classement" onRetry={() => {}} />
        </Sheet>
      </Section>

      <BadgeUnlockSheet
        visible={badgeOpen}
        onClose={() => setBadgeOpen(false)}
        badgeName="Premier carnassier"
        description="Tu as pris ton premier brochet, sandre ou perche."
        xpGained={150}
        category="excellence"
      />
    </ScrollView>
  );
}

function formatScore(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Démonstration de toutes les primitives. Non branché dans la navigation. */
export default function UICatalogScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ToastProvider bottomOffset={16}>
        <CatalogContent />
      </ToastProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.xl },
  sectionTitle: { ...typography.title2, color: colors.ink, marginBottom: spacing.ms },
  rowCenter: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  gapTop: { marginTop: spacing.ms },
  gapSmall: { marginTop: spacing.sm },
  pad: { paddingHorizontal: spacing.md },
  anglerRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.ms, paddingHorizontal: spacing.md },
  anglerText: { flex: 1, marginLeft: spacing.ms },
  anglerName: { ...typography.headline, color: colors.ink },
  anglerMeta: { ...typography.footnote, color: colors.inkSecondary },
  photo: { aspectRatio: 4 / 3, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  rankLeft: { flexDirection: 'row', alignItems: 'center' },
  rankAvatar: { marginLeft: spacing.sm },
  rankRight: { alignItems: 'flex-end', marginLeft: spacing.sm },
});

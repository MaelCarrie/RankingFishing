import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store';
import { isOnPremiumWaitlist, joinPremiumWaitlist } from '../../api/profile';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Button from '../../components/ui/Button';
import { ListGroup, ListRow } from '../../components/ui/ListGroup';
import { useToast } from '../../components/ui/Toast';

// Présentation honnête de Premium (issue #32) : avantages tirés de
// Documentations/specs/version_premium.md, séparés entre ce qui fonctionne
// déjà dans l'app et ce qui est prévu. Aucun prix n'est affiché tant que le
// paiement (#22) n'est pas en place.

type Icon = keyof typeof Ionicons.glyphMap;

interface Perk {
  icon: Icon;
  title: string;
  text: string;
}

// Fonctionne aujourd'hui pour les comptes is_premium = true
const AVAILABLE: Perk[] = [
  {
    icon: 'location-outline',
    title: 'Lieu de tes prises',
    text: "Ajoute ta position en publiant une prise, et vois le lieu des prises de la communauté.",
  },
  {
    icon: 'star-outline',
    title: 'Badge Premium',
    text: 'Une marque Premium sur ta photo de profil.',
  },
];

// Prévu par la spécification Premium, pas encore développé
const PLANNED: Perk[] = [
  {
    icon: 'map-outline',
    title: 'Carte de tes spots',
    text: 'Spots privés illimités et historique de tes sorties par spot.',
  },
  {
    icon: 'partly-sunny-outline',
    title: 'Météo en temps réel',
    text: 'Les conditions du moment directement sur la carte.',
  },
  {
    icon: 'stats-chart-outline',
    title: 'Statistiques détaillées',
    text: 'Graphiques avancés de tes prises et export de tes données.',
  },
  {
    icon: 'people-outline',
    title: 'Groupes illimités',
    text: 'Crée autant de groupes de discussion que tu veux.',
  },
  {
    icon: 'color-palette-outline',
    title: 'Personnalisation',
    text: 'Thèmes exclusifs et profil avancé.',
  },
];

// Le cœur de l'app reste gratuit (principe produit n° 5)
const FREE = [
  'Publier tes prises avec photos',
  'Les classements et ton rang',
  'Les badges et l’XP',
  'Les messages et les abonnements',
];

export default function PremiumScreen() {
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const [onWaitlist, setOnWaitlist] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    isOnPremiumWaitlist(user.id).then((v) => { if (active) setOnWaitlist(v); }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  if (!user) return null;

  async function handleJoin() {
    if (joining || onWaitlist) return;
    setJoining(true);
    try {
      await joinPremiumWaitlist(user!.id, user!.email);
      setOnWaitlist(true);
      toast.show('C’est noté : tu seras prévenu au lancement.', { tone: 'success' });
    } catch {
      toast.show("L'inscription n'a pas pu être enregistrée. Réessaie.", { tone: 'error' });
    } finally {
      setJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} testID="premium-screen">
        {/* En-tête */}
        <View style={styles.hero}>
          <View style={styles.heroTile}>
            <Ionicons name="star" size={30} color={colors.goldInk} />
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header">RankingFishing Premium</Text>
          <Text style={styles.heroText}>
            Des outils en plus pour les pêcheurs qui veulent aller plus loin. L'essentiel de l'app reste gratuit.
          </Text>
          {user.isPremium && (
            <View style={styles.activePill}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primaryDark} />
              <Text style={styles.activePillText}>Ton compte Premium est actif</Text>
            </View>
          )}
        </View>

        <ListGroup header="Déjà dans l'app" style={styles.group}>
          {AVAILABLE.map((p) => (
            <ListRow key={p.title} title={p.title} subtitle={p.text} icon={p.icon} />
          ))}
        </ListGroup>

        <ListGroup
          header="En préparation"
          footer="Ces fonctions sont prévues : elles arriveront avec l'ouverture de l'abonnement."
          style={styles.group}
        >
          {PLANNED.map((p) => (
            <ListRow key={p.title} title={p.title} subtitle={p.text} icon={p.icon} iconTone="neutral" />
          ))}
        </ListGroup>

        <ListGroup header="Toujours gratuit" style={styles.group}>
          {FREE.map((label) => (
            <ListRow key={label} title={label} icon="checkmark" />
          ))}
        </ListGroup>

        {/* Appel à l'action : pas de prix tant que le paiement n'existe pas */}
        {!user.isPremium && (
          <View style={styles.cta}>
            <View style={styles.ctaStatus} testID="premium-cta" accessible accessibilityRole="text">
              <Ionicons name="time-outline" size={18} color={colors.goldInk} />
              <Text style={styles.ctaNote}>
                L'abonnement n'est pas encore ouvert. Son prix sera annoncé au lancement.
              </Text>
            </View>
            <Button
              title={onWaitlist ? 'Tu seras prévenu au lancement' : 'Me prévenir au lancement'}
              icon={onWaitlist ? 'checkmark' : 'notifications-outline'}
              variant={onWaitlist ? 'tonal' : 'filled'}
              onPress={handleJoin}
              loading={joining}
              disabled={onWaitlist}
              fullWidth
              testID="premium-waitlist"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  hero: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  heroTile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.goldTint,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { ...typography.title2, color: colors.textPrimary, textAlign: 'center' },
  heroText: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 340,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryTint,
  },
  activePillText: { ...typography.footnote, color: colors.primaryDark, fontWeight: '600' },

  group: { marginTop: spacing.lg },

  cta: { marginTop: spacing.xl, gap: spacing.md },
  ctaStatus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.sheet,
    backgroundColor: colors.goldTint,
  },
  ctaNote: { ...typography.subhead, color: colors.ink, flex: 1 },
});

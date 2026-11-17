import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme';
import ActionSheet from '../common/ActionSheet';
import Button from '../ui/Button';
import Chip from '../ui/Chip';

// Sélecteur date + heure de la prise, sans dépendance native (aucun
// datetimepicker n'est installé) : jour, heure et minutes par pas, avec
// raccourcis. Les dates futures sont bloquées.

interface Props {
  value: string; // ISO
  onChange: (iso: string) => void;
  error?: string | null;
}

const MINUTE_STEP = 5;
const MAX_DAYS_BACK = 365;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function formatCaughtAt(iso: string): string {
  const d = new Date(iso);
  const today = startOfDay(new Date()).getTime();
  const day = startOfDay(d).getTime();
  const diffDays = Math.round((today - day) / 86400000);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Aujourd'hui à ${time}`;
  if (diffDays === 1) return `Hier à ${time}`;
  const date = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${date} à ${time}`;
}

function clampToNow(d: Date): Date {
  const now = new Date();
  return d.getTime() > now.getTime() ? now : d;
}

function Stepper({
  label, value, onMinus, onPlus, minusDisabled, plusDisabled, minusLabel, plusLabel,
}: {
  label: string; value: string; onMinus: () => void; onPlus: () => void;
  minusDisabled?: boolean; plusDisabled?: boolean; minusLabel: string; plusLabel: string;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed, minusDisabled && styles.stepBtnDisabled]}
          onPress={onMinus}
          disabled={minusDisabled}
          accessibilityRole="button"
          accessibilityLabel={minusLabel}
        >
          <Ionicons name="remove" size={22} color={colors.primaryDark} />
        </Pressable>
        <Text style={styles.stepValue} accessibilityLiveRegion="polite">{value}</Text>
        <Pressable
          style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed, plusDisabled && styles.stepBtnDisabled]}
          onPress={onPlus}
          disabled={plusDisabled}
          accessibilityRole="button"
          accessibilityLabel={plusLabel}
        >
          <Ionicons name="add" size={22} color={colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

export default function DateTimeField({ value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Date(value));

  useEffect(() => {
    if (open) setDraft(new Date(value));
  }, [open, value]);

  const now = new Date();
  const isToday = startOfDay(draft).getTime() === startOfDay(now).getTime();
  const daysBack = Math.round((startOfDay(now).getTime() - startOfDay(draft).getTime()) / 86400000);

  function shift(ms: number) {
    setDraft((d) => clampToNow(new Date(d.getTime() + ms)));
  }
  function setPreset(kind: 'now' | 'yesterday-evening' | 'this-morning') {
    const d = new Date();
    if (kind === 'yesterday-evening') { d.setDate(d.getDate() - 1); d.setHours(20, 0, 0, 0); }
    if (kind === 'this-morning') { d.setHours(7, 0, 0, 0); }
    setDraft(clampToNow(d));
  }

  const dateLabel = isToday
    ? "Aujourd'hui"
    : draft.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed, !!error && styles.fieldError]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Date de la prise : ${formatCaughtAt(value)}. Modifier`}
        testID="capture-date"
      >
        <Ionicons name="calendar-outline" size={20} color={colors.inkSecondary} />
        <Text style={styles.fieldValue}>{formatCaughtAt(value)}</Text>
        <Text style={styles.fieldAction}>Modifier</Text>
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}

      <ActionSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Date et heure de la prise"
        options={[]}
        cancelLabel="Annuler"
      >
        <View style={styles.presets}>
          {([
            ['now', 'Maintenant'],
            ['this-morning', 'Ce matin'],
            ['yesterday-evening', 'Hier soir'],
          ] as const).map(([k, label]) => (
            <Chip key={k} label={label} onPress={() => setPreset(k)} />
          ))}
        </View>

        <Stepper
          label="Jour"
          value={dateLabel}
          onMinus={() => shift(-86400000)}
          onPlus={() => shift(86400000)}
          minusDisabled={daysBack >= MAX_DAYS_BACK}
          plusDisabled={isToday}
          minusLabel="Jour précédent"
          plusLabel="Jour suivant"
        />
        <Stepper
          label="Heure"
          value={`${String(draft.getHours()).padStart(2, '0')} h`}
          onMinus={() => shift(-3600000)}
          onPlus={() => shift(3600000)}
          plusDisabled={draft.getTime() + 3600000 > now.getTime()}
          minusLabel="Une heure plus tôt"
          plusLabel="Une heure plus tard"
        />
        <Stepper
          label="Minutes"
          value={String(draft.getMinutes()).padStart(2, '0')}
          onMinus={() => shift(-MINUTE_STEP * 60000)}
          onPlus={() => shift(MINUTE_STEP * 60000)}
          plusDisabled={draft.getTime() + MINUTE_STEP * 60000 > now.getTime()}
          minusLabel={`${MINUTE_STEP} minutes plus tôt`}
          plusLabel={`${MINUTE_STEP} minutes plus tard`}
        />

        <Button
          title="Valider la date"
          onPress={() => { onChange(draft.toISOString()); setOpen(false); }}
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </ActionSheet>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: borderRadius.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md - 1,
  },
  fieldPressed: { backgroundColor: colors.surfaceMuted },
  fieldError: { borderColor: colors.error },
  fieldValue: { ...typography.body, fontSize: 17, color: colors.ink, flex: 1, fontVariant: ['tabular-nums'] },
  fieldAction: { ...typography.subhead, color: colors.primary, fontWeight: '600' },
  error: { ...typography.footnote, color: colors.error, marginTop: spacing.xs },

  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  stepperLabel: { ...typography.body, color: colors.inkSecondary },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.control,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPressed: { backgroundColor: '#DFEBDD' },
  stepBtnDisabled: { opacity: 0.35 },
  stepValue: {
    ...typography.headline,
    color: colors.ink,
    minWidth: 110,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});

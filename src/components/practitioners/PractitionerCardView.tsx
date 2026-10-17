import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import type { Profession, PractitionerCard as PractitionerCardType } from '@/types';
import { formatClinicDate } from '@/utils';

export type PractitionerCardViewProps = {
  item: PractitionerCardType;
  /** Localized profession name (the caller owns the in-app language choice). */
  professionLabel: string;
  onPress: () => void;
};

/**
 * A practitioner row card in discovery surfaces (search results, the home
 * "near you" carousel). Extracted from the search screen (P8.T3) so both
 * renderers share ONE card: name, profession/specialty, rating + review
 * count, fee, location, next availability; tapping opens the practitioner
 * detail page.
 *
 * Standard rules pinned here: the availability teaser renders in the CLINIC
 * timezone via `formatClinicDate` (standard §5 teaser-timezone rule — a
 * patient plans around it from any device timezone); the fee formats through
 * the in-app language (standard §7 format locale); icons are Ionicons, never
 * emoji (screen readers announce emoji as noise — Review 014 MINOR-5).
 */
export const PractitionerCardView = memo(function PractitionerCardView({
  item,
  professionLabel,
  onPress,
}: PractitionerCardViewProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const fullName = [item.prefix, item.givenNames, item.surname].filter(Boolean).join(' ');

  return (
    <Pressable
      accessibilityRole="button"
      // The name leads the announcement (standard §2 persona naming).
      accessibilityLabel={t('practitioner.cardA11yLabel', {
        name: fullName,
        profession: [professionLabel, item.specialty ?? null].filter(Boolean).join(' — '),
      })}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card style={styles.resultCard}>
        <View style={styles.resultRow}>
          <Avatar name={fullName} uri={item.photoUrl ?? undefined} size={52} />
          <View style={styles.resultInfo}>
            <Text variant="subheading" numberOfLines={1}>
              {fullName}
            </Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {professionLabel}
              {item.specialty ? ` • ${item.specialty}` : ''}
            </Text>
            <View style={styles.metaRow}>
              {/* Decorative accents — the text carries the information, the
                  glyphs stay out of the screen-reader announcement. */}
              <Ionicons name="star" size={14} color={theme.colors.textMuted} />
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {item.rating.average.toFixed(1)} ({item.rating.count})
                {item.consultationFeeXaf != null
                  ? `  •  ${item.consultationFeeXaf.toLocaleString(i18n.language)} XAF`
                  : ''}
              </Text>
            </View>
            {item.location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            ) : null}
            {item.nextAvailableAt ? (
              <Text variant="caption" style={{ color: theme.colors.success }} numberOfLines={1}>
                {formatClinicDate(
                  item.nextAvailableAt,
                  { dateStyle: 'medium', timeStyle: 'short' },
                  i18n.language,
                )}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
});

/**
 * Localized profession name for a card item — picked by the IN-APP language,
 * never the device locale (standard §7 format locale).
 */
export const professionLabelOf = (profession: Profession, isFrench: boolean): string =>
  isFrench ? profession.nameFr : profession.nameEn;

const styles = StyleSheet.create({
  resultCard: { marginBottom: 2 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultInfo: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

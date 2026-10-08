import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { professionIcon } from '@/constants';
import { useTheme } from '@/theme';
import type { Profession, PractitionerCard as PractitionerCardType } from '@/types';
import { formatDate } from '@/utils';

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
 */
export function PractitionerCardView({
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
              {professionIcon(professionLabel, item.specialty)} {professionLabel}
              {item.specialty ? ` • ${item.specialty}` : ''}
            </Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              ⭐ {item.rating.average.toFixed(1)} ({item.rating.count})
              {item.consultationFeeXaf != null
                ? `  •  ${item.consultationFeeXaf.toLocaleString()} XAF`
                : ''}
            </Text>
            {item.location ? (
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                📍 {item.location}
              </Text>
            ) : null}
            {item.nextAvailableAt ? (
              <Text variant="caption" style={{ color: theme.colors.success }} numberOfLines={1}>
                {formatDate(
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
}

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
});

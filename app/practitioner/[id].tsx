import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { searchService } from '@/api';
import { Banner } from '@/components/feedback';
import { Avatar, Badge, Button, Card, Divider, Screen, Spinner, Text } from '@/components/ui';
import { professionIcon } from '@/constants';
import { useAsync } from '@/hooks';
import { useTheme } from '@/theme';
import type { ConsultationType } from '@/types';
import { formatDate } from '@/utils';

/**
 * Public profile of a verified practitioner. Booking is intentionally a
 * notice: the appointments/payments module is not built yet (team decision).
 */
export default function PractitionerDetailScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showBookingNotice, setShowBookingNotice] = useState(false);

  const { data, error, isLoading, refetch } = useAsync(
    () => searchService.practitioner(id),
    [id],
  );

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Spinner />
        </View>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <BackButton />
        <Text variant="body" color="danger">
          {error?.message ?? t('practitioner.notFound')}
        </Text>
        <Button title="Try again" variant="outline" onPress={refetch} />
      </Screen>
    );
  }

  const isFrench = i18n.language === 'fr';
  const fullName = [data.prefix, data.givenNames, data.surname].filter(Boolean).join(' ');
  const professionLabel = isFrench ? data.profession.nameFr : data.profession.nameEn;
  const languageNames = data.languages.length
    ? data.languages.map((language) => (isFrench ? language.nameFr : language.nameEn))
    : (data.languagesSpoken ?? []);
  const offerings = data.offerings.filter((offering) => offering.active);

  const consultationLabel = (type: ConsultationType) =>
    t(`search.${type === 'in_person' ? 'inPerson' : type}`);

  return (
    <Screen contentStyle={{ gap: theme.spacing.md }}>
      <BackButton />

      {/* Identity */}
      <View style={styles.identity}>
        <Avatar name={fullName} uri={data.photoUrl ?? undefined} size={72} />
        <View style={styles.identityInfo}>
          <Text variant="title">{fullName}</Text>
          <Text variant="body" color="textMuted">
            {professionIcon(professionLabel, data.specialty)} {professionLabel}
            {data.specialty ? ` • ${data.specialty}` : ''}
          </Text>
          <View style={styles.badgeRow}>
            {data.verification.status === 'verified' ? (
              <Badge label={`✓ ${t('practitioner.verified')}`} tone="success" />
            ) : null}
            <Badge label={`⭐ ${data.rating.average.toFixed(1)} (${data.rating.count})`} tone="primary" />
          </View>
        </View>
      </View>

      {/* Quick facts */}
      <Card>
        <View style={styles.factsRow}>
          {data.yearsExperience != null ? (
            <FactLine label={t('practitioner.yearsExperience', { years: data.yearsExperience })} />
          ) : null}
          {data.consultationFeeXaf != null ? (
            <FactLine label={`From ${data.consultationFeeXaf.toLocaleString()} XAF`} />
          ) : null}
          {data.nextAvailableAt ? (
            <FactLine
              label={t('practitioner.nextAvailable', {
                when: formatDate(data.nextAvailableAt, { dateStyle: 'short', timeStyle: 'short' }),
              })}
            />
          ) : null}
        </View>
      </Card>

      {showBookingNotice ? (
        <Banner tone="info" message={t('practitioner.bookingNotice')} />
      ) : null}
      <Button title={t('practitioner.bookNow')} fullWidth onPress={() => setShowBookingNotice(true)} />

      {/* About */}
      <Card>
        <Text variant="subheading">{t('practitioner.about')}</Text>
        <Divider spacing={theme.spacing.sm} />
        <Text variant="body" color="textMuted">
          {data.bio ?? t('practitioner.noBio')}
        </Text>
        <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.sm }}>
          {t('practitioner.consultationOptions')}:{' '}
          {(data.consultationTypes ?? []).map(consultationLabel).join(' • ')}
        </Text>
      </Card>

      {/* Consultation options & pricing */}
      {offerings.length > 0 ? (
        <Card>
          <Text variant="subheading">{t('practitioner.consultationOptions')}</Text>
          <Divider spacing={theme.spacing.sm} />
          {offerings.map((offering, index) => (
            <View key={offering.id} style={index > 0 ? styles.listRow : undefined}>
              <View style={styles.offeringRow}>
                <Text variant="body">{consultationLabel(offering.consultationType)}</Text>
                <Text variant="body" color="textMuted">
                  {t('practitioner.minutes', { count: offering.durationMin })} •{' '}
                  {offering.priceXaf.toLocaleString()} XAF
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Languages */}
      {languageNames.length > 0 ? (
        <Card>
          <Text variant="subheading">{t('practitioner.languages')}</Text>
          <Divider spacing={theme.spacing.sm} />
          <Text variant="body" color="textMuted">
            {languageNames.join(' • ')}
          </Text>
        </Card>
      ) : null}

      {/* Locations */}
      {data.locations.length > 0 ? (
        <Card>
          <Text variant="subheading">{t('practitioner.locations')}</Text>
          <Divider spacing={theme.spacing.sm} />
          {data.locations.map((location, index) => (
            <View key={location.id} style={index > 0 ? styles.listRow : undefined}>
              <Text variant="body">{location.label}</Text>
              <Text variant="caption" color="textMuted">
                {[location.addressLine1, location.city, location.region].filter(Boolean).join(', ')}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Qualifications */}
      {data.qualifications.length > 0 ? (
        <Card>
          <Text variant="subheading">{t('practitioner.qualifications')}</Text>
          <Divider spacing={theme.spacing.sm} />
          {data.qualifications
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((qualification, index) => (
              <View key={qualification.id} style={index > 0 ? styles.listRow : undefined}>
                <Text variant="body">
                  {professionIcon(qualification.title)} {qualification.title}
                </Text>
                <Text variant="caption" color="textMuted">
                  {[qualification.institution, qualification.country, qualification.year]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              </View>
            ))}
        </Card>
      ) : null}

      <Text variant="caption" color="textMuted" align="center">
        {formatDate(data.memberSince, { dateStyle: 'long' })}
      </Text>
    </Screen>
  );
}

function BackButton() {
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
      <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
    </Pressable>
  );
}

function FactLine({ label }: { label: string }) {
  return (
    <Text variant="caption" color="textMuted">
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { padding: 4, alignSelf: 'flex-start' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityInfo: { flex: 1, gap: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  factsRow: { gap: 6 },
  offeringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listRow: { marginTop: 12 },
});

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { consultationTypeParam, referenceService, searchService, isApiError } from '@/api';
import {
  Avatar,
  Button,
  Card,
  Input,
  Screen,
  Select,
  Spinner,
  Text,
} from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { professionIcon } from '@/constants';
import { useAsync, useDebounce } from '@/hooks';
import { useTheme } from '@/theme';
import type {
  ApiError,
  ConsultationType,
  OffsetPageMeta,
  PractitionerCard,
  PractitionerSort,
  Profession,
} from '@/types';
import { formatDate } from '@/utils';

const PAGE_SIZE = 10;

const CONSULTATION_TYPES: ConsultationType[] = ['in_person', 'video', 'home_visit'];

const SORT_OPTIONS: { value: PractitionerSort; key: string }[] = [
  { value: 'rating', key: 'search.sort.rating' },
  { value: 'availability', key: 'search.sort.availability' },
  { value: 'fee', key: 'search.sort.fee' },
  { value: 'experience', key: 'search.sort.experience' },
  { value: 'name', key: 'search.sort.name' },
  { value: 'recency', key: 'search.sort.recency' },
];

/**
 * Practitioner discovery: free-text search + profession/consultation filters
 * with server-side sorting and "load more" pagination. Consultation types are
 * a genuine multi-select (the API takes them comma-separated).
 */
export default function SearchScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isFrench = i18n.language === 'fr';

  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q.trim(), 400);
  const [professionId, setProfessionId] = useState<string | null>(null);
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([]);
  const [sort, setSort] = useState<PractitionerSort>('rating');

  const [items, setItems] = useState<PractitionerCard[]>([]);
  const [meta, setMeta] = useState<OffsetPageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const professions = useAsync(() => referenceService.professions({ limit: 50 }), []);

  const queryKey = JSON.stringify({ debouncedQ, professionId, consultationTypes, sort });

  // Any filter change restarts from the first page.
  useEffect(() => {
    setPage(1);
  }, [queryKey]);

  useEffect(() => {
    let cancelled = false;
    const loadingMore = page > 1;
    if (loadingMore) setIsLoadingMore(true);
    else setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await searchService.practitioners({
          page,
          pageSize: PAGE_SIZE,
          sort,
          q: debouncedQ || undefined,
          professionId: professionId ?? undefined,
          consultationType: consultationTypeParam(consultationTypes),
        });
        if (cancelled) return;
        setMeta(result.meta);
        setItems((prev) => (page === 1 ? result.data : [...prev, ...result.data]));
      } catch (err) {
        if (!cancelled) {
          setError(
            isApiError(err) ? err : { status: 0, message: 'Something went wrong. Please try again.' },
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, page]);

  const toggleConsultationType = useCallback((type: ConsultationType) => {
    setConsultationTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setQ('');
    setProfessionId(null);
    setConsultationTypes([]);
    setSort('rating');
  }, []);

  const professionLabel = useCallback(
    (profession: Profession) => (isFrench ? profession.nameFr : profession.nameEn),
    [isFrench],
  );

  const consultationLabel = useCallback(
    (type: ConsultationType) => t(`search.${type === 'in_person' ? 'inPerson' : type}`),
    [t],
  );

  const hasActiveFilters =
    debouncedQ !== '' || professionId !== null || consultationTypes.length > 0 || sort !== 'rating';

  return (
    <Screen contentStyle={{ gap: theme.spacing.md }}>
      <View style={styles.header}>
        <Text variant="title">{t('search.title')}</Text>
        <Text variant="body" color="textMuted">
          {t('search.subtitle')}
        </Text>
      </View>

      <Input
        placeholder={t('search.searchPlaceholder')}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        returnKeyType="search"
      />

      {/* Profession filter — single-select (the API takes one professionId). */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        <Chip
          label={t('search.allProfessions')}
          selected={professionId === null}
          onPress={() => setProfessionId(null)}
        />
        {(professions.data?.data ?? []).map((profession) => (
          <Chip
            key={profession.id}
            label={`${professionIcon(profession.nameEn, profession.nameFr)} ${professionLabel(profession)}`}
            selected={professionId === profession.id}
            onPress={() =>
              setProfessionId((prev) => (prev === profession.id ? null : profession.id))
            }
          />
        ))}
      </ScrollView>

      {/* Consultation types — genuine multi-select (comma-joined for the API). */}
      <View style={styles.filterSection}>
        <Text variant="label" color="textMuted">
          {t('search.consultation')}
        </Text>
        <View style={styles.chipWrap}>
          {CONSULTATION_TYPES.map((type) => (
            <Chip
              key={type}
              label={consultationLabel(type)}
              selected={consultationTypes.includes(type)}
              onPress={() => toggleConsultationType(type)}
            />
          ))}
        </View>
      </View>

      <Select<PractitionerSort>
        label={t('search.sortBy')}
        title={t('search.sortBy')}
        value={sort}
        onChange={setSort}
        options={SORT_OPTIONS.map((option) => ({ label: t(option.key), value: option.value }))}
      />

      {meta ? (
        <Text variant="caption" color="textMuted">
          {t('search.resultsCount', { count: meta.total })}
        </Text>
      ) : null}

      {isLoading ? (
        <View style={{ alignItems: 'center', marginTop: theme.spacing.xl }}>
          <Spinner />
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="body" color="danger">
            {error.message}
          </Text>
          <Button title={t('search.clearFilters')} variant="outline" onPress={clearFilters} />
        </View>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <EmptyState
          title={t('search.noResultsTitle')}
          message={t('search.noResultsMessage')}
          icon={<Ionicons name="search-outline" size={40} color={theme.colors.textMuted} />}
          actionLabel={hasActiveFilters ? t('search.clearFilters') : undefined}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      ) : null}

      {!isLoading && !error
        ? items.map((item) => (
            <PractitionerResultCard
              key={item.id}
              item={item}
              professionLabel={professionLabel(item.profession)}
              onPress={() => router.push(`/practitioner/${item.id}`)}
            />
          ))
        : null}

      {!isLoading && !error && meta?.hasNextPage ? (
        <Button
          title={t('search.loadMore')}
          variant="outline"
          loading={isLoadingMore}
          onPress={() => setPage((prev) => prev + 1)}
        />
      ) : null}
    </Screen>
  );
}

/** A practitioner row in the search results. */
function PractitionerResultCard({
  item,
  professionLabel,
  onPress,
}: {
  item: PractitionerCard;
  professionLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const fullName = [item.prefix, item.givenNames, item.surname].filter(Boolean).join(' ');

  return (
    <Pressable onPress={onPress}>
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
                {formatDate(item.nextAvailableAt, { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      <Text variant="label" style={{ color: selected ? theme.colors.onPrimary : theme.colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  chipRow: { flexGrow: 0 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterSection: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  resultCard: { marginBottom: 2 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultInfo: { flex: 1, gap: 2 },
});

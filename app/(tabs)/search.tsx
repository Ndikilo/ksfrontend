import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { consultationTypeParam, referenceService, searchService, isApiError } from '@/api';
import { PractitionerCardView, professionLabelOf } from '@/components/practitioners';
import { Button, Input, Screen, Select, Spinner, Text } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { CONSULTATION_TYPE_KEYS, professionIcon } from '@/constants';
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
 * Quick categories the home screen's chips deep-link in with (P8.T2). A
 * category pre-filters the results before the user touches anything:
 *  - doctors / nurses resolve to the matching profession from the reference
 *    catalog (the API filters by one professionId — ids are backend UUIDs,
 *    so the chip sends a semantic key and this screen resolves it);
 *  - cardiologist / dentists map to a specialty stem for the API's
 *    case-insensitive contains-match ('Cardiolog' covers Cardiology and
 *    Cardiologist, 'Dentist' covers Dentist and Dentistry).
 */
type HomeCategory = 'doctors' | 'nurses' | 'cardiologist' | 'dentists';

const HOME_CATEGORIES: readonly HomeCategory[] = ['doctors', 'nurses', 'cardiologist', 'dentists'];

const CATEGORY_SPECIALTY: Partial<Record<HomeCategory, string>> = {
  cardiologist: 'Cardiolog',
  dentists: 'Dentist',
};

const CATEGORY_PROFESSION_MATCH: Partial<
  Record<HomeCategory, (profession: Profession) => boolean>
> = {
  doctors: (p) => /doctor|physician|m[ée]decin|g[ée]n[ée]ral/i.test(`${p.nameEn} ${p.nameFr}`),
  nurses: (p) => /nurse|infirm/i.test(`${p.nameEn} ${p.nameFr}`),
};

const isHomeCategory = (value: unknown): value is HomeCategory =>
  typeof value === 'string' && (HOME_CATEGORIES as readonly string[]).includes(value);

/**
 * Practitioner discovery: free-text search + profession/specialty/consultation
 * filters with server-side sorting and "load more" pagination. Consultation
 * types are a genuine multi-select (the API takes them comma-separated).
 * Deep links carry a `category` param (home quick-category chips, P8.T2) that
 * seeds the filters; the pre-filter renders as a removable selected chip so
 * it is never an invisible filter.
 */
export default function SearchScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isFrench = i18n.language === 'fr';

  const params = useLocalSearchParams<{ category?: string }>();
  const category = isHomeCategory(params.category) ? params.category : null;

  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q.trim(), 400);
  const [professionId, setProfessionId] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState<string | null>(
    category !== null ? (CATEGORY_SPECIALTY[category] ?? null) : null,
  );
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([]);
  const [sort, setSort] = useState<PractitionerSort>('rating');

  const [items, setItems] = useState<PractitionerCard[]>([]);
  const [meta, setMeta] = useState<OffsetPageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const professions = useAsync(() => referenceService.professions({ limit: 50 }), []);

  // Profession categories need the reference catalog to resolve the semantic
  // key into a backend professionId; re-runs when the list arrives.
  useEffect(() => {
    if (category === null) return;
    const matcher = CATEGORY_PROFESSION_MATCH[category];
    if (!matcher) return;
    const profession = (professions.data?.data ?? []).find(matcher);
    if (profession) setProfessionId((prev) => prev ?? profession.id);
  }, [category, professions.data]);

  const queryKey = JSON.stringify({ debouncedQ, professionId, specialty, consultationTypes, sort });

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
          specialty: specialty ?? undefined,
          consultationType: consultationTypeParam(consultationTypes),
        });
        if (cancelled) return;
        setMeta(result.meta);
        setItems((prev) => (page === 1 ? result.data : [...prev, ...result.data]));
      } catch (err) {
        if (!cancelled) {
          setError(
            isApiError(err)
              ? err
              : { status: 0, message: t('errors.generic'), source: 'client' },
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
    setSpecialty(null);
    setConsultationTypes([]);
    setSort('rating');
  }, []);

  const professionLabel = useCallback(
    (profession: Profession) => professionLabelOf(profession, isFrench),
    [isFrench],
  );

  const consultationLabel = useCallback(
    // Typed type→key map — raw keys can never reach the UI (Review 006 BLOCKER:
    // `search.home_visit` does not exist, home_visit rendered the literal key).
    (type: ConsultationType) => t(`search.${CONSULTATION_TYPE_KEYS[type]}`),
    [t],
  );

  const hasActiveFilters =
    debouncedQ !== '' ||
    professionId !== null ||
    specialty !== null ||
    consultationTypes.length > 0 ||
    sort !== 'rating';

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

      {/* Profession filter — single-select (the API takes one professionId).
          A specialty pre-filter (home category chip) leads the row as a
          removable selected chip so the active filter is always visible. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {specialty !== null && category !== null ? (
          <Chip
            label={`${professionIcon(t(`home.categories.${category}`))} ${t(`home.categories.${category}`)}`}
            selected
            onPress={() => setSpecialty(null)}
          />
        ) : null}
        <Chip
          label={t('search.allProfessions')}
          selected={professionId === null && specialty === null}
          onPress={() => {
            setProfessionId(null);
            setSpecialty(null);
          }}
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
          <Text variant="body" color="dangerText">
            {error.message}
          </Text>
          <Button title={t('search.clearFilters')} variant="outline" onPress={clearFilters} />
        </View>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <EmptyState
          title={t('search.noResultsTitle')}
          message={t('search.noResultsMessage')}
          icon={<Ionicons name="search-outline" size={48} color={theme.colors.textMuted} />}
          actionLabel={hasActiveFilters ? t('search.clearFilters') : undefined}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      ) : null}

      {!isLoading && !error
        ? items.map((item) => (
            <PractitionerCardView
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
});

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { availabilityService } from '@/api';
import { Banner, EmptyState, ErrorState } from '@/components/feedback';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  DateField,
  FieldLabel,
  IconButton,
  Screen,
  Select,
  Spinner,
  Text,
} from '@/components/ui';
import { CONSULTATION_TYPE_KEYS } from '@/constants';
import { useAsync, useMutation } from '@/hooks';
import { useTheme } from '@/theme';
import { formatDayKey } from '@/utils';
import type {
  AvailabilityException,
  AvailabilityExceptionInput,
  AvailabilityRule,
  AvailabilityRuleInput,
  ConsultationType,
  ID,
} from '@/types';

/**
 * Calendar management (P7.T2) — the practitioner's availability editor. Two
 * segments over the real `/v1/practitioners/me/availability/*` APIs:
 *
 * - Weekly rules run through ONE replace endpoint (PUT with the full set —
 *   the backend has no per-rule CRUD), so every add/edit/delete re-PUTs the
 *   array optimistically and rolls back on failure. New rule ids come back
 *   in the PUT response and replace the optimistic rows.
 * - Exceptions have real create/delete; an edit is a create-then-delete
 *   composite (create first — the old entry is only removed once the new one
 *   exists, so a failure can never lose the practitioner's data).
 *
 * Every change here directly reshapes the `rule:{id}:{startsAt}` /
 * `exception:{id}:{startsAt}` slot keys patients book, which is why deletes
 * confirm with the consequence spelled out.
 */

type Segment = 'rules' | 'exceptions';

/** Editable rule shape — dates as `YYYY-MM-DD` keys, no id until committed. */
type RuleDraft = {
  weekday: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  consultationTypes: ConsultationType[];
  validFrom: string | null;
  validTo: string | null;
};

/** Editable exception shape — `allDay` collapses a `blocked` to null times. */
type ExceptionDraft = {
  date: string | null;
  kind: 'blocked' | 'extra';
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  consultationTypes: ConsultationType[] | null;
};

type RuleFormErrors = {
  time?: string;
  range?: string;
  types?: string;
  overlap?: string;
};

type ExceptionFormErrors = {
  date?: string;
  time?: string;
  types?: string;
};

// The backend weekday is JS-style (Sunday = 0); the picker reads Monday-first
// (the Cameroon/French calendar convention) while mapping to real numbers.
const WEEKDAY_ORDER: { value: number; labelKey: string }[] = [
  { value: 1, labelKey: 'monday' },
  { value: 2, labelKey: 'tuesday' },
  { value: 3, labelKey: 'wednesday' },
  { value: 4, labelKey: 'thursday' },
  { value: 5, labelKey: 'friday' },
  { value: 6, labelKey: 'saturday' },
  { value: 0, labelKey: 'sunday' },
];

/** Clinic-local time choices at 15-minute steps ("08:15"), backend `HH:MM`. */
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const minutes = index * 15;
  const value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return { label: value, value };
});

const DURATIONS = [10, 15, 20, 30, 45, 60, 90, 120];

/** Optimistic rows carry a client-only id until the server assigns the real one. */
let tempIdCounter = 0;
const nextTempId = (prefix: string) => `${prefix}-temp-${(tempIdCounter += 1)}`;

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const fromDateKey = (key: string): Date => {
  const [year = 2000, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** Monday-first display order; `HH:MM` strings sort chronologically. */
const sortRules = (rules: AvailabilityRule[]): AvailabilityRule[] =>
  [...rules].sort(
    (a, b) => (a.weekday + 6) % 7 - ((b.weekday + 6) % 7) || a.startTime.localeCompare(b.startTime),
  );

const sortExceptions = (exceptions: AvailabilityException[]): AvailabilityException[] =>
  [...exceptions].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''),
  );

const toRuleInput = (rule: AvailabilityRule): AvailabilityRuleInput => ({
  weekday: rule.weekday,
  startTime: rule.startTime,
  endTime: rule.endTime,
  slotDurationMin: rule.slotDurationMin,
  consultationTypes: rule.consultationTypes,
  locationId: rule.locationId,
  timezone: rule.timezone,
  validFrom: rule.validFrom,
  validTo: rule.validTo,
});

/** Same-day window intersection — `HH:MM` compares chronologically. */
const overlapsRule = (draft: RuleDraft, others: AvailabilityRule[], ignoreId: ID | null): boolean =>
  others.some(
    (rule) =>
      rule.id !== ignoreId &&
      rule.weekday === draft.weekday &&
      draft.startTime < rule.endTime &&
      rule.startTime < draft.endTime,
  );

const draftToExceptionInput = (draft: ExceptionDraft): AvailabilityExceptionInput => ({
  date: draft.date ?? '',
  kind: draft.kind,
  startTime: draft.kind === 'blocked' && draft.allDay ? null : draft.startTime,
  endTime: draft.kind === 'blocked' && draft.allDay ? null : draft.endTime,
  consultationTypes: draft.kind === 'extra' ? (draft.consultationTypes ?? []) : null,
  locationId: null,
});

const exceptionFromRow = (row: AvailabilityException): ExceptionDraft => ({
  date: row.date,
  kind: row.kind,
  allDay: row.kind === 'blocked' && row.startTime === null,
  startTime: row.startTime,
  endTime: row.endTime,
  consultationTypes: row.consultationTypes,
});

const DEFAULT_RULE_DRAFT: RuleDraft = {
  weekday: 1,
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMin: 30,
  consultationTypes: ['in_person'],
  validFrom: null,
  validTo: null,
};

const DEFAULT_EXCEPTION_DRAFT: ExceptionDraft = {
  date: null,
  kind: 'blocked',
  allDay: true,
  startTime: '09:00',
  endTime: '12:00',
  consultationTypes: ['in_person'],
};

export default function AvailabilityScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [segment, setSegment] = useState<Segment>('rules');

  const rulesState = useAsync(() => availabilityService.listRules(), []);
  const exceptionsState = useAsync(() => availabilityService.listExceptions(), []);

  // Local copies of the server lists — the mutation layer writes here first
  // (optimistic) and rolls back on failure.
  const [rules, setRules] = useState<AvailabilityRule[] | null>(null);
  const [exceptions, setExceptions] = useState<AvailabilityException[] | null>(null);
  useEffect(() => {
    if (rulesState.data) setRules(sortRules(rulesState.data.data));
  }, [rulesState.data]);
  useEffect(() => {
    if (exceptionsState.data) setExceptions(sortExceptions(exceptionsState.data.data));
  }, [exceptionsState.data]);

  // Re-focus refetch (tabs stay mounted) — skipped while an optimistic
  // mutation is in flight so the refresh can't clobber it; a FAILED refetch
  // surfaces a Banner over the stale rows (the agenda-tab pattern).
  const busyRef = useRef(false);
  const { refetch: refetchRules } = rulesState;
  const { refetch: refetchExceptions } = exceptionsState;
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current && !busyRef.current) {
        void refetchRules();
        void refetchExceptions();
      }
      hasFocused.current = true;
    }, [refetchRules, refetchExceptions]),
  );

  // --- Weekly rules (PUT replace, optimistic with rollback) ------------------

  const [ruleDraft, setRuleDraft] = useState<RuleDraft | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<ID | null>(null);
  const [ruleErrors, setRuleErrors] = useState<RuleFormErrors>({});
  const [pendingRuleId, setPendingRuleId] = useState<ID | null>(null);

  const saveRules = useMutation((next: AvailabilityRuleInput[]) =>
    availabilityService.replaceRules(next),
  );
  const rulesPending = saveRules.isLoading;

  const applyRules = useCallback(
    async (next: AvailabilityRule[], pendingId: ID | null): Promise<boolean> => {
      const previous = rules ?? [];
      busyRef.current = true;
      setRules(next);
      setPendingRuleId(pendingId);
      // `mutate` resolves null only on failure. On success the response's
      // server-assigned ids replace the optimistic rows (a temp id never
      // survives a completed save).
      const page = await saveRules.mutate(next.map(toRuleInput));
      if (page === null) setRules(previous);
      else setRules(sortRules(page.data));
      busyRef.current = false;
      setPendingRuleId(null);
      return page !== null;
    },
    [rules, saveRules],
  );

  const openAddRule = useCallback(() => {
    setEditingRuleId(null);
    setRuleErrors({});
    setRuleDraft(DEFAULT_RULE_DRAFT);
  }, []);

  const openEditRule = useCallback((rule: AvailabilityRule) => {
    setEditingRuleId(rule.id);
    setRuleErrors({});
    setRuleDraft({
      weekday: rule.weekday,
      startTime: rule.startTime,
      endTime: rule.endTime,
      slotDurationMin: rule.slotDurationMin,
      consultationTypes: rule.consultationTypes,
      validFrom: rule.validFrom,
      validTo: rule.validTo,
    });
  }, []);

  const closeRuleForm = useCallback(() => {
    setRuleDraft(null);
    setRuleErrors({});
  }, []);

  const submitRule = useCallback(async () => {
    if (ruleDraft === null) return;
    const errors: RuleFormErrors = {};
    if (ruleDraft.endTime <= ruleDraft.startTime) {
      errors.time = t('practice.errors.endTimeAfterStart');
    }
    if (ruleDraft.validFrom !== null && ruleDraft.validTo !== null && ruleDraft.validFrom > ruleDraft.validTo) {
      errors.range = t('practice.errors.dateRange');
    }
    if (ruleDraft.consultationTypes.length === 0) {
      errors.types = t('practice.errors.typesRequired');
    }
    if (overlapsRule(ruleDraft, rules ?? [], editingRuleId)) {
      errors.overlap = t('practice.errors.rulesOverlap');
    }
    if (Object.keys(errors).length > 0) {
      setRuleErrors(errors);
      return;
    }
    // The PUT replaces the whole set: add appends an optimstic row (client
    // id), edit patches the existing one. New server ids arrive in the
    // response and replace both.
    const draft = ruleDraft;
    const optimistic: AvailabilityRule = {
      ...draft,
      locationId: null,
      timezone: 'Africa/Douala',
      id: editingRuleId ?? nextTempId('rule'),
    };
    const next =
      editingRuleId === null
        ? [...(rules ?? []), optimistic]
        : (rules ?? []).map((rule) => (rule.id === editingRuleId ? optimistic : rule));
    closeRuleForm();
    const saved = await applyRules(sortRules(next), optimistic.id);
    // Form-failure preservation (codified standard §7): the form closed for
    // the in-flight save, but the draft is NEVER destroyed by a failure — it
    // reopens prefilled with the entered values and the error Banner inside.
    // It clears on success only.
    if (!saved) setRuleDraft(draft);
  }, [ruleDraft, rules, editingRuleId, applyRules, closeRuleForm, t]);

  const confirmDeleteRule = useCallback(
    (rule: AvailabilityRule) => {
      Alert.alert(
        t('practice.deleteRuleTitle'),
        t('practice.deleteRuleMessage'),
        [
          { text: t('practice.cancel'), style: 'cancel' },
          {
            text: t('practice.deleteRule'),
            style: 'destructive',
            onPress: () => {
              void applyRules((rules ?? []).filter((candidate) => candidate.id !== rule.id), null);
            },
          },
        ],
      );
    },
    [applyRules, rules, t],
  );

  // --- Exceptions (real create/delete; edit = create then delete) ------------

  const [exceptionDraft, setExceptionDraft] = useState<ExceptionDraft | null>(null);
  const [editingExceptionId, setEditingExceptionId] = useState<ID | null>(null);
  const [exceptionErrors, setExceptionErrors] = useState<ExceptionFormErrors>({});
  const [pendingExceptionId, setPendingExceptionId] = useState<ID | null>(null);
  const [cleanupBanner, setCleanupBanner] = useState(false);

  const createException = useMutation(availabilityService.createException);
  const deleteExceptionMutation = useMutation(availabilityService.deleteException);
  const exceptionsPending = createException.isLoading || deleteExceptionMutation.isLoading;

  const openAddException = useCallback(() => {
    setEditingExceptionId(null);
    setExceptionErrors({});
    setExceptionDraft(DEFAULT_EXCEPTION_DRAFT);
  }, []);

  const openEditException = useCallback((row: AvailabilityException) => {
    setEditingExceptionId(row.id);
    setExceptionErrors({});
    setExceptionDraft(exceptionFromRow(row));
  }, []);

  const closeExceptionForm = useCallback(() => {
    setExceptionDraft(null);
    setExceptionErrors({});
  }, []);

  const submitException = useCallback(async () => {
    if (exceptionDraft === null) return;
    // A missing date must not be a dead tap — surface the field error instead.
    if (exceptionDraft.date === null) {
      setExceptionErrors({ date: t('practice.errors.dateRequired') });
      return;
    }
    const errors: ExceptionFormErrors = {};
    if (
      !(exceptionDraft.kind === 'blocked' && exceptionDraft.allDay) &&
      (exceptionDraft.endTime === null ||
        exceptionDraft.startTime === null ||
        exceptionDraft.endTime <= exceptionDraft.startTime)
    ) {
      errors.time = t('practice.errors.endTimeAfterStart');
    }
    if (
      exceptionDraft.kind === 'extra' &&
      (exceptionDraft.consultationTypes ?? []).length === 0
    ) {
      errors.types = t('practice.errors.typesRequired');
    }
    if (Object.keys(errors).length > 0) {
      setExceptionErrors(errors);
      return;
    }

    const input = draftToExceptionInput(exceptionDraft);
    const draft = exceptionDraft;
    const previous = exceptions ?? [];
    const tempId = nextTempId('exception');
    const optimistic: AvailabilityException = { ...input, id: tempId };
    // Create-first: the new row exists before the old one is removed, so a
    // failed edit can never lose the exception (and a failed create is a
    // pure rollback).
    const next =
      editingExceptionId === null
        ? sortExceptions([...previous, optimistic])
        : sortExceptions(
            previous.map((row) => (row.id === editingExceptionId ? optimistic : row)),
          );
    closeExceptionForm();
    busyRef.current = true;
    setExceptions(next);
    setPendingExceptionId(tempId);
    setCleanupBanner(false);

    const created = await createException.mutate(input);
    if (created === null) {
      setExceptions(previous); // rollback
      busyRef.current = false;
      setPendingExceptionId(null);
      // Form-failure preservation (codified standard §7): the failed save
      // must not destroy the entered values — the form reopens prefilled
      // with the error Banner inside. It clears on success only.
      setExceptionDraft(draft);
      return;
    }
    setExceptions(
      sortExceptions((next).map((row) => (row.id === tempId ? created : row))),
    );
    setPendingExceptionId(created.id);

    if (editingExceptionId !== null) {
      const removed = await deleteExceptionMutation.mutate(editingExceptionId);
      if (removed === null) {
        // The save SUCCEEDED — say so, then show the server truth (which may
        // still hold the outdated row) instead of pretending.
        setCleanupBanner(true);
        await refetchExceptions();
      }
    }
    busyRef.current = false;
    setPendingExceptionId(null);
  }, [
    exceptionDraft,
    exceptions,
    editingExceptionId,
    createException,
    deleteExceptionMutation,
    closeExceptionForm,
    refetchExceptions,
    t,
  ]);

  const confirmDeleteException = useCallback(
    (row: AvailabilityException) => {
      Alert.alert(
        t('practice.deleteExceptionTitle'),
        row.kind === 'blocked'
          ? t('practice.deleteExceptionBlockedMessage')
          : t('practice.deleteExceptionExtraMessage'),
        [
          { text: t('practice.cancel'), style: 'cancel' },
          {
            text: t('practice.deleteException'),
            style: 'destructive',
            onPress: () => {
              const previous = exceptions ?? [];
              busyRef.current = true;
              setExceptions(previous.filter((candidate) => candidate.id !== row.id));
              void (async () => {
                const removed = await deleteExceptionMutation.mutate(row.id);
                if (removed === null) setExceptions(previous); // rollback
                busyRef.current = false;
                setPendingExceptionId(null);
              })();
            },
          },
        ],
      );
    },
    [deleteExceptionMutation, exceptions, t],
  );

  // --- Shared rendering helpers ----------------------------------------------

  const typeOptions = useMemo(
    () => (['in_person', 'video', 'home_visit'] as const).map((type) => ({
      type,
      label: t(`search.${CONSULTATION_TYPE_KEYS[type]}`),
    })),
    [t],
  );

  const weekdayLabel = useCallback(
    (weekday: number) => {
      const entry = WEEKDAY_ORDER.find((candidate) => candidate.value === weekday);
      return t(`practice.weekdays.${entry?.labelKey ?? 'monday'}`);
    },
    [t],
  );

  const timeLabel = (start: string | null, end: string | null): string =>
    start !== null && end !== null ? `${start} – ${end}` : '—';

  const patchRuleDraft = (patch: Partial<RuleDraft>) =>
    setRuleDraft((draft) => (draft === null ? draft : { ...draft, ...patch }));

  const patchExceptionDraft = (patch: Partial<ExceptionDraft>) =>
    setExceptionDraft((draft) => (draft === null ? draft : { ...draft, ...patch }));

  // --- Segment: weekly rules --------------------------------------------------

  const rulesBody = () => {
    if (rulesState.isLoading && rules === null) {
      return (
        <View testID="availability-spinner" style={styles.centered}>
          <Spinner />
        </View>
      );
    }
    if (rulesState.error && rules === null) {
      return <ErrorState error={rulesState.error} onRetry={rulesState.refetch} />;
    }

    return (
      <>
        {/* Refetch failure while stale rows stay mounted must be visible, not
            silent (the patient-tab pattern, codified standard §2). The
            first-load failure is the ErrorState branch above. A failed SAVE
            renders inside the reopened form instead (form-failure
            preservation) — this outer Banner covers deletes and the
            closed-form case. */}
        {rulesState.error ? (
          <Banner tone="error" message={rulesState.error.message} style={styles.banner} />
        ) : null}
        {saveRules.error && ruleDraft === null ? (
          <Banner tone="error" message={saveRules.error.message} style={styles.banner} />
        ) : null}

        {ruleDraft !== null ? (
          <Card testID="rule-form">
            {saveRules.error ? (
              <Banner
                tone="error"
                message={saveRules.error.message}
                style={styles.formBanner}
              />
            ) : null}
            <FieldLabel label={t('practice.form.weekday')} required />
            <View style={styles.chipWrap}>
              {WEEKDAY_ORDER.map((day) => (
                <Chip
                  key={day.value}
                  testID={`rule-weekday-${day.value}`}
                  label={t(`practice.weekdays.${day.labelKey}`)}
                  selected={ruleDraft.weekday === day.value}
                  onPress={() => patchRuleDraft({ weekday: day.value })}
                />
              ))}
            </View>
            {ruleErrors.overlap ? (
              <Text variant="caption" color="dangerText">
                {ruleErrors.overlap}
              </Text>
            ) : null}

            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <Select
                  label={t('practice.form.startTime')}
                  value={ruleDraft.startTime}
                  onChange={(value) => patchRuleDraft({ startTime: value })}
                  options={TIME_OPTIONS}
                />
              </View>
              <View style={styles.fieldFlex}>
                <Select
                  label={t('practice.form.endTime')}
                  value={ruleDraft.endTime}
                  onChange={(value) => patchRuleDraft({ endTime: value })}
                  options={TIME_OPTIONS}
                />
              </View>
            </View>
            {ruleErrors.time ? (
              <Text variant="caption" color="dangerText">
                {ruleErrors.time}
              </Text>
            ) : null}

            <Select
              label={t('practice.form.duration')}
              value={ruleDraft.slotDurationMin}
              onChange={(value) => patchRuleDraft({ slotDurationMin: value })}
              options={DURATIONS.map((minutes) => ({
                label: t('practitioner.minutes', { count: minutes }),
                value: minutes,
              }))}
            />

            <FieldLabel label={t('practice.form.types')} required />
            <View style={styles.chipWrap}>
              {typeOptions.map(({ type, label }) => (
                <Chip
                  key={type}
                  testID={`rule-type-${type}`}
                  label={label}
                  selected={ruleDraft.consultationTypes.includes(type)}
                  onPress={() =>
                    patchRuleDraft({
                      consultationTypes: ruleDraft.consultationTypes.includes(type)
                        ? ruleDraft.consultationTypes.filter((kept) => kept !== type)
                        : [...ruleDraft.consultationTypes, type],
                    })
                  }
                />
              ))}
            </View>
            {ruleErrors.types ? (
              <Text variant="caption" color="dangerText">
                {ruleErrors.types}
              </Text>
            ) : null}

            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <DateField
                  label={t('practice.form.validFrom')}
                  value={ruleDraft.validFrom === null ? null : fromDateKey(ruleDraft.validFrom)}
                  onChange={(date) => patchRuleDraft({ validFrom: toDateKey(date) })}
                />
              </View>
              <View style={styles.fieldFlex}>
                <DateField
                  label={t('practice.form.validTo')}
                  value={ruleDraft.validTo === null ? null : fromDateKey(ruleDraft.validTo)}
                  onChange={(date) => patchRuleDraft({ validTo: toDateKey(date) })}
                />
              </View>
            </View>
            {ruleErrors.range ? (
              <Text variant="caption" color="dangerText">
                {ruleErrors.range}
              </Text>
            ) : null}

            <View style={styles.formActions}>
              <Button
                testID="rule-save"
                title={t('practice.save')}
                onPress={() => void submitRule()}
                style={styles.fieldFlex}
              />
              <Button
                title={t('practice.cancel')}
                variant="outline"
                onPress={closeRuleForm}
                style={styles.fieldFlex}
              />
            </View>
          </Card>
        ) : null}

        {(rules ?? []).length === 0 && ruleDraft === null ? (
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />}
            title={t('practice.rulesEmptyTitle')}
            message={t('practice.rulesEmptyMessage')}
            actionLabel={t('practice.addRule')}
            onAction={openAddRule}
          />
        ) : (
          <>
            {(rules ?? []).map((rule) => (
              <Card key={rule.id} testID={`rule-card-${rule.id}`}>
                <View style={styles.cardHeader}>
                  <Text variant="subheading">{weekdayLabel(rule.weekday)}</Text>
                  {pendingRuleId === rule.id && saveRules.isLoading ? (
                    <Spinner />
                  ) : (
                    <View style={styles.cardActions}>
                      <IconButton
                        name="pencil"
                        variant="ghost"
                        size={20}
                        disabled={rulesPending}
                        accessibilityLabel={`${t('practice.editRule')} — ${weekdayLabel(rule.weekday)}`}
                        onPress={() => openEditRule(rule)}
                      />
                      <IconButton
                        name="trash-outline"
                        variant="ghost"
                        size={20}
                        disabled={rulesPending}
                        color={theme.colors.dangerText}
                        accessibilityLabel={`${t('practice.deleteRule')} — ${weekdayLabel(rule.weekday)}`}
                        onPress={() => confirmDeleteRule(rule)}
                      />
                    </View>
                  )}
                </View>
                <Text variant="body">
                  {`${rule.startTime} – ${rule.endTime}`} ·{' '}
                  {t('practitioner.minutes', { count: rule.slotDurationMin })}
                </Text>
                <Text variant="caption" color="textMuted">
                  {rule.consultationTypes
                    .map((type) => t(`search.${CONSULTATION_TYPE_KEYS[type]}`))
                    .join(' · ')}
                </Text>
                {rule.validFrom !== null || rule.validTo !== null ? (
                  <Text variant="caption" color="textMuted">
                    {[
                      rule.validFrom !== null
                        ? t('practice.effectiveFrom', { date: formatDayKey(rule.validFrom, i18n.language) })
                        : null,
                      rule.validTo !== null
                        ? t('practice.effectiveUntil', { date: formatDayKey(rule.validTo, i18n.language) })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
              </Card>
            ))}
            <Button
              testID="add-rule"
              title={t('practice.addRule')}
              variant="outline"
              onPress={openAddRule}
              disabled={rulesPending}
              leftAccessory={
                <Ionicons name="add" size={20} color={theme.colors.primary} />
              }
            />
          </>
        )}
      </>
    );
  };

  // --- Segment: exceptions -----------------------------------------------------

  const exceptionsBody = () => {
    if (exceptionsState.isLoading && exceptions === null) {
      return (
        <View testID="availability-spinner" style={styles.centered}>
          <Spinner />
        </View>
      );
    }
    if (exceptionsState.error && exceptions === null) {
      return <ErrorState error={exceptionsState.error} onRetry={exceptionsState.refetch} />;
    }

    return (
      <>
        {/* Same stale-refetch rule for the exceptions list. A failed CREATE
            renders inside the reopened form instead (form-failure
            preservation); this outer Banner covers deletes and the
            closed-form case. */}
        {exceptionsState.error ? (
          <Banner tone="error" message={exceptionsState.error.message} style={styles.banner} />
        ) : null}
        {(createException.error || deleteExceptionMutation.error) && exceptionDraft === null ? (
          <Banner
            tone="error"
            message={
              (createException.error ?? deleteExceptionMutation.error)?.message ?? ''
            }
            style={styles.banner}
          />
        ) : null}
        {cleanupBanner ? (
          <Banner
            tone="warning"
            message={t('practice.editCleanupBanner')}
            style={styles.banner}
          />
        ) : null}

        {exceptionDraft !== null ? (
          <Card testID="exception-form">
            {createException.error ? (
              <Banner
                tone="error"
                message={createException.error.message}
                style={styles.formBanner}
              />
            ) : null}
            <DateField
              label={t('practice.form.date')}
              required
              value={exceptionDraft.date === null ? null : fromDateKey(exceptionDraft.date)}
              onChange={(date) => patchExceptionDraft({ date: toDateKey(date) })}
              error={exceptionErrors.date ?? null}
            />

            <FieldLabel label={t('practice.form.kind')} required />
            <View style={styles.fieldRow}>
              <Chip
                testID="exception-kind-blocked"
                label={t('practice.form.kindClosed')}
                selected={exceptionDraft.kind === 'blocked'}
                onPress={() => patchExceptionDraft({ kind: 'blocked' })}
                style={styles.fieldFlex}
              />
              <Chip
                testID="exception-kind-extra"
                label={t('practice.form.kindExtra')}
                selected={exceptionDraft.kind === 'extra'}
                onPress={() =>
                  patchExceptionDraft({
                    kind: 'extra',
                    allDay: false,
                    startTime: exceptionDraft.startTime ?? '14:00',
                    endTime: exceptionDraft.endTime ?? '17:00',
                  })
                }
                style={styles.fieldFlex}
              />
            </View>
            <Text variant="caption" color="textMuted">
              {exceptionDraft.kind === 'blocked'
                ? t('practice.form.kindClosedHint')
                : t('practice.form.kindExtraHint')}
            </Text>

            {exceptionDraft.kind === 'blocked' ? (
              <Checkbox
                checked={exceptionDraft.allDay}
                onChange={(checked) =>
                  patchExceptionDraft({
                    allDay: checked,
                    startTime: exceptionDraft.startTime ?? '09:00',
                    endTime: exceptionDraft.endTime ?? '12:00',
                  })
                }
                label={t('practice.form.allDay')}
              />
            ) : null}

            {exceptionDraft.kind === 'blocked' && exceptionDraft.allDay ? null : (
              <>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldFlex}>
                    <Select
                      label={t('practice.form.startTime')}
                      value={exceptionDraft.startTime}
                      onChange={(value) => patchExceptionDraft({ startTime: value })}
                      options={TIME_OPTIONS}
                    />
                  </View>
                  <View style={styles.fieldFlex}>
                    <Select
                      label={t('practice.form.endTime')}
                      value={exceptionDraft.endTime}
                      onChange={(value) => patchExceptionDraft({ endTime: value })}
                      options={TIME_OPTIONS}
                    />
                  </View>
                </View>
                {exceptionErrors.time ? (
                  <Text variant="caption" color="dangerText">
                    {exceptionErrors.time}
                  </Text>
                ) : null}
              </>
            )}

            {exceptionDraft.kind === 'extra' ? (
              <>
                <FieldLabel label={t('practice.form.types')} required />
                <View style={styles.chipWrap}>
                  {typeOptions.map(({ type, label }) => (
                    <Chip
                      key={type}
                      testID={`exception-type-${type}`}
                      label={label}
                      selected={(exceptionDraft.consultationTypes ?? []).includes(type)}
                      onPress={() => {
                        const current = exceptionDraft.consultationTypes ?? [];
                        patchExceptionDraft({
                          consultationTypes: current.includes(type)
                            ? current.filter((kept) => kept !== type)
                            : [...current, type],
                        });
                      }}
                    />
                  ))}
                </View>
                {exceptionErrors.types ? (
                  <Text variant="caption" color="dangerText">
                    {exceptionErrors.types}
                  </Text>
                ) : null}
              </>
            ) : null}

            <View style={styles.formActions}>
              <Button
                testID="exception-save"
                title={t('practice.save')}
                onPress={() => void submitException()}
                style={styles.fieldFlex}
              />
              <Button
                title={t('practice.cancel')}
                variant="outline"
                onPress={closeExceptionForm}
                style={styles.fieldFlex}
              />
            </View>
          </Card>
        ) : null}

        {(exceptions ?? []).length === 0 && exceptionDraft === null ? (
          <EmptyState
            icon={<Ionicons name="sparkles-outline" size={48} color={theme.colors.textMuted} />}
            title={t('practice.exceptionsEmptyTitle')}
            message={t('practice.exceptionsEmptyMessage')}
            actionLabel={t('practice.addException')}
            onAction={openAddException}
          />
        ) : (
          <>
            {(exceptions ?? []).map((row) => (
              <Card key={row.id} testID={`exception-card-${row.id}`}>
                <View style={styles.cardHeader}>
                  <Text variant="subheading">{formatDayKey(row.date, i18n.language)}</Text>
                  {pendingExceptionId === row.id && exceptionsPending ? (
                    <Spinner />
                  ) : (
                    <View style={styles.cardActions}>
                      <IconButton
                        name="pencil"
                        variant="ghost"
                        size={20}
                        disabled={exceptionsPending}
                        accessibilityLabel={`${t('practice.editException')} — ${formatDayKey(row.date, i18n.language)}`}
                        onPress={() => openEditException(row)}
                      />
                      <IconButton
                        name="trash-outline"
                        variant="ghost"
                        size={20}
                        disabled={exceptionsPending}
                        color={theme.colors.dangerText}
                        accessibilityLabel={`${t('practice.deleteException')} — ${formatDayKey(row.date, i18n.language)}`}
                        onPress={() => confirmDeleteException(row)}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.exceptionMeta}>
                  {row.kind === 'blocked' ? (
                    <Badge label={t('practice.badgeClosed')} tone="danger" />
                  ) : (
                    <Badge label={t('practice.badgeExtra')} tone="success" />
                  )}
                  {row.kind === 'blocked' && row.startTime === null ? (
                    <Text variant="body" color="textMuted">
                      {t('practice.closedAllDay')}
                    </Text>
                  ) : (
                    <Text variant="body">{timeLabel(row.startTime, row.endTime)}</Text>
                  )}
                </View>
                {row.consultationTypes !== null && row.consultationTypes.length > 0 ? (
                  <Text variant="caption" color="textMuted">
                    {row.consultationTypes
                      .map((type) => t(`search.${CONSULTATION_TYPE_KEYS[type]}`))
                      .join(' · ')}
                  </Text>
                ) : null}
              </Card>
            ))}
            <Button
              testID="add-exception"
              title={t('practice.addException')}
              variant="outline"
              onPress={openAddException}
              disabled={exceptionsPending}
              leftAccessory={
                <Ionicons name="add" size={20} color={theme.colors.primary} />
              }
            />
          </>
        )}
      </>
    );
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <View style={styles.headerGap}>
        <Text variant="title">{t('practice.availabilityTitle')}</Text>
        <Text variant="caption" color="textMuted">
          {t('practice.availabilityIntro')}
        </Text>
      </View>

      <View style={styles.segments}>
        {/* Primary navigation chips: two label lines so the labels survive
            OS font scaling × French (codified standard §7). */}
        <Chip
          testID="availability-segment-rules"
          label={t('practice.segmentRules')}
          numberOfLines={2}
          selected={segment === 'rules'}
          onPress={() => setSegment('rules')}
          style={styles.segment}
        />
        <Chip
          testID="availability-segment-exceptions"
          label={t('practice.segmentExceptions')}
          numberOfLines={2}
          selected={segment === 'exceptions'}
          onPress={() => setSegment('exceptions')}
          style={styles.segment}
        />
      </View>

      {segment === 'rules' ? rulesBody() : exceptionsBody()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  headerGap: { gap: 4 },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1 },
  banner: { marginBottom: 12 },
  formBanner: { marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  fieldRow: { flexDirection: 'row', gap: 8 },
  fieldFlex: { flex: 1 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  exceptionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
});

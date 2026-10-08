import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { practitionerService } from '@/api';
import { Banner, ErrorState } from '@/components/feedback';
import { Badge, Button, Card, Divider, IconButton, Input, Spinner, Text } from '@/components/ui';
import { useAsync, useMutation } from '@/hooks';
import { useTheme } from '@/theme';
import type {
  CredentialsSubmissionInput,
  VerificationDocumentKind,
  VerificationStatus,
} from '@/types';

/**
 * Practitioner verification card (P7.T4) — the credentials lifecycle over the
 * real `/v1/practitioners/me/*` onboarding APIs, mounted by the console
 * profile screen. The states mirror the backend state machine exactly:
 *
 * - 404              → no practitioner profile yet: a calm pointer to the
 *                      registration step (no dead end).
 * - `incomplete` or rejected+`canResubmit` → the submission form: two numbers
 *   plus three documents. Picking a file presigns (`{ kind, contentType }` →
 *   `{ url, key }`), PUTs the bytes to the presigned URL and keeps the `key`;
 *   a failed upload keeps the file with an explicit per-file Retry. Nothing
 *   is sent to the verification endpoint until all three keys exist.
 * - `pending_verification` → the honest "under review" state: patients cannot
 *   find or book an unverified practitioner (public detail 404s), while the
 *   public profile and availability stay editable.
 * - `rejected` → the admin's reason when the API returns one, with the
 *   re-submit path.
 * - `verified` → the badge patients' trust is built on.
 *
 * Focus refetch keeps the card mounted (stale-while-revalidate); a refetch
 * that fails over mounted content surfaces the standard refetch-failure
 * Banner, never a silent failure.
 */

/** The backend's upload cap (practitioner.service.ts MAX_UPLOAD_BYTES). */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Mirror of the backend ALLOWED_CONTENT_TYPES — documents are PDF/Word only;
 *  only the profile photo accepts images. */
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

const DOCUMENT_KINDS: VerificationDocumentKind[] = ['cmc-certificate', 'nic', 'profile-photo'];

type UploadPhase = 'idle' | 'uploading' | 'uploaded' | 'error';

/** A picked file as expo-document-picker reports it. */
type PickedDocument = { uri: string; name: string; size: number | null; mimeType: string | null };

const allowedMimeTypes = (kind: VerificationDocumentKind): readonly string[] =>
  kind === 'profile-photo' ? PHOTO_MIME_TYPES : DOCUMENT_MIME_TYPES;

export function VerificationCard() {
  const theme = useTheme();
  const { t } = useTranslation();

  const [cmcNumber, setCmcNumber] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [documents, setDocuments] = useState<Record<VerificationDocumentKind, PickedDocument | null>>({
    'cmc-certificate': null,
    nic: null,
    'profile-photo': null,
  });
  const [phases, setPhases] = useState<Record<VerificationDocumentKind, UploadPhase>>({
    'cmc-certificate': 'idle',
    nic: 'idle',
    'profile-photo': 'idle',
  });
  const [fileKeys, setFileKeys] = useState<Record<VerificationDocumentKind, string | null>>({
    'cmc-certificate': null,
    nic: null,
    'profile-photo': null,
  });
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // --- Verification state (single source of truth: GET .../verification) -----
  const verification = useAsync(() => practitionerService.getVerification(), []);
  const { data, error, isLoading, refetch } = verification;

  // Tabs stay mounted — refetch on every RE-focus so an admin decision shows
  // up without a restart (the agenda's focus-refetch pattern: the initial
  // focus is skipped, useAsync's mount effect already fired).
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) void refetch();
      hasFocused.current = true;
    }, [refetch]),
  );

  // --- Upload pipeline: pick → validate → presign → PUT → keep the key -------
  const upload = useCallback(
    async (kind: VerificationDocumentKind, file: PickedDocument) => {
      setFileError(null);
      setPhases((prev) => ({ ...prev, [kind]: 'uploading' }));
      try {
        // The presigned URL is the credential — a fresh one per attempt, so a
        // retry after an expired URL genuinely re-issues the whole round-trip.
        const { url, key } = await practitionerService.presignDocument(
          kind,
          file.mimeType as string,
        );
        await practitionerService.uploadDocument(url, file.mimeType as string, file.uri);
        setFileKeys((prev) => ({ ...prev, [kind]: key }));
        setPhases((prev) => ({ ...prev, [kind]: 'uploaded' }));
      } catch {
        // The file stays picked; the row keeps an explicit Retry that re-issues
        // presign + PUT (a stale-closure-safe new call, not just a flag clear).
        setFileKeys((prev) => ({ ...prev, [kind]: null }));
        setPhases((prev) => ({ ...prev, [kind]: 'error' }));
      }
    },
    [],
  );

  const pickDocument = useCallback(
    async (kind: VerificationDocumentKind) => {
      setFileError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: [...allowedMimeTypes(kind)],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const picked: PickedDocument = {
        uri: asset.uri,
        name: asset.name ?? 'document',
        size: typeof asset.size === 'number' ? asset.size : null,
        mimeType: asset.mimeType ?? null,
      };
      // Validate BEFORE any network call (3G manners): the backend rejects
      // oversize puts at the storage host with a generic 413 — say it upfront.
      if (picked.mimeType === null || !allowedMimeTypes(kind).includes(picked.mimeType)) {
        setFileError(t('practice.verification.fileTypeUnsupported'));
        return;
      }
      if (picked.size !== null && picked.size > MAX_UPLOAD_BYTES) {
        setFileError(t('practice.verification.fileTooLarge'));
        return;
      }
      setDocuments((prev) => ({ ...prev, [kind]: picked }));
      void upload(kind, picked);
    },
    [t, upload],
  );

  const removeDocument = useCallback((kind: VerificationDocumentKind) => {
    setDocuments((prev) => ({ ...prev, [kind]: null }));
    setFileKeys((prev) => ({ ...prev, [kind]: null }));
    setPhases((prev) => ({ ...prev, [kind]: 'idle' }));
  }, []);

  // --- Submit: numbers + the three presigned keys ----------------------------
  const submission = useMutation(
    (input: CredentialsSubmissionInput) => practitionerService.submitCredentials(input),
    {
      // The POST returning is not enough — pull the verification record so the
      // card renders the REAL server state (documents, submittedAt).
      onSuccess: () => void refetch(),
    },
  );

  const pressSubmit = useCallback(() => {
    setFormError(null);
    const numbersValid =
      cmcNumber.trim().length >= 3 &&
      cmcNumber.trim().length <= 60 &&
      nicNumber.trim().length >= 3 &&
      nicNumber.trim().length <= 60;
    const allUploaded = DOCUMENT_KINDS.every((kind) => fileKeys[kind] !== null);
    if (!numbersValid || !allUploaded) {
      setFormError(t('practice.verification.nothingSelected'));
      return;
    }
    void submission.mutate({
      cmcRegistrationNumber: cmcNumber.trim(),
      nicNumber: nicNumber.trim(),
      cmcCertificateFileKey: fileKeys['cmc-certificate'] as string,
      nicFileKey: fileKeys.nic as string,
      profilePhotoFileKey: fileKeys['profile-photo'] as string,
    });
  }, [cmcNumber, nicNumber, fileKeys, submission, t]);

  // --- Render states ----------------------------------------------------------
  if (isLoading && data === null) {
    return (
      <View testID="verification-spinner" style={styles.centered}>
        <Spinner />
      </View>
    );
  }

  if (error && data === null) {
    // 404 = registered account, no practitioner profile yet (e.g. the role was
    // granted outside this device). Offer the way forward instead of an error.
    if (error.status === 404) {
      return (
        <Card testID="verification-unregistered">
          <Text variant="subheading">{t('practice.verification.notRegisteredTitle')}</Text>
          <Text variant="body" color="textMuted" style={styles.block}>
            {t('practice.verification.notRegisteredBody')}
          </Text>
          <Button
            title={t('practice.verification.notRegisteredAction')}
            variant="outline"
            onPress={() => router.push('/practitioner/register')}
          />
        </Card>
      );
    }
    return (
      <Card testID="verification-error">
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    );
  }

  if (!data) return null;

  const status: VerificationStatus = data.status;
  const statusLabelKey: Record<VerificationStatus, string> = {
    incomplete: 'practice.verification.statusIncomplete',
    pending_verification: 'practice.verification.statusPending',
    verified: 'practice.verification.statusVerified',
    rejected: 'practice.verification.statusRejected',
  };
  const statusTone: Record<VerificationStatus, 'info' | 'warning' | 'success' | 'danger'> = {
    incomplete: 'warning',
    pending_verification: 'info',
    verified: 'success',
    rejected: 'danger',
  };

  const showForm =
    data.canResubmit && (status === 'incomplete' || status === 'rejected');
  const submittedDate = data.submittedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
        new Date(data.submittedAt),
      )
    : null;

  const renderDocumentRow = (kind: VerificationDocumentKind) => {
    const label =
      kind === 'cmc-certificate'
        ? t('practice.verification.docCmc')
        : kind === 'nic'
          ? t('practice.verification.docNic')
          : t('practice.verification.docPhoto');
    const hint =
      kind === 'profile-photo'
        ? t('practice.verification.docPhotoHint')
        : t('practice.verification.docCmcHint');
    const file = documents[kind];
    const phase = phases[kind];
    const statusLabel =
      phase === 'uploading'
        ? t('practice.verification.uploading')
        : phase === 'uploaded'
          ? t('practice.verification.uploadDone')
          : phase === 'error'
            ? t('practice.verification.uploadFailed')
            : null;

    return (
      <View
        key={kind}
        testID={`credential-doc-${kind}`}
        style={styles.docRow}
        accessibilityLabel={`${label} — ${statusLabel ?? t('practice.verification.addFile')}`}
      >
        <View style={styles.docInfo}>
          <Text variant="bodyStrong">{label}</Text>
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
          {file ? (
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {phase === 'uploading' ? statusLabel : file.name}
            </Text>
          ) : null}
          {phase === 'error' ? (
            <Text variant="caption" color="dangerText">
              {t('practice.verification.uploadFailed')}
            </Text>
          ) : null}
        </View>
        {phase === 'uploading' ? (
          <Spinner />
        ) : phase === 'uploaded' ? (
          <>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.success}
              accessibilityLabel={t('practice.verification.uploadDone')}
            />
            <IconButton
              name="close"
              variant="ghost"
              accessibilityLabel={`${t('practice.verification.removeFile')} — ${label}`}
              onPress={() => removeDocument(kind)}
            />
          </>
        ) : (
          <Button
            title={phase === 'error' ? t('practice.verification.retryUpload') : t('practice.verification.addFile')}
            variant={phase === 'error' ? 'outline' : 'ghost'}
            size="sm"
            onPress={() => (file ? void upload(kind, file) : void pickDocument(kind))}
          />
        )}
      </View>
    );
  };

  return (
    <Card testID="verification-card">
      <View style={styles.headerRow}>
        <Text variant="subheading">{t('practice.verification.cardTitle')}</Text>
        <Badge label={t(statusLabelKey[status])} tone={statusTone[status]} />
      </View>

      {/* A refocus refetch that failed over mounted content: visible, not
          silent (the standard's stale-failure Banner). */}
      {error && data !== null ? (
        <Banner message={t('practice.verification.refreshFailed')} tone="warning" style={styles.block} />
      ) : null}

      {status === 'pending_verification' ? (
        <>
          <Text variant="body" color="textMuted" style={styles.block}>
            {t('practice.verification.pendingBody')}
          </Text>
          {submittedDate ? (
            <Text variant="caption" color="textMuted">
              {t('practice.verification.pendingSince', { date: submittedDate })}
            </Text>
          ) : null}
          <Divider spacing={theme.spacing.md} />
          <Text variant="caption" color="textMuted">
            {t('practice.verification.pendingEditNote')}
          </Text>
        </>
      ) : null}

      {status === 'verified' ? (
        <Text variant="body" color="textMuted" style={styles.block}>
          {t('practice.verification.verifiedBody')}
        </Text>
      ) : null}

      {status === 'rejected' && !showForm ? (
        <Text variant="body" color="textMuted" style={styles.block}>
          {t('practice.verification.rejectedBody')}
        </Text>
      ) : null}

      {showForm ? (
        <>
          {status === 'rejected' ? (
            <>
              <Text variant="body" color="textMuted" style={styles.block}>
                {t('practice.verification.rejectedIntro')}
              </Text>
              {data.latestDecision?.reason ? (
                <View
                  style={[styles.reasonBox, { borderColor: theme.colors.border }]}
                  testID="verification-rejection-reason"
                >
                  <Text variant="caption" color="textMuted">
                    {t('practice.verification.reasonLabel')}
                  </Text>
                  <Text variant="body">{data.latestDecision.reason}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text variant="body" color="textMuted" style={styles.block}>
              {t('practice.verification.formIntro')}
            </Text>
          )}

          <Divider spacing={theme.spacing.md} />

          <Input
            label={t('practice.verification.cmcLabel')}
            required
            placeholder={t('practice.verification.cmcPlaceholder')}
            value={cmcNumber}
            onChangeText={setCmcNumber}
            autoCapitalize="characters"
            accessibilityLabel={t('practice.verification.cmcLabel')}
          />
          <Input
            label={t('practice.verification.nicLabel')}
            required
            placeholder={t('practice.verification.nicPlaceholder')}
            value={nicNumber}
            onChangeText={setNicNumber}
            accessibilityLabel={t('practice.verification.nicLabel')}
          />

          <Divider spacing={theme.spacing.md} />

          <Text variant="bodyStrong">{t('practice.verification.docsTitle')}</Text>
          <View style={styles.docs}>{DOCUMENT_KINDS.map(renderDocumentRow)}</View>
          {fileError ? <Banner message={fileError} tone="error" style={styles.block} /> : null}
          {formError ? <Banner message={formError} tone="error" style={styles.block} /> : null}
          {submission.error ? (
            <Banner message={submission.error.message} tone="error" style={styles.block} />
          ) : null}

          <Button
            title={t('practice.verification.submitCredentials')}
            loading={submission.isLoading}
            fullWidth
            onPress={pressSubmit}
          />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  block: { marginTop: 8 },
  docs: { gap: 8, marginTop: 8 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docInfo: { flex: 1, gap: 2 },
  reasonBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    gap: 2,
  },
});

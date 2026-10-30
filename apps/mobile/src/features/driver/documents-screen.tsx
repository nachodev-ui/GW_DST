import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { Button, Feedback } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { DocumentAction, DocumentMessage } from '@/shared/documents/flow-ui';
import { flowStyles as s } from '@/shared/documents/flow-styles';
import { useOwnerDocuments } from '@/shared/documents/owner-documents';
import { documentError, documentLabels, type DocumentVersion } from '@/shared/documents/contracts';
import {
  selectDocumentFile,
  takeDocumentPhoto,
  uploadPrivateFile,
  type SelectedDocumentFile,
} from '@/shared/documents/files';
import { FileSourcePicker, type DocumentSource } from '@/shared/documents/file-source-picker';
import { scanDocumentFile } from '@/shared/documents/scan-document';
import { useDocumentViewer } from '@/shared/documents/document-viewer';
import { getSupabase } from '@/shared/supabase/client';
import { normalizeRut } from '@/shared/validation/rut';
import { theme } from '@/theme';
import { useDriverDocumentAccess } from './document-access';
import {
  driverDetailsSchema,
  driverDocumentSteps,
  driverLicenseTypes,
  firstDriverDocumentStep,
  licenseFileStatus,
  parseLicenseDate,
} from './document-contracts';
import { LicenseFileStep, LicenseIdentityStep, LicenseSummary } from './document-steps';
import { summaryStyles } from './document-summary-styles';

export function DriverDocumentsScreen() {
  const { session } = useAuth();
  const access = useDriverDocumentAccess();
  const business = access.data?.business;
  return session && business ? (
    <DriverLicenseWizard
      key={`${session.user.id}:${business.id}`}
      userId={session.user.id}
      businessId={business.id}
    />
  ) : null;
}

function DriverLicenseWizard({ userId, businessId }: { userId: string; businessId: string }) {
  const { zone } = useAuth();
  const owner = { type: 'driver', id: userId, businessId } as const;
  const query = useOwnerDocuments(userId, owner);
  const client = useQueryClient();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const viewer = useDocumentViewer();
  const scroll = useRef<ScrollViewInstance>(null);
  const initialized = useRef(false);
  const [step, setStep] = useState(0);
  const [rut, setRut] = useState('');
  const [license, setLicense] = useState('');
  const [identityBase, setIdentityBase] = useState<{ rut: string; license: string } | null>(null);
  const [date, setDate] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [file, setFile] = useState<SelectedDocumentFile | null>(null);
  const [uploaded, setUploaded] = useState<{
    path: string;
    expires: string | null;
    type: (typeof driverLicenseTypes)[number];
    licenseClass: string | null;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [leaveAction, setLeaveAction] = useState<{ leave: () => void } | null>(null);
  useEffect(() => () => file?.release?.(), [file]);
  useEffect(() => {
    if (initialized.current || !query.data) return;
    initialized.current = true;
    setRut(query.data.rut ?? '');
    setLicense(query.data.license_class ?? '');
    setIdentityBase({ rut: query.data.rut ?? '', license: query.data.license_class ?? '' });
    setStep(firstDriverDocumentStep(query.data));
  }, [query.data]);
  useEffect(() => {
    if (notice || error) scroll.current?.scrollToEnd({ animated: true });
  }, [notice, error]);

  const refresh = () =>
    Promise.all(
      ['owner-documents', 'driver', 'driver-team', 'business-coverage', 'business-dashboard'].map(
        (key) => client.invalidateQueries({ queryKey: [key] }),
      ),
    );
  const identityDirty =
    !!identityBase && (normalizeRut(rut) !== identityBase.rut || license !== identityBase.license);
  const identityValid = driverDetailsSchema.safeParse({ rut, license }).success;
  const type = step === 1 || step === 2 ? driverLicenseTypes[step - 1]! : null;
  const pick = useMutation({
    mutationFn: async (source: DocumentSource) => {
      await new Promise((resolve) => setTimeout(resolve, theme.motion.entrance));
      return source === 'scanner'
        ? scanDocumentFile()
        : source === 'camera'
          ? takeDocumentPhoto()
          : selectDocumentFile();
    },
    onMutate: () => {
      setError('');
      setNotice('');
    },
    onSuccess: (selected) => {
      if (selected) {
        setFile(selected);
        setDate('');
        scroll.current?.scrollTo({ y: 0, animated: false });
      }
    },
    onError: (cause) => setError(documentError(cause)),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!query.data || query.isError)
        throw new Error('Actualiza tus documentos antes de guardar.');
      if (step === 0) {
        const details = driverDetailsSchema.parse({ rut, license });
        const { error: failure } = await getSupabase().rpc('set_driver_document_details', {
          p_driver_id: userId,
          p_rut: details.rut,
          p_license_class: details.license,
        });
        if (failure) throw failure;
        return 'Datos de licencia guardados';
      }
      if (!file || !type) throw new Error('Primero adjunta esta cara de tu licencia.');
      let draft = uploaded;
      if (!draft) {
        const expiry = type === 'driver_license_back' ? parseLicenseDate(date) : null;
        if (expiry && (!expiry.success || expiry.data < query.data.today))
          throw new Error('Ingresa una fecha de próximo control válida y vigente.');
        draft = {
          path: await uploadPrivateFile(owner, 'documents', file.bytes),
          type,
          expires: expiry?.success ? expiry.data : null,
          licenseClass: query.data.license_class,
        };
        setUploaded(draft);
      }
      if (draft.licenseClass !== query.data.license_class)
        throw new Error(
          'La clase de licencia cambió. Descarta esta carga y vuelve a adjuntar el archivo.',
        );
      const { error: failure } = await getSupabase().rpc('submit_document', {
        p_owner_type: 'driver',
        p_owner_id: userId,
        p_type: draft.type,
        p_path: draft.path,
        p_expires_on: draft.expires,
      });
      if (failure) throw failure;
      return 'Archivo enviado a revisión';
    },
    onMutate: () => {
      setError('');
      setNotice('');
    },
    onSuccess: async (message) => {
      if (step === 0) {
        setRut(normalizeRut(rut));
        setIdentityBase({ rut: normalizeRut(rut), license });
      }
      setFile(null);
      setUploaded(null);
      setDate('');
      setNotice(message);
      await refresh();
    },
    onError: (cause) => setError(documentError(cause)),
  });
  const open = useMutation({
    mutationFn: async (version: DocumentVersion) =>
      viewer.openDocument(version, documentLabels[version.type]),
    onError: (cause) => setError(documentError(cause)),
  });
  const busy = save.isPending || pick.isPending || open.isPending;
  const dirty = !!file || !!uploaded || identityDirty;
  usePreventRemove(busy || dirty, ({ data }) => {
    if (busy) {
      setError('Espera a que termine la acción antes de salir.');
      return;
    }
    setLeaveAction({ leave: () => navigation.dispatch(data.action) });
  });
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace(zone === 'driver' ? '/driver-account' : '/customer/account');
  };
  const go = (next: number) => {
    if (busy || dirty) return;
    setStep(next);
    setDate('');
    setError('');
    setNotice('');
    // An explicit revisit loads the latest saved identity; polling never overwrites a draft.
    if (next === 0 && query.data) {
      setRut(query.data.rut ?? '');
      setLicense(query.data.license_class ?? '');
      setIdentityBase({ rut: query.data.rut ?? '', license: query.data.license_class ?? '' });
    }
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const ready =
    !!query.data &&
    (step === 0
      ? identityValid && !identityDirty
      : !!type && licenseFileStatus(query.data, type).submitted);
  const expiry = parseLicenseDate(date);
  const invalidExpiry =
    step === 2 &&
    !!file &&
    !uploaded &&
    (!expiry.success || !query.data || expiry.data < query.data.today);
  const needsSave = step === 0 ? identityDirty : !!file;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <PulsePressable
            accessibilityRole="button"
            accessibilityLabel="Volver a mi cuenta"
            style={s.iconButton}
            disabled={busy}
            onPress={leave}
          >
            <Icon name="arrowLeft" />
          </PulsePressable>
          <View style={s.grow}>
            <Text variant="label">Mi licencia</Text>
            <Text variant="note" style={s.muted}>
              Documentos de conductor
            </Text>
          </View>
          {step !== 3 ? (
            <DocumentAction
              label="Resumen"
              icon="orders"
              disabled={busy || dirty}
              onPress={() => go(3)}
            />
          ) : null}
        </View>
        <View
          style={s.progress}
          accessibilityRole="progressbar"
          accessibilityLabel={driverDocumentSteps[step]}
          accessibilityValue={{ min: 1, max: 4, now: step + 1 }}
        >
          <View style={s.row}>
            <Text variant="label" style={s.grow}>
              Paso {step + 1} de 4
            </Text>
            <Text variant="note" style={s.muted}>
              {driverDocumentSteps[step]}
            </Text>
          </View>
          <View style={s.rail}>
            {driverDocumentSteps.map((label, index) => (
              <View
                key={label}
                style={[
                  s.segment,
                  index < step && s.segmentDone,
                  index === step && s.segmentCurrent,
                  step === 3 && summaryStyles.progressSegment,
                ]}
              />
            ))}
          </View>
        </View>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.content, step === 3 && summaryStyles.content]}
        >
          {query.isPending ? <Feedback text="Cargando tu licencia…" /> : null}
          {query.isError ? (
            <View style={s.stack}>
              <Feedback error text={documentError(query.error)} />
              <DocumentAction
                label="Reintentar"
                icon="refresh"
                onPress={() => void query.refetch()}
              />
            </View>
          ) : null}
          {query.data && !query.isError ? (
            step === 0 ? (
              <LicenseIdentityStep
                data={query.data}
                rut={rut}
                license={license}
                disabled={busy}
                onRut={setRut}
                onLicense={setLicense}
              />
            ) : step === 1 || step === 2 ? (
              <LicenseFileStep
                index={step}
                data={query.data}
                file={file}
                date={date}
                disabled={busy}
                uploaded={!!uploaded}
                onDate={setDate}
                onPick={() => setSelecting(true)}
                onDiscard={() => {
                  setFile(null);
                  setUploaded(null);
                  setDate('');
                  setError('');
                }}
                onView={() => file && viewer.openSelected(file)}
                onOpen={(version) => open.mutate(version)}
              />
            ) : (
              <LicenseSummary
                data={query.data}
                onEdit={go}
                onOpen={(version) => open.mutate(version)}
              />
            )
          ) : null}
          {notice ? <DocumentMessage title={notice} /> : null}
          {error ? <DocumentMessage title={error} error /> : null}
        </ScrollView>
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
          <View style={s.footerInner}>
            <Button
              label={
                save.isPending
                  ? 'Guardando…'
                  : step === 3
                    ? 'Volver a mi cuenta'
                    : needsSave
                      ? step === 0
                        ? 'Guardar mis datos'
                        : 'Guardar y enviar a revisión'
                      : step === 2
                        ? 'Ver resumen'
                        : 'Continuar'
              }
              style={[s.primaryButton, step === 3 && summaryStyles.footerButton]}
              loading={save.isPending}
              disabled={
                busy ||
                query.isError ||
                !query.data ||
                (step !== 3 &&
                  (needsSave ? (step === 0 && !identityValid) || invalidExpiry : !ready))
              }
              onPress={() => (step === 3 ? leave() : needsSave ? save.mutate() : go(step + 1))}
            />
            {dirty && !busy && step === 0 ? (
              <Button
                label="Descartar cambios"
                variant="link"
                onPress={() => {
                  const saved = {
                    rut: query.data?.rut ?? '',
                    license: query.data?.license_class ?? '',
                  };
                  setRut(saved.rut);
                  setLicense(saved.license);
                  setIdentityBase(saved);
                  setError('');
                }}
              />
            ) : step > 0 && step < 3 && !dirty ? (
              <Button
                label="Paso anterior"
                variant="link"
                disabled={busy}
                onPress={() => go(step - 1)}
              />
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
      <FileSourcePicker
        allowScan
        visible={selecting}
        onClose={() => setSelecting(false)}
        onSelect={(source) => pick.mutate(source)}
      />
      {viewer.viewer}
      <BottomSheet
        visible={!!leaveAction}
        title="¿Salir sin guardar?"
        onClose={() => setLeaveAction(null)}
      >
        <View style={s.stack}>
          <Text>
            Los archivos que ya enviaste se conservan. Los cambios sin guardar se descartarán.
          </Text>
          <Button label="Seguir aquí" onPress={() => setLeaveAction(null)} />
          <Button
            label="Salir sin guardar"
            variant="link"
            onPress={() => {
              const action = leaveAction;
              setLeaveAction(null);
              action?.leave();
            }}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

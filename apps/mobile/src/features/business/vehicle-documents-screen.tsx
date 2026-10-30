import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button, Feedback } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { Screen } from '@/shared/ui/screen';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import {
  documentError,
  documentLabels,
  requiresExpiry,
  type DocumentVersion,
} from '@/shared/documents/contracts';
import {
  selectDocumentFile,
  takeDocumentPhoto,
  uploadPrivateFile,
  type SelectedDocumentFile,
} from '@/shared/documents/files';
import { getSupabase } from '@/shared/supabase/client';
import { FileSourcePicker, type DocumentSource } from '@/shared/documents/file-source-picker';
import { scanDocumentFile } from '@/shared/documents/scan-document';
import { useDocumentViewer } from '@/shared/documents/document-viewer';
import { theme } from '@/theme';
import { useSelectedBusiness } from './business-shell';
import { useBusinessVehicles } from './workspace-data';
import { selectVehiclePhoto } from './vehicle-photo';
import {
  allowsDocumentTestSkip,
  hasUsableFile,
  useVehicleDocuments,
  vehicleDocumentSteps,
} from './vehicle-documents-data';
import { DocumentSummary } from './vehicle-document-summary';
import { VehicleDocumentStepBody } from './vehicle-document-step';
import { DocumentAction, DocumentMessage } from './vehicle-document-visuals';
import { flowStyles as s } from './vehicle-documents-styles';

const summaryStep = vehicleDocumentSteps.length;
const parseDate = (value: string) => {
  const [day, month, year] = value.split('/');
  return z.iso.date().safeParse(`${year}-${month}-${day}`);
};

export function VehicleDocumentsScreen() {
  const business = useSelectedBusiness();
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  const id = z.uuid().safeParse(vehicleId);
  return business && id.success ? (
    <VehicleEntry key={id.data} businessId={business.id} vehicleId={id.data} />
  ) : (
    <Screen title="Documentación del vehículo" onBack={() => router.back()}>
      <Feedback
        error
        text="No encontramos este vehículo. Vuelve a Flota y selecciónalo nuevamente."
      />
    </Screen>
  );
}

function VehicleEntry({ businessId, vehicleId }: { businessId: string; vehicleId: string }) {
  const vehicles = useBusinessVehicles(businessId);
  const vehicle = vehicles.data?.find((item) => item.id === vehicleId);
  if (vehicles.isPending || !vehicles.data || !vehicle)
    return (
      <Screen title="Documentación del vehículo" onBack={() => router.back()}>
        <Feedback
          error={!vehicles.isPending}
          text={
            vehicles.isPending
              ? 'Cargando vehículo…'
              : vehicles.isError
                ? 'No pudimos consultar tu flota.'
                : 'El vehículo ya no pertenece a esta flota.'
          }
        />
        {vehicles.isError ? (
          <Button label="Reintentar" onPress={() => void vehicles.refetch()} />
        ) : null}
      </Screen>
    );
  return <VehicleWizard businessId={businessId} vehicleId={vehicleId} plate={vehicle.plate} />;
}

function VehicleWizard({
  businessId,
  vehicleId,
  plate,
}: {
  businessId: string;
  vehicleId: string;
  plate: string;
}) {
  const query = useVehicleDocuments(vehicleId);
  const client = useQueryClient();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollViewInstance>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const viewer = useDocumentViewer();
  const [selecting, setSelecting] = useState(false);
  const [file, setFile] = useState<SelectedDocumentFile | null>(null);
  useEffect(() => () => file?.release?.(), [file]);
  const [date, setDate] = useState('');
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [skipped, setSkipped] = useState<number[]>([]);
  const [leaveAction, setLeaveAction] = useState<{ leave: () => void } | null>(null);
  useEffect(() => {
    if (notice || error) scroll.current?.scrollToEnd({ animated: true });
  }, [notice, error]);
  const testSkip = allowsDocumentTestSkip();
  const step = vehicleDocumentSteps[stepIndex];
  const photo = step?.type === 'photo';
  const existing =
    !!query.data &&
    (photo ? !!query.data.photo_path : !!step && hasUsableFile(query.data, step.type));
  const expiryRequired = !!step && step.type !== 'photo' && requiresExpiry(step.type);
  const parsedDate = parseDate(date);
  const alternative =
    query.data &&
    (step?.type === 'technical_inspection'
      ? hasUsableFile(query.data, 'homologation_certificate')
      : step?.type === 'homologation_certificate' &&
        hasUsableFile(query.data, 'technical_inspection'));
  const owner = { type: 'vehicle', id: vehicleId, businessId } as const;

  const pick = useMutation({
    mutationFn: async (source: DocumentSource) => {
      await new Promise((resolve) => setTimeout(resolve, theme.motion.entrance));
      if (photo) {
        if (source === 'scanner')
          throw new Error('Para el vehículo, toma una foto o elige un archivo.');
        return selectVehiclePhoto(source);
      }
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
        scroll.current?.scrollTo({ y: 0, animated: false });
      }
    },
    onError: (cause) => setError(documentError(cause)),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!file || !step) return;
      const expires = expiryRequired ? parseDate(date) : null;
      if (expires && !expires.success) throw new Error('Escribe una fecha válida: día/mes/año.');
      const path =
        uploaded ??
        (await uploadPrivateFile(owner, photo ? 'vehicle-photos' : 'documents', file.bytes));
      setUploaded(path);
      const { error: rpcError } = photo
        ? await getSupabase().rpc('set_vehicle_photo', { p_vehicle_id: vehicleId, p_path: path })
        : await getSupabase().rpc('submit_document', {
            p_owner_type: 'vehicle',
            p_owner_id: vehicleId,
            p_type: step.type,
            p_path: path,
            p_expires_on: expires?.success ? expires.data : null,
          });
      if (rpcError) throw rpcError;
    },
    onMutate: () => {
      setError('');
      setNotice('');
    },
    onSuccess: async () => {
      setFile(null);
      setUploaded(null);
      setDate('');
      setSkipped((values) => values.filter((value) => value !== stepIndex));
      setNotice(photo ? 'Foto guardada' : 'Archivo guardado · en revisión');
      await Promise.all(
        ['owner-documents', 'business-vehicles', 'business-coverage', 'driver'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
    onError: (cause) => setError(documentError(cause)),
  });
  const open = useMutation({
    mutationFn: async (version: DocumentVersion) =>
      viewer.openDocument(version, documentLabels[version.type]),
    onError: (cause) => setError(documentError(cause)),
  });
  const busy = pick.isPending || save.isPending;
  usePreventRemove(busy || !!file || !!uploaded, ({ data }) => {
    if (busy) {
      setError('Espera a que termine la carga antes de salir.');
      return;
    }
    setLeaveAction({ leave: () => navigation.dispatch(data.action) });
  });
  const go = (index: number) => {
    if (busy || file || uploaded) return;
    setStepIndex(index);
    setDate('');
    setNotice('');
    setError('');
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/business/operations', params: { businessId } });
  };
  const isSummary = stepIndex === summaryStep;
  const ready = existing || !!notice;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <PulsePressable
            accessibilityRole="button"
            accessibilityLabel="Volver a Flota"
            style={s.iconButton}
            disabled={busy}
            onPress={leave}
          >
            <Icon name="arrowLeft" />
          </PulsePressable>
          <View style={s.grow}>
            <Text variant="label">Documentación</Text>
            <Text variant="note" style={s.muted}>
              {plate}
            </Text>
          </View>
          {!isSummary ? (
            <DocumentAction
              label="Resumen"
              icon="orders"
              disabled={busy || !!file}
              onPress={() => go(summaryStep)}
            />
          ) : null}
        </View>
        <View
          style={s.progress}
          accessibilityRole="progressbar"
          accessibilityLabel={isSummary ? 'Resumen' : step?.title}
          accessibilityValue={{ min: 1, max: 7, now: stepIndex + 1 }}
        >
          <View style={s.row}>
            <Text variant="label" style={s.grow}>
              Paso {stepIndex + 1} de 7
            </Text>
            <Text variant="note" style={s.muted}>
              {isSummary ? 'Resumen' : step?.short}
            </Text>
          </View>
          <View style={s.rail}>
            {Array.from({ length: 7 }, (_, index) => (
              <View
                key={index}
                style={[
                  s.segment,
                  index < stepIndex && s.segmentDone,
                  index === stepIndex && s.segmentCurrent,
                ]}
              />
            ))}
          </View>
        </View>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          {query.isPending ? <Feedback text="Cargando tus archivos…" /> : null}
          {query.isError ? (
            <View style={s.stack}>
              <Feedback error text="No pudimos actualizar tus documentos." />
              <DocumentAction
                label="Reintentar"
                icon="refresh"
                onPress={() => void query.refetch()}
              />
            </View>
          ) : null}
          {query.data ? (
            isSummary ? (
              <DocumentSummary
                plate={plate}
                data={query.data}
                skipped={skipped}
                testSkip={testSkip}
                onViewPhoto={() =>
                  query.data?.photo_path && viewer.openPhoto(query.data.photo_path)
                }
                onReplace={(index) => {
                  go(index);
                  setSelecting(true);
                }}
                onOpen={(version) => open.mutate(version)}
                opening={open.isPending}
              />
            ) : step ? (
              <VehicleDocumentStepBody
                key={step.type}
                step={step}
                index={stepIndex}
                data={query.data}
                plate={plate}
                alternative={!!alternative}
                optional={
                  testSkip &&
                  ['technical_inspection', 'homologation_certificate', 'soap'].includes(step.type)
                }
                file={file}
                uploaded={!!uploaded}
                date={date}
                dateInvalid={date.length === 10 && !parsedDate.success}
                dateExpired={parsedDate.success && parsedDate.data < query.data.today}
                notice={notice}
                busy={busy}
                opening={open.isPending}
                onPick={() => setSelecting(true)}
                onPreview={() => file && viewer.openSelected(file)}
                onViewPhoto={() =>
                  query.data?.photo_path && viewer.openPhoto(query.data.photo_path)
                }
                onOpen={(version) => open.mutate(version)}
                onDateChange={setDate}
              />
            ) : null
          ) : null}
          {error ? (
            <View accessibilityLiveRegion="assertive">
              <DocumentMessage error title={error} />
            </View>
          ) : null}
        </ScrollView>
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }]}>
          <View style={s.footerInner}>
            <Button
              style={s.primaryButton}
              label={
                isSummary
                  ? 'Volver a mi flota'
                  : file
                    ? uploaded
                      ? 'Reintentar guardado'
                      : 'Guardar archivo'
                    : ready || alternative
                      ? 'Continuar'
                      : 'Elegir archivo'
              }
              loading={busy}
              disabled={
                !query.data ||
                query.isError ||
                (file && expiryRequired && !parsedDate.success) ||
                open.isPending
              }
              onPress={() => {
                if (isSummary) leave();
                else if (file) save.mutate();
                else if (ready || alternative) go(stepIndex + 1);
                else setSelecting(true);
              }}
            />
            {!isSummary && !file && !busy ? (
              !ready && !alternative && step?.type === 'technical_inspection' ? (
                <Button
                  label="Tengo homologación"
                  variant="link"
                  onPress={() => go(stepIndex + 1)}
                />
              ) : testSkip &&
                step &&
                ['technical_inspection', 'homologation_certificate', 'soap'].includes(step.type) &&
                !existing ? (
                <Button
                  label="Omitir por ahora · solo Test"
                  variant="link"
                  onPress={() => {
                    setSkipped((values) => [
                      ...values.filter((value) => value !== stepIndex),
                      stepIndex,
                    ]);
                    go(stepIndex + 1);
                  }}
                />
              ) : stepIndex > 0 ? (
                <Button label="Paso anterior" variant="link" onPress={() => go(stepIndex - 1)} />
              ) : (
                <Text variant="note" style={[s.muted, s.center]}>
                  {ready
                    ? 'Siguiente: Padrón del vehículo'
                    : 'Primero, una foto con la patente visible'}
                </Text>
              )
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
      <FileSourcePicker
        allowScan={!photo}
        visible={selecting}
        onClose={() => setSelecting(false)}
        onSelect={(source) => pick.mutate(source)}
      />
      {viewer.viewer}
      <BottomSheet
        visible={!!leaveAction}
        title="¿Salir sin guardar este archivo?"
        onClose={() => setLeaveAction(null)}
      >
        <View style={s.stack}>
          <Text>Los archivos que ya guardaste se conservan. Esta selección se descartará.</Text>
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

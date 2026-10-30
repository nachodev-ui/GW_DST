import { Fragment } from 'react';
import { Image, View } from 'react-native';
import { GaswayLogo } from '@/shared/ui/gasway-logo';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { expiryLabel, type DocumentVersion } from '@/shared/documents/contracts';
import { theme } from '@/theme';
import {
  documentFeedback,
  hasUsableFile,
  latestDocument,
  useDocumentImage,
  vehicleDocumentSteps,
  vehicleFileCount,
  versionsFor,
  type VehicleDocuments,
} from './vehicle-documents-data';
import {
  DocumentAction,
  DocumentArtwork,
  DocumentFileIcon,
  DocumentMedia,
  DocumentMessage,
  DocumentStatus,
} from './vehicle-document-visuals';
import { flowStyles as s } from './vehicle-documents-styles';

export function SavedFile({
  version,
  title,
  today,
  onOpen,
  disabled,
  detailed = false,
  showTitle = true,
}: {
  version: DocumentVersion;
  title: string;
  today: string;
  onOpen: () => void;
  disabled: boolean;
  detailed?: boolean;
  showTitle?: boolean;
}) {
  const image = useDocumentImage(
    version.mime_type === 'application/pdf' ? null : version.file_path,
  );
  const type =
    vehicleDocumentSteps.find((step) => step.type === version.type)?.type ?? 'vehicle_registration';
  const state =
    version.status === 'superseded'
      ? { label: 'Versión anterior', tone: 'neutral' as const, icon: 'orders' as const }
      : documentFeedback(version, today);
  const expiry = expiryLabel(version.expires_on, today)?.replace(
    /(\d{4})-(\d{2})-(\d{2})/,
    '$3/$2/$1',
  );
  return (
    <View style={s.stack}>
      {detailed ? (
        <>
          <View style={s.mediaHeading}>
            <GaswayLogo variant="monogram" />
            <Text variant="label" style={[s.eyebrow, s.grow]}>
              TU ARCHIVO
            </Text>
            <Text variant="note" style={s.muted}>
              {version.mime_type === 'application/pdf' ? 'PDF' : 'IMAGEN'}
            </Text>
          </View>
          {version.mime_type === 'application/pdf' ? (
            <View style={s.uploadArt}>
              <DocumentArtwork type={type} />
              <Text variant="note" style={s.muted}>
                Consulta el contenido en «Ver»
              </Text>
            </View>
          ) : (
            <DocumentMedia
              uri={image.data}
              label={title}
              fallback={image.isError ? 'Vista previa no disponible' : 'Cargando documento…'}
              onRetry={() => void image.refetch()}
            />
          )}
        </>
      ) : null}
      <View style={detailed ? s.mediaBody : s.stack}>
        <View style={s.fileRow}>
          {!detailed ? (
            <View style={s.thumbnail}>
              {image.data ? (
                <Image
                  source={{ uri: image.data }}
                  style={s.thumbImage}
                  resizeMode="cover"
                  accessibilityLabel={title}
                />
              ) : (
                <DocumentFileIcon type={type} />
              )}
            </View>
          ) : null}
          <View style={[s.grow, s.stack]}>
            {showTitle ? <Text variant="label">{title}</Text> : null}
            <Text variant="note" style={s.muted}>
              {version.mime_type === 'application/pdf' ? 'PDF' : 'Imagen'} ·{' '}
              {(version.size_bytes / 1024 / 1024).toFixed(2)} MB
            </Text>
            <DocumentStatus label={state.label} tone={state.tone} icon={state.icon} />
          </View>
        </View>
        {expiry ? (
          <View style={s.fileRow}>
            <Icon name="calendar" size={theme.layout.tagRemove} />
            <Text variant="note" style={[s.grow, s.muted]}>
              {expiry}
            </Text>
          </View>
        ) : null}
        <DocumentAction
          label="Ver"
          accessibilityLabel={`Abrir ${title}`}
          icon="expand"
          disabled={disabled}
          onPress={onOpen}
        />
      </View>
    </View>
  );
}

export function DocumentSummary({
  data,
  plate,
  skipped,
  testSkip,
  onReplace,
  onViewPhoto,
  onOpen,
  opening,
}: {
  data: VehicleDocuments;
  plate: string;
  skipped: number[];
  testSkip: boolean;
  onReplace: (index: number) => void;
  onViewPhoto: () => void;
  onOpen: (doc: DocumentVersion) => void;
  opening: boolean;
}) {
  const count = vehicleFileCount(data);
  const photo = useDocumentImage(data.photo_path, true);
  const pending = data.items.some((item) => item.status === 'pending');
  return (
    <>
      <View style={s.heading}>
        <View style={s.folio}>
          <View style={s.folioLine} />
          <Text variant="label" style={s.eyebrow}>
            07 / TU CARPETA
          </Text>
        </View>
        <Text variant="title" style={s.title} accessibilityRole="header">
          Todo, en un solo lugar.
        </Text>
        <Text variant="note" style={s.muted}>
          Revisa lo que guardaste y retoma lo pendiente.
        </Text>
      </View>
      <View style={s.hero}>
        <View style={s.heroHeader}>
          <GaswayLogo appearance="dark" />
          <Icon
            name="orders"
            color={theme.documentation.colors.accent}
            size={theme.layout.brandMark}
          />
        </View>
        <View style={s.stack}>
          <Text variant="display" style={s.counter}>
            {String(count).padStart(2, '0')}
            <Text variant="subtitle" style={s.counterTotal}>
              {' '}
              / 05
            </Text>
          </Text>
          <Text variant="label" style={s.onDark}>
            Requisitos con archivo
          </Text>
        </View>
        <View
          style={s.rail}
          accessibilityRole="progressbar"
          accessibilityLabel="Requisitos con archivo, sujeto a revisión"
          accessibilityValue={{ min: 0, max: 5, now: count }}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <View key={index} style={[s.segment, index < count && s.segmentDone]} />
          ))}
        </View>
        <Text variant="note" style={s.onDarkMuted}>
          {count < 5
            ? 'Tu avance está guardado. Aún hay requisitos pendientes.'
            : pending
              ? 'Carpeta guardada. Falta la revisión de administración.'
              : 'La habilitación para repartir la confirma el servidor.'}
        </Text>
      </View>
      <View style={s.folder}>
        <View style={s.folderHeader}>
          <Text variant="label" style={s.eyebrow}>
            EXPEDIENTE DEL VEHÍCULO
          </Text>
          <View style={s.fileRow}>
            <Icon name="truck" />
            <View style={s.plate}>
              <Text variant="label">{plate}</Text>
            </View>
          </View>
        </View>
        {vehicleDocumentSteps.map((step, index) => {
          const doc = step.type !== 'photo' ? latestDocument(data, step.type) : undefined;
          const alternate =
            step.type === 'technical_inspection'
              ? hasUsableFile(data, 'homologation_certificate')
              : step.type === 'homologation_certificate' &&
                hasUsableFile(data, 'technical_inspection');
          const omitted = skipped.includes(index) && testSkip;
          const attached = !!doc || (step.type === 'photo' && !!data.photo_path);
          return (
            <Fragment key={step.type}>
              {index ? <View style={s.folderDivider} /> : null}
              <View style={s.folderItem}>
                <View style={s.fileRow}>
                  <Text variant="label" style={s.index}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Text variant="label" style={s.grow}>
                    {step.title}
                  </Text>
                </View>
                {step.type === 'photo' && data.photo_path ? (
                  <View style={s.fileRow}>
                    <View style={s.thumbnail}>
                      {photo.data ? (
                        <Image
                          source={{ uri: photo.data }}
                          style={s.thumbImage}
                          resizeMode="cover"
                          accessibilityLabel="Foto del vehículo"
                        />
                      ) : (
                        <Icon name="image" />
                      )}
                    </View>
                    <View style={s.stack}>
                      <DocumentStatus label="Foto guardada" tone="success" />
                      <DocumentAction label="Ver" icon="expand" onPress={onViewPhoto} />
                    </View>
                  </View>
                ) : doc ? (
                  <SavedFile
                    version={doc}
                    title={step.title}
                    showTitle={false}
                    today={data.today}
                    onOpen={() => onOpen(doc)}
                    disabled={opening}
                  />
                ) : (
                  <View style={s.fileRow}>
                    <DocumentFileIcon type={step.type} />
                    <View style={[s.grow, s.stack]}>
                      <DocumentStatus
                        label={
                          alternate ? 'Alternativa adjunta' : omitted ? 'Omitido en Test' : 'Falta'
                        }
                        icon={alternate ? 'exchange' : 'clock'}
                      />
                      <Text variant="note" style={s.muted}>
                        {alternate
                          ? 'Administración confirma su vigencia.'
                          : 'Sigue pendiente para completar la carpeta.'}
                      </Text>
                    </View>
                  </View>
                )}
                {doc?.rejection_reason ? (
                  <DocumentMessage
                    error
                    title="Necesita una corrección"
                    detail={doc.rejection_reason}
                  />
                ) : null}
                {doc &&
                doc.status !== 'approved' &&
                versionsFor(data, doc.type).some(
                  (version) =>
                    version.status === 'approved' &&
                    (!version.expires_on || version.expires_on >= data.today),
                ) ? (
                  <Text variant="note" style={s.summaryHint}>
                    Conservas una versión aprobada vigente.
                  </Text>
                ) : null}
                <DocumentAction
                  label={attached ? 'Reemplazar' : 'Adjuntar'}
                  accessibilityLabel={`${attached ? 'Reemplazar' : 'Adjuntar'} ${step.title}`}
                  icon={attached ? 'edit' : 'arrowRight'}
                  onPress={() => onReplace(index)}
                />
              </View>
            </Fragment>
          );
        })}
      </View>
      <DocumentMessage
        title="Revisión técnica u homologación"
        detail={`Basta una vigente y aprobada.${testSkip ? ' Omitir pasos en Test no habilita el vehículo.' : ''}`}
      />
    </>
  );
}

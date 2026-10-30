import { useState } from 'react';
import { View } from 'react-native';
import { SelectedDocumentPreview } from '@/shared/documents/selected-document-preview';
import { Input } from '@/shared/ui/components';
import { GaswayLogo } from '@/shared/ui/gasway-logo';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import type { SelectedDocumentFile } from '@/shared/documents/files';
import type { DocumentVersion } from '@/shared/documents/contracts';
import { theme } from '@/theme';
import { SavedFile } from './vehicle-document-summary';
import {
  latestDocument,
  useDocumentImage,
  versionsFor,
  type VehicleDocuments,
  type VehicleDocumentStep,
} from './vehicle-documents-data';
import {
  DocumentAction,
  DocumentMedia,
  DocumentMessage,
  DocumentStatus,
  DocumentStepHeading,
  DocumentUploadCard,
} from './vehicle-document-visuals';
import { flowStyles as s } from './vehicle-documents-styles';

export function VehicleDocumentStepBody({
  step,
  index,
  data,
  plate,
  alternative,
  optional,
  file,
  uploaded,
  date,
  dateInvalid,
  dateExpired,
  notice,
  busy,
  opening,
  onPick,
  onPreview,
  onViewPhoto,
  onOpen,
  onDateChange,
}: {
  step: VehicleDocumentStep;
  index: number;
  data: VehicleDocuments;
  plate: string;
  alternative: boolean;
  optional: boolean;
  file: SelectedDocumentFile | null;
  uploaded: boolean;
  date: string;
  dateInvalid: boolean;
  dateExpired: boolean;
  notice: string;
  busy: boolean;
  opening: boolean;
  onPick: () => void;
  onPreview: () => void;
  onViewPhoto: () => void;
  onOpen: (doc: DocumentVersion) => void;
  onDateChange: (value: string) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const photo = step.type === 'photo';
  const doc = step.type === 'photo' ? undefined : latestDocument(data, step.type);
  const photoUrl = useDocumentImage(photo ? data.photo_path : null, true);
  const previous = doc
    ? versionsFor(data, doc.type).filter((version) => version.id !== doc.id)
    : [];
  const approvedPrevious = previous.some(
    (version) =>
      version.status === 'approved' && (!version.expires_on || version.expires_on >= data.today),
  );
  return (
    <>
      <DocumentStepHeading step={step} index={index} />
      {file ? (
        <View style={s.mediaCard}>
          <View style={s.mediaHeading}>
            <GaswayLogo variant="monogram" />
            <Text variant="label" style={[s.eyebrow, s.grow]}>
              VISTA PREVIA
            </Text>
            <Icon name={file.mimeType === 'application/pdf' ? 'orders' : 'image'} />
          </View>
          <View style={s.mediaBody}>
            <SelectedDocumentPreview file={file} onView={onPreview} />
            <Text variant="note" style={s.muted}>
              Revisa que se vea completo. Administración validará el contenido.
            </Text>
            {!uploaded ? (
              <DocumentAction
                label="Elegir otro archivo"
                icon="exchange"
                disabled={busy}
                onPress={onPick}
              />
            ) : null}
          </View>
        </View>
      ) : photo && data.photo_path ? (
        <View style={s.mediaCard}>
          <View style={s.mediaHeading}>
            <GaswayLogo variant="monogram" />
            <Text variant="label" style={[s.eyebrow, s.grow]}>
              MI VEHÍCULO
            </Text>
            <View style={s.plate}>
              <Text variant="label">{plate}</Text>
            </View>
          </View>
          <DocumentMedia
            uri={photoUrl.data}
            label="Foto guardada del vehículo"
            fallback={photoUrl.isError ? 'No pudimos cargar la vista previa' : 'Cargando tu foto…'}
            onRetry={() => void photoUrl.refetch()}
          />
          <View style={s.mediaBody}>
            <View style={s.savedMeta}>
              <DocumentStatus label="Foto guardada" tone="success" />
              <DocumentAction label="Ver" icon="expand" onPress={onViewPhoto} />
              <DocumentAction label="Cambiar foto" icon="edit" disabled={busy} onPress={onPick} />
            </View>
          </View>
        </View>
      ) : doc ? (
        <View style={s.mediaCard}>
          <SavedFile
            version={doc}
            title={step.title}
            today={data.today}
            detailed
            onOpen={() => onOpen(doc)}
            disabled={opening}
          />
          <View style={s.mediaBody}>
            {doc.rejection_reason ? (
              <DocumentMessage
                error
                title="Necesita una corrección"
                detail={doc.rejection_reason}
              />
            ) : null}
            <DocumentAction
              label="Reemplazar archivo"
              icon="exchange"
              disabled={busy}
              onPress={onPick}
            />
          </View>
        </View>
      ) : (
        <DocumentUploadCard step={step} disabled={busy} onPress={onPick} />
      )}
      {file && step.type !== 'photo' && step.type !== 'vehicle_registration' ? (
        <View style={s.dateCard}>
          <View style={s.fileRow}>
            <Icon name="calendar" />
            <View style={s.grow}>
              <Text variant="label">La vigencia de tu documento</Text>
              <Text variant="note" style={s.muted}>
                Copia la fecha de vencimiento.
              </Text>
            </View>
          </View>
          <Input
            label="Fecha de vencimiento"
            hideLabel
            placeholder="DD/MM/AAAA"
            value={date}
            maxLength={10}
            keyboardType="number-pad"
            style={s.dateInput}
            editable={!busy && !uploaded}
            onChangeText={(value) => {
              const digits = value.replace(/\D/g, '').slice(0, 8);
              onDateChange(
                digits.length <= 2
                  ? digits
                  : digits.length <= 4
                    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                    : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`,
              );
            }}
          />
          {dateInvalid ? <DocumentMessage error title="Revisa el día, mes y año." /> : null}
          {dateExpired ? (
            <DocumentMessage
              error
              title="La fecha está vencida"
              detail="Guardarlo no cumple este requisito para repartir."
            />
          ) : null}
        </View>
      ) : null}
      {!file && !doc && !(photo && data.photo_path) ? (
        <View style={s.tipRow}>
          <View style={s.tip}>
            <Icon name="expand" size={theme.layout.tagRemove} />
            <Text variant="note" style={s.muted}>
              Sin recortes
            </Text>
          </View>
          <View style={s.tip}>
            <Icon name="image" size={theme.layout.tagRemove} />
            <Text variant="note" style={s.muted}>
              {photo ? 'Patente visible' : 'Texto legible'}
            </Text>
          </View>
        </View>
      ) : null}
      {notice && !photo ? (
        <DocumentMessage
          title="Archivo guardado"
          detail="Ya puedes continuar con el siguiente paso."
        />
      ) : null}
      {alternative ? (
        <DocumentMessage
          title="Ya tienes una alternativa adjunta"
          detail="Puedes continuar. Administración confirma su vigencia."
        />
      ) : null}
      {optional ? (
        <View style={s.testNote}>
          <Icon name="info" size={theme.layout.tagRemove} />
          <View style={[s.grow, s.stack]}>
            <Text variant="label">Opcional para esta prueba · Test</Text>
            <Text variant="note" style={s.muted}>
              Puedes omitirlo; seguirá pendiente de habilitación.
            </Text>
          </View>
        </View>
      ) : null}
      {doc && doc.status !== 'approved' && approvedPrevious ? (
        <DocumentMessage
          title="Tu aprobación anterior se conserva"
          detail="Sigue vigente mientras se revisa el reemplazo."
        />
      ) : null}
      {previous.length ? (
        <View style={s.stack}>
          <DocumentAction
            label={
              showHistory
                ? 'Ocultar versiones anteriores'
                : `Versiones anteriores (${previous.length})`
            }
            icon={showHistory ? 'chevronDown' : 'clock'}
            disabled={busy}
            onPress={() => setShowHistory(!showHistory)}
          />
          {showHistory
            ? previous.map((version) => (
                <View style={s.card} key={version.id}>
                  <SavedFile
                    version={version}
                    title={`Versión del ${version.created_at.slice(0, 10)}`}
                    today={data.today}
                    disabled={opening}
                    onOpen={() => onOpen(version)}
                  />
                </View>
              ))
            : null}
        </View>
      ) : null}
    </>
  );
}

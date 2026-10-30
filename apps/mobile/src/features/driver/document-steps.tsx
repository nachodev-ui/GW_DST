import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Input, OptionCard, StatusBadge } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { DocumentAction, DocumentMessage, DocumentStatus } from '@/shared/documents/flow-ui';
import { flowStyles as s } from '@/shared/documents/flow-styles';
import {
  licenseClasses,
  licenseClassLabels,
  type DocumentVersion,
} from '@/shared/documents/contracts';
import type { OwnerDocuments } from '@/shared/documents/owner-documents';
import type { SelectedDocumentFile } from '@/shared/documents/files';
import { SelectedDocumentPreview } from '@/shared/documents/selected-document-preview';
import { theme } from '@/theme';
import {
  driverDetailsSchema,
  driverLicenseTypes,
  formatLicenseDateInput,
  licenseFileStatus,
  parseLicenseDate,
} from './document-contracts';
import { summaryStyles as summary } from './document-summary-styles';

const palette = theme.documentation.colors;

function LicenseArtwork({ side }: { side: 'identity' | 'front' | 'back' }) {
  return (
    <Svg
      width={theme.documentation.artwork.width}
      height={theme.documentation.artwork.height}
      viewBox="0 0 320 200"
      accessible={false}
    >
      <Rect x="34" y="33" width="258" height="154" rx="18" fill={palette.rule} />
      <Rect
        x="22"
        y="20"
        width="270"
        height="158"
        rx="18"
        fill={palette.paper}
        stroke={palette.olive}
        strokeWidth="2"
      />
      <Path d="M22 61H292" stroke={palette.rule} strokeWidth="2" />
      <Rect x="40" y="37" width="96" height="8" rx="4" fill={palette.ink} />
      <Circle cx="270" cy="41" r="8" fill={palette.accent} />
      {side === 'back' ? (
        <>
          <Path
            d="M42 84H270M42 112H270M42 140H270M108 74V153M199 74V153"
            stroke={palette.rule}
            strokeWidth="2"
          />
          <Rect x="116" y="91" width="72" height="14" rx="5" fill={palette.accent} />
          <Path
            d="M49 97H83M211 97H255M49 126H83M120 126H179M211 126H255"
            stroke={palette.olive}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <Rect x="40" y="78" width="75" height="78" rx="12" fill={palette.canvas} />
          <Circle cx="77" cy="101" r="13" fill={palette.olive} />
          <Path d="M51 144C51 112 103 112 103 144Z" fill={palette.olive} />
          <Path
            d="M134 86H264M134 108H235M134 130H194"
            stroke={palette.rule}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <Rect x="133" y="145" width="64" height="8" rx="4" fill={palette.accent} />
        </>
      )}
    </Svg>
  );
}

export function LicenseHeading({
  index,
  title,
  detail,
}: {
  index: number;
  title: string;
  detail: string;
}) {
  return (
    <View style={s.heading}>
      <View style={s.folio}>
        <View style={s.folioLine} />
        <Text variant="label" style={s.eyebrow}>
          {String(index + 1).padStart(2, '0')} / TU LICENCIA
        </Text>
      </View>
      <Text variant="title" accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      <Text variant="note" style={s.muted}>
        {detail}
      </Text>
    </View>
  );
}

export function LicenseIdentityStep({
  data,
  rut,
  license,
  disabled,
  onRut,
  onLicense,
}: {
  data: OwnerDocuments;
  rut: string;
  license: string;
  disabled: boolean;
  onRut: (value: string) => void;
  onLicense: (value: string) => void;
}) {
  const invalidRut = rut.length > 0 && !driverDetailsSchema.shape.rut.safeParse(rut).success;
  return (
    <>
      <LicenseHeading
        index={0}
        title="Primero, tus datos"
        detail="Confirma tu RUT y la clase de licencia que usarás para repartir."
      />
      <View style={s.uploadArt}>
        <LicenseArtwork side="identity" />
      </View>
      <View style={s.card}>
        <Input
          label="Tu RUT"
          value={rut}
          onChangeText={onRut}
          autoCapitalize="characters"
          maxLength={12}
          editable={!disabled && !data.identity_locked}
          error={invalidRut ? 'Revisa el RUT y su dígito verificador.' : undefined}
          help={
            data.identity_locked
              ? 'RUT revisado. Para corregirlo, contacta a Gasway.'
              : 'Usa el RUT que aparece en tu licencia.'
          }
        />
        <Text variant="label">Clase de licencia</Text>
        <View style={s.stack}>
          {licenseClasses.map((value) => (
            <OptionCard
              key={value}
              label={licenseClassLabels[value]}
              selected={license === value}
              onPress={() => {
                if (!disabled) onLicense(value);
              }}
            />
          ))}
        </View>
        <Text variant="note" style={s.muted}>
          Si cambias la clase, necesitaremos revisar el dorso para esa clase.
        </Text>
      </View>
    </>
  );
}

export function LicenseFileStep({
  index,
  data,
  file,
  date,
  disabled,
  uploaded,
  onDate,
  onPick,
  onDiscard,
  onView,
  onOpen,
}: {
  index: 1 | 2;
  data: OwnerDocuments;
  file: SelectedDocumentFile | null;
  date: string;
  disabled: boolean;
  uploaded: boolean;
  onDate: (value: string) => void;
  onPick: () => void;
  onDiscard: () => void;
  onView: () => void;
  onOpen: (version: DocumentVersion) => void;
}) {
  const type = driverLicenseTypes[index - 1]!;
  const state = licenseFileStatus(data, type);
  const front = index === 1;
  const parsed = parseLicenseDate(date);
  return (
    <>
      <LicenseHeading
        index={index}
        title={front ? 'El frente de tu licencia' : 'Ahora, el dorso'}
        detail={
          front
            ? 'Que se vean tu foto, nombre y RUT. Incluye los cuatro bordes.'
            : 'Incluye las clases y sus fechas de próximo control. Usa una imagen completa y nítida.'
        }
      />
      <DocumentStatus
        label={state.label}
        tone={state.approved ? 'success' : state.submitted ? 'warning' : 'neutral'}
      />
      {file ? (
        <View style={s.card}>
          <SelectedDocumentPreview file={file} onView={onView} />
          <DocumentAction
            label={uploaded ? 'Descartar esta carga' : 'Cambiar archivo'}
            icon="exchange"
            disabled={disabled}
            onPress={uploaded ? onDiscard : onPick}
          />
          {!uploaded ? (
            <DocumentAction
              label="Descartar selección"
              icon="close"
              disabled={disabled}
              onPress={onDiscard}
            />
          ) : null}
        </View>
      ) : (
        <>
          <PulsePressable
            accessibilityRole="button"
            accessibilityLabel={
              front ? 'Adjuntar frente de la licencia' : 'Adjuntar dorso de la licencia'
            }
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onPick}
            style={s.upload}
          >
            <View style={s.uploadArt}>
              <LicenseArtwork side={front ? 'front' : 'back'} />
            </View>
            <View style={s.uploadBody}>
              <View style={s.fileRow}>
                <View style={s.uploadMark}>
                  <Icon name="image" />
                </View>
                <Text variant="subtitle" style={s.grow}>
                  {state.latest ? 'Adjuntar una nueva versión' : 'Adjuntar esta cara'}
                </Text>
                <Icon name="arrowRight" />
              </View>
              <Text variant="note" style={s.muted}>
                Toma una foto o elige un archivo · JPG, PNG o PDF
              </Text>
            </View>
          </PulsePressable>
          {state.latest ? (
            <View style={s.card}>
              <Text variant="label">Último archivo enviado</Text>
              {state.latest.rejection_reason ? (
                <DocumentMessage
                  title="Corrige este detalle"
                  detail={state.latest.rejection_reason}
                  error
                />
              ) : null}
              {state.latest.expires_on ? (
                <Text variant="note" style={s.muted}>
                  Próximo control: {state.latest.expires_on.split('-').reverse().join('/')}
                </Text>
              ) : null}
              <DocumentAction
                label="Ver archivo"
                icon="search"
                disabled={disabled}
                onPress={() => onOpen(state.latest!)}
              />
              {state.approved && state.approved.id !== state.latest.id ? (
                <DocumentMessage
                  title="Tu versión anterior sigue vigente"
                  detail="La nueva versión no reemplaza la aprobada hasta que Gasway la revise."
                />
              ) : null}
            </View>
          ) : null}
        </>
      )}
      {file && !front ? (
        <View style={s.dateCard}>
          <View style={s.fileRow}>
            <Icon name="calendar" />
            <Text variant="label" style={s.grow}>
              Próximo control de tu clase{' '}
              {data.license_class ? licenseClassLabels[data.license_class] : ''}
            </Text>
          </View>
          <Input
            label="Fecha de próximo control"
            placeholder="DD/MM/AAAA"
            value={date}
            maxLength={10}
            keyboardType="number-pad"
            editable={!disabled && !uploaded}
            onChangeText={(value) => onDate(formatLicenseDateInput(value))}
            style={s.dateInput}
          />
          <Text variant="note" style={s.muted}>
            Copia la fecha de la clase seleccionada. En licencias antiguas puede estar en el frente.
          </Text>
          {date.length === 10 && !parsed.success ? (
            <DocumentMessage title="Revisa el día, mes y año." error />
          ) : null}
          {parsed.success && parsed.data < data.today ? (
            <DocumentMessage
              title="Esta fecha ya venció"
              detail="Necesitas una licencia vigente para repartir."
              error
            />
          ) : null}
        </View>
      ) : null}
      <View style={s.tipRow}>
        <View style={s.tip}>
          <Icon name="image" />
          <Text variant="note">Sin reflejos</Text>
        </View>
        <View style={s.tip}>
          <Icon name="expand" />
          <Text variant="note">Sin recortar</Text>
        </View>
        <View style={s.tip}>
          <Icon name="search" />
          <Text variant="note">Texto legible</Text>
        </View>
      </View>
    </>
  );
}

function SummaryAction({
  label,
  icon = 'edit',
  variant = 'discreet',
  onPress,
}: {
  label: string;
  icon?: 'eye' | 'edit';
  variant?: 'discreet' | 'tonal' | 'primary';
  onPress: () => void;
}) {
  const color = variant === 'primary' ? palette.canvas : palette.olive;
  return (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[summary.action, summary[variant]]}
    >
      {icon === 'eye' ? (
        <Svg
          width={theme.layout.tagRemove}
          height={theme.layout.tagRemove}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={theme.borders.focus}
          accessible={false}
          aria-hidden
        >
          <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
          <Circle cx="12" cy="12" r="3" />
        </Svg>
      ) : (
        <Icon name="edit" color={color} size={theme.layout.tagRemove} />
      )}
      <Text
        variant="note"
        compact
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[summary.actionText, variant === 'primary' && summary.primaryText]}
      >
        {label}
      </Text>
    </PulsePressable>
  );
}

export function LicenseSummary({
  data,
  onEdit,
  onOpen,
}: {
  data: OwnerDocuments;
  onEdit: (step: number) => void;
  onOpen: (version: DocumentVersion) => void;
}) {
  const count = driverLicenseTypes.filter((type) => licenseFileStatus(data, type).submitted).length;
  return (
    <>
      <View style={[s.hero, summary.overview]}>
        <Icon
          name={data.status === 'approved' ? 'check' : count === 2 ? 'clock' : 'orders'}
          color={palette.canvas}
          size={theme.layout.tagRemove}
        />
        <Text
          variant="label"
          compact
          numberOfLines={1}
          adjustsFontSizeToFit
          style={summary.overviewLabel}
        >
          {data.status === 'approved'
            ? 'Licencia vigente'
            : count === 2
              ? 'En revisión de Gasway'
              : 'Completa tu licencia'}
        </Text>
        <Text
          variant="label"
          compact
          numberOfLines={1}
          accessibilityLabel={`${count} de 2 caras enviadas`}
          style={summary.count}
        >
          {count}/2
        </Text>
      </View>
      <View style={s.folder}>
        <View style={summary.item}>
          <View style={summary.titleRow}>
            <Text variant="note" style={summary.index}>
              01
            </Text>
            <Text variant="label" numberOfLines={1} style={summary.title}>
              Tus datos
            </Text>
            <Icon name="user" />
          </View>
          <Text variant="note" compact numberOfLines={1} adjustsFontSizeToFit style={summary.data}>
            {data.rut ?? 'RUT pendiente'} ·{' '}
            {data.license_class
              ? `Clase ${licenseClassLabels[data.license_class]}`
              : 'Clase pendiente'}
          </Text>
          <View style={summary.actions}>
            <SummaryAction label="Revisar datos" onPress={() => onEdit(0)} />
            <View style={s.grow} />
          </View>
        </View>
        {driverLicenseTypes.map((type, index) => {
          const state = licenseFileStatus(data, type);
          const tone = state.pending
            ? 'progress'
            : state.latest?.status === 'rejected'
              ? 'error'
              : 'warning';
          return (
            <View key={type}>
              {index > 0 ? <View style={s.folderDivider} /> : null}
              <View style={summary.item}>
                <View style={summary.titleRow}>
                  <Text variant="note" style={summary.index}>
                    0{index + 2}
                  </Text>
                  <Text
                    variant="label"
                    compact
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={summary.title}
                  >
                    {index === 0 ? 'Frente de la licencia' : 'Dorso de la licencia'}
                  </Text>
                </View>
                <View style={summary.status} accessibilityLiveRegion="polite">
                  {state.approved ? (
                    <StatusBadge label={state.label} tone="success" />
                  ) : (
                    <View style={summary.statusRow} accessible accessibilityLabel={state.label}>
                      <Icon
                        name={tone === 'error' ? 'close' : tone === 'progress' ? 'clock' : 'info'}
                        color={theme.colors[tone]}
                        size={theme.layout.tagRemoveIcon}
                      />
                      <Text
                        variant="note"
                        compact
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={[summary.statusText, { color: theme.colors[tone] }]}
                      >
                        {state.label}
                      </Text>
                    </View>
                  )}
                </View>
                {state.latest?.rejection_reason ? (
                  <DocumentMessage
                    title="Observación de Gasway"
                    detail={state.latest.rejection_reason}
                    error
                  />
                ) : null}
                <View style={summary.actions}>
                  {state.latest ? (
                    <SummaryAction
                      label="Ver archivo"
                      icon="eye"
                      variant="tonal"
                      onPress={() => onOpen(state.latest!)}
                    />
                  ) : null}
                  <SummaryAction
                    label={state.latest ? 'Reemplazar' : 'Adjuntar'}
                    variant={state.approved ? 'discreet' : 'primary'}
                    onPress={() => onEdit(index + 1)}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

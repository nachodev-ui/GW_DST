import { DocumentAction } from '@/shared/documents/flow-ui';
import { useState } from 'react';
import { Image, View, type ImageStyle, type StyleProp } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { Icon, type IconName } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import type { VehicleDocumentStep } from './vehicle-documents-data';
import { flowStyles as s } from './vehicle-documents-styles';

type ArtworkType = VehicleDocumentStep['type'];
const palette = theme.documentation.colors;
const categories: Record<ArtworkType, string> = {
  photo: 'CONOCE TU VEHÍCULO',
  vehicle_registration: 'IDENTIDAD DEL VEHÍCULO',
  circulation_permit: 'PERMISO PARA CIRCULAR',
  technical_inspection: 'ESTADO DEL VEHÍCULO',
  homologation_certificate: 'ALTERNATIVA A LA REVISIÓN',
  soap: 'SEGURO OBLIGATORIO',
};
const stepIcons: Record<ArtworkType, IconName> = {
  photo: 'image',
  vehicle_registration: 'truck',
  circulation_permit: 'calendar',
  technical_inspection: 'search',
  homologation_certificate: 'check',
  soap: 'orders',
};

export function DocumentStepHeading({ step, index }: { step: VehicleDocumentStep; index: number }) {
  return (
    <View style={s.heading}>
      <View style={s.folio}>
        <View style={s.folioLine} />
        <Text variant="label" style={[s.eyebrow, s.grow]}>
          {String(index + 1).padStart(2, '0')} / {categories[step.type]}
        </Text>
      </View>
      <Text variant="title" style={s.title} accessibilityRole="header">
        {step.title}
      </Text>
      <Text variant="note" style={s.muted}>
        {step.hint}
      </Text>
    </View>
  );
}

export { DocumentStatus, DocumentMessage, DocumentAction } from '@/shared/documents/flow-ui';
/** Decorative guidance only: these shapes never stand in for an uploaded document. */
export function DocumentArtwork({ type }: { type: ArtworkType }) {
  const paper = type !== 'photo';
  return (
    <Svg
      width={theme.documentation.artwork.width}
      height={theme.documentation.artwork.height}
      viewBox={theme.documentation.artwork.viewBox}
      accessible={false}
      aria-hidden
    >
      <Path d="M20 123h184M30 115v-6m164 6v-6" stroke={palette.rule} strokeWidth="2" />
      <Circle cx="192" cy="28" r="10" fill={palette.accent} />
      <Path d="M24 33h12m-6-6v12" stroke={palette.olive} strokeWidth="2" />
      {paper ? (
        <>
          <Rect
            x="65"
            y="18"
            width="98"
            height="110"
            rx="12"
            fill={palette.canvas}
            stroke={palette.rule}
            strokeWidth="1.5"
            transform="rotate(-8 114 73)"
          />
          <Path
            d="M78 14h57l20 20v86a8 8 0 0 1-8 8H78a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8Z"
            fill={palette.paper}
            stroke={palette.ink}
            strokeWidth="2"
          />
          <Path d="M135 14v20h20" fill={palette.canvas} stroke={palette.ink} strokeWidth="2" />
          <Rect x="83" y="99" width="42" height="4" rx="2" fill={palette.olive} />
          <Rect x="83" y="109" width="56" height="3" rx="1.5" fill={palette.rule} />
          <G
            stroke={palette.ink}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {type === 'vehicle_registration' ? (
              <>
                <Rect x="83" y="45" width="26" height="28" rx="5" fill={palette.canvas} />
                <Path d="M90 55h12m-12 7h8m18-11h25m-25 10h25M83 84h58" />
              </>
            ) : null}
            {type === 'circulation_permit' ? (
              <>
                <Rect x="86" y="45" width="52" height="40" rx="6" />
                <Path d="M86 57h52m-41-17v11m30-11v11m-28 16 8 8 17-16" />
                <Circle cx="141" cy="82" r="12" fill={palette.accent} />
                <Path d="m136 82 4 4 7-9" />
              </>
            ) : null}
            {type === 'technical_inspection' ? (
              <>
                <Path d="M87 75a25 25 0 0 1 50 0m-25-1 14-17M89 75h8m38 0h-8m-15-25v8" />
                <Circle cx="112" cy="75" r="5" fill={palette.accent} />
                <Path d="m92 88 6-5m34 5-6-5" />
              </>
            ) : null}
            {type === 'homologation_certificate' ? (
              <>
                <Circle cx="112" cy="63" r="22" fill={palette.accent} />
                <Path d="m101 63 7 7 16-16M98 82l-3 13 17-7 17 7-3-13" />
              </>
            ) : null}
            {type === 'soap' ? (
              <>
                <Path d="m112 42 23 8v16c0 15-23 25-23 25S89 81 89 66V50Z" fill={palette.accent} />
                <Path d="m102 64 7 7 14-16" />
              </>
            ) : null}
          </G>
        </>
      ) : (
        <>
          <Rect
            x="39"
            y="22"
            width="150"
            height="98"
            rx="14"
            fill={palette.paper}
            stroke={palette.rule}
            strokeWidth="2"
          />
          <Path
            d="M49 46V32h18m94 0h18v14M49 96v14h18m94 0h18V96"
            fill="none"
            stroke={palette.olive}
            strokeWidth="2"
          />
          <Rect x="62" y="48" width="69" height="41" rx="5" fill={palette.ink} />
          <Path
            d="M131 61h20l17 17v11h-37Z"
            fill={palette.accent}
            stroke={palette.ink}
            strokeWidth="2"
          />
          <Path d="M140 67h9l10 11h-19Z" fill={palette.canvas} />
          <Circle cx="79" cy="91" r="9" fill={palette.ink} />
          <Circle cx="151" cy="91" r="9" fill={palette.ink} />
          <Rect
            x="90"
            y="103"
            width="49"
            height="14"
            rx="4"
            fill={palette.paper}
            stroke={palette.olive}
            strokeWidth="1.5"
          />
          <Path d="M98 110h33" stroke={palette.olive} strokeWidth="2" strokeDasharray="4 3" />
        </>
      )}
    </Svg>
  );
}

export function DocumentUploadCard({
  step,
  disabled,
  onPress,
}: {
  step: VehicleDocumentStep;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PulsePressable
      style={s.upload}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Adjuntar ${step.title}`}
      accessibilityState={{ disabled }}
      onPress={onPress}
    >
      <View style={s.uploadArt}>
        <DocumentArtwork type={step.type} />
      </View>
      <View style={s.uploadBody}>
        <View style={s.fileRow}>
          <View style={s.grow}>
            <Text variant="subtitle">
              {step.type === 'photo' ? 'Tu vehículo, a la vista' : 'Aquí va tu documento'}
            </Text>
          </View>
          <View style={s.uploadMark}>
            <Icon name="arrowRight" color={palette.ink} />
          </View>
        </View>
        <Text variant="note" style={s.muted}>
          {step.type === 'photo'
            ? 'Toca para elegir una foto de la galería'
            : 'Toca para elegir · PDF, JPG o PNG · hasta 5 MB'}
        </Text>
      </View>
    </PulsePressable>
  );
}

export function DocumentMedia({
  uri,
  label,
  style,
  fallback,
  onRetry,
}: {
  uri: string | undefined;
  label: string;
  style?: StyleProp<ImageStyle>;
  fallback?: string;
  onRetry?: () => void;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return (
    <View style={s.mediaFrame}>
      {uri && uri !== failedUri ? (
        <Image
          source={{ uri }}
          style={[s.preview, style]}
          resizeMode="contain"
          accessibilityLabel={label}
          onError={() => setFailedUri(uri)}
        />
      ) : (
        <View style={s.mediaFallback}>
          <Icon name="image" size={theme.layout.brandMark} />
          <Text variant="note" style={[s.muted, s.center]}>
            {fallback ?? 'Vista previa no disponible'}
          </Text>
          {onRetry ? (
            <DocumentAction label="Actualizar vista previa" icon="refresh" onPress={onRetry} />
          ) : null}
        </View>
      )}
      <View pointerEvents="none" style={[s.corner, s.cornerTL]} />
      <View pointerEvents="none" style={[s.corner, s.cornerTR]} />
      <View pointerEvents="none" style={[s.corner, s.cornerBL]} />
      <View pointerEvents="none" style={[s.corner, s.cornerBR]} />
    </View>
  );
}

export function DocumentFileIcon({ type }: { type: ArtworkType }) {
  return (
    <View style={s.paperIcon}>
      <View style={s.paperFold} />
      <Icon name={stepIcons[type]} color={palette.olive} />
    </View>
  );
}

import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import {
  documentError,
  documentLabels,
  licenseClassLabels,
  requiresExpiry,
  type DocumentVersion,
} from '@/shared/documents/contracts';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button, Feedback, Input } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { s } from './admin-ui';

export type ReviewDecision = 'approved' | 'rejected';
const reasons = ['Ilegible', 'Incompleto', 'No corresponde', 'Vencido'];

export function DocumentReviewSheet({
  doc,
  decision,
  close,
  onBusyChange,
}: {
  doc: DocumentVersion;
  decision: ReviewDecision;
  close: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { session } = useAuth();
  const client = useQueryClient();
  const [expires, setExpires] = useState(doc.expires_on ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const expiryRequired = requiresExpiry(doc.type);
  const parsedDate = z.iso.date().safeParse(expires);
  const review = useMutation({
    mutationFn: async () => {
      if (doc.submitted_by === session?.user.id || doc.status !== 'pending')
        throw new Error('Este documento requiere otro revisor.');
      if (decision === 'approved' && expiryRequired && (!parsedDate.success || !confirmed))
        throw new Error('Confirma la fecha de vigencia.');
      if (decision === 'rejected' && !reason.trim())
        throw new Error('Indica el motivo de rechazo.');
      const { error } = await getSupabase().rpc('review_document', {
        p_document_id: doc.id,
        p_decision: decision,
        p_rejection_reason: decision === 'rejected' ? reason.trim() : null,
        p_expires_on:
          decision === 'approved' && expiryRequired && parsedDate.success
            ? parsedDate.data
            : doc.expires_on,
      });
      if (error?.code === '55000')
        throw new Error(
          'Este archivo ya cambió o fue reemplazado. Vuelve para revisar la versión actual.',
        );
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all(
        [
          'admin-workspace',
          'owner-documents',
          'business-vehicles',
          'business-coverage',
          'driver',
        ].map((key) => client.invalidateQueries({ queryKey: [key] })),
      );
      close();
    },
    onError: () =>
      Promise.all(
        ['admin-workspace', 'owner-documents'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      ),
  });
  useEffect(() => {
    onBusyChange(review.isPending);
    return () => onBusyChange(false);
  }, [review.isPending, onBusyChange]);
  const allowed =
    decision === 'approved'
      ? !expiryRequired || (parsedDate.success && confirmed)
      : !!reason.trim();
  return (
    <BottomSheet
      visible
      title={decision === 'approved' ? 'Aprobar documento' : 'Rechazar documento'}
      onClose={close}
      dismissible={!review.isPending}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.stack}>
        <Text variant="label">{documentLabels[doc.type]}</Text>
        {decision === 'approved' ? (
          <>
            {expiryRequired ? (
              <>
                <Input
                  label={
                    doc.type === 'driver_license_back'
                      ? 'Próximo control (AAAA-MM-DD)'
                      : 'Vencimiento (AAAA-MM-DD)'
                  }
                  value={expires}
                  onChangeText={(value) => {
                    setExpires(value);
                    setConfirmed(false);
                  }}
                  maxLength={10}
                  editable={!review.isPending}
                />
                <PulsePressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: confirmed, disabled: review.isPending }}
                  accessibilityLabel="Confirmo la fecha del documento"
                  style={[s.row, s.card]}
                  disabled={review.isPending || !parsedDate.success}
                  onPress={() => setConfirmed(!confirmed)}
                >
                  <Icon name={confirmed ? 'check' : 'calendar'} />
                  <Text variant="label" style={s.grow}>
                    Confirmo la fecha
                  </Text>
                </PulsePressable>
              </>
            ) : null}
            {doc.type === 'homologation_certificate' ? (
              <Text variant="note" style={s.muted}>
                Confirma vehículo y vigencia de la homologación.
              </Text>
            ) : null}
            {doc.type === 'driver_license_back' ? (
              <Text variant="note" style={s.muted}>
                Clase {doc.license_class ? licenseClassLabels[doc.license_class] : 'sin indicar'}:
                revisa próximo control y ambas caras.
              </Text>
            ) : null}
            <Button
              label="Aprobar"
              disabled={!allowed}
              loading={review.isPending}
              onPress={() => review.mutate()}
            />
          </>
        ) : (
          <>
            <View style={s.wrap}>
              {reasons.map((value) => (
                <Button
                  key={value}
                  label={value}
                  variant="secondary"
                  style={[s.reason, reason === value && s.selected]}
                  disabled={review.isPending}
                  onPress={() => setReason(value)}
                />
              ))}
            </View>
            <Input
              label="Motivo"
              value={reason}
              onChangeText={setReason}
              maxLength={500}
              multiline
              editable={!review.isPending}
            />
            <Button
              label="Confirmar rechazo"
              variant="destructive"
              style={s.destructive}
              disabled={!allowed}
              loading={review.isPending}
              onPress={() => review.mutate()}
            />
          </>
        )}
        <Button label="Volver" variant="link" disabled={review.isPending} onPress={close} />
        {review.isError ? <Feedback error text={documentError(review.error)} /> : null}
      </ScrollView>
    </BottomSheet>
  );
}

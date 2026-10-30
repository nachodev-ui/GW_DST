import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused, usePreventRemove } from 'expo-router/react-navigation';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import {
  documentLabels,
  licenseClassLabels,
  type DocumentVersion,
} from '@/shared/documents/contracts';
import { useDocumentViewer } from '@/shared/documents/document-viewer';
import { Button } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import {
  matchesFilter,
  reviewFilterSchema,
  useAdminOwner,
  useAdminWorkspace,
  type AdminBusiness,
  type AdminOwner,
  type ReviewFilter,
} from './admin-data';
import { AdminChip, AdminImage, AdminPage, QueryFeedback, ReviewProgress, s } from './admin-ui';
import { DocumentReviewSheet, type ReviewDecision } from './document-review-sheet';
import { reviewDocumentVersions } from './document-versions';

export function AdminBusinessReviewScreen() {
  const params = useLocalSearchParams<{ businessId?: string; filter?: string }>();
  const id = z.uuid().safeParse(params.businessId);
  const filter = reviewFilterSchema.safeParse(params.filter).data ?? 'pending';
  const query = useAdminWorkspace();
  const business =
    !query.isError && id.success
      ? query.data?.businesses.find((item) => item.id === id.data)
      : undefined;
  const back = () => router.replace({ pathname: '/admin/documents', params: { filter } });
  if (!business)
    return (
      <AdminPage title="Revisión" onBack={back}>
        <QueryFeedback
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
        {!query.isPending && !query.isError ? <Text>Distribuidora no disponible.</Text> : null}
      </AdminPage>
    );
  return (
    <BusinessReview
      key={`${business.id}:${filter}`}
      business={business}
      filter={filter}
      today={query.data!.today}
      refresh={() => query.refetch()}
      back={back}
    />
  );
}

function BusinessReview({
  business,
  filter,
  today,
  refresh,
  back,
}: {
  business: AdminBusiness;
  filter: ReviewFilter;
  today: string;
  refresh: () => Promise<unknown>;
  back: () => void;
}) {
  // Snapshot the steps: completed owners stay available to Anterior/Siguiente.
  const [steps] = useState(() => business.owners.filter((owner) => matchesFilter(owner, filter)));
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hasAction, setHasAction] = useState(false);
  usePreventRemove(busy, () => undefined);
  const owner = steps[index];
  const summary = index >= steps.length;
  const reviewed = business.approved + business.rejected;
  return (
    <AdminPage
      title={business.name}
      onBack={() => {
        if (!busy) back();
      }}
      onRefresh={busy ? undefined : refresh}
      footer={
        summary ? (
          <View style={s.row}>
            {steps.length ? (
              <View style={s.grow}>
                <Button
                  label="Anterior"
                  variant="secondary"
                  onPress={() => setIndex(steps.length - 1)}
                />
              </View>
            ) : null}
            <View style={s.grow}>
              <Button label="Volver a la lista" onPress={back} />
            </View>
          </View>
        ) : (
          <View style={s.row}>
            <View style={s.grow}>
              <Button
                label="Anterior"
                variant="secondary"
                disabled={busy || index === 0}
                onPress={() => {
                  setHasAction(false);
                  setIndex(index - 1);
                }}
              />
            </View>
            <View style={s.grow}>
              <Button
                label={index === steps.length - 1 ? 'Resumen' : 'Siguiente'}
                variant={hasAction ? 'secondary' : 'primary'}
                disabled={busy}
                onPress={() => {
                  setHasAction(false);
                  setIndex(index + 1);
                }}
              />
            </View>
          </View>
        )
      }
    >
      <ReviewProgress done={reviewed} total={reviewed + business.pending} />
      <View style={s.between}>
        <Text variant="label">
          {summary
            ? 'Resumen'
            : `${owner!.type === 'vehicle' ? 'Vehículo' : 'Conductor'} · ${index + 1}/${steps.length}`}
        </Text>
        <Icon name={summary ? 'check' : owner!.type === 'vehicle' ? 'truck' : 'user'} />
      </View>
      {summary ? (
        <View style={s.card}>
          <Text variant="label">Estado actual</Text>
          <AdminChip label={`${business.approved} aprobados`} icon="check" tone="approved" />
          <AdminChip label={`${business.rejected} rechazados`} icon="close" tone="rejected" />
          <AdminChip label={`${business.pending} pendientes`} icon="clock" />
        </View>
      ) : (
        <OwnerReview
          key={owner!.id}
          owner={owner!}
          today={today}
          onBusyChange={setBusy}
          onHasActionChange={setHasAction}
        />
      )}
    </AdminPage>
  );
}

function OwnerReview({
  owner,
  today,
  onBusyChange,
  onHasActionChange,
}: {
  owner: AdminOwner;
  today: string;
  onBusyChange: (busy: boolean) => void;
  onHasActionChange: (value: boolean) => void;
}) {
  const { session } = useAuth();
  const focused = useIsFocused();
  const [busy, setBusy] = useState(false);
  const query = useAdminOwner(owner, focused && !busy);
  const viewer = useDocumentViewer();
  const [active, setActive] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [review, setReview] = useState<{ doc: DocumentVersion; decision: ReviewDecision } | null>(
    null,
  );
  const data = query.isError ? undefined : query.data;
  const { current: documents, history } = reviewDocumentVersions(data?.items ?? []);
  const selected =
    (documents.some((doc) => doc.id === active) ? active : null) ??
    documents.find((doc) => doc.status === 'pending' && doc.submitted_by !== session?.user.id)?.id;
  const actionable = documents.some(
    (doc) =>
      doc.id === selected && doc.status === 'pending' && doc.submitted_by !== session?.user.id,
  );
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    onHasActionChange(actionable);
    return () => onHasActionChange(false);
  }, [actionable, onHasActionChange]);
  return (
    <View style={s.stack}>
      <QueryFeedback
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {data ? (
        <>
          <View style={s.card}>
            {owner.type === 'vehicle' ? (
              <>
                <Text variant="title">{data.vehicle?.plate ?? 'Vehículo'}</Text>
                <Text variant="note" style={s.muted}>
                  {[data.vehicle?.make, data.vehicle?.model, data.vehicle?.year]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <AdminImage
                  path={data.photo_path}
                  photo
                  large
                  onPress={data.photo_path ? () => viewer.openPhoto(data.photo_path!) : undefined}
                />
              </>
            ) : (
              <View style={s.row}>
                <Icon name="user" />
                <View style={s.grow}>
                  <Text variant="title">{data.rut ?? 'Sin RUT'}</Text>
                  <Text variant="note">
                    {data.license_class
                      ? `Clase ${licenseClassLabels[data.license_class]}`
                      : 'Sin clase'}
                  </Text>
                </View>
              </View>
            )}
          </View>
          {documents.map((doc) => (
            <DocumentReviewCard
              key={doc.id}
              doc={doc}
              today={today}
              selected={selected === doc.id}
              own={doc.submitted_by === session?.user.id}
              disabled={busy}
              onSelect={() => setActive(doc.id)}
              onView={() => viewer.openDocument(doc, documentLabels[doc.type])}
              onReview={(decision) => setReview({ doc, decision })}
            />
          ))}
          {!documents.length ? <Text style={s.muted}>Sin documentos.</Text> : null}
          {history.length ? (
            <View style={s.stack}>
              <Button
                label={showHistory ? 'Ocultar historial' : `Ver historial (${history.length})`}
                variant="link"
                disabled={busy}
                onPress={() => setShowHistory((value) => !value)}
              />
              {showHistory ? (
                <>
                  <Text variant="note" style={s.muted}>
                    Versiones anteriores · solo consulta
                  </Text>
                  {history.map((doc) => (
                    <DocumentReviewCard
                      key={doc.id}
                      doc={doc}
                      today={today}
                      selected={false}
                      own={doc.submitted_by === session?.user.id}
                      disabled={busy}
                      historical
                      onSelect={() => viewer.openDocument(doc, documentLabels[doc.type])}
                      onView={() => viewer.openDocument(doc, documentLabels[doc.type])}
                      onReview={() => undefined}
                    />
                  ))}
                </>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
      {review ? (
        <DocumentReviewSheet
          key={`${review.doc.id}:${review.decision}`}
          doc={review.doc}
          decision={review.decision}
          close={() => setReview(null)}
          onBusyChange={setBusy}
        />
      ) : null}
      {viewer.viewer}
    </View>
  );
}

function DocumentReviewCard({
  doc,
  today,
  selected,
  own,
  disabled,
  onSelect,
  onView,
  onReview,
  historical = false,
}: {
  doc: DocumentVersion;
  today: string;
  selected: boolean;
  own: boolean;
  disabled: boolean;
  onSelect: () => void;
  onView: () => void;
  onReview: (decision: ReviewDecision) => void;
  historical?: boolean;
}) {
  const status =
    doc.status === 'replaced'
      ? 'Envío reemplazado'
      : doc.status === 'superseded'
        ? 'Versión anterior'
        : historical && doc.status === 'pending'
          ? 'Envío anterior'
          : doc.status === 'approved'
            ? 'Aprobado'
            : doc.status === 'rejected'
              ? 'Rechazado'
              : 'Pendiente';
  const expiry = doc.expires_on
    ? doc.expires_on < today
      ? 'Vencido'
      : doc.expires_on <=
          new Date(Date.parse(`${today}T12:00:00Z`) + 30 * 86400000).toISOString().slice(0, 10)
        ? 'Por vencer'
        : null
    : null;
  return (
    <View style={[s.card, selected && s.activeCard]}>
      <PulsePressable
        accessibilityRole="button"
        accessibilityLabel={`${historical ? 'Ver versión anterior de' : 'Revisar'} ${documentLabels[doc.type]}`}
        accessibilityState={{ expanded: selected }}
        disabled={disabled}
        onPress={onSelect}
        style={s.row}
      >
        <AdminImage path={doc.file_path} pdf={doc.mime_type === 'application/pdf'} />
        <View style={[s.grow, s.stackSmall]}>
          <Text variant="label">{documentLabels[doc.type]}</Text>
          <AdminChip
            label={status}
            icon={
              doc.status === 'approved' ? 'check' : doc.status === 'rejected' ? 'close' : 'clock'
            }
            tone={
              doc.status === 'approved'
                ? 'approved'
                : doc.status === 'rejected'
                  ? 'rejected'
                  : 'pending'
            }
          />
        </View>
      </PulsePressable>
      {doc.expires_on ? (
        <View style={s.wrap}>
          <Text variant="note">
            {doc.type === 'driver_license_back' ? 'Control' : 'Vence'}:{' '}
            {doc.expires_on.split('-').reverse().join('/')}
          </Text>
          {expiry ? (
            <AdminChip
              label={expiry}
              icon="calendar"
              tone={expiry === 'Vencido' ? 'rejected' : 'warning'}
            />
          ) : null}
        </View>
      ) : null}
      {doc.rejection_reason ? <Text variant="note">{doc.rejection_reason}</Text> : null}
      <Button label="Ver" variant="secondary" disabled={disabled} onPress={onView} />
      {doc.status === 'pending' && !historical ? (
        own ? (
          <AdminChip label="Requiere otro revisor" icon="user" tone="neutral" />
        ) : selected ? (
          <View style={s.stackSmall}>
            <Button label="Aprobar" disabled={disabled} onPress={() => onReview('approved')} />
            <Button
              label="Rechazar"
              variant="destructive"
              style={s.destructive}
              disabled={disabled}
              onPress={() => onReview('rejected')}
            />
          </View>
        ) : (
          <Button label="Revisar" variant="secondary" disabled={disabled} onPress={onSelect} />
        )
      ) : null}
    </View>
  );
}

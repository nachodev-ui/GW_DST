import { useEffect, useState } from 'react';
import { trackEvent } from '@/shared/analytics/track-event';
import { Linking, ScrollView, View } from 'react-native';
import {
  deliveryOptionSchema,
  deliveryAvailability,
  distributorContactUrl,
  serviceStatus,
  sortDeliveryOptions,
  type DeliveryOption,
  type DeliverySort,
} from '@/shared/orders/delivery-options';
import { formatClp } from '@/shared/orders/contracts';
import { Button, Card, Feedback, OptionCard, StatusBadge, ui } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Text } from '@/shared/ui/text';
import { Enter } from '@/shared/ui/enter';

const sortChoices = [
  { value: 'recommended', label: 'Recomendado' },
  { value: 'price', label: 'Menor precio' },
  { value: 'fastest', label: 'Menor tiempo estimado' },
] as const;

export function DeliveryOptionsList({
  options,
  quantity,
  onSelect,
}: {
  options: DeliveryOption[];
  quantity: number;
  onSelect: (option: DeliveryOption) => void;
}) {
  const [sort, setSort] = useState<DeliverySort>('recommended');
  const [contact, setContact] = useState<DeliveryOption | null>(null);
  const [contactError, setContactError] = useState(false);
  const [opening, setOpening] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const ordered = sortDeliveryOptions(options, sort);
  useEffect(() => {
    trackEvent('results_viewed', { count: options.length, sort });
  }, [options, sort]);
  return (
    <View style={ui.stack}>
      <Text variant="subtitle" accessibilityLiveRegion="polite">
        {options.length}{' '}
        {options.length === 1 ? 'distribuidora con stock' : 'distribuidoras con stock'}
      </Text>
      <Button
        label={`Ordenar: ${sortChoices.find((choice) => choice.value === sort)?.label}`}
        variant="secondary"
        onPress={() => setSortOpen(true)}
      />
      {ordered.map((option, index) => {
        const status = serviceStatus(option.service.schedule);
        const availability = deliveryAvailability(option);
        const eta =
          option.service.eta_min !== null && status.open !== false && option.has_available_driver
            ? `Llegada estimada: ${option.service.eta_min}–${option.service.eta_max} min`
            : 'Llegada por confirmar';
        const contactUrl = distributorContactUrl(option.service.whatsapp, option.name);
        const price = (value: number | null) =>
          value === null ? 'Consultar' : formatClp(value * quantity);
        return (
          <Enter key={option.id} index={index}>
            <Card>
              <Text variant="subtitle">{option.name}</Text>
              <StatusBadge
                label={option.is_demo ? 'Demostración · datos ficticios' : 'Habilitada en Gasway'}
                tone={option.is_demo ? 'warning' : 'success'}
                icon={option.is_demo ? 'clock' : 'check'}
              />
              <Text variant="note" style={ui.muted}>
                {status.label}
              </Text>
              <Text variant="label">{eta}</Text>
              <Text variant="label">
                Stock del negocio: {option.stock} {option.stock === 1 ? 'cilindro' : 'cilindros'}
              </Text>
              <Text variant="note" style={ui.muted}>
                {!option.has_coverage
                  ? 'Sin reparto en tu comuna.'
                  : option.has_available_driver
                    ? 'Hay conductor disponible en tu comuna.'
                    : 'Sin repartidores disponibles ahora.'}
              </Text>
              <Text variant="note" style={ui.muted}>
                Marcas que vende: {option.brands.join(' · ')}
              </Text>
              <View style={ui.equalRow}>
                <View style={ui.flex}>
                  <Text variant="note" style={ui.muted}>
                    Con canje · {quantity} {quantity === 1 ? 'cilindro' : 'cilindros'}
                  </Text>
                  <Text variant="subtitle">{price(option.unit_price_clp)}</Text>
                </View>
                <View style={ui.flex}>
                  <Text variant="note" style={ui.muted}>
                    Sin canje · incluye envase
                  </Text>
                  <Text variant="subtitle">{price(option.price_without_exchange_clp)}</Text>
                </View>
              </View>
              <Text variant="note" style={ui.muted}>
                Total elegido
              </Text>
              <Text variant="title">
                {option.total_clp === null ? 'Precio por confirmar' : formatClp(option.total_clp)}
              </Text>
              <Text variant="note" style={ui.muted}>
                Precio del negocio. El servidor lo revisa al confirmar; no se añaden cargos en
                Gasway. Atención y entrega en la dirección sujetas a confirmación.
              </Text>
              <Button
                label={availability.label}
                disabled={!availability.canOrder}
                onPress={() => onSelect(deliveryOptionSchema.parse(option))}
              />
              {contactUrl && !option.is_demo ? (
                <Button
                  label="Consultar por WhatsApp"
                  variant="link"
                  onPress={() => {
                    setContactError(false);
                    setContact(option);
                  }}
                />
              ) : null}
              {option.total_clp === null ? (
                <Text variant="note" style={ui.muted}>
                  El negocio aún no informó precio para esta modalidad. No puedes confirmar un
                  pedido sin precio.
                </Text>
              ) : null}
            </Card>
          </Enter>
        );
      })}
      <Text variant="note" style={ui.muted}>
        Recomendado prioriza disponibilidad, horario informado, estimación y precio. Las
        estimaciones las informa el negocio. No hay valoraciones verificadas todavía. Una
        habilitación en Gasway no representa una certificación SEC.
      </Text>
      <BottomSheet
        visible={sortOpen}
        title="Ordenar distribuidoras"
        onClose={() => setSortOpen(false)}
      >
        <View
          style={ui.stack}
          accessibilityRole="radiogroup"
          accessibilityLabel="Orden de distribuidoras"
        >
          {sortChoices.map((choice) => (
            <OptionCard
              key={choice.value}
              label={choice.label}
              selected={choice.value === sort}
              onPress={() => {
                setSort(choice.value);
                setSortOpen(false);
              }}
            />
          ))}
        </View>
      </BottomSheet>
      <BottomSheet
        visible={contact !== null}
        title="Consulta al negocio"
        onClose={() => setContact(null)}
        dismissible={!opening}
      >
        <ScrollView contentContainerStyle={ui.stack}>
          <Text variant="subtitle">{contact?.name}</Text>
          <Text>
            Se abrirá WhatsApp con una consulta general. Tu dirección y los datos de tu pedido no se
            incluyen. Confirma tu pedido en Gasway.
          </Text>
          <Button
            label={opening ? 'Abriendo WhatsApp…' : 'Abrir WhatsApp'}
            disabled={opening}
            onPress={() => {
              const url = contact
                ? distributorContactUrl(contact.service.whatsapp, contact.name)
                : null;
              if (!url) return;
              if (contact) trackEvent('whatsapp_clicked', { distributorId: contact.id });
              setOpening(true);
              void Linking.openURL(url)
                .then(() => setContact(null))
                .catch(() => setContactError(true))
                .finally(() => setOpening(false));
            }}
          />
          {contactError ? (
            <Feedback
              error
              text="No pudimos abrir WhatsApp. Revisa tu conexión o vuelve a intentarlo."
            />
          ) : null}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

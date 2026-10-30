import { useEffect, useState } from 'react';
import { trackEvent } from '@/shared/analytics/track-event';
import { Linking, ScrollView, View } from 'react-native';
import {
  deliveryOptionSchema,
  serviceStatus,
  distributorContactUrl,
  sortDeliveryOptions,
  type DeliveryOption,
  type DeliverySort,
} from '@/shared/orders/delivery-options';
import { formatClp, type Product } from '@/shared/orders/contracts';
import { Button, Feedback, OptionCard, ui } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Text } from '@/shared/ui/text';
import { Enter } from '@/shared/ui/enter';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { DeliveryOptionCard } from './delivery-option-card';
import { purchaseStyles as purchase } from './purchase-styles';

const sortChoices = [
  { value: 'recommended', label: 'Recomendado' },
  { value: 'price', label: 'Menor precio' },
  { value: 'fastest', label: 'Menor tiempo estimado' },
] as const;

export function DeliveryOptionsList({
  options,
  quantity,
  product,
  exchangeEmpty,
  onSelect,
}: {
  options: DeliveryOption[];
  quantity: number;
  product: Product | undefined;
  exchangeEmpty: boolean;
  onSelect: (option: DeliveryOption) => void;
}) {
  const [sort, setSort] = useState<DeliverySort>('recommended');
  const [contact, setContact] = useState<DeliveryOption | null>(null);
  const [contactError, setContactError] = useState(false);
  const [opening, setOpening] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [details, setDetails] = useState<DeliveryOption | null>(null);
  const ordered = sortDeliveryOptions(options, sort);
  useEffect(() => {
    trackEvent('results_viewed', { count: options.length, sort });
  }, [options, sort]);
  return (
    <View style={ui.stack}>
      <View style={purchase.row}>
        <Text variant="label" style={purchase.grow} accessibilityLiveRegion="polite">
          {options.length} {options.length === 1 ? 'distribuidora' : 'distribuidoras'}
        </Text>
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel={`Ordenar: ${sortChoices.find((choice) => choice.value === sort)?.label}`}
          style={[purchase.action, purchase.outlineAction]}
          onPress={() => setSortOpen(true)}
        >
          <Icon name="sort" />
          <Text variant="note" style={purchase.actionText}>
            {sortChoices.find((choice) => choice.value === sort)?.label}
          </Text>
          <Icon name="chevronDown" />
        </PulsePressable>
      </View>
      {ordered.map((option, index) => {
        const contactUrl = distributorContactUrl(option.service.whatsapp, option.name);
        return (
          <Enter key={option.id} index={index}>
            <DeliveryOptionCard
              option={option}
              product={product}
              quantity={quantity}
              exchangeEmpty={exchangeEmpty}
              onSelect={() => onSelect(deliveryOptionSchema.parse(option))}
              onDetails={() => setDetails(option)}
              onContact={
                contactUrl && !option.is_demo
                  ? () => {
                      setContactError(false);
                      setContact(option);
                    }
                  : undefined
              }
            />
          </Enter>
        );
      })}
      <BottomSheet
        visible={details !== null}
        title="Sobre esta distribuidora"
        onClose={() => setDetails(null)}
      >
        {details ? (
          <ScrollView contentContainerStyle={purchase.stack}>
            <Text variant="title">{details.name}</Text>
            <View style={purchase.row}>
              <Icon name="clock" />
              <Text style={purchase.grow}>{serviceStatus(details.service.schedule).label}</Text>
            </View>
            <View style={purchase.row}>
              <Icon name="store" />
              <Text style={purchase.grow}>{details.brands.join(' · ')}</Text>
            </View>
            <View style={purchase.pricePair}>
              <View style={purchase.priceOption}>
                <Icon name="exchange" />
                <Text variant="label">Con cilindro vacío</Text>
                <Text variant="subtitle">
                  {details.unit_price_clp === null
                    ? 'Por confirmar'
                    : formatClp(details.unit_price_clp * quantity)}
                </Text>
              </View>
              <View style={purchase.priceOption}>
                <Icon name="orders" />
                <Text variant="label">Con cilindro incluido</Text>
                <Text variant="subtitle">
                  {details.price_without_exchange_clp === null
                    ? 'Por confirmar'
                    : formatClp(details.price_without_exchange_clp * quantity)}
                </Text>
              </View>
            </View>
            <Text variant="note" style={purchase.muted}>
              Los precios corresponden a {quantity} {quantity === 1 ? 'cilindro' : 'cilindros'}. La
              llegada es una estimación informada por el negocio.
            </Text>
            <Text variant="note" style={purchase.muted}>
              El orden recomendado considera disponibilidad, horario, llegada estimada y precio.
            </Text>
          </ScrollView>
        ) : null}
      </BottomSheet>
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

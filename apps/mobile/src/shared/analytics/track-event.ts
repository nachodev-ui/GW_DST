type Events = {
  address_set: Record<string, never>;
  format_selected: { weight: 5 | 11 | 15 | 45 };
  results_viewed: { count: number; sort: 'recommended' | 'price' | 'fastest' };
  no_coverage_viewed: Record<string, never>;
  whatsapp_clicked: { distributorId: string };
};
/** Extension point only. Payloads exclude addresses, coordinates, RUT and contact details. */
export function trackEvent<Name extends keyof Events>(_name: Name, _payload: Events[Name]): void {}

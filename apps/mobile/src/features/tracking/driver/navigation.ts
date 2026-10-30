import { deliveryPointSchema, type DeliveryPoint } from '@/shared/orders/delivery-point';
export type NavigationApp = 'google' | 'waze';
export function navigationUrl(app: NavigationApp, destination: DeliveryPoint) {
  const point = deliveryPointSchema.parse(destination),
    coordinates = `${point.latitude},${point.longitude}`;
  if (app === 'waze')
    return `https://waze.com/ul?${new URLSearchParams({ ll: coordinates, navigate: 'yes', utm_source: 'gasway' })}`;
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination: coordinates, travelmode: 'driving', dir_action: 'navigate' })}`;
}

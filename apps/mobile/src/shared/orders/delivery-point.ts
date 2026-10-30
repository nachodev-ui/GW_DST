import { z } from 'zod';

export const deliveryPointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});
export type DeliveryPoint = z.infer<typeof deliveryPointSchema>;

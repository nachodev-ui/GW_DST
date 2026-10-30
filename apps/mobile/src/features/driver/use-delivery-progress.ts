import { useEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import type { assignedOrderSchema } from './offer-contracts';

type Target = 'on_the_way' | 'delivered';
type AssignedOrder = z.infer<typeof assignedOrderSchema>;
type Mutate = (
  values: { id: string; status: Target },
  callbacks: {
    onSuccess: (order: AssignedOrder) => void;
    onError: (error: unknown) => void;
    onSettled: () => void;
  },
) => void;
export type DeliveryProgressFeedback = {
  key: string;
  scope: string;
  target: Target;
} & ({ state: 'pending' | 'success' } | { state: 'error'; error: unknown });

// Only an explicit, acknowledged mutation creates success feedback. Polling never does.
export function useDeliveryProgress(userId: string | undefined, orderId: string, mutate: Mutate) {
  const scope = `${userId}:${orderId}`;
  const [record, setRecord] = useState<DeliveryProgressFeedback | null>(null);
  const owner = useRef<string | null>(scope);
  const sequence = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => {
    sequence.current++;
    owner.current = scope;
    inFlight.current = false;
    return () => {
      owner.current = null;
      inFlight.current = false;
    };
  }, [scope]);
  const feedback = record?.scope === scope ? record : null;
  return {
    feedback,
    pending: feedback?.state === 'pending',
    clear: () => {
      if (!inFlight.current) setRecord(null);
    },
    submit: (target: Target) => {
      if (!userId || inFlight.current || owner.current !== scope) return;
      inFlight.current = true;
      const request = ++sequence.current;
      const base = { scope, target, key: `${scope}:${request}` };
      const current = () => owner.current === scope && sequence.current === request;
      setRecord({ ...base, state: 'pending' });
      mutate(
        { id: orderId, status: target },
        {
          onSuccess: (order) => {
            if (!current()) return;
            setRecord(
              order.order_id === orderId && order.status === target
                ? { ...base, state: 'success' }
                : { ...base, state: 'error', error: new Error('Unconfirmed order transition') },
            );
          },
          onError: (error) => {
            if (current()) setRecord({ ...base, state: 'error', error });
          },
          onSettled: () => {
            if (current()) inFlight.current = false;
          },
        },
      );
    },
  };
}

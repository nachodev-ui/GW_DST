import { useCallback, useEffect, useRef } from 'react';
import type MapView from 'react-native-maps';
import type { DeliveryPoint } from '@/shared/orders/delivery-point';
import { theme } from '@/theme';

export function useTrackingCamera(
  ready: boolean,
  destination: DeliveryPoint | null,
  position: DeliveryPoint | null,
) {
  const map = useRef<MapView>(null);
  const framedPoints = useRef(0);
  const userControlled = useRef(false);
  const frame = useCallback(() => {
    if (!ready || !map.current) return;
    const points = [destination, position].filter((point) => point !== null);
    if (points.length > 1) {
      map.current.fitToCoordinates(points, {
        edgePadding: {
          top: theme.spacing.xl,
          bottom: theme.layout.touchTarget + theme.spacing.lg,
          left: theme.spacing.xl,
          right: theme.spacing.xl,
        },
        animated: false,
      });
    } else if (points[0]) {
      map.current.animateToRegion(
        {
          ...points[0],
          latitudeDelta: theme.maps.cameraDelta,
          longitudeDelta: theme.maps.cameraDelta,
        },
        0,
      );
    }
    framedPoints.current = points.length;
  }, [ready, destination, position]);

  useEffect(() => {
    const count = Number(destination !== null) + Number(position !== null);
    // A later first driver fix can complete the initial frame, until the user touches the map.
    if (!userControlled.current && count > framedPoints.current) frame();
  }, [destination, position, frame]);

  return {
    map,
    onInteraction: () => {
      userControlled.current = true;
    },
    recenter: () => {
      userControlled.current = true;
      frame();
    },
  };
}

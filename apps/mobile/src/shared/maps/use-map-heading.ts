import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type MapView from 'react-native-maps';
import { normalizeHeading } from './vehicle-motion/geometry';

// Apple custom views are billboards: their image needs the camera heading, even at rest.
// Reading the camera never changes framing. Limit reads to one in flight and 10 Hz.
export function useMapHeading(map: RefObject<MapView | null>, enabled: boolean) {
  const [heading, setHeading] = useState(0);
  const lifetime = useRef({ active: enabled });
  const pending = useRef(false);
  const finalRead = useRef(false);
  const lastRead = useRef(-Infinity);
  const readHeading = useCallback(
    function readCamera(force = false): void {
      const guard = lifetime.current;
      if (!enabled || !guard.active || !map.current) return;
      if (pending.current) {
        finalRead.current ||= force;
        return;
      }
      const now = performance.now();
      if (!force && now - lastRead.current < 100) return;
      lastRead.current = now;
      pending.current = true;
      void map.current
        .getCamera()
        .then((camera) => {
          if (guard.active && Number.isFinite(camera.heading))
            setHeading(normalizeHeading(camera.heading));
        })
        .catch(() => undefined)
        .finally(() => {
          pending.current = false;
          if (guard.active && finalRead.current) {
            finalRead.current = false;
            readCamera(true);
          }
        });
    },
    [enabled, map],
  );
  useEffect(() => {
    const guard = { active: enabled };
    lifetime.current = guard;
    return () => {
      guard.active = false;
      finalRead.current = false;
    };
  }, [enabled]);
  return { heading, readHeading };
}

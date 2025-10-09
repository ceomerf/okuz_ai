import { useCallback } from 'react';

interface EventPayload {
  type: string; // e.g., USER_DELETED
  actorId?: string;
  targetId?: string;
  context?: Record<string, unknown>;
}

export const useEventLogger = () => {
  const logEvent = useCallback(async (payload: EventPayload) => {
    try {
      // TODO: send to analytics endpoint or data layer
      // fetch('/analytics/events', { method: 'POST', body: JSON.stringify(payload) })
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[event]', payload);
      }
    } catch {
      // noop
    }
  }, []);

  return { logEvent };
};



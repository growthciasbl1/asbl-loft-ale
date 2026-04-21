import { useBehaviorStore } from '@/lib/store/behaviorStore';
import { BehaviorEvent } from '@/types';

export function useBehavior() {
  const addEvent = useBehaviorStore((s) => s.addEvent);
  const updateW2B = useBehaviorStore((s) => s.updateW2B);
  const updateR2B = useBehaviorStore((s) => s.updateR2B);

  const trackEvent = (type: BehaviorEvent['type'], data: any, w2bPoints = 0, r2bPoints = 0) => {
    addEvent({ type, timestamp: Date.now(), data });
    if (w2bPoints) updateW2B(w2bPoints);
    if (r2bPoints) updateR2B(r2bPoints);
  };

  return { trackEvent };
}

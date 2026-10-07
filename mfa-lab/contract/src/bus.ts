import type { InspectableBus } from './index';

export const createBus = (): InspectableBus => {
  const topics = new Map<string, Set<(payload: unknown) => void>>();
  return {
    publish: (topic, payload) => {
      topics.get(topic)?.forEach((fn) => fn(payload));
    },
    subscribe: (topic, fn) => {
      const set = topics.get(topic) ?? new Set();
      set.add(fn);
      topics.set(topic, set);
      return () => {
        set.delete(fn);
      };
    },
    subscriberCount: (topic) => topics.get(topic)?.size ?? 0,
  };
};

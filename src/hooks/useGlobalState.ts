import React, { useCallback, useRef, useSyncExternalStore } from 'react';

type IListener = () => void;

const store = {
  values: new Map<string, any>(),
  listeners: [] as Array<{ listener: IListener; key: string }>,
  subscribe(key: string) {
    return function (listener: IListener) {
      const item = { listener, key };
      store.listeners.push(item);

      return () => {
        store.listeners.splice(store.listeners.indexOf(item), 1);
      };
    };
  },
  publish<T>(key: string, value: T) {
    store.values.set(key, value);
    store.listeners.forEach((item) => {
      if (item.key === key) {
        item.listener();
      }
    });
  },
  getSnapshot<T>(key: string, initialState: T): () => T {
    return () => {
      if (!store.values.has(key)) {
        store.values.set(key, initialState);
      }
      return store.values.get(key);
    };
  },
};

export function useGlobalState<T>(
  key: string,
  initialState: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const state = useSyncExternalStore<T>(
    store.subscribe(key),
    store.getSnapshot(key, initialState),
    store.getSnapshot(key, initialState),
  );
  const prevSate = useRef(state);
  prevSate.current = state;

  const setState = useCallback(
    (newState: React.SetStateAction<T>): void => {
      const value = newState instanceof Function ? newState(prevSate.current) : newState;
      store.publish(key, value);
    },
    [key],
  );

  return [state, setState];
}

import React, { useCallback, useRef, useSyncExternalStore } from 'react';

type IListener = () => void;

const store = {
  values: new Map<string, any>(),
  listeners: [] as Array<
    | {
        listener: IListener;
        key: string;
        selector?: never;
        prev: any;
      }
    | {
        listener: IListener;
        key?: never;
        selector: (store: any) => any;
        prev: any;
      }
  >,
  subscribe(key: string) {
    return function (listener: IListener) {
      const item = { listener, key, prev: store.values.get(key) };
      store.listeners.push(item);

      return () => {
        store.listeners.splice(store.listeners.indexOf(item), 1);
      };
    };
  },
  subscribeWithSelector<T, P>(selector: (store: P) => T) {
    return function (listener: IListener) {
      const item = { listener, selector, prev: selector(store.values as P) };
      store.listeners.push(item);

      return () => {
        store.listeners.splice(store.listeners.indexOf(item), 1);
      };
    };
  },
  publish<T>(key: string, value: T) {
    store.values.set(key, value);
    store.listeners.forEach((item) => {
      if (item.key && item.key === key && item.prev !== value) {
        item.prev = value;
        item.listener();
      } else if (item.selector) {
        const nextValue = item.selector(store.values);
        if (item.prev !== nextValue) {
          item.prev = nextValue;
          item.listener();
        }
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
  getSnapshotWithSelector<T, P>(selector: (store: P) => T): () => T {
    return () => {
      return selector(store.values as P);
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

/**
 * not tested
 */
export function useGlobalSelector<T, P>(selector: (store: P) => T): T {
  const state = useSyncExternalStore<T>(
    store.subscribeWithSelector(selector),
    store.getSnapshotWithSelector(selector),
    store.getSnapshotWithSelector(selector),
  );

  return state;
}

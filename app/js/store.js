const state = {
  config: null,
  profiles: [],
  gateway: null,
  usage: null,
  usageHistory: [],
  macros: {},
  events: [],
  logs: [],
};

const listeners = new Set();

export const getState = () => state;

export const setState = (partial) => {
  Object.assign(state, partial);
  listeners.forEach((listener) => listener(state));
};

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

import '@testing-library/jest-dom';

// Node.js 26 registers a non-functional localStorage getter on globalThis BEFORE
// jsdom runs. jsdom cannot override it because the getter short-circuits to
// undefined (with a warning). We detect a DOM environment via `document` and
// replace the getter with a real in-memory Storage so component tests work.
if (typeof document !== 'undefined') {
  const makeStorage = (): Storage => {
    const store: Record<string, string> = {};
    return {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      get length() { return Object.keys(store).length; },
      key: (i) => Object.keys(store)[i] ?? null,
    };
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  });
}

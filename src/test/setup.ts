import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

if (typeof window !== 'undefined' && !window.matchMedia) {
  // jsdom has no layout: behave as a desktop-width screen.
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// findBy* waits up to 5 s (default 1 s) for what a slow, loaded run renders a little later.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
  if (typeof window !== 'undefined') window.localStorage.clear();
});

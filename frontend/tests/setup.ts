/**
 * Vitest + @testing-library/jest-dom setup file.
 * Extends expect with custom DOM matchers and jest-axe matchers.
 */
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { configureAxe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

// Register jest-axe matchers
expect.extend(toHaveNoViolations);

// Configure axe for testing environment
configureAxe({
  rules: {},
});

// Automatically clean up the DOM after each test
afterEach(() => {
  cleanup();
});

// Mock sessionStorage for device ID generation
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Silence Recharts ResizeObserver errors in jsdom
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

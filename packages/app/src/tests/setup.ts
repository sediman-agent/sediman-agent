/**
 * Jest configuration and setup for OpenSkynet Desktop
 */

// Import jest-dom for custom matchers
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ status: 'ok' }),
  } as Response)
);

// Mock Electron APIs
global.window = {
  ...global.window,
  matchMedia: jest.fn((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock crypto.randomUUID
global.crypto = {
  ...global.crypto,
  randomUUID: jest.fn(() => 'mock-uuid-' + Math.random()),
} as any;

// Mock react-markdown and related packages
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: () => 'mocked-react-markdown',
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => (tree: any) => tree,
}));

jest.mock('rehype-highlight', () => ({
  __esModule: true,
  default: () => (tree: any) => tree,
}));

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

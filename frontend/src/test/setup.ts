import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";
import { createElement } from "react";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    return createElement("img", { src, alt, ...props });
  },
}));

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset DOM
  document.body.innerHTML = "";
});

Object.defineProperty(global, "fetch", {
  value: vi.fn(),
  writable: true,
});

// Mock console methods to reduce noise during testing
global.console = {
  ...global.console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

// Mock window object if needed
Object.defineProperty(window, "location", {
  value: {
    href: "http://localhost:3000",
  },
  writable: true,
});

// Add any other global mocks here as needed
(global as typeof global & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(global as typeof global & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;
global.console = {
  ...console,
  // Uncomment to silence console.log in tests
  // log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

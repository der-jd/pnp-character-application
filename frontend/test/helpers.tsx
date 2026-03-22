import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/auth/AuthProvider";
import type { ReactNode } from "react";

/**
 * Creates a fresh QueryClient configured for tests (no retries, no refetch).
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface WrapperOptions {
  /** Initial route entries for MemoryRouter */
  initialEntries?: string[];
  /** Provide a custom QueryClient */
  queryClient?: QueryClient;
  /** Whether to wrap with AuthProvider (default: false — most tests mock auth) */
  withAuth?: boolean;
}

/**
 * Creates a test wrapper with all required providers.
 */
export function createWrapper(options: WrapperOptions = {}) {
  const { initialEntries = ["/"], queryClient = createTestQueryClient(), withAuth = false } = options;

  return function Wrapper({ children }: { children: ReactNode }) {
    const inner = (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    if (withAuth) {
      return (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      );
    }

    return inner;
  };
}

/**
 * Renders a component wrapped with all test providers.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: WrapperOptions & Omit<RenderOptions, "wrapper"> = {},
) {
  const { initialEntries, queryClient, withAuth, ...renderOptions } = options;
  return render(ui, {
    wrapper: createWrapper({ initialEntries, queryClient, withAuth }),
    ...renderOptions,
  });
}

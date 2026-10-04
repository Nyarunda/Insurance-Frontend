/**
 * Server state lives in TanStack Query (FI1-Q7). Local presentation state stays in Zustand.
 *
 * A 4xx is an answer, not a glitch, so it is never retried automatically: the screen shows it.
 * Commands (mutations) are never retried here; `sendCommand` owns retries, with the same key.
 */

import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/errors';

export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        refetchOnWindowFocus: true,
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  });

export const queryClient = createQueryClient();

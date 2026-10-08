/**
 * Workflow server state (FI1-B). The queue and the instance come only from the backend: a task
 * appears and disappears when the server lists it, never by inference from other data.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import type { Decision, HistoryPage, InstanceView, ReasonCode, WorkQueue } from './types';

export const WORKFLOW_KEYS = {
  all: ['workflow'] as const,
  queue: ['workflow', 'work-queue'] as const,
  instance: (id: string) => ['workflow', 'instance', id] as const,
  reasonCodes: (action: Decision) => ['workflow', 'reason-codes', action] as const,
};

/**
 * The user's work queue. There is no background polling (DESIGN-1-R1): it is fetched when first
 * needed, again when the user returns to the window, on Refresh, and after a decision or a domain
 * command invalidates it. The shell's navigation count and reminder read this same cached answer.
 */
export function useWorkQueue(enabled = true) {
  return useQuery({
    queryKey: WORKFLOW_KEYS.queue,
    queryFn: async () => (await api.request<WorkQueue>('/work-queue')).data,
    enabled,
    staleTime: 0, // refreshed whenever the user comes back to the tab
  });
}

export interface LoadedInstance {
  view: InstanceView;
  /** From the response's ETag header (the body's `etag` only when the header is absent). */
  etag: string;
}

export function useInstance(instanceId: string) {
  return useQuery({
    queryKey: WORKFLOW_KEYS.instance(instanceId),
    queryFn: async (): Promise<LoadedInstance> => {
      const result = await api.request<InstanceView>(`/workflows/instances/${encodeURIComponent(instanceId)}`);
      return { view: result.data, etag: result.etag ?? result.data.etag };
    },
    staleTime: 0,
  });
}

/** The tenant's configured reasons for a decision; never hard-coded (FI1-Q1). */
export function useReasonCodes(action: Decision, enabled: boolean) {
  return useQuery({
    queryKey: WORKFLOW_KEYS.reasonCodes(action),
    queryFn: async () =>
      (await api.request<{ results: ReasonCode[] }>(`/workflows/reason-codes?action=${action}`)).data.results,
    enabled,
    staleTime: 60_000,
  });
}

export const HISTORY_PAGE_SIZE = 25;

/** WFH-1: the caller's own decisions or requests, newest first; `outcome` is where each stands now. */
export function useMyHistory(role: 'DECIDED' | 'REQUESTED', outcome: string | null, page: number, enabled = true) {
  return useQuery({
    queryKey: ['workflow', 'history', role, outcome ?? '', page] as const,
    queryFn: async () => {
      const params = new URLSearchParams({ role, page: String(page), page_size: String(HISTORY_PAGE_SIZE) });
      if (outcome) params.set('outcome', outcome);
      return (await api.request<HistoryPage>(`/workflows/my-history?${params}`)).data;
    },
    enabled,
    staleTime: 0,
  });
}

/**
 * Workflow server state (FI1-B). The queue and the instance come only from the backend: a task
 * appears and disappears when the server lists it, never by inference from other data.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import type { Decision, InstanceView, ReasonCode, WorkQueue } from './types';

export const WORKFLOW_KEYS = {
  all: ['workflow'] as const,
  queue: ['workflow', 'work-queue'] as const,
  instance: (id: string) => ['workflow', 'instance', id] as const,
  reasonCodes: (action: Decision) => ['workflow', 'reason-codes', action] as const,
};

/** How often the shell checks the queue for new approvals (DESIGN-1 reminder). */
export const QUEUE_POLL_MS = 60_000;

export function useWorkQueue(enabled = true, poll = false) {
  return useQuery({
    queryKey: WORKFLOW_KEYS.queue,
    queryFn: async () => (await api.request<WorkQueue>('/work-queue')).data,
    enabled,
    staleTime: 0, // refreshed whenever the user comes back to the tab
    refetchInterval: poll ? QUEUE_POLL_MS : false,
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

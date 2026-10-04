/**
 * Policy server state (FI1-C). Lists and details come only from the backend, which decides what
 * the user may see: a policy out of scope is a 404, never a substitute record.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import type { CoverageStatus, PolicyDetail, PolicyPage, VersionList } from './types';

export interface PolicyFilters {
  coverage_status?: CoverageStatus;
  /** An exact policy number or insurer policy number (the backend matches it exactly). */
  q?: string;
  page?: number;
}

export const POLICY_PAGE_SIZE = 25;

export const POLICY_KEYS = {
  all: ['policies'] as const,
  list: (filters: PolicyFilters) => ['policies', 'list', filters] as const,
  detail: (id: string) => ['policies', 'detail', id] as const,
  versions: (id: string) => ['policies', 'versions', id] as const,
};

export function usePolicies(filters: PolicyFilters) {
  return useQuery({
    queryKey: POLICY_KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(filters.page ?? 1), page_size: String(POLICY_PAGE_SIZE) });
      if (filters.coverage_status) params.set('coverage_status', filters.coverage_status);
      if (filters.q) params.set('q', filters.q);
      return (await api.request<PolicyPage>(`/policies?${params}`)).data;
    },
    placeholderData: keepPreviousData,
  });
}

export interface LoadedPolicy {
  view: PolicyDetail;
  /**
   * The policy's ETag, from the response header only: endorsement creation sends it as If-Match
   * (FI1-D). It is never rebuilt on the client; without the header there is nothing to send.
   */
  etag: string | null;
}

export function usePolicy(policyId: string) {
  return useQuery({
    queryKey: POLICY_KEYS.detail(policyId),
    queryFn: async (): Promise<LoadedPolicy> => {
      const result = await api.request<PolicyDetail>(`/policies/${encodeURIComponent(policyId)}`);
      return { view: result.data, etag: result.etag };
    },
    staleTime: 0,
  });
}

export function usePolicyVersions(policyId: string, enabled: boolean) {
  return useQuery({
    queryKey: POLICY_KEYS.versions(policyId),
    queryFn: async () => (await api.request<VersionList>(`/policies/${encodeURIComponent(policyId)}/versions`)).data,
    enabled,
  });
}

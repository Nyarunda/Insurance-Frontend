/**
 * Renewal server state (RENEWALS-SURFACE-1 RS-A). Visibility follows the policy: the backend answers
 * 404 for a renewal on a policy the user cannot see.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import type { RenewalDetail, RenewalList } from './types';

export const RENEWAL_KEYS = {
  all: ['renewals'] as const,
  forPolicy: (policyId: string) => ['renewals', 'policy', policyId] as const,
  detail: (id: string) => ['renewals', 'detail', id] as const,
};

export function usePolicyRenewals(policyId: string, enabled: boolean) {
  return useQuery({
    queryKey: RENEWAL_KEYS.forPolicy(policyId),
    queryFn: async () => (await api.request<RenewalList>(`/policies/${encodeURIComponent(policyId)}/renewals`)).data,
    enabled: enabled && !!policyId,
    staleTime: 0,
  });
}

export interface LoadedRenewal {
  view: RenewalDetail;
  /** From the response's ETag header only; never rebuilt on the client. */
  etag: string | null;
}

export function useRenewal(renewalId: string) {
  return useQuery({
    queryKey: RENEWAL_KEYS.detail(renewalId),
    queryFn: async (): Promise<LoadedRenewal> => {
      const result = await api.request<RenewalDetail>(`/renewals/${encodeURIComponent(renewalId)}`);
      return { view: result.data, etag: result.etag };
    },
    staleTime: 0, // a governed approval happens elsewhere; coming back shows the current state
    enabled: !!renewalId,
  });
}

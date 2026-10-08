/**
 * Renewal server state (RENEWALS-SURFACE-1 RS-A). Visibility follows the policy: the backend answers
 * 404 for a renewal on a policy the user cannot see.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import type { PolicyPage } from '../policies/types';
import type { RenewalDetail, RenewalList, RenewalListItem, RenewalPage } from './types';

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

// ---------------------------------------------------------------------------- the worklists (RS-C over RS-P0)

export const RENEWAL_PAGE_SIZE = 25;

/** The policies due for renewal in the user's reach, by expiry: `GET /policies?renewal_due=true`. */
export function useDueForRenewal(page: number, enabled = true) {
  return useQuery({
    queryKey: ['renewals', 'due', page] as const,
    queryFn: async () => {
      const params = new URLSearchParams({ renewal_due: 'true', page: String(page), page_size: String(RENEWAL_PAGE_SIZE) });
      return (await api.request<PolicyPage>(`/policies?${params}`)).data;
    },
    enabled,
    staleTime: 0,
  });
}

/** Renewals across policies, newest first; `status` is the effective status (EXPIRED derived). */
export function useRenewalList(status: string | null, page: number, enabled = true) {
  return useQuery({
    queryKey: ['renewals', 'list', status ?? '', page] as const,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(RENEWAL_PAGE_SIZE) });
      if (status) params.set('status', status);
      return (await api.request<RenewalPage>(`/renewals?${params}`)).data;
    },
    enabled,
    staleTime: 0,
  });
}

/** A renewal by its number, within the user's reach; null when there is none they may see. */
export function useRenewalByNumber(renewalNo: string) {
  return useQuery({
    queryKey: ['renewals', 'by-number', renewalNo] as const,
    queryFn: async (): Promise<RenewalListItem | null> => {
      const params = new URLSearchParams({ renewal_no: renewalNo, page: '1', page_size: '1' });
      const found = (await api.request<RenewalPage>(`/renewals?${params}`)).data.results[0];
      return found && found.renewal_no === renewalNo.toUpperCase() ? found : null;
    },
    enabled: !!renewalNo,
  });
}

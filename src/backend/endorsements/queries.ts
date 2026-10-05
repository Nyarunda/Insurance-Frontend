/**
 * Endorsement server state (FI1-D). Visibility follows the policy: the backend answers 404 for an
 * endorsement on a policy the user cannot see.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import type { EndorsementDetail, EndorsementList } from './types';

export const ENDORSEMENT_KEYS = {
  all: ['endorsements'] as const,
  forPolicy: (policyId: string) => ['endorsements', 'policy', policyId] as const,
  detail: (id: string) => ['endorsements', 'detail', id] as const,
};

export function usePolicyEndorsements(policyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ENDORSEMENT_KEYS.forPolicy(policyId),
    queryFn: async () =>
      (await api.request<EndorsementList>(`/policies/${encodeURIComponent(policyId)}/endorsements`)).data,
    enabled,
    staleTime: 0,
  });
}

export interface LoadedEndorsement {
  view: EndorsementDetail;
  /** From the response's ETag header only; never rebuilt on the client. */
  etag: string | null;
}

export function useEndorsement(endorsementId: string, enabled = true) {
  return useQuery({
    queryKey: ENDORSEMENT_KEYS.detail(endorsementId),
    queryFn: async (): Promise<LoadedEndorsement> => {
      const result = await api.request<EndorsementDetail>(`/endorsements/${encodeURIComponent(endorsementId)}`);
      return { view: result.data, etag: result.etag };
    },
    staleTime: 0, // the approval happens elsewhere; coming back to the tab shows the current state
    enabled: enabled && !!endorsementId,
  });
}

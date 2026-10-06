/**
 * Underwriting proposal server state (NB1-C). Everything shown comes from the backend: the proposal
 * with its ETag, its copied premium (never recalculated, U1-D5), its requirements, exceptions and
 * readiness blockers, and the insurer's agreements it can be placed under.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import type { Agreement, ProposalDetail, ProposalPage, ProposalStatus } from './types';

export interface ProposalFilters {
  /** An exact proposal number. */
  q?: string;
  status?: ProposalStatus;
  quotation_id?: string;
  page?: number;
}

export const PROPOSAL_PAGE_SIZE = 25;

export const PROPOSAL_KEYS = {
  all: ['proposals'] as const,
  list: (filters: ProposalFilters) => ['proposals', 'list', filters] as const,
  detail: (id: string) => ['proposals', 'detail', id] as const,
  agreements: (insurerId: string) => ['insurers', 'agreements', insurerId] as const,
};

export function useProposals(filters: ProposalFilters, enabled = true) {
  return useQuery({
    queryKey: PROPOSAL_KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(filters.page ?? 1), page_size: String(PROPOSAL_PAGE_SIZE) });
      if (filters.q) params.set('q', filters.q);
      if (filters.status) params.set('status', filters.status);
      if (filters.quotation_id) params.set('quotation_id', filters.quotation_id);
      return (await api.request<ProposalPage>(`/underwriting/proposals?${params}`)).data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export interface LoadedProposal {
  view: ProposalDetail;
  /** From the response header only: every proposal command sends it as If-Match. */
  etag: string | null;
}

export function useProposal(proposalId: string) {
  return useQuery({
    queryKey: PROPOSAL_KEYS.detail(proposalId),
    queryFn: async (): Promise<LoadedProposal> => {
      const result = await api.request<ProposalDetail>(`/underwriting/proposals/${encodeURIComponent(proposalId)}`);
      return { view: result.data, etag: result.etag };
    },
    enabled: !!proposalId,
    staleTime: 0,
  });
}

/** The product insurer's agreements (insurers.insurer.view); the server checks the choice. */
export function useAgreements(insurerId: string, enabled = true) {
  return useQuery({
    queryKey: PROPOSAL_KEYS.agreements(insurerId),
    queryFn: async () =>
      (await api.request<{ results: Agreement[] }>(`/insurers/${encodeURIComponent(insurerId)}/agreements`)).data.results,
    enabled: enabled && !!insurerId,
    staleTime: 5 * 60_000,
  });
}

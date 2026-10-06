/**
 * Readable proposal addresses (NB1-C, NB-D2): `/proposals/list/UWP0000001`. A number is resolved
 * through `GET /underwriting/proposals?q=` (an exact number match, within the user's access); one
 * the user cannot see is "not found", exactly as an ID would be. Links with an ID keep working.
 */

import React, { createContext, useContext } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, SearchX } from 'lucide-react';
import { HorizonLoader, HorizonPage, HorizonPageTitle, StatusScreen } from '../../components/horizon';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { api } from '../../lib/api/instance';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { isId } from '../policies/refs';
import type { ProposalPage } from './types';

export const PROPOSALS_PATH = '/proposals/list';
export const proposalHref = (ref: string) => `${PROPOSALS_PATH}/${encodeURIComponent(ref)}`;

const ProposalIdContext = createContext<string | null>(null);

export function useProposalId(): string {
  const params = useParams();
  return useContext(ProposalIdContext) ?? params.proposalId ?? '';
}

export const ProposalRefRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { proposalId: ref = '' } = useParams();
  const byNumber = useQuery({
    queryKey: ['proposals', 'by-number', ref],
    queryFn: async () => {
      const params = new URLSearchParams({ q: ref, page: '1', page_size: '5' });
      const page = (await api.request<ProposalPage>(`/underwriting/proposals?${params}`)).data;
      return page.results.find((item) => item.proposal_no === ref.toUpperCase())?.id ?? null;
    },
    enabled: !isId(ref),
    staleTime: 5 * 60_000,
  });
  if (isId(ref)) return <ProposalIdContext.Provider value={ref}>{children}</ProposalIdContext.Provider>;
  if (byNumber.isPending) return <HorizonLoader tip="Loading the proposal..." />;
  if (byNumber.isError) return <ApiErrorAlert error={byNumber.error} title="The proposal could not be loaded" />;
  if (!byNumber.data) {
    return (
      <HorizonPage id="not-found">
        <HorizonPageTitle title="Proposal" />
        <StatusScreen
          icon={SearchX}
          title={NOT_FOUND_TEXT}
          description="The proposal does not exist, or it is outside the branches you can see."
          actions={
            <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate(PROPOSALS_PATH)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Proposals
            </button>
          }
        />
      </HorizonPage>
    );
  }
  return <ProposalIdContext.Provider value={byNumber.data}>{children}</ProposalIdContext.Provider>;
};

/**
 * Readable addresses (RUP1 F-11): `/policies/POL0000001/endorsements/END0000001` instead of
 * internal IDs. An address may carry either; old links with IDs keep working.
 *
 * A policy number is resolved through `GET /policies?q=` (an exact match, within the user's
 * branch access); an endorsement number through the policy's endorsement list. A number the user
 * cannot see is "not found", exactly as an ID would be: nothing is learned from the address.
 * The pages below receive the IDs, so the queries, ETags and commands are unchanged.
 */

import React, { createContext, useContext } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { HorizonAlert, HorizonLoader, HorizonPage, HorizonPageContent, HorizonPageTitle } from '../../components/horizon';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { api } from '../../lib/api/instance';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { usePolicyEndorsements } from '../endorsements/queries';
import type { PolicyPage } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isId = (ref: string) => UUID.test(ref);

export const policyHref = (policyNo: string) => `/policies/${encodeURIComponent(policyNo)}`;
export const endorsementHref = (policyNo: string, endorsementNo: string) =>
  `${policyHref(policyNo)}/endorsements/${encodeURIComponent(endorsementNo)}`;

export interface RouteRefs {
  /** The policy's ID, resolved from the address. */
  policyId: string;
  /** The endorsement's ID, resolved from the address; empty on routes without one. */
  endorsementId: string;
  /** The policy as the address names it (a number or an ID), for links back to it. */
  policyRef: string;
}

const RefsContext = createContext<RouteRefs | null>(null);

/** The IDs behind the address. Outside a `PolicyRefRoute` the address's own values are used. */
export function useRouteRefs(): RouteRefs {
  const params = useParams();
  return (
    useContext(RefsContext) ?? {
      policyId: params.policyId ?? '',
      endorsementId: params.endorsementId ?? '',
      policyRef: params.policyId ?? '',
    }
  );
}

function usePolicyIdByNumber(ref: string) {
  return useQuery({
    queryKey: ['policies', 'by-number', ref],
    queryFn: async () => {
      const params = new URLSearchParams({ q: ref, page: '1', page_size: '5' });
      const page = (await api.request<PolicyPage>(`/policies?${params}`)).data;
      return page.results.find((policy) => policy.policy_no === ref)?.id ?? null;
    },
    enabled: !isId(ref),
    staleTime: 5 * 60_000,
  });
}

const NotFound: React.FC<{ what: 'policy' | 'endorsement' }> = ({ what }) => (
  <HorizonPage id="not-found">
    <HorizonPageTitle title={what === 'policy' ? 'Policy' : 'Endorsement'} />
    <HorizonPageContent className="p-4">
      <HorizonAlert tone="warning" title={NOT_FOUND_TEXT}>
        {what === 'policy'
          ? 'The policy does not exist, or it is outside the branches you can see.'
          : 'The endorsement does not exist on this policy, or it is not one you can see.'}
      </HorizonAlert>
    </HorizonPageContent>
  </HorizonPage>
);

/** Resolves the address's policy and endorsement references, then renders the page with their IDs. */
export const PolicyRefRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { policyId: policyRef = '', endorsementId: endorsementRef = '' } = useParams();
  const byNumber = usePolicyIdByNumber(policyRef);
  const policyId = isId(policyRef) ? policyRef : byNumber.data ?? '';
  const endorsementByNumber = !!endorsementRef && !isId(endorsementRef);
  const endorsements = usePolicyEndorsements(policyId, endorsementByNumber && !!policyId);

  if (!isId(policyRef)) {
    if (byNumber.isPending) return <HorizonLoader tip="Loading the policy..." />;
    if (byNumber.isError) return <ApiErrorAlert error={byNumber.error} title="The policy could not be loaded" />;
    if (!byNumber.data) return <NotFound what="policy" />;
  }

  let endorsementId = endorsementRef;
  if (endorsementByNumber) {
    if (endorsements.isPending) return <HorizonLoader tip="Loading the endorsement..." />;
    if (endorsements.isError) return <ApiErrorAlert error={endorsements.error} title="The endorsement could not be loaded" />;
    const found = endorsements.data.results.find((item) => item.endorsement_no === endorsementRef);
    if (!found) return <NotFound what="endorsement" />;
    endorsementId = found.id;
  }

  return <RefsContext.Provider value={{ policyId, endorsementId, policyRef }}>{children}</RefsContext.Provider>;
};

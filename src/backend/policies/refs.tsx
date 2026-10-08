/**
 * Readable addresses (RUP1 F-11): `/policies/list/POL0000001/endorsements/END0000001` instead of
 * internal IDs. A record sits under its list. An address may carry either; old links with IDs keep working.
 *
 * A policy number is resolved through `GET /policies?q=` (an exact match, within the user's
 * branch access); an endorsement number through the policy's endorsement list, and a renewal
 * number (RENEWALS-SURFACE-1 RS-A) through the policy's renewal list. A number the user
 * cannot see is "not found", exactly as an ID would be: nothing is learned from the address.
 * The pages below receive the IDs, so the queries, ETags and commands are unchanged.
 */

import React, { createContext, useContext } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router';
import { HorizonLoader, HorizonPage, HorizonPageTitle, StatusScreen } from '../../components/horizon';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { api } from '../../lib/api/instance';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { usePolicyEndorsements } from '../endorsements/queries';
import { usePolicyRenewals } from '../renewals/queries';
import type { PolicyPage } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isId = (ref: string) => UUID.test(ref);

export const policyHref = (policyRef: string) => `/policies/list/${encodeURIComponent(policyRef)}`;
export const endorsementHref = (policyNo: string, endorsementNo: string) =>
  `${policyHref(policyNo)}/endorsements/${encodeURIComponent(endorsementNo)}`;
export const renewalHref = (policyNo: string, renewalNo: string) =>
  `${policyHref(policyNo)}/renewals/${encodeURIComponent(renewalNo)}`;

export interface RouteRefs {
  /** The policy's ID, resolved from the address. */
  policyId: string;
  /** The endorsement's ID, resolved from the address; empty on routes without one. */
  endorsementId: string;
  /** The renewal's ID, resolved from the address; empty on routes without one. */
  renewalId: string;
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
      renewalId: params.renewalId ?? '',
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

const NotFound: React.FC<{ what: 'policy' | 'endorsement' | 'renewal' }> = ({ what }) => {
  const navigate = useNavigate();
  return (
    <HorizonPage id="not-found">
      <HorizonPageTitle title={what === 'policy' ? 'Policy' : what === 'renewal' ? 'Renewal' : 'Endorsement'} />
      <StatusScreen
        icon={SearchX}
        title={NOT_FOUND_TEXT}
        description={
          what === 'policy'
            ? 'The policy does not exist, or it is outside the branches you can see.'
            : `The ${what} does not exist on this policy, or it is not one you can see.`
        }
        actions={
          <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate('/policies/list')}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Policy Directory
          </button>
        }
      />
    </HorizonPage>
  );
};

/** Resolves the address's policy and endorsement references, then renders the page with their IDs. */
export const PolicyRefRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { policyId: policyRef = '', endorsementId: endorsementRef = '', renewalId: renewalRef = '' } = useParams();
  const byNumber = usePolicyIdByNumber(policyRef);
  const policyId = isId(policyRef) ? policyRef : byNumber.data ?? '';
  const endorsementByNumber = !!endorsementRef && !isId(endorsementRef);
  const endorsements = usePolicyEndorsements(policyId, endorsementByNumber && !!policyId);
  const renewalByNumber = !!renewalRef && !isId(renewalRef);
  const renewals = usePolicyRenewals(policyId, renewalByNumber && !!policyId);

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

  let renewalId = renewalRef;
  if (renewalByNumber) {
    if (renewals.isPending) return <HorizonLoader tip="Loading the renewal..." />;
    if (renewals.isError) return <ApiErrorAlert error={renewals.error} title="The renewal could not be loaded" />;
    const found = renewals.data.results.find((item) => item.renewal_no === renewalRef);
    if (!found) return <NotFound what="renewal" />;
    renewalId = found.id;
  }

  return <RefsContext.Provider value={{ policyId, endorsementId, renewalId, policyRef }}>{children}</RefsContext.Provider>;
};

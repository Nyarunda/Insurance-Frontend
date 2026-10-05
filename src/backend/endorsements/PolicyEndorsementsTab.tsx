/**
 * The policy workspace's Endorsements tab (FI1-D): `GET /policies/{id}/endorsements`, loaded when the
 * tab opens. "New endorsement" appears only with `policies.endorsement.create` and on a bound
 * policy; the backend decides whether the policy can be endorsed.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { endorsementHref, policyHref } from '../policies/refs';
import { FilePen, FileText, Plus } from 'lucide-react';
import { DetailGroup, EmptyState, HorizonLoader, openableRow, RecordCell, RowChevron, StatusBadge } from '../../components/horizon';
import { hasPermission, useMe } from '../../lib/auth/me';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { ENDORSEMENT_CREATE } from '../permissions';
import { formatDate } from '../policies/format';
import type { PolicyDetail } from '../policies/types';
import { humanize } from '../workflow/format';
import { ENDORSEMENT_STATUS_LABEL, ENDORSEMENT_TONE, formatDelta } from './format';
import { usePolicyEndorsements } from './queries';

export const NO_ENDORSEMENTS_TEXT = 'This policy has no endorsements.';

export const PolicyEndorsementsTab: React.FC<{ policy: PolicyDetail }> = ({ policy }) => {
  const navigate = useNavigate();
  // The Policy Directory return location (FI1-C-R1) travels on to the endorsement screens (FI1-D-R1).
  const { state } = useLocation();
  const me = useMe().data;
  const endorsements = usePolicyEndorsements(policy.id, true);
  const canCreate = hasPermission(me, ENDORSEMENT_CREATE) && policy.lifecycle_status === 'BOUND';
  const base = `${policyHref(policy.policy_no)}/endorsements`;
  const open = (endorsementNo: string) => navigate(endorsementHref(policy.policy_no, endorsementNo), { state });

  return (
    <DetailGroup
      title="Endorsements"
      description="Changes made to this policy after it was bound."
      action={
        canCreate && (
          <button type="button" className="hz-button hz-button-primary" onClick={() => navigate(`${base}/new`, { state })}>
            <Plus className="h-3.5 w-3.5" />
            New endorsement
          </button>
        )
      }
    >
      {endorsements.isPending && <HorizonLoader tip="Loading the endorsements..." />}
      {endorsements.isError && <ApiErrorAlert error={endorsements.error} title="The endorsements could not be loaded" />}
      {endorsements.isSuccess && endorsements.data.results.length === 0 && (
        <EmptyState
          icon={FilePen}
          title={NO_ENDORSEMENTS_TEXT}
          hint={canCreate ? 'Use New endorsement to change a limit on this policy.' : undefined}
        />
      )}
      {endorsements.isSuccess && endorsements.data.results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="hz-grid w-full" aria-label="Endorsements">
            <thead>
              <tr>
                <th>Endorsement</th>
                <th>Effective from</th>
                <th className="text-right">Premium change</th>
                <th>Status</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {endorsements.data.results.map((item) => (
                <tr key={item.id} {...openableRow(() => open(item.endorsement_no))}>
                  <td>
                    <RecordCell icon={FileText} mono title={item.endorsement_no} detail={humanize(item.endorsement_type)} />
                  </td>
                  <td>{formatDate(item.effective_date)}</td>
                  <td className="text-right tabular-nums">{formatDelta(item.premium_delta, policy.currency)}</td>
                  <td>
                    <StatusBadge square label={ENDORSEMENT_STATUS_LABEL[item.status] ?? humanize(item.status)} tone={ENDORSEMENT_TONE[item.status] ?? 'neutral'} />
                  </td>
                  <RowChevron />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailGroup>
  );
};

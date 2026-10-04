/**
 * The policy workspace's Endorsements tab (FI1-D): `GET /policies/{id}/endorsements`, loaded when the
 * tab opens. "New endorsement" appears only with `policies.endorsement.create` and on a bound
 * policy; the backend decides whether the policy can be endorsed.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { HorizonLoader, StatusBadge } from '../../components/horizon';
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
  const base = `/policies/${encodeURIComponent(policy.id)}/endorsements`;
  const open = (id: string) => navigate(`${base}/${encodeURIComponent(id)}`, { state });

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <button type="button" className="hz-button hz-button-primary" onClick={() => navigate(`${base}/new`, { state })}>
            <Plus className="h-3.5 w-3.5" />
            New endorsement
          </button>
        </div>
      )}
      {endorsements.isPending && <HorizonLoader tip="Loading the endorsements..." />}
      {endorsements.isError && <ApiErrorAlert error={endorsements.error} title="The endorsements could not be loaded" />}
      {endorsements.isSuccess && endorsements.data.results.length === 0 && (
        <p className="text-[13px] text-[var(--hz-text-secondary)]" role="status">
          {NO_ENDORSEMENTS_TEXT}
        </p>
      )}
      {endorsements.isSuccess && endorsements.data.results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="hz-grid w-full" aria-label="Endorsements">
            <thead>
              <tr>
                <th>Endorsement</th>
                <th>Type</th>
                <th>Effective from</th>
                <th className="text-right">Premium change</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {endorsements.data.results.map((item) => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => open(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') open(item.id);
                  }}
                >
                  <td className="font-mono font-semibold">{item.endorsement_no}</td>
                  <td>{humanize(item.endorsement_type)}</td>
                  <td>{formatDate(item.effective_date)}</td>
                  <td className="text-right tabular-nums">{formatDelta(item.premium_delta, policy.currency)}</td>
                  <td>
                    <StatusBadge label={ENDORSEMENT_STATUS_LABEL[item.status] ?? humanize(item.status)} tone={ENDORSEMENT_TONE[item.status] ?? 'neutral'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

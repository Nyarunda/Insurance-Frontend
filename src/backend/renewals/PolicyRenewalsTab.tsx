/**
 * The policy workspace's Renewals tab (RENEWALS-SURFACE-1 RS-A): `GET /policies/{id}/renewals`,
 * newest first. "Prepare renewal" appears with `policies.renewal.create` on a bound policy that has
 * no renewal in progress; whether the policy is inside its renewal window is the server's rule
 * (it refuses outside it, in words), so the window is never computed here.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { FileText, Plus, RefreshCcw } from 'lucide-react';
import { DetailGroup, EmptyState, HorizonLoader, openableRow, RecordCell, RowChevron, StatusBadge } from '../../components/horizon';
import { hasPermission, useMe } from '../../lib/auth/me';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { RENEWAL_CREATE } from '../permissions';
import { formatDate } from '../policies/format';
import { policyHref, renewalHref } from '../policies/refs';
import type { PolicyDetail } from '../policies/types';
import { formatMoney } from '../workflow/format';
import { RENEWAL_STATUS_LABEL, RENEWAL_TONE } from './format';
import { usePolicyRenewals } from './queries';
import type { RenewalStatus } from './types';

export const NO_RENEWALS_TEXT = 'This policy has no renewals.';

/** Statuses that keep a renewal in progress (the server's RENEWAL_OPEN). */
export const OPEN_RENEWAL: readonly RenewalStatus[] = ['DRAFT', 'PRICED', 'OFFERED', 'ACCEPTED'];

export const PolicyRenewalsTab: React.FC<{ policy: PolicyDetail }> = ({ policy }) => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const renewals = usePolicyRenewals(policy.id, true);
  const canPrepare = useCanPrepare(policy, renewals.data?.results.map((item) => item.status));
  const open = (renewalNo: string) => navigate(renewalHref(policy.policy_no, renewalNo), { state });

  return (
    <DetailGroup
      title="Renewals"
      description="The next insurance period, priced on the tariff in force then and offered to the customer."
      action={
        canPrepare && (
          <button type="button" className="hz-button hz-button-primary" onClick={() => navigate(`${policyHref(policy.policy_no)}/renewals/new`, { state })}>
            <Plus className="h-3.5 w-3.5" />
            Prepare renewal
          </button>
        )
      }
    >
      {renewals.isPending && <HorizonLoader tip="Loading the renewals..." />}
      {renewals.isError && <ApiErrorAlert error={renewals.error} title="The renewals could not be loaded" />}
      {renewals.isSuccess && renewals.data.results.length === 0 && (
        <EmptyState icon={RefreshCcw} title={NO_RENEWALS_TEXT} hint={canPrepare ? 'Use Prepare renewal when the policy nears its expiry.' : undefined} />
      )}
      {renewals.isSuccess && renewals.data.results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="hz-grid w-full" aria-label="Renewals">
            <thead>
              <tr>
                <th>Renewal</th>
                <th>New period</th>
                <th className="text-right">Renewal premium</th>
                <th>Status</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {renewals.data.results.map((item) => (
                <tr key={item.id} {...openableRow(() => open(item.renewal_no))}>
                  <td>
                    <RecordCell icon={FileText} mono title={item.renewal_no} detail={item.renewal_type === 'AS_IS' ? 'As is' : 'Amended'} />
                  </td>
                  <td className="whitespace-nowrap">
                    {formatDate(item.inception_date)} – {formatDate(item.expiry_date)}
                  </td>
                  <td className="text-right tabular-nums">{item.renewal_total_premium ? formatMoney(item.renewal_total_premium, policy.currency) : '—'}</td>
                  <td>
                    <StatusBadge square label={RENEWAL_STATUS_LABEL[item.effective_status] ?? item.effective_status} tone={RENEWAL_TONE[item.effective_status] ?? 'neutral'} />
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

/** Prepare is offered to a renewal maker on a bound policy without a renewal in progress. */
export function useCanPrepare(policy: PolicyDetail, statuses: RenewalStatus[] | undefined): boolean {
  const me = useMe().data;
  return (
    hasPermission(me, RENEWAL_CREATE) &&
    policy.lifecycle_status === 'BOUND' &&
    statuses !== undefined &&
    !statuses.some((status) => OPEN_RENEWAL.includes(status))
  );
}

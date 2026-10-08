/**
 * Renewals (RENEWALS-SURFACE-1 RS-C, RS-D3): `/renewals/list`, under Policies, for
 * `policies.policy.view`. Two tabs over the RS-P0 reads; the server decides what each user sees
 * (their policy reach), the window and every filter.
 *
 * - **Due for renewal**: `GET /policies?renewal_due=true`, the policies a renewal may be prepared for
 *   today, soonest expiry first. A renewal maker (`policies.renewal.create`) gets Prepare renewal on
 *   each; anyone else opens the policy.
 * - **Renewals**: `GET /renewals`, every renewal in reach, newest first, filtered by its effective
 *   status (an offer past its validity is "Offer expired", not "Offered"). No premium column: the
 *   list carries no currency, and amounts in different currencies are never shown side by side
 *   (RS-C review); the premium is on the renewal's record.
 *
 * A renewal opens in its RS-A record on its policy. `/renewals/list/<REN>` resolves a number through
 * `GET /renewals?renewal_no=` and opens the same record; a number the user cannot see is not found.
 * The tab, filter and page live in the URL.
 */

import React from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CalendarClock, FileText, Plus, RefreshCcw, RefreshCw, SearchX, ShieldCheck } from 'lucide-react';
import {
  EmptyState,
  FilterGroup,
  HorizonLoader,
  HorizonPage,
  HorizonPageTitle,
  ListCard,
  openableRow,
  RecordCell,
  RowChevron,
  StackedCell,
  StatusBadge,
  StatusScreen,
  WorkspaceTabs,
} from '../../components/horizon';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { hasPermission, useMe } from '../../lib/auth/me';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { RENEWAL_CREATE } from '../permissions';
import { formatDate } from '../policies/format';
import { policyHref, renewalHref } from '../policies/refs';
import { RENEWAL_STATUS_LABEL, RENEWAL_TONE } from '../renewals/format';
import { RENEWAL_PAGE_SIZE, useDueForRenewal, useRenewalByNumber, useRenewalList } from '../renewals/queries';
import type { RenewalEffectiveStatus } from '../renewals/types';
import { formatMoney } from '../workflow/format';

export const NO_DUE_TEXT = 'No policies are due for renewal';
export const NO_RENEWALS_LISTED_TEXT = 'No renewals to show';

type TabId = 'due' | 'renewals';
const TABS: { id: TabId; label: string }[] = [
  { id: 'due', label: 'Due for renewal' },
  { id: 'renewals', label: 'Renewals' },
];

const STATUS_FILTERS: { id: RenewalEffectiveStatus | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'PRICED', label: 'Priced' },
  { id: 'OFFERED', label: 'Offered' },
  { id: 'EXPIRED', label: 'Offer expired' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'DECLINED', label: 'Declined' },
  { id: 'RENEWED', label: 'Renewed' },
  { id: 'CANCELLED', label: 'Withdrawn' },
];
const isStatus = (value: string | null): value is RenewalEffectiveStatus =>
  STATUS_FILTERS.some((filter) => filter.id !== '' && filter.id === value);

const Paging: React.FC<{ page: number; count: number; shown: number; onPage: (page: number) => void }> = ({ page, count, shown, onPage }) => {
  const pages = Math.max(1, Math.ceil(count / RENEWAL_PAGE_SIZE));
  return (
    <>
      <span>
        Showing {shown} of {count}
      </span>
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-2">
          <button type="button" className="hz-button hz-button-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </button>
          <span className="text-[var(--hz-text-primary)]">
            Page {page} of {pages}
          </span>
          <button type="button" className="hz-button hz-button-secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Next
          </button>
        </nav>
      )}
    </>
  );
};

export const RenewalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: TabId = params.get('tab') === 'renewals' ? 'renewals' : 'due';
  const status = params.get('status');
  const page = Math.max(1, Number(params.get('page')) || 1);
  const canPrepare = hasPermission(useMe().data, RENEWAL_CREATE);
  const due = useDueForRenewal(page, tab === 'due');
  const renewals = useRenewalList(isStatus(status) ? status : null, page, tab === 'renewals');
  const active = tab === 'due' ? due : renewals;

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };
  const toPage = (next: number) => update({ page: next > 1 ? String(next) : null });

  return (
    <HorizonPage id="renewals">
      <HorizonPageTitle
        title="Renewals"
        subtitle="Policies nearing expiry, and the renewals prepared for them"
        actions={
          <button type="button" className="hz-button hz-button-secondary" onClick={() => void active.refetch()} disabled={active.isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${active.isFetching ? 'animate-spin' : ''}`} />
            {active.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />
      <div className="px-4">
        <WorkspaceTabs tabs={TABS} activeTab={tab} label="Renewal lists" variant="line"
          onChange={(next) => update({ tab: next === 'due' ? null : next, status: null, page: null })} />
      </div>

      {tab === 'due' ? (
        <ListCard
          title="Due for renewal"
          footer={due.data && due.data.results.length > 0 ? <Paging page={page} count={due.data.count} shown={due.data.results.length} onPage={toPage} /> : undefined}
        >
          {due.isPending && (
            <div className="p-6">
              <HorizonLoader tip="Loading the policies due for renewal..." />
            </div>
          )}
          {due.isError && (
            <div className="p-4">
              <ApiErrorAlert error={due.error} title="The policies due for renewal could not be loaded" />
            </div>
          )}
          {due.data && due.data.results.length === 0 && (
            <EmptyState icon={CalendarClock} title={NO_DUE_TEXT} hint="A policy appears here when it nears its expiry and has no renewal in progress." />
          )}
          {due.data && due.data.results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="hz-grid w-full" aria-label="Due for renewal">
                <thead>
                  <tr>
                    <th>Policy</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Expires</th>
                    <th className="text-right">Annual premium</th>
                    <th aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {due.data.results.map((policy) => (
                    <tr key={policy.id} {...openableRow(() => navigate(`${policyHref(policy.policy_no)}?tab=renewals`))}>
                      <td>
                        <RecordCell icon={ShieldCheck} mono title={policy.policy_no} />
                      </td>
                      <td>
                        <StackedCell value={policy.customer.display_name} detail={policy.customer.customer_no} />
                      </td>
                      <td>
                        <StackedCell value={policy.product.name} detail={policy.insurer.name} />
                      </td>
                      <td className="whitespace-nowrap">{formatDate(policy.expiry_date)}</td>
                      <td className="text-right tabular-nums">{formatMoney(policy.total_premium, policy.currency)}</td>
                      <td className="text-right">
                        {canPrepare ? (
                          <button type="button" className="hz-button hz-button-secondary" aria-label={`Prepare a renewal of ${policy.policy_no}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`${policyHref(policy.policy_no)}/renewals/new`);
                            }}>
                            <Plus className="h-3.5 w-3.5" />
                            Prepare renewal
                          </button>
                        ) : (
                          <RowChevron />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ListCard>
      ) : (
        <ListCard
          title="Renewals"
          toolbar={
            <FilterGroup label="Status" options={STATUS_FILTERS} value={isStatus(status) ? status : ''}
              onChange={(id) => update({ status: id || null, page: null })} />
          }
          footer={renewals.data && renewals.data.results.length > 0 ? <Paging page={page} count={renewals.data.count} shown={renewals.data.results.length} onPage={toPage} /> : undefined}
        >
          {renewals.isPending && (
            <div className="p-6">
              <HorizonLoader tip="Loading the renewals..." />
            </div>
          )}
          {renewals.isError && (
            <div className="p-4">
              <ApiErrorAlert error={renewals.error} title="The renewals could not be loaded" />
            </div>
          )}
          {renewals.data && renewals.data.results.length === 0 && (
            <EmptyState icon={RefreshCcw} title={NO_RENEWALS_LISTED_TEXT} hint={status ? 'Nothing has this status.' : 'Renewals appear here once they are prepared.'} />
          )}
          {renewals.data && renewals.data.results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="hz-grid w-full" aria-label="Renewals">
                <thead>
                  <tr>
                    <th>Renewal</th>
                    <th>Policy</th>
                    <th>New period</th>
                    <th>Status</th>
                    <th aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {renewals.data.results.map((item) => (
                    <tr key={item.id} {...openableRow(() => navigate(renewalHref(item.policy.policy_no, item.renewal_no)))}>
                      <td>
                        <RecordCell icon={FileText} mono title={item.renewal_no} detail={item.renewal_type === 'AS_IS' ? 'As is' : 'Amended'} />
                      </td>
                      <td className="font-mono">{item.policy.policy_no}</td>
                      <td className="whitespace-nowrap">
                        {formatDate(item.inception_date)} – {formatDate(item.expiry_date)}
                      </td>
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
        </ListCard>
      )}
    </HorizonPage>
  );
};

/** `/renewals/list/<REN>`: the number resolved within the user's reach, then the RS-A record on its policy. */
export const RenewalByNumberRoute: React.FC = () => {
  const { renewalNo = '' } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const found = useRenewalByNumber(renewalNo);
  if (found.isPending) return <HorizonLoader tip="Loading the renewal..." />;
  if (found.isError) return <ApiErrorAlert error={found.error} title="The renewal could not be loaded" />;
  if (!found.data) {
    return (
      <HorizonPage id="not-found">
        <HorizonPageTitle title="Renewal" />
        <StatusScreen
          icon={SearchX}
          title={NOT_FOUND_TEXT}
          description="The renewal does not exist, or its policy is outside the branches you can see."
          actions={
            <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate('/renewals/list?tab=renewals')}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Renewals
            </button>
          }
        />
      </HorizonPage>
    );
  }
  return <Navigate replace to={renewalHref(found.data.policy.policy_no, found.data.renewal_no)} state={state} />;
};

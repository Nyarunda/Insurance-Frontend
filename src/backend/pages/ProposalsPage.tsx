/**
 * Proposals (NB1-C): `GET /underwriting/proposals`, the proposals the backend says this user may
 * see, newest first. The number search (exact), status filter and page are the server's and live
 * in the URL. "New proposal" opens the create dialog over this list.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ClipboardList, Plus, RefreshCw, Search } from 'lucide-react';
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
  SearchField,
  StackedCell,
  StatusBadge,
} from '../../components/horizon';
import { usePermission } from '../../lib/auth/me';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { PROPOSAL_CREATE } from '../permissions';
import { formatDate } from '../policies/format';
import { PROPOSAL_STATUS_LABEL, PROPOSAL_TONE } from '../proposals/format';
import { PROPOSAL_PAGE_SIZE, useProposals } from '../proposals/queries';
import { proposalHref, PROPOSALS_PATH } from '../proposals/refs';
import type { ProposalStatus } from '../proposals/types';
import { formatMoney } from '../workflow/format';

export const EMPTY_PROPOSALS_TEXT = 'No proposals to show';

const STATUS_FILTERS: { id: ProposalStatus | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'UNDER_REVIEW', label: 'Under review' },
  { id: 'REFERRED', label: 'Referred' },
  { id: 'READY_TO_BIND', label: 'Ready to bind' },
  { id: 'BOUND', label: 'Bound' },
];
const isStatus = (value: string | null): value is ProposalStatus => STATUS_FILTERS.some((f) => f.id !== '' && f.id === value);

const LIST_LOCATION = /^\/proposals\/list(?:\?[^#\\]*)?$/;
export const proposalsFrom = (state: unknown): string => {
  const from = (state as { proposals?: unknown } | null)?.proposals;
  return typeof from === 'string' && LIST_LOCATION.test(from) ? from : PROPOSALS_PATH;
};

export const ProposalsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const canCreate = usePermission(PROPOSAL_CREATE);
  const status = params.get('status');
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);

  const proposals = useProposals({ q: q || undefined, status: isStatus(status) ? status : undefined, page });
  const data = proposals.data;
  const pages = data ? Math.max(1, Math.ceil(data.count / PROPOSAL_PAGE_SIZE)) : 1;

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };
  const listState = { proposals: `${location.pathname}${location.search}` };

  return (
    <HorizonPage id="proposals">
      <HorizonPageTitle
        title="Proposals"
        subtitle={data ? `${data.count} ${data.count === 1 ? 'proposal' : 'proposals'}` : 'Underwriting proposals you can see'}
        actions={
          <>
            <button type="button" className="hz-button hz-button-secondary" onClick={() => void proposals.refetch()} disabled={proposals.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${proposals.isFetching ? 'animate-spin' : ''}`} />
              {proposals.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
            {canCreate && (
              <button type="button" className="hz-button hz-button-primary" onClick={() => navigate(`${PROPOSALS_PATH}/new`, { state: listState })}>
                <Plus className="h-3.5 w-3.5" />
                New proposal
              </button>
            )}
          </>
        }
      />
      <ListCard
        title="Proposals"
        toolbar={
          <>
            <form
              role="search"
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                update({ q: search.trim() || null, page: null });
              }}
            >
              <SearchField id="proposal-search" label="Proposal number" value={search} onChange={setSearch} placeholder="Exact proposal number" className="w-full sm:w-64" />
              <button type="submit" className="hz-button hz-button-secondary">
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
            </form>
            <FilterGroup
              label="Status"
              options={STATUS_FILTERS}
              value={isStatus(status) ? status : ''}
              onChange={(id) => update({ status: id || null, page: null })}
            />
          </>
        }
        footer={
          data && data.results.length > 0 ? (
            <>
              <span>
                Showing {data.results.length} of {data.count}
              </span>
              {pages > 1 && (
                <nav aria-label="Pages" className="flex items-center gap-2">
                  <button type="button" className="hz-button hz-button-secondary" disabled={page <= 1} onClick={() => update({ page: page - 1 > 1 ? String(page - 1) : null })}>
                    Previous
                  </button>
                  <span className="text-[var(--hz-text-primary)]">
                    Page {page} of {pages}
                  </span>
                  <button type="button" className="hz-button hz-button-secondary" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
                    Next
                  </button>
                </nav>
              )}
            </>
          ) : undefined
        }
      >
        {proposals.isPending && (
          <div className="p-6">
            <HorizonLoader tip="Loading proposals..." />
          </div>
        )}
        {proposals.isError && (
          <div className="p-4">
            <ApiErrorAlert error={proposals.error} title="Proposals could not be loaded" />
          </div>
        )}
        {data && data.results.length === 0 && (
          <EmptyState icon={ClipboardList} title={EMPTY_PROPOSALS_TEXT} hint={q || status ? 'Nothing matches this search or filter.' : 'Proposals appear here once accepted quotations are taken into underwriting.'} />
        )}
        {data && data.results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="hz-grid w-full" aria-label="Proposals">
              <thead>
                <tr>
                  <th>Proposal</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Cover</th>
                  <th>Premium</th>
                  <th>Status</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {data.results.map((item) => (
                  <tr key={item.id} {...openableRow(() => navigate(proposalHref(item.proposal_no), { state: listState }))}>
                    <td>
                      <RecordCell icon={ClipboardList} mono title={item.proposal_no} detail={`${item.quotation.quotation_no} · ${item.branch.name}`} />
                    </td>
                    <td>
                      <StackedCell value={item.customer.display_name} detail={item.customer.customer_no} />
                    </td>
                    <td>
                      <StackedCell value={item.product.name} detail={item.insurer.name} />
                    </td>
                    <td className="whitespace-nowrap">
                      {item.proposed_inception_date ? `${formatDate(item.proposed_inception_date)} – ${formatDate(item.proposed_expiry_date)}` : 'Not set'}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{formatMoney(item.total_premium, item.currency)}</td>
                    <td>
                      <StatusBadge square label={PROPOSAL_STATUS_LABEL[item.status] ?? item.status} tone={PROPOSAL_TONE[item.status] ?? 'neutral'} />
                    </td>
                    <RowChevron />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListCard>
    </HorizonPage>
  );
};

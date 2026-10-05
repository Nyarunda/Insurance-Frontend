/**
 * Policy Directory (FI1-C): `GET /policies`, the policies the backend says this user may see.
 * Filtering, search and paging are the server's; the page and filters live in the URL, so going
 * back from a policy returns to the same list.
 *
 * DESIGN-1: one list card, as My Work Queue: coverage filter and policy-number search in its
 * toolbar, the rows, and the count with paging in its footer.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { policyHref } from '../policies/refs';
import { FileSearch, RefreshCw, Search, ShieldCheck } from 'lucide-react';
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
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { formatMoney, humanize } from '../workflow/format';
import { COVERAGE_TONE, formatDate } from '../policies/format';
import { POLICY_PAGE_SIZE, usePolicies } from '../policies/queries';
import { directoryReturnState } from '../policies/returnTo';
import type { CoverageStatus } from '../policies/types';

export const EMPTY_POLICIES_TEXT = 'No policies to show';

const COVERAGE_FILTERS: { id: CoverageStatus | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'PENDING_INCEPTION', label: 'Pending inception' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

const isCoverage = (value: string | null): value is CoverageStatus =>
  COVERAGE_FILTERS.some((filter) => filter.id !== '' && filter.id === value);

export const PoliciesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const coverage = params.get('coverage');
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);

  const policies = usePolicies({ coverage_status: isCoverage(coverage) ? coverage : undefined, q: q || undefined, page });
  const data = policies.data;
  const pages = data ? Math.max(1, Math.ceil(data.count / POLICY_PAGE_SIZE)) : 1;

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };
  const open = (policyNo: string) =>
    navigate(policyHref(policyNo), {
      state: directoryReturnState(location.pathname, location.search),
    });

  return (
    <HorizonPage id="policies">
      <HorizonPageTitle
        title="Policy Directory"
        subtitle={data ? `${data.count} ${data.count === 1 ? 'policy' : 'policies'}` : 'Policies you can see'}
        actions={
          <button
            type="button"
            className="hz-button hz-button-secondary"
            onClick={() => void policies.refetch()}
            disabled={policies.isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${policies.isFetching ? 'animate-spin' : ''}`} />
            {policies.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />
      <ListCard
        title="Policies"
        description="Policies within your branch access. Open one to see its cover, premium and endorsements."
        toolbar={
          <>
            <FilterGroup
              label="Coverage"
              options={COVERAGE_FILTERS}
              value={isCoverage(coverage) ? coverage : ''}
              onChange={(id) => update({ coverage: id || null, page: null })}
            />
            <form
              role="search"
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                update({ q: search.trim() || null, page: null });
              }}
            >
              <SearchField
                id="policy-search"
                label="Policy number"
                value={search}
                onChange={setSearch}
                placeholder="Exact policy or insurer number"
                className="w-full sm:w-64"
              />
              <button type="submit" className="hz-button hz-button-secondary">
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
            </form>
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
                  <button
                    type="button"
                    className="hz-button hz-button-secondary"
                    disabled={page <= 1}
                    onClick={() => update({ page: page - 1 > 1 ? String(page - 1) : null })}
                  >
                    Previous
                  </button>
                  <span className="text-[var(--hz-text-primary)]">
                    Page {page} of {pages}
                  </span>
                  <button
                    type="button"
                    className="hz-button hz-button-secondary"
                    disabled={page >= pages}
                    onClick={() => update({ page: String(page + 1) })}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          ) : undefined
        }
      >
        {policies.isPending && (
          <div className="p-6">
            <HorizonLoader tip="Loading policies..." />
          </div>
        )}
        {policies.isError && (
          <div className="p-4">
            <ApiErrorAlert error={policies.error} title="Policies could not be loaded" />
          </div>
        )}
        {data && data.results.length === 0 && (
          <EmptyState
            icon={FileSearch}
            title={EMPTY_POLICIES_TEXT}
            hint={q || coverage ? 'Nothing matches this search or filter.' : 'Policies appear here once they are bound in your branches.'}
          />
        )}
        {data && data.results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="hz-grid w-full" aria-label="Policies">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Period</th>
                  <th className="text-right">Annual premium</th>
                  <th>Coverage</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {data.results.map((policy) => (
                  <tr key={policy.id} {...openableRow(() => open(policy.policy_no))}>
                    <td>
                      <RecordCell
                        icon={ShieldCheck}
                        mono
                        title={policy.policy_no}
                        detail={policy.insurer_policy_no ? `Insurer ${policy.insurer_policy_no}` : undefined}
                      />
                    </td>
                    <td>
                      <StackedCell value={policy.customer.display_name} detail={policy.customer.customer_no} />
                    </td>
                    <td>
                      <StackedCell value={policy.product.name} detail={policy.insurer.name} />
                    </td>
                    <td className="whitespace-nowrap">
                      {formatDate(policy.inception_date)} – {formatDate(policy.expiry_date)}
                    </td>
                    <td className="text-right tabular-nums">{formatMoney(policy.total_premium, policy.currency)}</td>
                    <td>
                      <StatusBadge square label={humanize(policy.coverage_status)} tone={COVERAGE_TONE[policy.coverage_status] ?? 'neutral'} />
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

/**
 * Policy Directory (FI1-C): `GET /policies`, the policies the backend says this user may see.
 * Filtering, search and paging are the server's; the page and filters live in the URL, so going
 * back from a policy returns to the same list.
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { RefreshCw, Search } from 'lucide-react';
import {
  HorizonLoader,
  HorizonPage,
  HorizonPageContent,
  HorizonPageTitle,
  StatusBadge,
} from '../../components/horizon';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { formatMoney, humanize } from '../workflow/format';
import { COVERAGE_TONE, formatDate } from '../policies/format';
import { POLICY_PAGE_SIZE, usePolicies } from '../policies/queries';
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
  const open = (id: string) => navigate(`/policies/${encodeURIComponent(id)}`);

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
      <HorizonPageContent>
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--hz-divider)] p-3">
          <div role="group" aria-label="Coverage" className="flex flex-wrap gap-1">
            {COVERAGE_FILTERS.map((filter) => {
              const active = (isCoverage(coverage) ? coverage : '') === filter.id;
              return (
                <button
                  key={filter.id || 'all'}
                  type="button"
                  aria-pressed={active}
                  className={`hz-button ${active ? 'hz-button-primary' : 'hz-button-secondary'}`}
                  onClick={() => update({ coverage: filter.id || null, page: null })}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <form
            role="search"
            className="ml-auto flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              update({ q: search.trim() || null, page: null });
            }}
          >
            <label htmlFor="policy-search" className="text-[13px] text-[var(--hz-text-secondary)]">
              Policy number
            </label>
            <input
              id="policy-search"
              className="hz-field w-56 px-2 text-[13px]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Exact policy or insurer number"
            />
            <button type="submit" className="hz-button hz-button-secondary">
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
          </form>
        </div>

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
          <div className="p-6 text-center text-[13px] text-[var(--hz-text-secondary)]" role="status">
            {EMPTY_POLICIES_TEXT}
          </div>
        )}
        {data && data.results.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="hz-grid w-full" aria-label="Policies">
                <thead>
                  <tr>
                    <th>Policy</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Insurer</th>
                    <th>Period</th>
                    <th className="text-right">Annual premium</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((policy) => (
                    <tr
                      key={policy.id}
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => open(policy.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') open(policy.id);
                      }}
                    >
                      <td>
                        <span className="font-mono font-semibold">{policy.policy_no}</span>
                        {policy.insurer_policy_no && (
                          <span className="block text-[12px] text-[var(--hz-text-secondary)]">
                            Insurer {policy.insurer_policy_no}
                          </span>
                        )}
                      </td>
                      <td>
                        {policy.customer.display_name}
                        <span className="block text-[12px] text-[var(--hz-text-secondary)]">{policy.customer.customer_no}</span>
                      </td>
                      <td>{policy.product.name}</td>
                      <td>{policy.insurer.name}</td>
                      <td className="whitespace-nowrap">
                        {formatDate(policy.inception_date)} – {formatDate(policy.expiry_date)}
                      </td>
                      <td className="text-right tabular-nums">{formatMoney(policy.total_premium, policy.currency)}</td>
                      <td>
                        <StatusBadge label={humanize(policy.coverage_status)} tone={COVERAGE_TONE[policy.coverage_status] ?? 'neutral'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <nav aria-label="Pages" className="flex items-center justify-end gap-2 p-3 text-[13px]">
                <button
                  type="button"
                  className="hz-button hz-button-secondary"
                  disabled={page <= 1}
                  onClick={() => update({ page: page - 1 > 1 ? String(page - 1) : null })}
                >
                  Previous
                </button>
                <span>
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
        )}
      </HorizonPageContent>
    </HorizonPage>
  );
};

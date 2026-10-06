/**
 * Quotations (NB1-B): `GET /quotations`, the quotations the backend says this user may see, newest
 * first. The number search (exact), status filter and page are the server's and live in the URL.
 * "New quotation" opens the create dialog over this list.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { FileText, Plus, RefreshCw, Search } from 'lucide-react';
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
import { QUOTATION_CREATE } from '../permissions';
import { formatDate } from '../policies/format';
import { QUOTATION_STATUS_LABEL, QUOTATION_TONE } from '../quotations/format';
import { QUOTATION_PAGE_SIZE, useQuotations } from '../quotations/queries';
import { quotationHref, QUOTATIONS_PATH } from '../quotations/refs';
import type { QuotationStatus } from '../quotations/types';

export const EMPTY_QUOTATIONS_TEXT = 'No quotations to show';

const STATUS_FILTERS: { id: QuotationStatus | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'ISSUED', label: 'Issued' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'DECLINED', label: 'Declined' },
];
const isStatus = (value: string | null): value is QuotationStatus => STATUS_FILTERS.some((f) => f.id !== '' && f.id === value);

const LIST_LOCATION = /^\/quotations\/list(?:\?[^#\\]*)?$/;
export const quotationsFrom = (state: unknown): string => {
  const from = (state as { quotations?: unknown } | null)?.quotations;
  return typeof from === 'string' && LIST_LOCATION.test(from) ? from : QUOTATIONS_PATH;
};

export const QuotationsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const canCreate = usePermission(QUOTATION_CREATE);
  const status = params.get('status');
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);

  const quotations = useQuotations({ q: q || undefined, status: isStatus(status) ? status : undefined, page });
  const data = quotations.data;
  const pages = data ? Math.max(1, Math.ceil(data.count / QUOTATION_PAGE_SIZE)) : 1;

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };
  const listState = { quotations: `${location.pathname}${location.search}` };

  return (
    <HorizonPage id="quotations">
      <HorizonPageTitle
        title="Quotations"
        subtitle={data ? `${data.count} ${data.count === 1 ? 'quotation' : 'quotations'}` : 'Quotations you can see'}
        actions={
          <>
            <button type="button" className="hz-button hz-button-secondary" onClick={() => void quotations.refetch()} disabled={quotations.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${quotations.isFetching ? 'animate-spin' : ''}`} />
              {quotations.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
            {canCreate && (
              <button type="button" className="hz-button hz-button-primary" onClick={() => navigate(`${QUOTATIONS_PATH}/new`, { state: listState })}>
                <Plus className="h-3.5 w-3.5" />
                New quotation
              </button>
            )}
          </>
        }
      />
      <ListCard
        title="Quotations"
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
              <SearchField id="quotation-search" label="Quotation number" value={search} onChange={setSearch} placeholder="Exact quotation number" className="w-full sm:w-64" />
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
        {quotations.isPending && (
          <div className="p-6">
            <HorizonLoader tip="Loading quotations..." />
          </div>
        )}
        {quotations.isError && (
          <div className="p-4">
            <ApiErrorAlert error={quotations.error} title="Quotations could not be loaded" />
          </div>
        )}
        {data && data.results.length === 0 && (
          <EmptyState icon={FileText} title={EMPTY_QUOTATIONS_TEXT} hint={q || status ? 'Nothing matches this search or filter.' : 'Quotations appear here once they are created in your branches.'} />
        )}
        {data && data.results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="hz-grid w-full" aria-label="Quotations">
              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Valid until</th>
                  <th>Status</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {data.results.map((item) => (
                  <tr key={item.id} {...openableRow(() => navigate(quotationHref(item.quotation_no), { state: listState }))}>
                    <td>
                      <RecordCell icon={FileText} mono title={item.quotation_no} detail={`Revision ${item.current_revision_no} · ${item.branch.name}`} />
                    </td>
                    <td>
                      <StackedCell value={item.customer.display_name} detail={item.customer.customer_no} />
                    </td>
                    <td>
                      <StackedCell value={item.product.name} detail={item.insurer.name} />
                    </td>
                    <td className="whitespace-nowrap">{formatDate(item.valid_until)}</td>
                    <td>
                      <StatusBadge square label={QUOTATION_STATUS_LABEL[item.effective_status] ?? item.effective_status} tone={QUOTATION_TONE[item.effective_status] ?? 'neutral'} />
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

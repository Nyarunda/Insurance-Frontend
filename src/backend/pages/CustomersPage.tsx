/**
 * Customers (NB1-A): `GET /clients`, the customers the backend says this user may see. Search,
 * filters and paging are the server's; they live in the URL, so going back from a customer returns
 * to the same list. "New customer" opens the create dialog over this list.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { Building2, Plus, RefreshCw, Search, UserRound, UsersRound } from 'lucide-react';
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
import { CUSTOMER_TYPE_LABEL, KYC_LABEL, KYC_TONE, STATUS_TONE } from '../customers/format';
import { CUSTOMER_PAGE_SIZE, useCustomers } from '../customers/queries';
import { customerHref, CUSTOMERS_PATH } from '../customers/refs';
import type { CustomerType, KycStatus } from '../customers/types';
import { CUSTOMER_CREATE } from '../permissions';
import { humanize } from '../workflow/format';

export const EMPTY_CUSTOMERS_TEXT = 'No customers to show';

const KYC_FILTERS: { id: KycStatus | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'NOT_STARTED', label: 'Not started' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'PENDING_VERIFICATION', label: 'Awaiting verification' },
  { id: 'VERIFIED', label: 'Verified' },
];

const TYPE_FILTERS: { id: CustomerType | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'INDIVIDUAL', label: 'Individuals' },
  { id: 'CORPORATE', label: 'Companies' },
];

const isKyc = (value: string | null): value is KycStatus => KYC_FILTERS.some((f) => f.id !== '' && f.id === value);
const isType = (value: string | null): value is CustomerType => TYPE_FILTERS.some((f) => f.id !== '' && f.id === value);

/** Where Back on a customer returns: this list with its filters, never another path. */
const LIST_LOCATION = /^\/customers\/list(?:\?[^#\\]*)?$/;
export const customersFrom = (state: unknown): string => {
  const from = (state as { customers?: unknown } | null)?.customers;
  return typeof from === 'string' && LIST_LOCATION.test(from) ? from : CUSTOMERS_PATH;
};

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const canCreate = usePermission(CUSTOMER_CREATE);
  const kyc = params.get('kyc');
  const type = params.get('type');
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);

  const customers = useCustomers({
    q: q || undefined,
    kyc_status: isKyc(kyc) ? kyc : undefined,
    customer_type: isType(type) ? type : undefined,
    page,
  });
  const data = customers.data;
  const pages = data ? Math.max(1, Math.ceil(data.count / CUSTOMER_PAGE_SIZE)) : 1;

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };
  const listState = { customers: `${location.pathname}${location.search}` };
  const open = (customerNo: string) => navigate(customerHref(customerNo), { state: listState });

  return (
    <HorizonPage id="customers">
      <HorizonPageTitle
        title="Customers"
        subtitle={data ? `${data.count} ${data.count === 1 ? 'customer' : 'customers'}` : 'Customers you can see'}
        actions={
          <>
            <button
              type="button"
              className="hz-button hz-button-secondary"
              onClick={() => void customers.refetch()}
              disabled={customers.isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${customers.isFetching ? 'animate-spin' : ''}`} />
              {customers.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
            {canCreate && (
              <button
                type="button"
                className="hz-button hz-button-primary"
                onClick={() => navigate(`${CUSTOMERS_PATH}/new`, { state: listState })}
              >
                <Plus className="h-3.5 w-3.5" />
                New customer
              </button>
            )}
          </>
        }
      />
      <ListCard
        title="Customers"
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
              <SearchField
                id="customer-search"
                label="Find a customer"
                value={search}
                onChange={setSearch}
                placeholder="Name, number, phone or e-mail"
                className="w-full sm:w-72"
              />
              <button type="submit" className="hz-button hz-button-secondary">
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
            </form>
            <FilterGroup
              label="KYC"
              options={KYC_FILTERS}
              value={isKyc(kyc) ? kyc : ''}
              onChange={(id) => update({ kyc: id || null, page: null })}
            />
            <FilterGroup
              label="Type"
              options={TYPE_FILTERS}
              value={isType(type) ? type : ''}
              onChange={(id) => update({ type: id || null, page: null })}
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
        {customers.isPending && (
          <div className="p-6">
            <HorizonLoader tip="Loading customers..." />
          </div>
        )}
        {customers.isError && (
          <div className="p-4">
            <ApiErrorAlert error={customers.error} title="Customers could not be loaded" />
          </div>
        )}
        {data && data.results.length === 0 && (
          <EmptyState
            icon={UsersRound}
            title={EMPTY_CUSTOMERS_TEXT}
            hint={q || kyc || type ? 'Nothing matches this search or filter.' : 'Customers appear here once they are created in your branches.'}
          />
        )}
        {data && data.results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="hz-grid w-full" aria-label="Customers">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>KYC</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {data.results.map((customer) => (
                  <tr key={customer.id} {...openableRow(() => open(customer.customer_no))}>
                    <td>
                      <RecordCell
                        icon={customer.customer_type === 'INDIVIDUAL' ? UserRound : Building2}
                        title={customer.display_name}
                        detail={`${customer.customer_no} · ${CUSTOMER_TYPE_LABEL[customer.customer_type] ?? humanize(customer.customer_type)}`}
                      />
                    </td>
                    <td>
                      <StackedCell value={customer.primary_phone ?? '—'} detail={customer.primary_email ?? undefined} />
                    </td>
                    <td>{customer.home_branch.name}</td>
                    <td>
                      <StatusBadge square label={humanize(customer.status)} tone={STATUS_TONE[customer.status] ?? 'neutral'} />
                    </td>
                    <td>
                      <StatusBadge square label={KYC_LABEL[customer.kyc_status] ?? humanize(customer.kyc_status)} tone={KYC_TONE[customer.kyc_status] ?? 'neutral'} />
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

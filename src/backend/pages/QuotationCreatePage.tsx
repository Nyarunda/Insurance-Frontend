/**
 * New quotation (NB1-B): `POST /quotations`, as a dialog over the Quotations list at its own address
 * (`/quotations/list/new`). It takes the customer (searched on the server, or handed over from the
 * customer's record in router state), an ACTIVE product and the quoting branch, and optionally the
 * validity date (the server applies its default and limits). The draft opens next, where the risk
 * is entered from the product's own rating factors, priced and issued.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { FilePlus2, Search } from 'lucide-react';
import { FieldError, HorizonLoader } from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { useBranchStore } from '../../lib/context/branchStore';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { KYC_LABEL } from '../customers/format';
import { useCustomers } from '../customers/queries';
import type { CustomerSummary } from '../customers/types';
import { useActiveProducts } from '../quotations/queries';
import { quotationHref } from '../quotations/refs';
import { useQuotationCommands } from '../quotations/useQuotationCommands';
import { quotationsFrom } from './QuotationsPage';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;
const Required = () => <span className="text-[var(--hz-danger)]">*</span>;

type Chosen = Pick<CustomerSummary, 'id' | 'customer_no' | 'display_name'>;

/** A customer handed over from the customer's record: `{ customer: {id, customer_no, display_name} }`. */
const handedOver = (state: unknown): Chosen | null => {
  const customer = (state as { customer?: Partial<Chosen> } | null)?.customer;
  return customer && typeof customer.id === 'string' && typeof customer.customer_no === 'string' && typeof customer.display_name === 'string'
    ? { id: customer.id, customer_no: customer.customer_no, display_name: customer.display_name }
    : null;
};

export const QuotationCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const branches = useBranchStore((state) => state.branches);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const products = useActiveProducts();
  const { create, pending } = useQuotationCommands();

  const [customer, setCustomer] = useState<Chosen | null>(() => handedOver(location.state));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const found = useCustomers({ q: query || undefined, page: 1 }, !!query && !customer);
  const [product, setProduct] = useState('');
  const [branch, setBranch] = useState(activeBranchId ?? (branches.length === 1 ? branches[0].id : ''));
  const [validUntil, setValidUntil] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<unknown>(null);

  const back = () => navigate(quotationsFrom(location.state));
  const clientErrors: Record<string, string | undefined> = {
    customer_id: customer ? undefined : 'Choose the customer.',
    product_id: product ? undefined : 'Choose the product.',
    branch_id: branch ? undefined : 'Choose the quoting branch.',
  };
  const errorFor = (name: string) => (attempted ? clientErrors[name] : undefined) ?? serverFields[name];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(clientErrors).some(Boolean) || !customer) return;
    setFailure(null);
    setServerFields({});
    const outcome = await create({
      customer_id: customer.id,
      product_id: product,
      branch_id: branch,
      ...(validUntil ? { valid_until: validUntil } : {}),
    });
    if (outcome.ok === true) {
      navigate(quotationHref(outcome.view.quotation_no), { replace: true, state: { quotations: quotationsFrom(location.state) } });
      return;
    }
    const fields = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(fields).length) setServerFields(fields);
    else setFailure(outcome.error);
  };

  return (
    <DialogFrame
      titleId="quotation-create-title"
      title="New quotation"
      subtitle="Created as a draft; the risk is entered and priced next"
      onClose={back}
      closeLabel="Back to Quotations"
      dismissOnBackdrop={!customer && !product}
      size="lg"
      icon={<FilePlus2 className="h-4 w-4" />}
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={back} disabled={pending}>
            Cancel
          </button>
          <button type="submit" form="quotation-create-form" className="hz-button hz-button-primary" disabled={pending}>
            {pending ? 'Creating…' : 'Create quotation'}
          </button>
        </>
      }
    >
      {failure !== null && <ApiErrorAlert error={failure} title="The quotation was not created" />}
      <form id="quotation-create-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
        <div>
          <span className={label}>
            Customer <Required />
          </span>
          {customer ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--hz-border-grid)] px-3 py-2">
              <div>
                <p className="text-sm font-medium text-[var(--hz-text-primary)]">{customer.display_name}</p>
                <p className="font-mono text-[13px] text-[var(--hz-text-muted)]">{customer.customer_no}</p>
              </div>
              <button type="button" className="hz-button hz-button-secondary" onClick={() => setCustomer(null)}>
                Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  id="quotation-customer-search"
                  aria-label="Find the customer"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      setQuery(search.trim());
                    }
                  }}
                  placeholder="Name, number, phone or e-mail"
                  className={field(!!errorFor('customer_id'))}
                />
                <button type="button" className="hz-button hz-button-secondary" onClick={() => setQuery(search.trim())}>
                  <Search className="h-3.5 w-3.5" />
                  Find
                </button>
              </div>
              {query && found.isPending && <HorizonLoader tip="Searching..." />}
              {found.isError && <ApiErrorAlert error={found.error} title="Customers could not be searched" />}
              {found.data && (
                <ul aria-label="Matching customers" className="flex flex-col divide-y divide-[var(--hz-divider)] rounded-lg border border-[var(--hz-border-grid)]">
                  {found.data.results.length === 0 && <li className="px-3 py-2 text-sm text-[var(--hz-text-muted)]">No customer matches.</li>}
                  {found.data.results.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setCustomer(item)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[var(--hz-surface-subtle)]"
                      >
                        <span>
                          <span className="block text-sm text-[var(--hz-text-primary)]">{item.display_name}</span>
                          <span className="block font-mono text-[13px] text-[var(--hz-text-muted)]">{item.customer_no}</span>
                        </span>
                        <span className="text-[13px] text-[var(--hz-text-muted)]">{KYC_LABEL[item.kyc_status]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <FieldError message={errorFor('customer_id')} />
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="quotation-product" className={label}>
              Product <Required />
            </label>
            <select
              id="quotation-product"
              value={product}
              onChange={(event) => setProduct(event.target.value)}
              aria-invalid={!!errorFor('product_id')}
              className={field(!!errorFor('product_id'))}
            >
              <option value="">{products.isPending ? 'Loading products…' : 'Select a product…'}</option>
              {products.data?.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.insurer.name}
                </option>
              ))}
            </select>
            {products.isError && <ApiErrorAlert error={products.error} title="Products could not be loaded" />}
            <FieldError message={errorFor('product_id')} />
          </div>
          <div>
            <label htmlFor="quotation-branch" className={label}>
              Quoting branch <Required />
            </label>
            <select
              id="quotation-branch"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              aria-invalid={!!errorFor('branch_id')}
              className={field(!!errorFor('branch_id'))}
            >
              <option value="">Select a branch…</option>
              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
            <FieldError message={errorFor('branch_id')} />
          </div>
          <div>
            <label htmlFor="quotation-valid-until" className={label}>
              Valid until
            </label>
            <input
              id="quotation-valid-until"
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
              aria-invalid={!!errorFor('valid_until')}
              className={field(!!errorFor('valid_until'))}
            />
            {!errorFor('valid_until') && <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">Left empty, the tenant's default validity applies.</p>}
            <FieldError message={errorFor('valid_until')} />
          </div>
        </div>
      </form>
    </DialogFrame>
  );
};

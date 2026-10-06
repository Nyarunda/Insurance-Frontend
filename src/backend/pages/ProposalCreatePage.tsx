/**
 * New proposal (NB1-C): `POST /underwriting/proposals`, as a dialog over the Proposals list at its
 * own address (`/proposals/list/new`). It takes an accepted quotation (found by its exact number on
 * the server, or handed over from the quotation's record in router state) and, optionally, the
 * proposed inception date. The server copies the accepted offer (risk, cover and premium) and
 * never recalculates it; the expiry follows from the inception. The draft opens next, where the
 * agreement, sum insured and underwriting details are completed and evidence is recorded.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ClipboardPlus, Search } from 'lucide-react';
import { FieldError, HorizonLoader } from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { proposalHref } from '../proposals/refs';
import { useProposalCommands } from '../proposals/useProposalCommands';
import { useQuotations } from '../quotations/queries';
import { proposalsFrom } from './ProposalsPage';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;
const Required = () => <span className="text-[var(--hz-danger)]">*</span>;

export interface ChosenQuotation {
  id: string;
  quotation_no: string;
  customer: string;
  product: string;
}

/** A quotation handed over from its record: `{ quotation: {id, quotation_no, customer, product} }`. */
const handedOver = (state: unknown): ChosenQuotation | null => {
  const q = (state as { quotation?: Partial<ChosenQuotation> } | null)?.quotation;
  return q && typeof q.id === 'string' && typeof q.quotation_no === 'string' && typeof q.customer === 'string' && typeof q.product === 'string'
    ? { id: q.id, quotation_no: q.quotation_no, customer: q.customer, product: q.product }
    : null;
};

export const ProposalCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { create, pending } = useProposalCommands();

  const [quotation, setQuotation] = useState<ChosenQuotation | null>(() => handedOver(location.state));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const found = useQuotations({ q: query || undefined, status: 'ACCEPTED', page: 1 }, !!query && !quotation);
  const [inception, setInception] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<unknown>(null);

  const back = () => navigate(proposalsFrom(location.state));
  const errorFor = (name: string) => (attempted && name === 'quotation_id' && !quotation ? 'Choose the accepted quotation.' : undefined) ?? serverFields[name];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (!quotation) return;
    setFailure(null);
    setServerFields({});
    const outcome = await create({ quotation_id: quotation.id, ...(inception ? { proposed_inception_date: inception } : {}) });
    if (outcome.ok === true) {
      navigate(proposalHref(outcome.view.proposal_no), { replace: true, state: { proposals: proposalsFrom(location.state) } });
      return;
    }
    const fields = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(fields).length) setServerFields(fields);
    else setFailure(outcome.error);
  };

  return (
    <DialogFrame
      titleId="proposal-create-title"
      title="New proposal"
      subtitle="From an accepted quotation; its offer is copied as accepted"
      onClose={back}
      closeLabel="Back to Proposals"
      dismissOnBackdrop={!quotation && !inception}
      size="lg"
      icon={<ClipboardPlus className="h-4 w-4" />}
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={back} disabled={pending}>
            Cancel
          </button>
          <button type="submit" form="proposal-create-form" className="hz-button hz-button-primary" disabled={pending}>
            {pending ? 'Creating…' : 'Create proposal'}
          </button>
        </>
      }
    >
      {failure !== null && <ApiErrorAlert error={failure} title="The proposal was not created" />}
      <form id="proposal-create-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
        <div>
          <span className={label}>
            Accepted quotation <Required />
          </span>
          {quotation ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--hz-border-grid)] px-3 py-2">
              <div>
                <p className="font-mono text-sm font-medium text-[var(--hz-text-primary)]">{quotation.quotation_no}</p>
                <p className="text-[13px] text-[var(--hz-text-muted)]">
                  {quotation.customer} · {quotation.product}
                </p>
              </div>
              <button type="button" className="hz-button hz-button-secondary" onClick={() => setQuotation(null)}>
                Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  id="proposal-quotation-search"
                  aria-label="Find the accepted quotation"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      setQuery(search.trim());
                    }
                  }}
                  placeholder="Exact quotation number"
                  className={field(!!errorFor('quotation_id'))}
                />
                <button type="button" className="hz-button hz-button-secondary" onClick={() => setQuery(search.trim())}>
                  <Search className="h-3.5 w-3.5" />
                  Find
                </button>
              </div>
              {query && found.isPending && <HorizonLoader tip="Searching..." />}
              {found.isError && <ApiErrorAlert error={found.error} title="Quotations could not be searched" />}
              {found.data && (
                <ul aria-label="Matching accepted quotations" className="flex flex-col divide-y divide-[var(--hz-divider)] rounded-lg border border-[var(--hz-border-grid)]">
                  {found.data.results.length === 0 && <li className="px-3 py-2 text-sm text-[var(--hz-text-muted)]">No accepted quotation has this number.</li>}
                  {found.data.results.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setQuotation({ id: item.id, quotation_no: item.quotation_no, customer: item.customer.display_name, product: item.product.name })}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[var(--hz-surface-subtle)]"
                      >
                        <span>
                          <span className="block font-mono text-sm text-[var(--hz-text-primary)]">{item.quotation_no}</span>
                          <span className="block text-[13px] text-[var(--hz-text-muted)]">
                            {item.customer.display_name} · {item.product.name}
                          </span>
                        </span>
                        <span className="text-[13px] text-[var(--hz-text-muted)]">{item.branch.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <FieldError message={errorFor('quotation_id')} />
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="proposal-inception" className={label}>
              Proposed inception
            </label>
            <input
              id="proposal-inception"
              type="date"
              value={inception}
              onChange={(event) => setInception(event.target.value)}
              aria-invalid={!!errorFor('proposed_inception_date')}
              className={field(!!errorFor('proposed_inception_date'))}
            />
            {!errorFor('proposed_inception_date') && (
              <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">Can be set later. The expiry follows from it: one year less a day.</p>
            )}
            <FieldError message={errorFor('proposed_inception_date')} />
          </div>
        </div>
      </form>
    </DialogFrame>
  );
};

/**
 * Prepare a renewal (RENEWALS-SURFACE-1 RS-A, RS-D4): `/policies/list/<POL>/renewals/new`, a dialog
 * over the policy's Renewals tab. **As is** carries the terms in force to the next period; **Amended**
 * (RS-B) changes them with the controlled amendments (`AmendmentFields`), validated by the server
 * against the product version in force when the new period starts.
 *
 * The dates may be left empty: the server then starts the period the day after the policy expires and
 * runs it for a year less a day. A later start is allowed; the form says the days between are not
 * covered (the server refers such a gap to a checker). It is sent with the policy's ETag as If-Match,
 * so the renewal starts from the version the user saw. Whether the policy is inside its renewal window
 * is the server's rule; its refusal is shown in words.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { RefreshCcw } from 'lucide-react';
import { FieldError, HorizonAlert, HorizonLoader } from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { STALE_TEXT } from '../../lib/api/commandErrors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { formatDate } from '../policies/format';
import { usePolicy } from '../policies/queries';
import { policyHref, renewalHref, useRouteRefs } from '../policies/refs';
import { RenewalRefusalAlert } from './RenewalPage';
import { AmendmentFields, amendmentErrors, AmendmentState, changesOf, initialAmendment, useRenewalTariff } from '../renewals/AmendmentFields';
import { useRenewalCommands } from '../renewals/useRenewalCommands';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;
const hint = 'mt-1.5 text-[13px] text-[var(--hz-text-muted)]';

const dayAfter = (iso: string) => {
  const day = new Date(`${iso}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
};
const dayBefore = (iso: string) => {
  const day = new Date(`${iso}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
};

export const RenewalPreparePage: React.FC = () => {
  const { policyId, policyRef } = useRouteRefs();
  const navigate = useNavigate();
  const { state } = useLocation();
  const policy = usePolicy(policyId);
  const commands = useRenewalCommands();
  const [inception, setInception] = useState('');
  const [expiry, setExpiry] = useState('');
  const [failure, setFailure] = useState<unknown>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [stale, setStale] = useState(false);
  const [amended, setAmended] = useState(false);
  const [amendment, setAmendment] = useState<AmendmentState | null>(null);
  const [attempted, setAttempted] = useState(false);
  const productId = policy.data?.view.product.id ?? '';
  const startDay = inception || (policy.data ? dayAfter(policy.data.view.expiry_date) : '');
  const tariff = useRenewalTariff(productId, startDay);

  const back = () => navigate(`${policyHref(policyRef)}?tab=renewals`, { state });
  const frame = { titleId: 'renewal-prepare-title', title: 'Prepare renewal', onClose: back, closeLabel: 'Back to the policy', size: 'md' as const,
    icon: <RefreshCcw className="h-4 w-4" /> };
  const cancel = (
    <button type="button" className="hz-button hz-button-secondary" onClick={back} disabled={commands.pending}>
      Back
    </button>
  );

  if (policy.isPending) {
    return (
      <DialogFrame {...frame} footer={cancel}>
        <HorizonLoader tip="Loading the policy..." />
      </DialogFrame>
    );
  }
  if (policy.isError) {
    return (
      <DialogFrame {...frame} footer={cancel}>
        <ApiErrorAlert error={policy.error} title="The policy could not be loaded" />
      </DialogFrame>
    );
  }

  const { view, etag } = policy.data;
  const defaultStart = dayAfter(view.expiry_date);
  const gap = inception && inception > defaultStart ? { from: defaultStart, to: dayBefore(inception) } : null;
  const terms = amendment ?? initialAmendment(view);
  const declared = tariff.document.data?.content.rating_factors ?? [];
  const changes = amended ? changesOf(terms, view, declared) : {};
  const local: Record<string, string | undefined> = {
    expiry_date: expiry && inception && expiry <= inception ? 'The new period must end after it starts.' : undefined,
    changes: amended && Object.keys(changes).length === 0 ? 'Change at least one thing, or prepare it as is.' : undefined,
  };
  const amendmentProblems = amended ? amendmentErrors(terms, declared) : {};
  const errorFor = (key: string) => local[key] ?? fields[key];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(local).some(Boolean) || Object.keys(amendmentProblems).length || !etag) return;
    setFailure(null);
    setFields({});
    setStale(false);
    const body = {
      renewal_type: amended ? ('AMENDED' as const) : ('AS_IS' as const),
      ...(inception ? { inception_date: inception } : {}),
      ...(expiry ? { expiry_date: expiry } : {}),
      ...(amended ? { changes } : {}),
    };
    const outcome = await commands.prepare(view.id, body, etag);
    if (outcome.ok === true) {
      navigate(renewalHref(view.policy_no, outcome.view.renewal_no), { state });
      return;
    }
    if (outcome.kind === 'stale') return setStale(true);
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(found).length) setFields(found);
    else setFailure(outcome.error);
  };

  return (
    <DialogFrame
      {...frame}
      footer={
        <>
          {cancel}
          <button type="submit" form="renewal-prepare-form" className="hz-button hz-button-primary" disabled={commands.pending || !etag}>
            {commands.pending ? 'Preparing…' : 'Prepare renewal'}
          </button>
        </>
      }
    >
      <p className="text-sm text-[var(--hz-text-primary)]">
        {view.policy_no} expires on {formatDate(view.expiry_date)}. The renewal carries the terms in force to the next period and is priced on the
        tariff in force when that period starts.
      </p>
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <RenewalRefusalAlert error={failure} title="The renewal was not prepared" />}
      <form id="renewal-prepare-form" noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="renewal-inception" className={label}>
              New period starts
            </label>
            <input id="renewal-inception" type="date" value={inception} onChange={(event) => setInception(event.target.value)}
              aria-invalid={!!errorFor('inception_date')} className={field(!!errorFor('inception_date'))} />
            <p className={hint}>Empty: the day after expiry, {formatDate(defaultStart)}.</p>
            <FieldError message={errorFor('inception_date')} />
          </div>
          <div>
            <label htmlFor="renewal-expiry" className={label}>
              New period ends
            </label>
            <input id="renewal-expiry" type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)}
              aria-invalid={!!errorFor('expiry_date')} className={field(!!errorFor('expiry_date'))} />
            <p className={hint}>Empty: a year less a day from the start.</p>
            <FieldError message={errorFor('expiry_date')} />
          </div>
        </div>
        <fieldset>
          <legend className={label}>Terms</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="renewal-type" checked={!amended} onChange={() => setAmended(false)} />
              As is
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="renewal-type" checked={amended} onChange={() => setAmended(true)} />
              Amended
            </label>
          </div>
          <p className={hint}>{amended ? 'Change the sum insured, cover, limits or other details for the new period.' : 'The terms in force carry to the new period.'}</p>
        </fieldset>
        {amended && (
          <AmendmentFields policy={view} day={startDay} state={terms} onChange={setAmendment} attempted={attempted}
            serverFields={fields} />
        )}
        {attempted && local.changes && <FieldError message={local.changes} />}
        {fields.changes && <FieldError message={fields.changes} />}
        {gap && (
          <div role="note">
            <HorizonAlert tone="warning" title="A gap in cover">
              The days from {formatDate(gap.from)} to {formatDate(gap.to)} are not covered. A checker will need to approve this renewal.
            </HorizonAlert>
          </div>
        )}
      </form>
    </DialogFrame>
  );
};

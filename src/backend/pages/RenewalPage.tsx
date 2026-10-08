/**
 * A renewal (RENEWALS-SURFACE-1 RS-A): `/policies/list/<POL>/renewals/<REN>`, a dialog over the
 * policy's Renewals tab, from `GET /renewals/{id}` with its ETag. Every command sends that ETag.
 *
 * - DRAFT: change the dates or the amendments (RS-B), price, withdraw.
 * - PRICED: the expiring and renewal annual figures, the difference and movement (information, not a
 *   charge), and the reasons a checker is needed. When one is needed and the tenant governs renewal
 *   approval, the renewal shows who it waits for and the checker decides in My Work Queue; otherwise a
 *   holder of `policies.renewal.approve` who did not prepare it approves here. Then offer, with an
 *   optional validity (the server's default and maximum apply). Changing the dates returns it to draft.
 * - OFFERED: record the customer's answer, accepted or declined (with a reason); an offer past its
 *   validity shows as expired and can only be withdrawn.
 * - ACCEPTED: renew. It completes on or after the new period's start; before then the server holds it,
 *   and after it a late renewal needs an approved backdating. Every refusal is shown in words.
 * - DECLINED, WITHDRAWN: prepared again from the policy. RENEWED: the policy's new version.
 *
 * Actions show only to users whose permissions could use them; the server decides every one.
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Calculator, Check, RefreshCcw, Send, Undo2, X } from 'lucide-react';
import { DetailGrid, DetailGroup, FieldError, HorizonAlert, HorizonLoader, HorizonToast, StatusBadge } from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { NOT_FOUND_TEXT, STALE_TEXT } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { hasPermission, useMe } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { RENEWAL_APPROVE, RENEWAL_CREATE } from '../permissions';
import { formatDate } from '../policies/format';
import { usePolicy } from '../policies/queries';
import type { PolicyDetail } from '../policies/types';
import { AmendmentFields, amendmentErrors, AmendmentState, changesOf, initialAmendment, useRenewalTariff } from '../renewals/AmendmentFields';
import { policyHref, useRouteRefs } from '../policies/refs';
import { checkReasonText, RENEWAL_STATUS_LABEL, RENEWAL_TONE, renewalRefusal } from '../renewals/format';
import { useRenewal } from '../renewals/queries';
import type { RenewalChanges, RenewalDetail } from '../renewals/types';
import { RenewalAction, useRenewalCommands } from '../renewals/useRenewalCommands';
import { formatDateTime, formatMoney } from '../workflow/format';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;

/** A refusal in words: the next step where the renewal has one, otherwise the server's own message. */
export const RenewalRefusalAlert: React.FC<{ error: unknown; title: string }> = ({ error, title }) => {
  const refusal = renewalRefusal(error);
  if (!refusal) return <ApiErrorAlert error={error} title={title} />;
  return (
    <div role="alert">
      <HorizonAlert tone="warning" title={title}>
        {refusal.text}
        {refusal.problems.length > 0 && (
          <ul className="mt-1 list-disc pl-5">
            {refusal.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
        <ErrorReference reference={referenceOf(error)} />
      </HorizonAlert>
    </div>
  );
};

type Dialog = 'dates' | 'amend' | 'offer' | 'decline' | 'withdraw' | null;

/** The amendments asked, in words (the server keeps the exact values). */
const amendmentLines = (changes: RenewalChanges): string[] => {
  const lines: string[] = [];
  if (changes.sum_insured) lines.push(`Sum insured ${Number(changes.sum_insured).toLocaleString()}`);
  for (const [code, value] of Object.entries(changes.factors ?? {})) lines.push(`${code.replace(/_/g, ' ')}: ${String(value)}`);
  for (const code of changes.add_benefits ?? []) lines.push(`Add ${code.replace(/_/g, ' ').toLowerCase()}`);
  for (const code of changes.remove_benefits ?? []) lines.push(`Remove ${code.replace(/_/g, ' ').toLowerCase()}`);
  for (const [code, value] of Object.entries(changes.limits ?? {})) lines.push(`${code.replace(/_/g, ' ').toLowerCase()} limit ${Number(value).toLocaleString()}`);
  if (changes.geographical_limit) lines.push(`Geographical limit: ${changes.geographical_limit}`);
  return lines;
};

/** Today on this device, as an ISO date: only to choose a hint; the server decides with the tenant's date. */
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const RenewalPage: React.FC = () => {
  const { renewalId, policyRef } = useRouteRefs();
  const navigate = useNavigate();
  const { state } = useLocation();
  const renewal = useRenewal(renewalId);
  const me = useMe().data;
  const commands = useRenewalCommands();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [failure, setFailure] = useState<{ error: unknown; title: string } | null>(null);
  const [stale, setStale] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const policyNo = renewal.data?.view.policy.policy_no ?? policyRef;
  const back = () => navigate(`${policyHref(policyNo)}?tab=renewals`, { state });
  const frame = { titleId: 'renewal-title', onClose: back, closeLabel: 'Back to the policy', size: 'xl' as const, expandable: true,
    icon: <RefreshCcw className="h-4 w-4" /> };
  const close = (
    <button type="button" className="hz-button hz-button-secondary" onClick={back}>
      Close
    </button>
  );

  if (renewal.isPending) {
    return (
      <DialogFrame {...frame} title="Renewal" footer={close}>
        <HorizonLoader tip="Loading the renewal..." />
      </DialogFrame>
    );
  }
  if (renewal.isError) {
    const missing = renewal.error instanceof ApiError && renewal.error.status === 404;
    return (
      <DialogFrame {...frame} title="Renewal" footer={close}>
        {missing ? (
          <HorizonAlert tone="warning" title={NOT_FOUND_TEXT}>
            It does not exist, or its policy is outside the branches you can see.
            <ErrorReference reference={referenceOf(renewal.error)} />
          </HorizonAlert>
        ) : (
          <ApiErrorAlert error={renewal.error} title="The renewal could not be loaded" />
        )}
      </DialogFrame>
    );
  }

  const { view, etag } = renewal.data;
  const canCreate = hasPermission(me, RENEWAL_CREATE);
  const canApprove = hasPermission(me, RENEWAL_APPROVE);
  const status = view.effective_status;
  const waiting = view.workflow?.status === 'PENDING_APPROVAL';
  const needsCheck = view.check.required && !view.check.approved_at;

  /** Runs a command; a 412 reloads the renewal and keeps the dialog's input, so the same press resends. */
  const act = async (action: RenewalAction, body: Record<string, unknown>, done: string, title: string) => {
    if (!etag) return false;
    setFailure(null);
    setStale(false);
    const outcome = await commands.act(view.id, action, body, etag);
    if (outcome.ok === true) {
      setDialog(null);
      setToast(done);
      return true;
    }
    if (outcome.kind === 'stale') setStale(true);
    else if (!(outcome.kind === 'invalid' && Object.keys(fieldErrorsOf(outcome.error)).length)) setFailure({ error: outcome.error, title });
    return outcome;
  };

  const button = (text: string, onClick: () => void, icon: React.ReactNode, primary = false) => (
    <button type="button" className={`hz-button ${primary ? 'hz-button-primary' : 'hz-button-secondary'}`} disabled={commands.pending || !etag} onClick={onClick}>
      {icon}
      {text}
    </button>
  );
  const actions: React.ReactNode[] = [];
  if (canCreate && status === 'DRAFT') {
    actions.push(button('Price', () => void act('price', {}, 'Priced', 'The renewal was not priced'), <Calculator className="h-3.5 w-3.5" />, true));
  }
  if (canCreate && (status === 'DRAFT' || status === 'PRICED')) {
    actions.push(button('Change dates', () => setDialog('dates'), null));
    actions.push(button(view.renewal_type === 'AMENDED' ? 'Change amendments' : 'Amend', () => setDialog('amend'), null));
  }
  if (status === 'PRICED' && needsCheck && !waiting && canApprove) {
    actions.push(button('Approve', () => void act('approve', {}, 'Approved', 'The renewal was not approved'), <Check className="h-3.5 w-3.5" />, true));
  }
  if (canCreate && status === 'PRICED' && !needsCheck) actions.push(button('Offer', () => setDialog('offer'), <Send className="h-3.5 w-3.5" />, true));
  if (canCreate && status === 'OFFERED') {
    actions.push(button('Customer accepted', () => void act('accept', {}, 'The customer accepted', 'The answer was not recorded'), <Check className="h-3.5 w-3.5" />, true));
    actions.push(button('Customer declined', () => setDialog('decline'), <X className="h-3.5 w-3.5" />));
  }
  if (canCreate && status === 'ACCEPTED') {
    actions.push(button('Renew', () => void act('renew', {}, 'Renewed', 'The renewal was not completed'), <RefreshCcw className="h-3.5 w-3.5" />, true));
  }
  if (canCreate && ['DRAFT', 'PRICED', 'OFFERED', 'EXPIRED', 'ACCEPTED'].includes(status)) {
    actions.push(button('Withdraw', () => setDialog('withdraw'), <Undo2 className="h-3.5 w-3.5" />));
  }
  if (canCreate && (status === 'DECLINED' || status === 'CANCELLED')) {
    actions.push(button('Prepare again', () => navigate(`${policyHref(view.policy.policy_no)}/renewals/new`, { state }), <RefreshCcw className="h-3.5 w-3.5" />));
  }

  return (
    <DialogFrame
      {...frame}
      title={`Renewal ${view.renewal_no}`}
      footer={
        <>
          {close}
          {actions.map((node, index) => (
            <React.Fragment key={index}>{node}</React.Fragment>
          ))}
        </>
      }
    >
      <HorizonToast message={toast} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge square label={RENEWAL_STATUS_LABEL[status] ?? status} tone={RENEWAL_TONE[status] ?? 'neutral'} />
          <span className="text-[13px] text-[var(--hz-text-muted)]">
            {view.renewal_type === 'AS_IS' ? 'As is' : 'Amended'}, from version {view.source_version_no} of {view.policy.policy_no}
          </span>
        </div>
        <StateNotice view={view} waiting={waiting} needsCheck={needsCheck} canApprove={canApprove} />
        {stale && (
          <div role="status">
            <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
          </div>
        )}
        {failure && <RenewalRefusalAlert error={failure.error} title={failure.title} />}

        <DetailGroup title="The new period">
          <DetailGrid
            items={[
              { label: 'Starts', value: formatDate(view.inception_date) },
              { label: 'Ends', value: formatDate(view.expiry_date) },
              ...(view.offer_valid_until ? [{ label: 'Offer valid until', value: formatDate(view.offer_valid_until) }] : []),
              ...(view.decision_reason ? [{ label: 'Reason given', value: view.decision_reason }] : []),
              ...(view.resulting_version_no ? [{ label: 'Policy version', value: `Version ${view.resulting_version_no}, renewed ${formatDateTime(view.renewed_at)}` }] : []),
            ]}
          />
        </DetailGroup>

        {view.renewal_type === 'AMENDED' && (
          <DetailGroup title="Amendments" description="What changes for the new period; the premium comes from the tariff.">
            <ul className="list-disc pl-5 text-sm text-[var(--hz-text-primary)]">
              {amendmentLines(view.requested_changes ?? {}).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </DetailGroup>
        )}

        {view.pricing ? (
          <DetailGroup title="Premium" description={`Priced on product version ${view.pricing.version_no}, the tariff in force on ${formatDate(view.pricing.rating_date)}. The difference is information, not a charge.`}>
            <div className="overflow-x-auto">
              <table className="hz-grid w-full" aria-label="Premium">
                <thead>
                  <tr>
                    <th aria-hidden="true" />
                    <th className="text-right">Expiring period</th>
                    <th className="text-right">Renewal</th>
                  </tr>
                </thead>
                <tbody>
                  {(['basic_premium', 'levies_total', 'total_premium'] as const).map((key) => (
                    <tr key={key}>
                      <td>{key === 'basic_premium' ? 'Basic premium' : key === 'levies_total' ? 'Levies' : 'Total premium'}</td>
                      <td className="text-right tabular-nums">{formatMoney(view.pricing!.expiring_annual[key], view.pricing!.currency)}</td>
                      <td className="text-right tabular-nums">{formatMoney(view.pricing!.renewal_annual[key], view.pricing!.currency)}</td>
                    </tr>
                  ))}
                  {view.pricing.renewal_annual.commission !== undefined && (
                    <tr>
                      <td>Commission</td>
                      <td className="text-right tabular-nums">{formatMoney(view.pricing.expiring_annual.commission ?? null, view.pricing.currency)}</td>
                      <td className="text-right tabular-nums">{formatMoney(view.pricing.renewal_annual.commission ?? null, view.pricing.currency)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[13px] text-[var(--hz-text-muted)]">
              Difference {formatMoney(view.pricing.premium_difference, view.pricing.currency)}
              {view.pricing.movement_percent !== null && ` (${Number(view.pricing.movement_percent) > 0 ? '+' : ''}${view.pricing.movement_percent}%)`}.
            </p>
          </DetailGroup>
        ) : (
          <p className="text-[13px] text-[var(--hz-text-muted)]">Not priced yet.</p>
        )}

        {view.check.required && (
          <DetailGroup title="Checker" description="Why this renewal needs someone other than its maker to approve it.">
            <ul className="list-disc pl-5 text-sm text-[var(--hz-text-primary)]">
              {view.check.reasons.map((reason) => (
                <li key={reason}>{checkReasonText(reason)}</li>
              ))}
            </ul>
            {view.check.approved_at && <p className="mt-2 text-[13px] text-[var(--hz-text-muted)]">Approved {formatDateTime(view.check.approved_at)}.</p>}
          </DetailGroup>
        )}
      </div>

      {dialog === 'dates' && (
        <DatesDialog view={view} pending={commands.pending}
          onClose={() => setDialog(null)}
          onSave={async (body) => {
            if (!etag) return {};
            setFailure(null);
            setStale(false);
            const outcome = await commands.dates(view.id, body, etag);
            if (outcome.ok === true) {
              setDialog(null);
              setToast('Dates changed; price it again');
              return {};
            }
            if (outcome.kind === 'stale') setStale(true);
            const fields = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
            if (!Object.keys(fields).length && outcome.kind !== 'stale') setFailure({ error: outcome.error, title: 'The dates were not changed' });
            return fields;
          }}
        />
      )}
      {dialog === 'amend' && (
        <AmendDialog view={view} pending={commands.pending} onClose={() => setDialog(null)}
          onSave={async (body) => {
            if (!etag) return {};
            setFailure(null);
            setStale(false);
            const outcome = await commands.amend(view.id, body, etag);
            if (outcome.ok === true) {
              setDialog(null);
              setToast(body.renewal_type === 'AS_IS' ? 'Back to as is; price it again' : 'Amendments saved; price it again');
              return {};
            }
            if (outcome.kind === 'stale') setStale(true);
            const fields = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
            if (!Object.keys(fields).length && outcome.kind !== 'stale') setFailure({ error: outcome.error, title: 'The amendments were not saved' });
            return fields;
          }}
        />
      )}
      {dialog === 'offer' && (
        <OfferDialog pending={commands.pending} onClose={() => setDialog(null)}
          onOffer={async (validUntil) => fieldsOf(await act('offer', validUntil ? { valid_until: validUntil } : {}, 'Offered', 'The renewal was not offered'))} />
      )}
      {(dialog === 'decline' || dialog === 'withdraw') && (
        <ReasonDialog
          mode={dialog}
          pending={commands.pending}
          onClose={() => setDialog(null)}
          onConfirm={async (reason) =>
            fieldsOf(dialog === 'decline'
              ? await act('decline', { reason }, 'The customer declined', 'The answer was not recorded')
              : await act('cancel', { reason }, 'Withdrawn', 'The renewal was not withdrawn'))}
        />
      )}
    </DialogFrame>
  );
};

const fieldsOf = (outcome: boolean | { ok: false; kind: string; error: unknown }) =>
  typeof outcome === 'object' && outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};

/** What the renewal is waiting for, in words. */
const StateNotice: React.FC<{ view: RenewalDetail; waiting: boolean; needsCheck: boolean; canApprove: boolean }> = ({ view, waiting, needsCheck, canApprove }) => {
  const status = view.effective_status;
  if (status === 'PRICED' && needsCheck && waiting) {
    const roles = view.workflow?.waiting_on ?? [];
    return (
      <HorizonAlert banner tone="info" title="Waiting for approval">
        {roles.length ? `Waiting for: ${roles.join(', ')}.` : 'Waiting for an approver.'} The checker decides in My Work Queue; it can be offered once approved.
      </HorizonAlert>
    );
  }
  if (status === 'PRICED' && needsCheck) {
    return (
      <HorizonAlert banner tone="info" title="Needs a checker">
        {canApprove ? 'Approve it if you did not prepare it; someone who prepared it cannot.' : 'Someone with renewal approval who did not prepare it approves it, then it can be offered.'}
      </HorizonAlert>
    );
  }
  if (status === 'EXPIRED') {
    return (
      <HorizonAlert banner tone="warning" title="Offer expired">
        The offer was valid until {formatDate(view.offer_valid_until)} and the customer did not answer. Withdraw it and prepare it again.
      </HorizonAlert>
    );
  }
  if (status === 'ACCEPTED' && view.inception_date > localToday()) {
    return (
      <HorizonAlert banner tone="info" title={`Held until ${formatDate(view.inception_date)}`}>
        The renewal completes on or after that day; until then the current period stays open to endorsements, and an endorsement means
        preparing the renewal again.
      </HorizonAlert>
    );
  }
  return null;
};

const DatesDialog: React.FC<{
  view: RenewalDetail;
  pending: boolean;
  onClose: () => void;
  onSave: (body: { inception_date: string; expiry_date: string }) => Promise<Record<string, string>>;
}> = ({ view, pending, onClose, onSave }) => {
  const [inception, setInception] = useState(view.inception_date);
  const [expiry, setExpiry] = useState(view.expiry_date);
  const [fields, setFields] = useState<Record<string, string>>({});
  const local = expiry <= inception ? 'The new period must end after it starts.' : undefined;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (local) return;
    setFields(await onSave({ inception_date: inception, expiry_date: expiry }));
  };
  return (
    <DialogFrame titleId="renewal-dates-title" title="Change the dates" onClose={onClose} size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>Back</button>
          <button type="submit" form="renewal-dates-form" className="hz-button hz-button-primary" disabled={pending}>{pending ? 'Saving…' : 'Change dates'}</button>
        </>
      }>
      <p className="text-sm text-[var(--hz-text-primary)]">The renewal returns to draft: any price or approval lapses, and it is priced again.</p>
      <form id="renewal-dates-form" noValidate onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="renewal-dates-inception" className={label}>New period starts</label>
          <input id="renewal-dates-inception" type="date" value={inception} onChange={(event) => setInception(event.target.value)}
            aria-invalid={!!fields.inception_date} className={field(!!fields.inception_date)} />
          <FieldError message={fields.inception_date} />
        </div>
        <div>
          <label htmlFor="renewal-dates-expiry" className={label}>New period ends</label>
          <input id="renewal-dates-expiry" type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)}
            aria-invalid={!!(local ?? fields.expiry_date)} className={field(!!(local ?? fields.expiry_date))} />
          <FieldError message={local ?? fields.expiry_date} />
        </div>
      </form>
    </DialogFrame>
  );
};

const OfferDialog: React.FC<{ pending: boolean; onClose: () => void; onOffer: (validUntil: string) => Promise<Record<string, string>> }> = ({ pending, onClose, onOffer }) => {
  const [validUntil, setValidUntil] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  return (
    <DialogFrame titleId="renewal-offer-title" title="Offer the renewal" onClose={onClose} size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>Back</button>
          <button type="submit" form="renewal-offer-form" className="hz-button hz-button-primary" disabled={pending}>{pending ? 'Offering…' : 'Offer'}</button>
        </>
      }>
      <form id="renewal-offer-form" noValidate onSubmit={(event) => { event.preventDefault(); void onOffer(validUntil).then(setFields); }} className="flex flex-col gap-2">
        <label htmlFor="renewal-offer-valid" className={label}>Valid until</label>
        <input id="renewal-offer-valid" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)}
          aria-invalid={!!fields.valid_until} className={field(!!fields.valid_until)} />
        <p className="text-[13px] text-[var(--hz-text-muted)]">Empty: the tenant's standard validity. The server limits how far ahead it may be.</p>
        <FieldError message={fields.valid_until} />
      </form>
    </DialogFrame>
  );
};

const ReasonDialog: React.FC<{ mode: 'decline' | 'withdraw'; pending: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<Record<string, string>> }> = ({
  mode, pending, onClose, onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const error = (attempted && !reason.trim() ? 'Give a reason.' : undefined) ?? fields.reason;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (!reason.trim()) return;
    setFields(await onConfirm(reason.trim()));
  };
  return (
    <DialogFrame titleId="renewal-reason-title" title={mode === 'decline' ? 'The customer declined' : 'Withdraw the renewal'} onClose={onClose} size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>Back</button>
          <button type="submit" form="renewal-reason-form" className="hz-button hz-button-primary" disabled={pending}>
            {pending ? 'Saving…' : mode === 'decline' ? 'Record the decline' : 'Withdraw'}
          </button>
        </>
      }>
      <form id="renewal-reason-form" noValidate onSubmit={(event) => void submit(event)}>
        <label htmlFor="renewal-reason" className={label}>Reason <span className="text-[var(--hz-danger)]">*</span></label>
        <textarea id="renewal-reason" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)}
          aria-invalid={!!error} className={`hz-field w-full px-3 py-2 text-sm ${error ? 'hz-field-invalid' : ''}`} />
        <FieldError message={error} />
      </form>
    </DialogFrame>
  );
};

const AmendDialog: React.FC<{
  view: RenewalDetail;
  pending: boolean;
  onClose: () => void;
  onSave: (body: { renewal_type: 'AS_IS' | 'AMENDED'; changes: RenewalChanges }) => Promise<Record<string, string>>;
}> = ({ view, pending, onClose, onSave }) => {
  const policy = usePolicy(view.policy.id);
  const tariff = useRenewalTariff(policy.data?.view.product.id ?? '', view.inception_date);
  const [terms, setTerms] = useState<AmendmentState | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  if (policy.isPending) {
    return (
      <DialogFrame titleId="renewal-amend-title" title="Amendments" onClose={onClose} size="lg"
        footer={<button type="button" className="hz-button hz-button-secondary" onClick={onClose}>Back</button>}>
        <HorizonLoader tip="Loading the policy..." />
      </DialogFrame>
    );
  }
  if (policy.isError) {
    return (
      <DialogFrame titleId="renewal-amend-title" title="Amendments" onClose={onClose} size="lg"
        footer={<button type="button" className="hz-button hz-button-secondary" onClick={onClose}>Back</button>}>
        <ApiErrorAlert error={policy.error} title="The policy could not be loaded" />
      </DialogFrame>
    );
  }
  const detail: PolicyDetail = policy.data.view;
  const state = terms ?? initialAmendment(detail, view.requested_changes ?? {});
  const declared = tariff.document.data?.content.rating_factors ?? [];
  const changes = changesOf(state, detail, declared);
  const nothing = Object.keys(changes).length === 0;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (nothing || Object.keys(amendmentErrors(state, declared)).length) return;
    setFields(await onSave({ renewal_type: 'AMENDED', changes }));
  };
  return (
    <DialogFrame titleId="renewal-amend-title" title="Amendments" onClose={onClose} size="lg"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>Back</button>
          {view.renewal_type === 'AMENDED' && (
            <button type="button" className="hz-button hz-button-secondary" disabled={pending}
              onClick={() => void onSave({ renewal_type: 'AS_IS', changes: {} }).then(setFields)}>
              Back to as is
            </button>
          )}
          <button type="submit" form="renewal-amend-form" className="hz-button hz-button-primary" disabled={pending}>{pending ? 'Saving…' : 'Save amendments'}</button>
        </>
      }>
      <p className="text-sm text-[var(--hz-text-primary)]">The renewal returns to draft: any price or approval lapses, and it is priced again.</p>
      <form id="renewal-amend-form" noValidate onSubmit={(event) => void save(event)} className="flex flex-col gap-4">
        <AmendmentFields policy={detail} day={view.inception_date} state={state} onChange={setTerms} attempted={attempted} serverFields={fields} />
        {attempted && nothing && <FieldError message="Change at least one thing, or go back to as is." />}
        {fields.changes && <FieldError message={fields.changes} />}
      </form>
    </DialogFrame>
  );
};

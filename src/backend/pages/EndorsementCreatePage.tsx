/**
 * Prepare an endorsement (FI1-D; every type since ENDORSEMENT-TYPES): what changes, with the
 * effective date and the reason.
 *
 * - **Change a limit**: the benefit and its new limit.
 * - **Change the sum insured**: the new sum insured.
 * - **Change the cover**: rating details and optional cover, from the tariff the policy was priced on
 *   (the amendment fields RS-B shares).
 * - **Change the geographical limit**: the new limit.
 * - **Change the policy period**: the new expiry date.
 * - **Cancel the policy**: no change to give; cover ends the day before the effective date. Offered
 *   only with `policies.policy.cancel`.
 *
 * Adding or removing a risk item is never offered: the server refuses it (items cannot be priced yet).
 * Every type re-rates on the server, and whether it needs a checker is the server's rule.
 *
 * The endorsement is built on the policy's **latest** version, so the benefits offered are that
 * version's (from `/versions`), not a list kept in the client. The policy's ETag from the response
 * header is sent as `If-Match`; after a 412 the policy is reloaded, what was typed is kept, and the
 * resubmission carries the new ETag with the same key (the body is unchanged).
 *
 * It opens as an expandable dialog over the policy's Endorsements tab, at its own address, so
 * links, refresh and browser Back still work; closing it returns to the policy.
 *
 * The same form edits a draft (`mode="edit"`, `PATCH /endorsements/{id}` with the endorsement's
 * ETag), and prepares one again from a withdrawn or declined endorsement (its change and reason
 * arrive as `prefill` in the router state; a new endorsement is created, the old one is unchanged).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowRight, FilePen } from 'lucide-react';
import { ChangeCallout, DetailDivider, DetailGrid, DetailGroup, FieldError, HorizonAlert, HorizonLoader } from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { NOT_FOUND_TEXT, STALE_TEXT } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { NO_ETAG_TEXT, useEndorsementCommands } from '../endorsements/useEndorsementCommands';
import { parseAmount } from '../endorsements/amount';
import { useEndorsement } from '../endorsements/queries';
import { formatDate } from '../policies/format';
import { usePolicy, usePolicyVersions } from '../policies/queries';
import { hasPermission, useMe } from '../../lib/auth/me';
import { POLICY_CANCEL } from '../permissions';
import { AmendmentFields, AmendmentState, changesOf, initialAmendment, useRenewalTariff } from '../renewals/AmendmentFields';
import type { EndorsementBody, EndorsementKind } from '../endorsements/types';
import { endorsementHref, policyHref, useRouteRefs } from '../policies/refs';
import { formatMoney, requiredActionText } from '../workflow/format';

export const REASON_MAX = 500;


/** The backend's field names this form shows errors on (`changes` is the change as a whole). */
const FORM_FIELDS = ['benefit', 'changes', 'limit_amount', 'effective_date', 'reason', 'sum_insured', 'factors', 'add_benefits',
  'remove_benefits', 'geographical_limit', 'expiry_date'];

export const KIND_LABEL: Record<EndorsementKind, string> = {
  CHANGE_LIMIT: 'Change a limit',
  CHANGE_SUM_INSURED: 'Change the sum insured',
  CHANGE_COVER: 'Change the cover',
  CHANGE_GEOGRAPHICAL_LIMIT: 'Change the geographical limit',
  CHANGE_POLICY_PERIOD: 'Change the policy period',
  CANCELLATION: 'Cancel the policy',
};
const KINDS = Object.keys(KIND_LABEL) as EndorsementKind[];
export const isKind = (value: unknown): value is EndorsementKind => typeof value === 'string' && KINDS.includes(value as EndorsementKind);

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

type Notice = { text: string; reference: string | null } | null;

/** What the form starts with when an endorsement is prepared again, or a draft edited. */
export interface EndorsementPrefill {
  benefit: string;
  limit: string;
  reason: string;
  effectiveDate?: string;
}

const prefillOf = (state: unknown): EndorsementPrefill | null => {
  const prefill = (state as { prefill?: Partial<EndorsementPrefill> } | null)?.prefill;
  return prefill && typeof prefill.benefit === 'string' && typeof prefill.limit === 'string' && typeof prefill.reason === 'string'
    ? { benefit: prefill.benefit, limit: prefill.limit, reason: prefill.reason }
    : null;
};

/** The router state without the prefill, so it does not travel on. */
const withoutPrefill = (state: unknown) => {
  if (!state || typeof state !== 'object') return state;
  const { prefill: _prefill, ...rest } = state as Record<string, unknown>;
  return rest;
};

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;

const FORM_ID = 'endorsement-create-form';
const TITLE_ID = 'endorsement-create-title';

export const EndorsementCreatePage: React.FC<{ mode?: 'create' | 'edit' }> = ({ mode = 'create' }) => {
  const editing = mode === 'edit';
  const { policyId, policyRef, endorsementId } = useRouteRefs();
  const navigate = useNavigate();
  // Carried on (without a prefill), so the policy's Back still returns to the originating list (FI1-D-R1).
  const location = useLocation();
  const state = withoutPrefill(location.state);
  const policy = usePolicy(policyId);
  const versions = usePolicyVersions(policyId, policy.isSuccess);
  const existing = useEndorsement(endorsementId, editing);
  const { create, update, pending } = useEndorsementCommands();

  const again = editing ? null : prefillOf(location.state);
  const canCancel = hasPermission(useMe().data, POLICY_CANCEL);
  const [kind, setKind] = useState<EndorsementKind>('CHANGE_LIMIT');
  const [sumInsured, setSumInsured] = useState('');
  const [geo, setGeo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cover, setCover] = useState<AmendmentState | null>(null);
  const [benefit, setBenefit] = useState(again?.benefit ?? '');
  const [limit, setLimit] = useState(again?.limit ?? '');
  const [effectiveDate, setEffectiveDate] = useState(todayIso);
  const [reason, setReason] = useState(again?.reason ?? '');
  const [seeded, setSeeded] = useState(!editing);

  // A draft being edited starts from what it holds now.
  useEffect(() => {
    if (seeded || !existing.data) return;
    const { view } = existing.data;
    const changes = view.requested_changes as Record<string, unknown>;
    if (isKind(view.endorsement_type)) setKind(view.endorsement_type);
    setBenefit(typeof changes.benefit === 'string' ? changes.benefit.toUpperCase() : '');
    setLimit(typeof changes.limit_amount === 'string' ? changes.limit_amount : '');
    setSumInsured(typeof changes.sum_insured === 'string' ? changes.sum_insured : '');
    setGeo(typeof changes.geographical_limit === 'string' ? changes.geographical_limit : '');
    setExpiry(typeof changes.expiry_date === 'string' ? changes.expiry_date : '');
    setEffectiveDate(view.effective_date);
    setReason(view.reason);
    setSeeded(true);
  }, [existing.data, seeded]);
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [serverFieldsReference, setServerFieldsReference] = useState<string | null>(null);
  const [failure, setFailure] = useState<unknown>(null);

  const latest = useMemo(() => {
    const rows = versions.data?.results ?? [];
    return rows.reduce<(typeof rows)[number] | null>((top, row) => (!top || row.version_no > top.version_no ? row : top), null);
  }, [versions.data]);
  // Change the cover re-rates on the tariff the latest version was priced on (E1-D5).
  const tariff = useRenewalTariff(policy.data?.view.product.id ?? '', latest?.annual_premium.rating_date ?? '');

  // Back to the policy as the address named it (by number, or by ID for an old link); an edit goes back to the draft.
  const back = () =>
    editing && existing.data
      ? navigate(endorsementHref(existing.data.view.policy.policy_no, existing.data.view.endorsement_no), { state })
      : navigate(`${policyHref(policyRef)}?tab=endorsements`, { state });

  const cancel = (
    <button type="button" className="hz-button hz-button-secondary" onClick={back}>
      Cancel
    </button>
  );
  const frame = {
    titleId: TITLE_ID,
    title: editing ? 'Edit endorsement' : 'New endorsement',
    onClose: back,
    closeLabel: editing ? 'Back to the endorsement' : 'Back to the policy',
    size: 'lg' as const,
  };

  if (policy.isPending || (policy.isSuccess && versions.isPending) || (editing && (existing.isPending || !seeded))) {
    if (editing && existing.isError) {
      return (
        <DialogFrame {...frame} icon={<FilePen className="h-4 w-4" />} footer={cancel}>
          <ApiErrorAlert error={existing.error} title="The endorsement could not be loaded" />
        </DialogFrame>
      );
    }
    return (
      <DialogFrame {...frame} icon={<FilePen className="h-4 w-4" />} footer={cancel}>
        <HorizonLoader tip="Loading the policy..." />
      </DialogFrame>
    );
  }
  const loadError = policy.error ?? versions.error;
  if (loadError || !policy.data || !latest) {
    const missing = loadError instanceof ApiError && loadError.status === 404;
    return (
      <DialogFrame {...frame} icon={<FilePen className="h-4 w-4" />} footer={cancel}>
        {missing ? (
          <HorizonAlert tone="warning" title={NOT_FOUND_TEXT}>
            The policy does not exist, or it is outside the branches you can see.
            <ErrorReference reference={referenceOf(loadError)} />
          </HorizonAlert>
        ) : (
          <ApiErrorAlert error={loadError} title="The policy could not be loaded" />
        )}
      </DialogFrame>
    );
  }

  const { view, etag } = policy.data;
  const currency = view.currency;
  const benefits = latest.cover?.benefits ?? [];
  const chosen = benefits.find((item) => item.code === benefit);
  // RUP1 F-8: "55,000" is accepted; the server receives "55000".
  const amount = parseAmount(limit);

  const sum = parseAmount(sumInsured);
  // The cover fields start from the latest version's terms; only what differs is sent.
  const policyForCover = { ...view, current_version: latest };
  const coverState = cover ?? initialAmendment(policyForCover, kind === 'CHANGE_COVER' && editing && existing.data ? (existing.data.view.requested_changes as never) : {});
  const coverChanges = changesOf(coverState, policyForCover, tariff.document.data?.content.rating_factors ?? []);
  const coverPart = { factors: coverChanges.factors, add_benefits: coverChanges.add_benefits, remove_benefits: coverChanges.remove_benefits };
  const coverChanged = Object.values(coverPart).some(Boolean);

  const clientErrors: Record<string, string | undefined> = {
    benefit: kind !== 'CHANGE_LIMIT' || chosen ? undefined : 'Choose the benefit whose limit changes.',
    limit_amount: kind === 'CHANGE_LIMIT' ? amount.error ?? undefined : undefined,
    sum_insured: kind === 'CHANGE_SUM_INSURED' ? (sumInsured.trim() ? sum.error ?? undefined : 'Give the new sum insured.') : undefined,
    changes: kind === 'CHANGE_COVER' && !coverChanged ? 'Change a rating detail or an optional cover.' : undefined,
    geographical_limit: kind === 'CHANGE_GEOGRAPHICAL_LIMIT' && !geo.trim() ? 'Give the new geographical limit.' : undefined,
    expiry_date: kind === 'CHANGE_POLICY_PERIOD' && !expiry ? 'Give the new expiry date.' : undefined,
    effective_date: effectiveDate ? undefined : 'Give the date the change takes effect.',
    reason: reason.trim() ? undefined : 'Give the reason for the change.',
  };
  const errorFor = (name: string, server: string[] = [name]) =>
    (attempted ? clientErrors[name] : undefined) ?? server.map((key) => serverFields[key]).find(Boolean);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    setFailure(null);
    if (Object.values(clientErrors).some(Boolean)) return;
    const ifMatch = editing ? existing.data?.etag : etag;
    if (!ifMatch) {
      setNotice({ text: NO_ETAG_TEXT, reference: null });
      return;
    }
    setNotice(null);
    setServerFields({});
    setServerFieldsReference(null);
    const changes: Record<string, unknown> =
      kind === 'CHANGE_LIMIT' ? { benefit, limit_amount: amount.value ?? limit.trim() }
        : kind === 'CHANGE_SUM_INSURED' ? { sum_insured: sum.value ?? sumInsured.trim() }
          : kind === 'CHANGE_COVER' ? Object.fromEntries(Object.entries(coverPart).filter(([, value]) => value !== undefined))
            : kind === 'CHANGE_GEOGRAPHICAL_LIMIT' ? { geographical_limit: geo.trim() }
              : kind === 'CHANGE_POLICY_PERIOD' ? { expiry_date: expiry }
                : {};
    const body: EndorsementBody = {
      endorsement_type: kind,
      effective_date: effectiveDate,
      reason: reason.trim(),
      changes,
    };
    const outcome =
      editing && existing.data
        ? await update(existing.data.view.id, { effective_date: effectiveDate, reason: reason.trim(), changes }, ifMatch)
        : await create(policyId, body, ifMatch);
    if (outcome.ok === true) {
      navigate(endorsementHref(view.policy_no, outcome.view.endorsement_no), {
        replace: true,
        state,
      });
      return;
    }
    const reference = referenceOf(outcome.error);
    if (outcome.kind === 'stale') {
      setNotice({ text: STALE_TEXT, reference });
      return;
    }
    const fields = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    // Shown on the form only when it names a field the form has; anything else is shown as a whole.
    if (Object.keys(fields).some((name) => FORM_FIELDS.includes(name))) {
      setServerFields(fields);
      setServerFieldsReference(reference);
      return;
    }
    setFailure(outcome.error);
  };

  const requiredAction =
    failure instanceof ApiError && typeof failure.details.required_action === 'string' ? failure.details.required_action : null;

  const typed = Boolean(benefit || limit.trim() || reason.trim() || sumInsured.trim() || geo.trim() || expiry);
  const preview =
    kind === 'CHANGE_LIMIT' && chosen && amount.value !== null
      ? {
          from: chosen.limit_amount !== null ? formatMoney(chosen.limit_amount, currency) : 'No limit stated',
          to: formatMoney(amount.value, currency),
        }
      : null;

  return (
    <DialogFrame
      titleId={TITLE_ID}
      title={editing && existing.data ? `Edit ${existing.data.view.endorsement_no}` : again ? 'Prepare again' : 'New endorsement'}
      subtitle={`${KIND_LABEL[kind]} · ${view.policy_no} · prepared on version ${latest.version_no}`}
      onClose={back}
      closeLabel={frame.closeLabel}
      dismissOnBackdrop={!typed}
      size="lg"
      expandable
      icon={<FilePen className="h-4 w-4" />}
      footer={
        <>
          <p className="mr-auto hidden text-[13px] text-[var(--hz-text-muted)] sm:block">
            {editing
              ? 'Saving keeps it a draft; submit it from the endorsement.'
              : 'Creating saves it as a draft; you submit it on the next screen.'}
          </p>
          <button type="button" className="hz-button hz-button-secondary" onClick={back} disabled={pending}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="hz-button hz-button-primary" disabled={pending}>
            {editing ? (pending ? 'Saving…' : 'Save changes') : pending ? 'Creating…' : 'Create endorsement'}
          </button>
        </>
      }
    >
      <DetailGroup title="Policy">
        <DetailGrid
          columns={2}
          items={[
            { label: 'Policy', value: view.policy_no },
            { label: 'Customer', value: view.customer.display_name },
            { label: 'Version', value: `Version ${latest.version_no}` },
            { label: 'Period', value: `${formatDate(latest.inception_date)} – ${formatDate(latest.expiry_date)}` },
          ]}
        />
      </DetailGroup>
      <DetailDivider />

      {notice && (
        <div role="status">
          <HorizonAlert tone="warning">
            {notice.text}
            <ErrorReference reference={notice.reference} />
          </HorizonAlert>
        </div>
      )}
      {failure !== null && (
        <div>
          <ApiErrorAlert error={failure} title="The endorsement was not created" />
          {requiredAction && (
            <p className="mt-1 text-[13px] text-[var(--hz-text-secondary)]">Required action: {requiredActionText(requiredAction)}</p>
          )}
        </div>
      )}

      <h2 className="text-base font-medium leading-tight text-[var(--hz-text-primary)]">Change</h2>
      <form id={FORM_ID} noValidate onSubmit={(event) => void onSubmit(event)} className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="endorsement-kind" className={label}>What changes</label>
          <select id="endorsement-kind" value={kind} disabled={editing || !!again} onChange={(event) => setKind(event.target.value as EndorsementKind)} className={field(false)}>
            {KINDS.filter((item) => item !== 'CANCELLATION' || canCancel || kind === 'CANCELLATION').map((item) => (
              <option key={item} value={item}>{KIND_LABEL[item]}</option>
            ))}
          </select>
        </div>
        {kind === 'CHANGE_SUM_INSURED' && (
          <div className="sm:col-span-2">
            <label htmlFor="endorsement-sum-insured" className={label}>New sum insured ({currency}) <span className="text-[var(--hz-danger)]">*</span></label>
            <input id="endorsement-sum-insured" inputMode="decimal" value={sumInsured} onChange={(event) => setSumInsured(event.target.value)}
              aria-invalid={!!errorFor('sum_insured')} className={field(!!errorFor('sum_insured'))} />
            <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">Now {latest.sum_insured ? formatMoney(latest.sum_insured, currency) : 'not stated'}.</p>
            <FieldError message={errorFor('sum_insured')} />
          </div>
        )}
        {kind === 'CHANGE_COVER' && (
          <div className="sm:col-span-2">
            <AmendmentFields policy={policyForCover} day={latest.annual_premium.rating_date} state={coverState} onChange={setCover} attempted={attempted}
              serverFields={serverFields} sections={['factors', 'optional']}
              intro={(no) => `Against product version ${no}, the tariff this policy was priced on. Only what differs is sent; the change is re-rated.`} />
            <FieldError message={errorFor('changes')} />
          </div>
        )}
        {kind === 'CHANGE_GEOGRAPHICAL_LIMIT' && (
          <div className="sm:col-span-2">
            <label htmlFor="endorsement-geo" className={label}>New geographical limit <span className="text-[var(--hz-danger)]">*</span></label>
            <input id="endorsement-geo" value={geo} maxLength={255} onChange={(event) => setGeo(event.target.value)}
              aria-invalid={!!errorFor('geographical_limit')} className={field(!!errorFor('geographical_limit'))} />
            <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">Now {String(latest.terms.geographical_limit ?? '') || 'not stated'}.</p>
            <FieldError message={errorFor('geographical_limit')} />
          </div>
        )}
        {kind === 'CHANGE_POLICY_PERIOD' && (
          <div className="sm:col-span-2">
            <label htmlFor="endorsement-expiry" className={label}>New expiry date <span className="text-[var(--hz-danger)]">*</span></label>
            <input id="endorsement-expiry" type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)}
              aria-invalid={!!errorFor('expiry_date')} className={field(!!errorFor('expiry_date'))} />
            <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">Now {formatDate(latest.expiry_date)}. The premium is re-rated for the changed period.</p>
            <FieldError message={errorFor('expiry_date')} />
          </div>
        )}
        {kind === 'CANCELLATION' && (
          <div className="sm:col-span-2" role="note">
            <HorizonAlert tone="warning" title="The policy will be cancelled">
              Cover ends the day before the effective date. The refund or charge is worked out by the server, and a checker approves it.
            </HorizonAlert>
          </div>
        )}
        {kind === 'CHANGE_LIMIT' && (
        <>
        <div>
          <label htmlFor="endorsement-benefit" className={label}>
            Benefit <span className="text-[var(--hz-danger)]">*</span>
          </label>
          <select
            id="endorsement-benefit"
            value={benefit}
            onChange={(event) => setBenefit(event.target.value)}
            aria-invalid={!!errorFor('benefit', ['benefit', 'changes'])}
            className={field(!!errorFor('benefit', ['benefit', 'changes']))}
          >
            <option value="">Select a benefit…</option>
            {benefits.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
          {chosen && (
            <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">
              Current limit:{' '}
              {chosen.limit_amount !== null ? formatMoney(chosen.limit_amount, currency) : 'no limit stated'}
              {chosen.limit_description ? ` (${chosen.limit_description})` : ''}
            </p>
          )}
          <FieldError message={errorFor('benefit', ['benefit', 'changes'])} />
        </div>
        <div>
          <label htmlFor="endorsement-limit" className={label}>
            New limit ({currency}) <span className="text-[var(--hz-danger)]">*</span>
          </label>
          <input
            id="endorsement-limit"
            inputMode="decimal"
            placeholder="e.g. 100,000"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            aria-invalid={!!errorFor('limit_amount')}
            className={field(!!errorFor('limit_amount'))}
          />
          <FieldError message={errorFor('limit_amount')} />
        </div>
        </>
        )}
        <div>
          <label htmlFor="endorsement-date" className={label}>
            Effective from <span className="text-[var(--hz-danger)]">*</span>
          </label>
          <input
            id="endorsement-date"
            type="date"
            value={effectiveDate}
            onChange={(event) => setEffectiveDate(event.target.value)}
            aria-invalid={!!errorFor('effective_date')}
            className={field(!!errorFor('effective_date'))}
          />
          <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">Within the period, up to {formatDate(latest.expiry_date)}.</p>
          <FieldError message={errorFor('effective_date')} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="endorsement-reason" className={label}>
            Reason <span className="text-[var(--hz-danger)]">*</span>
          </label>
          <textarea
            id="endorsement-reason"
            rows={3}
            maxLength={REASON_MAX}
            value={reason}
            placeholder="Why the customer wants this change"
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={!!errorFor('reason')}
            className={`${field(!!errorFor('reason'))} h-auto py-2`}
          />
          <div className="mt-1 flex justify-between gap-2">
            <FieldError message={errorFor('reason')} />
            <span className="ml-auto text-[13px] tabular-nums text-[var(--hz-text-muted)]">
              {reason.length}/{REASON_MAX}
            </span>
          </div>
        </div>
        {Object.keys(serverFields).length > 0 && (
          <div className="sm:col-span-2">
            <ErrorReference reference={serverFieldsReference} />
          </div>
        )}
      </form>

      <ChangeCallout
        aria-label="Preview of the change"
        label="What the checker will see"
        change={
          preview && chosen ? (
            <span className="flex flex-wrap items-center gap-2">
              <span>{chosen.name}:</span>
              <span>{preview.from}</span>
              <ArrowRight className="h-4 w-4 text-[var(--hz-text-muted)]" aria-label="to" />
              <span>{preview.to}</span>
            </span>
          ) : undefined
        }
      >
        {kind === 'CHANGE_LIMIT' && !(preview && chosen) && (
          <p className="text-[13px] text-[var(--hz-text-muted)]">Choose a benefit and give the new limit to see the change.</p>
        )}
        {kind !== 'CHANGE_LIMIT' && (
          <p className="text-[13px] text-[var(--hz-text-muted)]">{KIND_LABEL[kind]}. The premium change is worked out by the server when it is created.</p>
        )}
      </ChangeCallout>
    </DialogFrame>
  );
};

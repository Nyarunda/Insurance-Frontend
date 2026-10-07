/**
 * The quotation record (NB1-B): `GET /quotations/{id}` with its ETag. Every command sends that ETag.
 *
 * - Risk (NB-D3): the rating factors come entirely from the product's published version in force
 *   (`DECIMAL` a number with its bounds and unit, `CHOICE` the server's choices, `BOOLEAN` yes/no);
 *   risk identifiers are the platform's fixed types. `risk.details` is not shown; whatever the
 *   revision already holds is sent back unchanged. Saving the risk clears any pricing (server rule).
 * - Pricing (NB-D4): the stored snapshot as returned, never calculated here; commission only when
 *   the server includes it (products.commission.view).
 * - Issue (NB-D6): when the risk is on other live quotations, the visible ones and the hidden count
 *   are shown, and issuing needs an acknowledgement with a reason (a changed body, a new key).
 * - View offer shows the frozen `/offer` payload of an issued revision (its risk, pricing and
 *   required documents as issued), never the current revision (NB1-B-R1, B1).
 * - The offer: accept or decline (with a reason), revise, cancel (with a reason). A revision of an
 *   expired offer needs a checker: submit it; the check is made in My Work Queue when the tenant
 *   governs it, or here by a holder of quotations.quotation.check otherwise (never its preparer).
 * Actions show only to users whose permissions could use them; the server decides every one.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Calculator, ClipboardPlus, FileText, Plus, Send, Trash2 } from 'lucide-react';
import {
  DetailDivider,
  DetailGrid,
  DetailGroup,
  EmptyState,
  FieldError,
  HorizonAlert,
  HorizonLoader,
  HorizonPage,
  HorizonPageContent,
  HorizonPageTitle,
  HorizonToast,
  OutlineTag,
  RecordColumns,
  RecordHeader,
  SideSection,
  StatusBadge,
  SummaryList,
} from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { NOT_FOUND_TEXT, STALE_TEXT } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { usePermission } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { customerHref } from '../customers/refs';
import { PROPOSAL_CREATE, PROPOSAL_VIEW, QUOTATION_CANCEL, QUOTATION_CHECK, QUOTATION_DECIDE, QUOTATION_EDIT, QUOTATION_ISSUE } from '../permissions';
import { formatDate } from '../policies/format';
import { QUOTATION_STATUS_LABEL, QUOTATION_TONE, RISK_IDENTIFIER_TYPES, riskIdentifierLabel } from '../quotations/format';
import { useOffer, useProductDetail, useProductVersion, useQuotation, versionInForce } from '../quotations/queries';
import { parseFactorDecimal } from '../quotations/decimal';
import { useQuotationId } from '../quotations/refs';
import type { DuplicateAlerts, Pricing, QuotationDetail, RatingFactor, RiskIdentifier } from '../quotations/types';
import { QuotationOutcome, useQuotationCommands } from '../quotations/useQuotationCommands';
import { formatDateTime, formatMoney, humanize } from '../workflow/format';
import { quotationsFrom } from './QuotationsPage';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;

type Dialog = 'issue' | 'decline' | 'cancel' | 'validity' | { offer: number } | null;

export const QuotationPage: React.FC = () => {
  const quotationId = useQuotationId();
  const navigate = useNavigate();
  const location = useLocation();
  const quotation = useQuotation(quotationId);
  const commands = useQuotationCommands();
  const canEdit = usePermission(QUOTATION_EDIT);
  const canIssue = usePermission(QUOTATION_ISSUE);
  const canDecide = usePermission(QUOTATION_DECIDE);
  const canCancel = usePermission(QUOTATION_CANCEL);
  const canCheck = usePermission(QUOTATION_CHECK);
  const canCreateProposal = usePermission(PROPOSAL_CREATE);
  const canSeeProposals = usePermission(PROPOSAL_VIEW);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ error: unknown; title: string } | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const back = () => navigate(quotationsFrom(location.state));

  if (quotation.isPending) return <HorizonLoader tip="Loading the quotation..." />;
  if (quotation.isError) {
    const missing = quotation.error instanceof ApiError && quotation.error.status === 404;
    return (
      <HorizonPage id="quotation-record">
        <HorizonPageTitle title="Quotation" onBack={back} backLabel="Back to Quotations" />
        <HorizonPageContent className="p-4">
          {missing ? (
            <HorizonAlert tone="warning" title={NOT_FOUND_TEXT}>
              It does not exist, or it is outside the branches you can see.
              <ErrorReference reference={referenceOf(quotation.error)} />
            </HorizonAlert>
          ) : (
            <ApiErrorAlert error={quotation.error} title="The quotation could not be loaded" />
          )}
        </HorizonPageContent>
      </HorizonPage>
    );
  }

  const { view, etag } = quotation.data;
  const revision = view.current_revision;
  const status = view.effective_status;
  const draft = view.status === 'DRAFT';
  const awaitingWorkflow = revision.workflow?.status === 'PENDING_APPROVAL';
  const priced = !!revision.pricing;
  const checkBlocks = revision.check.required && revision.check.status !== 'APPROVED';

  /** One command from the header: a toast on success; a 412 or refusal shown above the record. */
  const act = async (title: string, done: string, command: (etag: string) => Promise<QuotationOutcome>) => {
    if (!etag) return;
    setFailure(null);
    setStale(false);
    const outcome = await command(etag);
    if (outcome.ok === true) {
      setToast(`${done}: ${view.quotation_no}`);
      return;
    }
    if (outcome.kind === 'stale') setStale(true);
    else setFailure({ error: outcome.error, title });
  };

  const actions: React.ReactNode[] = [];
  if (draft && !awaitingWorkflow) {
    if (canEdit && revision.check.required && revision.check.status === 'NONE' && priced) {
      actions.push(
        <button key="submit" type="button" className="hz-button hz-button-secondary" disabled={commands.pending}
          onClick={() => void act('The revision was not submitted', 'Sent for a check', (e) => commands.submitRevision(view.id, e))}>
          <Send className="h-3.5 w-3.5" />
          Submit for a check
        </button>,
      );
    }
    if (canCheck && revision.check.status === 'PENDING' && !revision.workflow) {
      actions.push(
        <button key="approve" type="button" className="hz-button hz-button-secondary" disabled={commands.pending}
          onClick={() => void act('The revision was not approved', 'Revision approved', (e) => commands.approveRevision(view.id, e))}>
          Approve revision
        </button>,
      );
    }
    if (canIssue && priced && !checkBlocks) {
      actions.push(
        <button key="issue" type="button" className="hz-button hz-button-primary" onClick={() => setDialog('issue')}>
          Issue offer
        </button>,
      );
    }
  }
  if (status === 'ISSUED' && canDecide) {
    actions.push(
      <button key="decline" type="button" className="hz-button hz-button-secondary" onClick={() => setDialog('decline')}>
        Customer declined
      </button>,
      <button key="accept" type="button" className="hz-button hz-button-primary" disabled={commands.pending}
        onClick={() => void act('The acceptance was not recorded', 'Accepted', (e) => commands.accept(view.id, e))}>
        Customer accepted
      </button>,
    );
  }
  if ((status === 'ISSUED' || status === 'EXPIRED') && canEdit) {
    actions.push(
      <button key="revise" type="button" className="hz-button hz-button-secondary" disabled={commands.pending}
        onClick={() => void act('The quotation was not revised', 'New revision', (e) => commands.revise(view.id, e))}>
        Revise
      </button>,
    );
  }
  if (view.status === 'ACCEPTED' && canCreateProposal && canSeeProposals) {
    actions.push(
      <button key="propose" type="button" className="hz-button hz-button-primary"
        onClick={() => navigate('/proposals/list/new', { state: { quotation: { id: view.id, quotation_no: view.quotation_no, customer: view.customer.display_name, product: view.product.name } } })}>
        <ClipboardPlus className="h-3.5 w-3.5" />
        Create proposal
      </button>,
    );
  }
  if ((view.status === 'DRAFT' || view.status === 'ISSUED') && canCancel) {
    actions.push(
      <button key="cancel" type="button" className="hz-button hz-button-secondary" onClick={() => setDialog('cancel')}>
        Cancel quotation
      </button>,
    );
  }

  return (
    <HorizonPage id="quotation-record" className="flex flex-col gap-4 !space-y-0">
      <HorizonToast message={toast} />
      <RecordHeader
        icon={FileText}
        title={view.quotation_no}
        subtitle={`${view.customer.display_name} · ${view.product.name}`}
        badges={
          <>
            <StatusBadge square label={QUOTATION_STATUS_LABEL[status] ?? humanize(status)} tone={QUOTATION_TONE[status] ?? 'neutral'} />
            <OutlineTag>{view.insurer.name}</OutlineTag>
            <OutlineTag>{view.branch.name}</OutlineTag>
            <OutlineTag>Revision {revision.revision_no}</OutlineTag>
          </>
        }
        actions={
          <>
            {actions.length > 0 && (
              <div role="group" aria-label="Quotation actions" className="flex flex-wrap items-center gap-2">
                {actions}
              </div>
            )}
            <button type="button" className="hz-button hz-button-secondary" onClick={back} aria-label="Back to Quotations" title="Back to Quotations">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </>
        }
      />
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure && <ApiErrorAlert error={failure.error} title={failure.title} />}
      <StateNotice view={view} />

      <div className="hz-record-body">
        <RecordColumns
          main={
            <div className="flex flex-col">
              <RiskSection view={view} etag={etag} editable={draft && !awaitingWorkflow && canEdit} onSaved={() => setToast(`Risk saved: ${view.quotation_no}`)} />
              <DetailDivider />
              <DetailGroup
                title="Premium"
                action={
                  draft && !awaitingWorkflow && canEdit && (
                    <button type="button" className="hz-button hz-button-secondary" disabled={commands.pending}
                      onClick={() => void act('The quotation was not priced', 'Priced', (e) => commands.price(view.id, e))}>
                      <Calculator className="h-3.5 w-3.5" />
                      {priced ? 'Price again' : 'Price'}
                    </button>
                  )
                }
              >
                {revision.pricing ? <PricingTable pricing={revision.pricing} /> : <EmptyState icon={Calculator} role="note" title="Not priced yet" hint="Save the risk, then price it." />}
              </DetailGroup>
              <DetailDivider />
              <DetailGroup title="Required documents" description="From the product version the quotation was priced on.">
                {revision.required_documents.length ? (
                  <ul className="flex flex-col gap-1 text-sm text-[var(--hz-text-primary)]">
                    {revision.required_documents.map((doc) => (
                      <li key={doc.code}>
                        {doc.name}
                        <span className="text-[13px] text-[var(--hz-text-muted)]"> · {humanize(doc.stage)}{doc.is_mandatory ? ' · required' : ' · optional'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--hz-text-muted)]">{priced ? 'None.' : 'Known once priced.'}</p>
                )}
              </DetailGroup>
            </div>
          }
          side={
            <>
              <SideSection title="Offer">
                <SummaryList
                  items={[
                    { label: 'Customer', value: <button type="button" className="text-[var(--hz-primary)] hover:underline" onClick={() => navigate(customerHref(view.customer.customer_no))}>{view.customer.customer_no}</button> },
                    { label: 'Quote date', value: formatDate(view.quote_date) },
                    { label: 'Valid until', value: formatDate(view.valid_until) },
                    ...(revision.check.required ? [{ label: 'Checker', value: humanize(revision.check.status) }] : []),
                    ...(revision.pricing ? [{ label: 'Total premium', value: formatMoney(revision.pricing.total_premium, revision.pricing.currency), strong: true }] : []),
                  ]}
                />
                {draft && !awaitingWorkflow && canEdit && (
                  <button type="button" className="mt-2 text-[13px] font-medium text-[var(--hz-primary)] hover:underline" onClick={() => setDialog('validity')}>
                    Change validity
                  </button>
                )}
              </SideSection>
              <SideSection title="Revisions">
                <ul className="flex flex-col gap-2 text-sm">
                  {view.revisions.map((item) => (
                    <li key={item.revision_no} className="flex items-center justify-between gap-2">
                      <span>
                        Revision {item.revision_no} · {humanize(item.status)}
                        {item.total_premium && <span className="block text-[13px] text-[var(--hz-text-muted)]">{formatMoney(item.total_premium, revision.pricing?.currency ?? '')}</span>}
                      </span>
                      {item.status === 'ISSUED' && (
                        <button type="button" className="text-[13px] font-medium text-[var(--hz-primary)] hover:underline" onClick={() => setDialog({ offer: item.revision_no })}>
                          View offer
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </SideSection>
            </>
          }
        />
      </div>

      {dialog === 'issue' && etag && (
        <IssueDialog view={view} etag={etag} onClose={() => setDialog(null)} onDone={() => { setDialog(null); setToast(`Offer issued: ${view.quotation_no}`); }} />
      )}
      {(dialog === 'decline' || dialog === 'cancel') && etag && (
        <ReasonDialog kind={dialog} view={view} etag={etag} onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); setToast(`${dialog === 'decline' ? 'Declined' : 'Cancelled'}: ${view.quotation_no}`); }} />
      )}
      {dialog === 'validity' && etag && (
        <ValidityDialog view={view} etag={etag} onClose={() => setDialog(null)} onDone={() => { setDialog(null); setToast(`Validity changed: ${view.quotation_no}`); }} />
      )}
      {dialog && typeof dialog === 'object' && <OfferDialog quotationId={view.id} revisionNo={dialog.offer} onClose={() => setDialog(null)} />}
    </HorizonPage>
  );
};

/** Where the quotation stands, in one line, when something waits on someone. */
const StateNotice: React.FC<{ view: QuotationDetail }> = ({ view }) => {
  const revision = view.current_revision;
  if (view.effective_status === 'EXPIRED') {
    return <HorizonAlert banner tone="warning" title="The offer expired">Revise it to make a new offer; a revision of an expired offer needs a checker.</HorizonAlert>;
  }
  if (revision.workflow?.status === 'PENDING_APPROVAL') {
    const waiting = revision.workflow.waiting_on?.length ? `Waiting for: ${revision.workflow.waiting_on.join(', ')}` : 'Waiting for a checker';
    return <HorizonAlert banner tone="info" title="Revision sent for a check">{waiting}</HorizonAlert>;
  }
  if (revision.check.required && revision.check.status === 'PENDING') {
    return <HorizonAlert banner tone="info" title="Revision sent for a check">Someone who did not prepare it approves it before it is issued.</HorizonAlert>;
  }
  if (revision.check.required && revision.check.status === 'NONE' && view.status === 'DRAFT') {
    return <HorizonAlert banner tone="info" title="This revision needs a checker">Price it, then submit it for a check before issuing.</HorizonAlert>;
  }
  if (view.status === 'DECLINED' || view.status === 'CANCELLED') {
    return <HorizonAlert banner tone="neutral" title={view.status === 'DECLINED' ? 'Declined by the customer' : 'Cancelled'}>{view.decision_reason || '—'}</HorizonAlert>;
  }
  if (view.status === 'ACCEPTED') {
    return <HorizonAlert banner tone="success" title="Accepted by the customer">{view.decided_at ? formatDateTime(view.decided_at) : ''}</HorizonAlert>;
  }
  return null;
};

const PricingTable: React.FC<{ pricing: Pricing }> = ({ pricing }) => {
  const money = (value: string) => formatMoney(value, pricing.currency);
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: 'Base premium', value: money(pricing.base_premium) },
    { label: 'Loadings', value: money(pricing.loadings) },
    { label: 'Discounts', value: money(pricing.discounts) },
    { label: 'Minimum premium adjustment', value: money(pricing.minimum_premium_adjustment) },
    { label: 'Rounding', value: money(pricing.rounding_adjustment) },
    { label: 'Basic premium', value: money(pricing.basic_premium), strong: true },
    ...pricing.levies.map((levy) => ({ label: levy.name, value: money(levy.amount) })),
    { label: 'Total premium', value: money(pricing.total_premium), strong: true },
  ];
  return (
    <div className="flex flex-col gap-3">
      <table className="hz-grid w-full" aria-label="Premium">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className={row.strong ? 'font-medium' : ''}>{row.label}</td>
              <td className={`text-right tabular-nums ${row.strong ? 'font-medium' : ''}`}>{row.value}</td>
            </tr>
          ))}
          {pricing.commission && (
            <tr>
              <td>Commission{pricing.commission.rate_percent ? ` (${pricing.commission.rate_percent}%)` : ''}</td>
              <td className="text-right tabular-nums">{money(pricing.commission.amount)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="text-[13px] text-[var(--hz-text-muted)]">
        Priced {formatDateTime(pricing.priced_at)} on product version {pricing.version_no}, for {formatDate(pricing.rating_date)}.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------- the risk

type FactorValues = Record<string, string>;

const asText = (value: unknown) => (value === undefined || value === null ? '' : typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value));

/**
 * The factor values as the server expects them: numbers as canonical digit strings (the same
 * parse the check uses, NB1-B-R1 B2), choices as strings, yes/no as booleans.
 */
const factorBody = (factors: RatingFactor[], values: FactorValues) =>
  Object.fromEntries(
    factors
      .filter((factor) => values[factor.code] !== undefined && values[factor.code].trim() !== '')
      .map((factor) => [
        factor.code,
        factor.data_type === 'BOOLEAN'
          ? values[factor.code] === 'true'
          : factor.data_type === 'DECIMAL'
            ? parseFactorDecimal(values[factor.code]).value ?? values[factor.code].trim()
            : values[factor.code].trim(),
      ]),
  );

const factorError = (factor: RatingFactor, raw: string): string | undefined => {
  const value = raw.trim();
  if (!value) return factor.is_required ? `Give the ${factor.name.toLowerCase()}.` : undefined;
  if (factor.data_type !== 'DECIMAL') return undefined;
  const parsed = parseFactorDecimal(value);
  if (parsed.error || parsed.value === null) return parsed.error ?? 'Enter a number.';
  const number = Number(parsed.value);
  if (factor.min_value !== null && number < Number(factor.min_value)) return `At least ${factor.min_value}${factor.unit ? ` ${factor.unit}` : ''}.`;
  if (factor.max_value !== null && number > Number(factor.max_value)) return `At most ${factor.max_value}${factor.unit ? ` ${factor.unit}` : ''}.`;
  return undefined;
};

const RiskSection: React.FC<{ view: QuotationDetail; etag: string | null; editable: boolean; onSaved: () => void }> = ({ view, etag, editable, onSaved }) => {
  const revision = view.current_revision;
  const product = useProductDetail(view.product.id, editable);
  const version = useMemo(() => (product.data ? versionInForce(product.data.versions) : null), [product.data]);
  const document = useProductVersion(view.product.id, editable ? version?.id ?? null : null);
  const factors = document.data?.content.rating_factors ?? [];
  const { risk, pending } = useQuotationCommands();

  // Keyed on what the server holds, not on the object: a refetch with the same risk (a window focus,
  // say) keeps what is being typed; a new revision or someone else's change starts again from the server.
  const serverRisk = JSON.stringify([revision.revision_no, revision.risk.factors, revision.risk.identifiers]);
  const seed = useMemo(
    () => ({
      values: Object.fromEntries(Object.entries(revision.risk.factors).map(([key, value]) => [key, asText(value)])) as FactorValues,
      identifiers: revision.risk.identifiers.map((item) => ({ ...item })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serverRisk],
  );
  const [values, setValues] = useState<FactorValues>(seed.values);
  const [identifiers, setIdentifiers] = useState<RiskIdentifier[]>(seed.identifiers);
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  // A new revision (or a reload after someone else's change) starts the form from the server again.
  useEffect(() => {
    setValues(seed.values);
    setIdentifiers(seed.identifiers);
  }, [seed]);

  if (!editable) {
    return (
      <DetailGroup title="Risk">
        <DetailGrid
          items={[
            ...Object.entries(revision.risk.factors).map(([code, value]) => ({ label: humanize(code), value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value) })),
            ...revision.risk.identifiers.map((item) => ({ label: riskIdentifierLabel(item.identifier_type), value: <span className="font-mono">{item.value}</span> })),
          ]}
        />
        {Object.keys(revision.risk.factors).length === 0 && revision.risk.identifiers.length === 0 && <p className="text-sm text-[var(--hz-text-muted)]">No risk entered.</p>}
      </DetailGroup>
    );
  }

  if (product.isPending || (version && document.isPending)) return <HorizonLoader tip="Loading the product's rating factors..." />;
  if (product.isError || document.isError) return <ApiErrorAlert error={product.error ?? document.error} title="The product's rating factors could not be loaded" />;
  if (!version) {
    return (
      <HorizonAlert tone="warning" title="No product version in force">
        The product has no published version in force today, so the risk cannot be entered.
      </HorizonAlert>
    );
  }

  const errors = Object.fromEntries(factors.map((factor) => [factor.code, factorError(factor, values[factor.code] ?? '')]));
  const identifierErrors = identifiers.map((item) => (item.value.trim() ? undefined : 'Give the number, or remove the row.'));
  const dirty = JSON.stringify(factorBody(factors, values)) !== JSON.stringify(factorBody(factors, seed.values)) || JSON.stringify(identifiers) !== JSON.stringify(seed.identifiers);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(errors).some(Boolean) || identifierErrors.some(Boolean) || !etag) return;
    setFailure(null);
    setStale(false);
    setServerFields({});
    const outcome = await risk(
      view.id,
      { factors: factorBody(factors, values), details: revision.risk.details, identifiers: identifiers.map((item) => ({ identifier_type: item.identifier_type, value: item.value.trim() })) },
      etag,
    );
    if (outcome.ok === true) {
      setAttempted(false);
      onSaved();
      return;
    }
    if (outcome.kind === 'stale') return setStale(true);
    const fields = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(fields).length) setServerFields(fields);
    else setFailure(outcome.error);
  };

  return (
    <DetailGroup title="Risk" description={`Rating factors of ${view.product.name}, version ${version.version_no}.`}>
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <ApiErrorAlert error={failure} title="The risk was not saved" />}
      <form noValidate onSubmit={(event) => void save(event)} aria-label="Risk" className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
          {factors.map((factor) => {
            const id = `factor-${factor.code}`;
            const error = (attempted ? errors[factor.code] : undefined) ?? serverFields[factor.code];
            const text = `${factor.name}${factor.unit ? ` (${factor.unit})` : ''}`;
            return (
              <div key={factor.code}>
                <label htmlFor={id} className={label}>
                  {text} {factor.is_required && <span className="text-[var(--hz-danger)]">*</span>}
                </label>
                {factor.data_type === 'CHOICE' ? (
                  <select id={id} value={values[factor.code] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [factor.code]: event.target.value }))} aria-invalid={!!error} className={field(!!error)}>
                    <option value="">Select…</option>
                    {factor.choices.map((choice) => (
                      <option key={choice} value={choice}>
                        {humanize(choice)}
                      </option>
                    ))}
                  </select>
                ) : factor.data_type === 'BOOLEAN' ? (
                  <select id={id} value={values[factor.code] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [factor.code]: event.target.value }))} aria-invalid={!!error} className={field(!!error)}>
                    <option value="">{factor.is_required ? 'Select…' : 'Not stated'}</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input id={id} inputMode="decimal" value={values[factor.code] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [factor.code]: event.target.value }))} aria-invalid={!!error} className={field(!!error)} />
                )}
                {!error && (factor.min_value !== null || factor.max_value !== null) && (
                  <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">
                    {factor.min_value !== null && `From ${factor.min_value}`}
                    {factor.min_value !== null && factor.max_value !== null && ' '}
                    {factor.max_value !== null && `up to ${factor.max_value}`}
                    {factor.unit ? ` ${factor.unit}` : ''}
                  </p>
                )}
                <FieldError message={error} />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--hz-text-primary)]">Risk identifiers</h3>
            <button type="button" className="hz-button hz-button-secondary" onClick={() => setIdentifiers((current) => [...current, { identifier_type: 'VEHICLE_REGISTRATION', value: '' }])}>
              <Plus className="h-3.5 w-3.5" />
              Add identifier
            </button>
          </div>
          {identifiers.length === 0 && <p className="text-[13px] text-[var(--hz-text-muted)]">None. Identifiers such as a registration number let duplicate risks be spotted.</p>}
          {identifiers.map((item, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2">
              <select aria-label={`Identifier ${index + 1} type`} value={item.identifier_type}
                onChange={(event) => setIdentifiers((current) => current.map((row, i) => (i === index ? { ...row, identifier_type: event.target.value } : row)))}
                className={field(false)}>
                {RISK_IDENTIFIER_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
              <div>
                <input aria-label={`Identifier ${index + 1} number`} value={item.value}
                  onChange={(event) => setIdentifiers((current) => current.map((row, i) => (i === index ? { ...row, value: event.target.value } : row)))}
                  aria-invalid={attempted && !!identifierErrors[index]} className={field(attempted && !!identifierErrors[index])} />
                <FieldError message={attempted ? identifierErrors[index] : undefined} />
              </div>
              <button type="button" className="hz-button hz-button-secondary" aria-label={`Remove identifier ${index + 1}`}
                onClick={() => setIdentifiers((current) => current.filter((_, i) => i !== index))}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3">
          {dirty && <span className="text-[13px] text-[var(--hz-text-muted)]">Unsaved changes. Saving clears any pricing.</span>}
          <button type="submit" className="hz-button hz-button-primary" disabled={pending || !dirty}>
            {pending ? 'Saving…' : 'Save risk'}
          </button>
        </div>
      </form>
    </DetailGroup>
  );
};

// ---------------------------------------------------------------------------- dialogs

const alertsFrom = (error: unknown): DuplicateAlerts | null =>
  error instanceof ApiError && error.code === 'DUPLICATE_RISK_ACKNOWLEDGEMENT_REQUIRED' && error.details.duplicate_alerts
    ? (error.details.duplicate_alerts as DuplicateAlerts)
    : null;

const IssueDialog: React.FC<{ view: QuotationDetail; etag: string; onClose: () => void; onDone: () => void }> = ({ view, etag, onClose, onDone }) => {
  const { issue, pending } = useQuotationCommands();
  const known = view.current_revision.duplicate_alerts;
  const [alerts, setAlerts] = useState<DuplicateAlerts | null>(known.visible.length || known.hidden_count ? known : null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (alerts && (!acknowledged || !reason.trim())) return;
    setFailure(null);
    setStale(false);
    const outcome = await issue(view.id, etag, alerts ? { reason: reason.trim() } : undefined);
    if (outcome.ok === true) return onDone();
    const found = alertsFrom(outcome.error);
    if (found) {
      setAlerts(found);
      setAcknowledged(false);
      return;
    }
    if (outcome.kind === 'stale') setStale(true);
    else setFailure(outcome.error);
  };

  return (
    <DialogFrame
      titleId="quotation-issue-title"
      title="Issue offer"
      subtitle={`${view.quotation_no} · ${view.current_revision.pricing ? formatMoney(view.current_revision.pricing.total_premium, view.current_revision.pricing.currency) : ''}`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="submit" form="quotation-issue-form" className="hz-button hz-button-primary" disabled={pending || (!!alerts && !acknowledged)}>
            {pending ? 'Issuing…' : alerts ? 'Issue anyway' : 'Issue offer'}
          </button>
        </>
      }
    >
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <ApiErrorAlert error={failure} title="The offer was not issued" />}
      <form id="quotation-issue-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <p className="text-sm text-[var(--hz-text-secondary)]">
          The offer is frozen as priced, valid until {formatDate(view.valid_until)}. A different price later means a new revision.
        </p>
        {alerts && (
          <>
            <div role="alert">
              <HorizonAlert tone="warning" title="This risk is on other live quotations">
                {alerts.visible.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {alerts.visible.map((item) => (
                      <li key={item.id}>
                        <span className="font-mono">{item.quotation_no}</span> · {humanize(item.status)}
                      </li>
                    ))}
                  </ul>
                )}
                {alerts.hidden_count > 0 && (
                  <p className="mt-1">
                    {alerts.hidden_count === 1 ? '1 more is outside the branches you can see.' : `${alerts.hidden_count} more are outside the branches you can see.`}
                  </p>
                )}
              </HorizonAlert>
            </div>
            <label className="flex items-start gap-2 text-sm text-[var(--hz-text-primary)]">
              <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-0.5" />
              I have checked the other quotations for this risk.
            </label>
            {acknowledged && (
              <div>
                <label htmlFor="issue-reason" className={label}>
                  Reason <span className="text-[var(--hz-danger)]">*</span>
                </label>
                <textarea id="issue-reason" rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="hz-field w-full px-3 py-2 text-sm" />
                <FieldError message={attempted && !reason.trim() ? 'Say why this offer is issued anyway.' : undefined} />
              </div>
            )}
          </>
        )}
      </form>
    </DialogFrame>
  );
};

const ReasonDialog: React.FC<{ kind: 'decline' | 'cancel'; view: QuotationDetail; etag: string; onClose: () => void; onDone: () => void }> = ({ kind, view, etag, onClose, onDone }) => {
  const commands = useQuotationCommands();
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const title = kind === 'decline' ? 'Customer declined' : 'Cancel quotation';
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (!reason.trim()) return;
    setFailure(null);
    setStale(false);
    const outcome = kind === 'decline' ? await commands.decline(view.id, reason.trim(), etag) : await commands.cancel(view.id, reason.trim(), etag);
    if (outcome.ok === true) return onDone();
    if (outcome.kind === 'stale') setStale(true);
    else setFailure(outcome.error);
  };
  return (
    <DialogFrame
      titleId="quotation-reason-title"
      title={title}
      subtitle={view.quotation_no}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form="quotation-reason-form" className="hz-button hz-button-primary" disabled={commands.pending}>
            {commands.pending ? 'Saving…' : kind === 'decline' ? 'Record the decline' : 'Cancel quotation'}
          </button>
        </>
      }
    >
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <ApiErrorAlert error={failure} title={kind === 'decline' ? 'The decline was not recorded' : 'The quotation was not cancelled'} />}
      <form id="quotation-reason-form" noValidate onSubmit={(event) => void onSubmit(event)}>
        <label htmlFor="quotation-reason" className={label}>
          Reason <span className="text-[var(--hz-danger)]">*</span>
        </label>
        <textarea id="quotation-reason" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="hz-field w-full px-3 py-2 text-sm" />
        <FieldError message={attempted && !reason.trim() ? 'Give the reason.' : undefined} />
      </form>
    </DialogFrame>
  );
};

const ValidityDialog: React.FC<{ view: QuotationDetail; etag: string; onClose: () => void; onDone: () => void }> = ({ view, etag, onClose, onDone }) => {
  const { update, pending } = useQuotationCommands();
  const [validUntil, setValidUntil] = useState(view.valid_until);
  const [failure, setFailure] = useState<unknown>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [stale, setStale] = useState(false);
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validUntil || validUntil === view.valid_until) return onClose();
    setFailure(null);
    setFields({});
    setStale(false);
    const outcome = await update(view.id, { valid_until: validUntil }, etag);
    if (outcome.ok === true) return onDone();
    if (outcome.kind === 'stale') return setStale(true);
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(found).length) setFields(found);
    else setFailure(outcome.error);
  };
  return (
    <DialogFrame
      titleId="quotation-validity-title"
      title="Change validity"
      subtitle={view.quotation_no}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="submit" form="quotation-validity-form" className="hz-button hz-button-primary" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <ApiErrorAlert error={failure} title="The validity was not changed" />}
      <form id="quotation-validity-form" noValidate onSubmit={(event) => void onSubmit(event)}>
        <label htmlFor="quotation-validity" className={label}>
          Valid until
        </label>
        <input id="quotation-validity" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} aria-invalid={!!fields.valid_until} className={field(!!fields.valid_until)} />
        <FieldError message={fields.valid_until} />
      </form>
    </DialogFrame>
  );
};

const OfferDialog: React.FC<{ quotationId: string; revisionNo: number; onClose: () => void }> = ({ quotationId, revisionNo, onClose }) => {
  const offer = useOffer(quotationId, revisionNo);
  return (
    <DialogFrame
      titleId="quotation-offer-title"
      title={offer.data ? `Offer ${offer.data.quotation_no}, revision ${revisionNo}` : `Offer, revision ${revisionNo}`}
      subtitle="As issued; it never changes"
      onClose={onClose}
      size="lg"
      expandable
      footer={
        <button type="button" className="hz-button hz-button-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {offer.isPending && <HorizonLoader tip="Loading the offer..." />}
      {offer.isError && <ApiErrorAlert error={offer.error} title="The offer could not be loaded" />}
      {offer.data && (
        <div className="flex flex-col">
          <DetailGrid
            dense
            columns={2}
            items={[
              { label: 'Customer', value: `${offer.data.customer.display_name} (${offer.data.customer.customer_no})` },
              { label: 'Product', value: `${offer.data.product.name} · ${offer.data.insurer.name}` },
              { label: 'Quote date', value: formatDate(offer.data.quote_date) },
              { label: 'Valid until', value: formatDate(offer.data.valid_until) },
              { label: 'Branch', value: offer.data.branch.name },
              { label: 'Issued', value: offer.data.issued_at ? formatDateTime(offer.data.issued_at) : '—' },
            ]}
          />
          <DetailDivider />
          <DetailGroup title="Risk, as offered">
            {Object.keys(offer.data.risk.factors).length === 0 && offer.data.risk.identifiers.length === 0 ? (
              <p className="text-sm text-[var(--hz-text-muted)]">No risk recorded.</p>
            ) : (
              <DetailGrid
                dense
                columns={2}
                items={[
                  ...Object.entries(offer.data.risk.factors).map(([code, value]) => ({
                    label: humanize(code),
                    value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value),
                  })),
                  ...offer.data.risk.identifiers.map((item) => ({
                    label: riskIdentifierLabel(item.identifier_type),
                    value: <span className="font-mono">{item.value}</span>,
                  })),
                ]}
              />
            )}
          </DetailGroup>
          <DetailDivider />
          <DetailGroup title="Premium, as offered">
            {offer.data.pricing ? <PricingTable pricing={offer.data.pricing} /> : <p className="text-sm text-[var(--hz-text-muted)]">No pricing.</p>}
          </DetailGroup>
          <DetailDivider />
          <DetailGroup title="Required documents, as offered">
            {offer.data.required_documents.length ? (
              <ul aria-label="Offered required documents" className="flex flex-col gap-1 text-sm text-[var(--hz-text-primary)]">
                {offer.data.required_documents.map((doc) => (
                  <li key={doc.code}>
                    {doc.name}
                    <span className="text-[13px] text-[var(--hz-text-muted)]"> · {humanize(doc.stage)}{doc.is_mandatory ? ' · required' : ' · optional'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--hz-text-muted)]">None.</p>
            )}
          </DetailGroup>
        </div>
      )}
    </DialogFrame>
  );
};

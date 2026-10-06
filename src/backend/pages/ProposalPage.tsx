/**
 * The underwriting proposal record (NB1-C): `GET /underwriting/proposals/{id}` with its ETag. Every
 * command sends that ETag.
 *
 * - Terms, while DRAFT: the agreement (of the product's insurer), the proposed inception (the
 *   server sets the expiry: one year less a day), the sum insured and underwriting details. Only
 *   what changed is sent. Never the premium: it is the accepted offer's, copied and shown as is.
 * - The quoted risk, the copied premium (commission only when the server includes it) and the cover.
 * - Requirements (NB-D7): evidence is a reference only, recorded per requirement.
 * - Submit settles the proposal: READY_TO_BIND, UNDER_REVIEW (what is outstanding, in words) or
 *   REFERRED (which exception, and who it waits for). A refusal to submit lists the server's problems.
 * - Exceptions: an underwriter's referral (with a reason); approval by someone who did not prepare
 *   the proposal, in My Work Queue when the tenant governs it, or here otherwise (the server refuses
 *   a contributor). Reopen (approvals lapse), check again, decline and cancel (with a reason).
 * Actions show only to users whose permissions could use them; the server decides every one.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, ClipboardList, Plus, Trash2 } from 'lucide-react';
import {
  DetailDivider,
  DetailGrid,
  DetailGroup,
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
  type StatusTone,
} from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { NOT_FOUND_TEXT, STALE_TEXT } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { usePermission } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { customerHref } from '../customers/refs';
import {
  PROPOSAL_CANCEL,
  PROPOSAL_DECLINE,
  PROPOSAL_EDIT,
  PROPOSAL_EXCEPTION_APPROVE,
  TASK_VIEW,
} from '../permissions';
import { formatDate } from '../policies/format';
import { blockerText, exceptionLabel, OPEN_WORKFLOW, PROPOSAL_STATUS_LABEL, PROPOSAL_TONE } from '../proposals/format';
import { useAgreements, useProposal } from '../proposals/queries';
import { useProposalId } from '../proposals/refs';
import type { ProposalDetail, ProposalException, ProposalPremium, Requirement } from '../proposals/types';
import { ProposalOutcome, useProposalCommands } from '../proposals/useProposalCommands';
import { parseFactorDecimal } from '../quotations/decimal';
import { riskIdentifierLabel } from '../quotations/format';
import { quotationHref } from '../quotations/refs';
import { formatDateTime, formatMoney, humanize } from '../workflow/format';
import { proposalsFrom } from './ProposalsPage';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;

type Dialog = 'refer' | 'decline' | 'cancel' | { evidence: Requirement } | { approve: ProposalException } | null;

const OPEN_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'REFERRED'];
const SUBMITTED_STATUSES = ['UNDER_REVIEW', 'REFERRED'];

/** A refusal in words: the server's list of problems when the proposal cannot be bound as it stands. */
const CommandFailure: React.FC<{ error: unknown; title: string }> = ({ error, title }) => {
  const problems =
    error instanceof ApiError && error.code === 'PROPOSAL_NOT_BINDABLE' && Array.isArray(error.details.problems)
      ? (error.details.problems as { code: string; message: string }[])
      : null;
  if (!problems) return <ApiErrorAlert error={error} title={title} />;
  return (
    <div role="alert">
      <HorizonAlert tone="warning" title={title}>
        <ul className="mt-1 list-disc pl-5" aria-label="What stops it">
          {problems.map((problem) => (
            <li key={problem.code}>{problem.message.charAt(0).toUpperCase() + problem.message.slice(1)}.</li>
          ))}
        </ul>
        <ErrorReference reference={referenceOf(error)} />
      </HorizonAlert>
    </div>
  );
};

export const ProposalPage: React.FC = () => {
  const proposalId = useProposalId();
  const navigate = useNavigate();
  const location = useLocation();
  const proposal = useProposal(proposalId);
  const commands = useProposalCommands();
  const canEdit = usePermission(PROPOSAL_EDIT);
  const canDecline = usePermission(PROPOSAL_DECLINE);
  const canCancel = usePermission(PROPOSAL_CANCEL);
  const canApprove = usePermission(PROPOSAL_EXCEPTION_APPROVE);
  const canSeeTasks = usePermission(TASK_VIEW);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ error: unknown; title: string } | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const back = () => navigate(proposalsFrom(location.state));

  if (proposal.isPending) return <HorizonLoader tip="Loading the proposal..." />;
  if (proposal.isError) {
    const missing = proposal.error instanceof ApiError && proposal.error.status === 404;
    return (
      <HorizonPage id="proposal-record">
        <HorizonPageTitle title="Proposal" onBack={back} backLabel="Back to Proposals" />
        <HorizonPageContent className="p-4">
          {missing ? (
            <HorizonAlert tone="warning" title={NOT_FOUND_TEXT}>
              It does not exist, or it is outside the branches you can see.
              <ErrorReference reference={referenceOf(proposal.error)} />
            </HorizonAlert>
          ) : (
            <ApiErrorAlert error={proposal.error} title="The proposal could not be loaded" />
          )}
        </HorizonPageContent>
      </HorizonPage>
    );
  }

  const { view, etag } = proposal.data;
  const draft = view.status === 'DRAFT';
  const open = OPEN_STATUSES.includes(view.status);
  const submitted = SUBMITTED_STATUSES.includes(view.status);

  /** One command from the header: a toast on success; a 412 or refusal shown above the record. */
  const act = async (title: string, done: (after: ProposalDetail) => string, command: (etag: string) => Promise<ProposalOutcome>) => {
    if (!etag) return;
    setFailure(null);
    setStale(false);
    const outcome = await command(etag);
    if (outcome.ok === true) {
      setToast(done(outcome.view));
      return;
    }
    if (outcome.kind === 'stale') setStale(true);
    else setFailure({ error: outcome.error, title });
  };
  const settled = (after: ProposalDetail) => `${view.proposal_no}: ${PROPOSAL_STATUS_LABEL[after.status] ?? humanize(after.status)}`;

  const actions: React.ReactNode[] = [];
  if (open && canEdit) {
    actions.push(
      <button key="refer" type="button" className="hz-button hz-button-secondary" onClick={() => setDialog('refer')}>
        Refer
      </button>,
    );
  }
  if (submitted && canEdit) {
    actions.push(
      <button key="evaluate" type="button" className="hz-button hz-button-secondary" disabled={commands.pending}
        onClick={() => void act('The proposal was not checked again', settled, (e) => commands.evaluate(view.id, e))}>
        Check again
      </button>,
      <button key="reopen" type="button" className="hz-button hz-button-secondary" disabled={commands.pending}
        onClick={() => void act('The proposal was not reopened', () => `Reopened: ${view.proposal_no}`, (e) => commands.reopen(view.id, e))}>
        Reopen
      </button>,
    );
  }
  if (open && canDecline) {
    actions.push(
      <button key="decline" type="button" className="hz-button hz-button-secondary" onClick={() => setDialog('decline')}>
        Decline
      </button>,
    );
  }
  if ((open || view.status === 'READY_TO_BIND') && canCancel) {
    actions.push(
      <button key="cancel" type="button" className="hz-button hz-button-secondary" onClick={() => setDialog('cancel')}>
        Cancel proposal
      </button>,
    );
  }
  if (draft && canEdit) {
    actions.push(
      <button key="submit" type="button" className="hz-button hz-button-primary" disabled={commands.pending}
        onClick={() => void act('The proposal was not submitted', settled, (e) => commands.submit(view.id, e))}>
        Submit
      </button>,
    );
  }

  return (
    <HorizonPage id="proposal-record" className="flex flex-col gap-4 !space-y-0">
      <HorizonToast message={toast} />
      <RecordHeader
        icon={ClipboardList}
        title={view.proposal_no}
        subtitle={`${view.customer.display_name} · ${view.product.name}`}
        badges={
          <>
            <StatusBadge square label={PROPOSAL_STATUS_LABEL[view.status] ?? humanize(view.status)} tone={PROPOSAL_TONE[view.status] ?? 'neutral'} />
            <OutlineTag>{view.insurer.name}</OutlineTag>
            <OutlineTag>{view.branch.name}</OutlineTag>
          </>
        }
        actions={
          <button type="button" className="hz-button hz-button-secondary" onClick={back} aria-label="Back to Proposals" title="Back to Proposals">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        }
      />
      {actions.length > 0 && (
        <div role="group" aria-label="Proposal actions" className="flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      )}
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure && <CommandFailure error={failure.error} title={failure.title} />}
      <StateNotice view={view} onCustomer={() => navigate(customerHref(view.customer.customer_no))} />

      <div className="hz-record-body">
        <RecordColumns
          main={
            <div className="flex flex-col">
              <TermsSection view={view} etag={etag} editable={draft && canEdit} onSaved={() => setToast(`Terms saved: ${view.proposal_no}`)} />
              <DetailDivider />
              <RequirementsSection view={view} canRecord={open && canEdit} onRecord={(requirement) => setDialog({ evidence: requirement })} />
              <DetailDivider />
              <ExceptionsSection
                view={view}
                canApprove={view.status === 'REFERRED' && canApprove}
                canSeeTasks={canSeeTasks}
                onApprove={(exception) => setDialog({ approve: exception })}
                onTask={(instanceId) => navigate(`/my-work/list/${encodeURIComponent(instanceId)}`)}
              />
              <DetailDivider />
              <DetailGroup title="Risk, as quoted" description={`From ${view.quotation.quotation_no}, revision ${view.quotation_revision_no}; it does not change here.`}>
                <DetailGrid
                  items={[
                    ...Object.entries(view.quoted_risk.factors).map(([code, value]) => ({ label: humanize(code), value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value) })),
                    ...view.quoted_risk.identifiers.map((item) => ({ label: riskIdentifierLabel(item.identifier_type), value: <span className="font-mono">{item.value}</span> })),
                  ]}
                />
              </DetailGroup>
              <DetailDivider />
              <DetailGroup title="Premium, as accepted" description="Copied from the accepted offer; never recalculated.">
                <PremiumTable premium={view.premium} />
              </DetailGroup>
              <DetailDivider />
              <CoverSection view={view} />
            </div>
          }
          side={
            <>
              <SideSection title="Proposal">
                <SummaryList
                  items={[
                    { label: 'Customer', value: <button type="button" className="text-[var(--hz-primary)] hover:underline" onClick={() => navigate(customerHref(view.customer.customer_no))}>{view.customer.customer_no}</button> },
                    { label: 'Quotation', value: <button type="button" className="text-[var(--hz-primary)] hover:underline" onClick={() => navigate(quotationHref(view.quotation.quotation_no))}>{view.quotation.quotation_no}</button> },
                    { label: 'Offer valid until', value: formatDate(view.quote_valid_until) },
                    { label: 'Cover', value: view.proposed_inception_date ? `${formatDate(view.proposed_inception_date)} – ${formatDate(view.proposed_expiry_date)}` : 'Not set' },
                    ...(view.submitted_at ? [{ label: 'Submitted', value: formatDateTime(view.submitted_at) }] : []),
                    ...(view.ready_at ? [{ label: 'Ready to bind', value: formatDateTime(view.ready_at) }] : []),
                    { label: 'Total premium', value: formatMoney(view.total_premium, view.currency), strong: true },
                  ]}
                />
              </SideSection>
            </>
          }
        />
      </div>

      {(dialog === 'refer' || dialog === 'decline' || dialog === 'cancel') && etag && (
        <ReasonDialog kind={dialog} view={view} etag={etag} onClose={() => setDialog(null)}
          onDone={(after) => { setDialog(null); setToast(dialog === 'refer' ? `Referred: ${view.proposal_no}` : settled(after)); }} />
      )}
      {dialog && typeof dialog === 'object' && 'evidence' in dialog && etag && (
        <EvidenceDialog view={view} requirement={dialog.evidence} etag={etag} onClose={() => setDialog(null)}
          onDone={(after) => { setDialog(null); setToast(`Evidence recorded · ${settled(after)}`); }} />
      )}
      {dialog && typeof dialog === 'object' && 'approve' in dialog && etag && (
        <ApproveDialog view={view} exception={dialog.approve} etag={etag} onClose={() => setDialog(null)}
          onDone={(after) => { setDialog(null); setToast(`Exception approved · ${settled(after)}`); }} />
      )}
    </HorizonPage>
  );
};

/** Where the proposal stands, in one line, and what it still waits for. */
const StateNotice: React.FC<{ view: ProposalDetail; onCustomer: () => void }> = ({ view, onCustomer }) => {
  if (view.status === 'DRAFT') {
    return <HorizonAlert banner tone="info" title="Draft">Complete the terms, then submit. The system checks the inception, the agreement and the sum insured, and refers what needs approval.</HorizonAlert>;
  }
  if (view.status === 'UNDER_REVIEW' || view.status === 'REFERRED') {
    const kyc = view.blockers.some((blocker) => blocker.code === 'CUSTOMER_KYC_NOT_VERIFIED');
    return (
      <div role="status">
        <HorizonAlert
          tone="warning"
          title={view.status === 'REFERRED' ? 'Referred: waiting for an approval' : 'Under review: not ready to bind'}
          action={kyc ? <button type="button" className="hz-button hz-button-secondary" onClick={onCustomer}>Open the customer</button> : undefined}
        >
          <ul className="mt-1 list-disc pl-5" aria-label="Outstanding">
            {view.blockers.map((blocker) => (
              <li key={`${blocker.code}-${blocker.item}`}>{blockerText(blocker, view.requirements)}</li>
            ))}
          </ul>
          {kyc && <p className="mt-1">Once the KYC is verified, use Check again.</p>}
        </HorizonAlert>
      </div>
    );
  }
  if (view.status === 'READY_TO_BIND') {
    return <HorizonAlert banner tone="success" title="Ready to bind">Nothing is outstanding{view.ready_at ? ` since ${formatDateTime(view.ready_at)}` : ''}.</HorizonAlert>;
  }
  if (view.status === 'BOUND') {
    return <HorizonAlert banner tone="success" title="Bound">{view.policy_no ? `Policy ${view.policy_no}` : ''}{view.bound_at ? `, ${formatDateTime(view.bound_at)}` : ''}</HorizonAlert>;
  }
  return <HorizonAlert banner tone="neutral" title={view.status === 'DECLINED' ? 'Declined' : 'Cancelled'}>{view.decision_reason || '—'}</HorizonAlert>;
};

const PremiumTable: React.FC<{ premium: ProposalPremium }> = ({ premium }) => {
  const money = (value: string) => formatMoney(value, premium.currency);
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: 'Base premium', value: money(premium.base_premium) },
    { label: 'Loadings', value: money(premium.loadings) },
    { label: 'Discounts', value: money(premium.discounts) },
    { label: 'Minimum premium adjustment', value: money(premium.minimum_premium_adjustment) },
    { label: 'Rounding', value: money(premium.rounding_adjustment) },
    { label: 'Basic premium', value: money(premium.basic_premium), strong: true },
    ...premium.levies.map((levy) => ({ label: levy.name, value: money(levy.amount) })),
    { label: 'Total premium', value: money(premium.total_premium), strong: true },
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
          {premium.commission && (
            <tr>
              <td>Commission{premium.commission.rate_percent ? ` (${premium.commission.rate_percent}%)` : ''}</td>
              <td className="text-right tabular-nums">{money(premium.commission.amount)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="text-[13px] text-[var(--hz-text-muted)]">
        Rated on product version {premium.version_no}{premium.rating_date ? `, for ${formatDate(premium.rating_date)}` : ''}.
      </p>
    </div>
  );
};

const CoverSection: React.FC<{ view: ProposalDetail }> = ({ view }) => {
  const { cover } = view;
  return (
    <DetailGroup title="Cover" description="The cover of the product version the offer was priced on.">
      {cover.cover_sections.length === 0 ? (
        <p className="text-sm text-[var(--hz-text-muted)]">No cover sections.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {cover.cover_sections.map((section) => {
            const benefits = cover.benefits.filter((benefit) => benefit.section === section.code);
            const exclusions = cover.exclusions.filter((exclusion) => exclusion.section === section.code);
            return (
              <section key={section.code} aria-label={section.name} className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-[var(--hz-text-primary)]">{section.name}</h3>
                {section.description && <p className="text-[13px] text-[var(--hz-text-muted)]">{section.description}</p>}
                {benefits.length > 0 && (
                  <ul className="flex flex-col gap-0.5 text-sm text-[var(--hz-text-primary)]">
                    {benefits.map((benefit) => (
                      <li key={benefit.code}>
                        {benefit.name}
                        <span className="text-[13px] text-[var(--hz-text-muted)]">
                          {benefit.limit_amount ? ` · limit ${formatMoney(benefit.limit_amount, view.currency)}` : benefit.limit_description ? ` · ${benefit.limit_description}` : ''}
                          {benefit.is_optional ? ' · optional' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {exclusions.length > 0 && (
                  <p className="text-[13px] text-[var(--hz-text-muted)]">Excluded: {exclusions.map((exclusion) => exclusion.text).join('; ')}</p>
                )}
              </section>
            );
          })}
          {cover.exclusions.some((exclusion) => !exclusion.section) && (
            <p className="text-[13px] text-[var(--hz-text-muted)]">
              General exclusions: {cover.exclusions.filter((exclusion) => !exclusion.section).map((exclusion) => exclusion.text).join('; ')}
            </p>
          )}
        </div>
      )}
    </DetailGroup>
  );
};

// ---------------------------------------------------------------------------- terms

interface Terms {
  agreement_id: string;
  proposed_inception_date: string;
  sum_insured: string;
  details: { key: string; value: string }[];
}

const termsOf = (view: ProposalDetail): Terms => ({
  agreement_id: view.agreement?.id ?? '',
  proposed_inception_date: view.proposed_inception_date ?? '',
  sum_insured: view.sum_insured ?? '',
  details: Object.entries(view.underwriting_details).map(([key, value]) => ({ key, value })),
});

const detailsBody = (rows: Terms['details']) => Object.fromEntries(rows.map((row) => [row.key.trim(), row.value.trim()]));

const TermsSection: React.FC<{ view: ProposalDetail; etag: string | null; editable: boolean; onSaved: () => void }> = ({ view, etag, editable, onSaved }) => {
  const agreements = useAgreements(view.insurer.id, editable);
  const { update, pending } = useProposalCommands();
  // Keyed on what the server holds: a refetch with the same terms keeps what is being typed.
  const serverTerms = JSON.stringify([view.agreement?.id, view.proposed_inception_date, view.sum_insured, view.underwriting_details]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seed = useMemo(() => termsOf(view), [serverTerms]);
  const [terms, setTerms] = useState<Terms>(seed);
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  useEffect(() => setTerms(seed), [seed]);

  const rated = view.quoted_risk.factors.sum_insured;
  if (!editable) {
    return (
      <DetailGroup title="Terms">
        <DetailGrid
          items={[
            { label: 'Agreement', value: view.agreement ? `${humanize(view.agreement.agreement_type)} · ${view.agreement.reference_no}` : 'Not chosen' },
            { label: 'Cover', value: view.proposed_inception_date ? `${formatDate(view.proposed_inception_date)} – ${formatDate(view.proposed_expiry_date)}` : 'Not set' },
            { label: 'Sum insured', value: view.sum_insured ? formatMoney(view.sum_insured, view.currency) : 'Not stated' },
            ...Object.entries(view.underwriting_details).map(([key, value]) => ({ label: key, value: value || '—' })),
          ]}
        />
      </DetailGroup>
    );
  }

  const sum = parseFactorDecimal(terms.sum_insured);
  const sumError = sum.error ?? (sum.value?.startsWith('-') ? 'The sum insured cannot be negative.' : undefined);
  const keys = terms.details.map((row) => row.key.trim());
  const detailErrors = terms.details.map((row, index) =>
    !row.key.trim() ? 'Name the detail, or remove the row.' : keys.indexOf(row.key.trim()) !== index ? 'Each detail needs its own name.' : undefined,
  );

  const body: Record<string, unknown> = {};
  if (terms.agreement_id !== seed.agreement_id) body.agreement_id = terms.agreement_id || null;
  if (terms.proposed_inception_date !== seed.proposed_inception_date) body.proposed_inception_date = terms.proposed_inception_date || null;
  if ((sum.value ?? '') !== (parseFactorDecimal(seed.sum_insured).value ?? '')) body.sum_insured = sum.value;
  if (JSON.stringify(detailsBody(terms.details)) !== JSON.stringify(detailsBody(seed.details)) || terms.details.length !== seed.details.length) {
    body.underwriting_details = detailsBody(terms.details);
  }
  const dirty = Object.keys(body).length > 0;
  const choices = (agreements.data ?? []).filter((item) => item.status === 'ACTIVE' || item.id === seed.agreement_id);
  const errorFor = (name: string, local?: string) => (attempted ? local : undefined) ?? serverFields[name];

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (sumError || detailErrors.some(Boolean) || !etag || !dirty) return;
    setFailure(null);
    setStale(false);
    setServerFields({});
    const outcome = await update(view.id, body, etag);
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
    <DetailGroup title="Terms" description="Editable while the proposal is a draft. The premium is the accepted offer's and does not change here.">
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <ApiErrorAlert error={failure} title="The terms were not saved" />}
      <form noValidate onSubmit={(event) => void save(event)} aria-label="Terms" className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="proposal-agreement" className={label}>
              Agreement
            </label>
            <select id="proposal-agreement" value={terms.agreement_id} onChange={(event) => setTerms((current) => ({ ...current, agreement_id: event.target.value }))}
              aria-invalid={!!errorFor('agreement_id')} className={field(!!errorFor('agreement_id'))}>
              <option value="">{agreements.isPending ? 'Loading agreements…' : 'Select an agreement…'}</option>
              {choices.map((item) => (
                <option key={item.id} value={item.id}>
                  {humanize(item.agreement_type)} · {item.reference_no}
                  {item.binder_limit ? ` · limit ${formatMoney(item.binder_limit, view.currency)}` : ''}
                  {item.status !== 'ACTIVE' ? ` (${humanize(item.status).toLowerCase()})` : ''}
                </option>
              ))}
            </select>
            {agreements.isError && <ApiErrorAlert error={agreements.error} title="The insurer's agreements could not be loaded" />}
            {!errorFor('agreement_id') && <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">{view.insurer.name}'s agreements. Needed to submit.</p>}
            <FieldError message={errorFor('agreement_id')} />
          </div>
          <div>
            <label htmlFor="proposal-inception-date" className={label}>
              Proposed inception
            </label>
            <input id="proposal-inception-date" type="date" value={terms.proposed_inception_date}
              onChange={(event) => setTerms((current) => ({ ...current, proposed_inception_date: event.target.value }))}
              aria-invalid={!!errorFor('proposed_inception_date')} className={field(!!errorFor('proposed_inception_date'))} />
            {!errorFor('proposed_inception_date') && (
              <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">
                {view.proposed_expiry_date && terms.proposed_inception_date === seed.proposed_inception_date
                  ? `Expires ${formatDate(view.proposed_expiry_date)}: one year less a day.`
                  : 'The server sets the expiry: one year less a day.'}
              </p>
            )}
            <FieldError message={errorFor('proposed_inception_date')} />
          </div>
          <div>
            <label htmlFor="proposal-sum-insured" className={label}>
              Sum insured ({view.currency})
            </label>
            <input id="proposal-sum-insured" inputMode="decimal" value={terms.sum_insured}
              onChange={(event) => setTerms((current) => ({ ...current, sum_insured: event.target.value }))}
              aria-invalid={!!errorFor('sum_insured', sumError)} className={field(!!errorFor('sum_insured', sumError))} />
            {!errorFor('sum_insured', sumError) && rated !== undefined && (
              <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">Rated on {String(rated)}. A different figure is referred for approval.</p>
            )}
            <FieldError message={errorFor('sum_insured', sumError)} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--hz-text-primary)]">Underwriting details</h3>
            <button type="button" className="hz-button hz-button-secondary" onClick={() => setTerms((current) => ({ ...current, details: [...current.details, { key: '', value: '' }] }))}>
              <Plus className="h-3.5 w-3.5" />
              Add detail
            </button>
          </div>
          {terms.details.length === 0 && <p className="text-[13px] text-[var(--hz-text-muted)]">None. Notes such as a survey result or prior claims, each with its own name.</p>}
          {terms.details.map((row, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-start gap-2">
              <div>
                <input aria-label={`Detail ${index + 1} name`} value={row.key} maxLength={60}
                  onChange={(event) => setTerms((current) => ({ ...current, details: current.details.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)) }))}
                  aria-invalid={attempted && !!detailErrors[index]} className={field(attempted && !!detailErrors[index])} />
                <FieldError message={attempted ? detailErrors[index] : undefined} />
              </div>
              <input aria-label={`Detail ${index + 1} value`} value={row.value} maxLength={500}
                onChange={(event) => setTerms((current) => ({ ...current, details: current.details.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)) }))}
                className={field(false)} />
              <button type="button" className="hz-button hz-button-secondary" aria-label={`Remove detail ${index + 1}`}
                onClick={() => setTerms((current) => ({ ...current, details: current.details.filter((_, i) => i !== index) }))}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {serverFields.underwriting_details && <FieldError message={serverFields.underwriting_details} />}
        </div>

        <div className="flex items-center justify-end gap-3">
          {dirty && <span className="text-[13px] text-[var(--hz-text-muted)]">Unsaved changes.</span>}
          <button type="submit" className="hz-button hz-button-primary" disabled={pending || !dirty}>
            {pending ? 'Saving…' : 'Save terms'}
          </button>
        </div>
      </form>
    </DetailGroup>
  );
};

// ---------------------------------------------------------------------------- requirements and exceptions

const RequirementsSection: React.FC<{ view: ProposalDetail; canRecord: boolean; onRecord: (requirement: Requirement) => void }> = ({ view, canRecord, onRecord }) => (
  <DetailGroup title="Requirements" description="Evidence is recorded as a reference to where it is kept.">
    {view.requirements.length === 0 ? (
      <p className="text-sm text-[var(--hz-text-muted)]">None.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="hz-grid w-full" aria-label="Requirements">
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Evidence</th>
              <th aria-label="Action" />
            </tr>
          </thead>
          <tbody>
            {view.requirements.map((item) => (
              <tr key={item.code}>
                <td>
                  <span className="block text-sm text-[var(--hz-text-primary)]">{item.name}</span>
                  <span className="block text-[13px] text-[var(--hz-text-muted)]">
                    {item.required ? 'Required' : 'Optional'}
                    {item.source === 'UNDERWRITER' ? ' · added by underwriting' : item.stage ? ` · ${humanize(item.stage).toLowerCase()} stage` : ''}
                  </span>
                </td>
                <td>
                  {item.satisfied ? (
                    <>
                      <span className="block font-mono text-sm text-[var(--hz-text-primary)]">{item.evidence_reference}</span>
                      {item.satisfied_at && <span className="block text-[13px] text-[var(--hz-text-muted)]">Recorded {formatDateTime(item.satisfied_at)}</span>}
                    </>
                  ) : (
                    <StatusBadge square label={item.required ? 'Outstanding' : 'Not given'} tone={item.required ? 'warning' : 'neutral'} />
                  )}
                </td>
                <td className="text-right">
                  {canRecord && (
                    <button type="button" className="hz-button hz-button-secondary" onClick={() => onRecord(item)} aria-label={`${item.satisfied ? 'Change evidence' : 'Record evidence'}: ${item.name}`}>
                      {item.satisfied ? 'Change' : 'Record evidence'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </DetailGroup>
);

/**
 * Where one exception stands (NB1-C-R1, C1). An OPEN row alone does not mean "awaiting approval":
 * when the tenant governs it, the decision lives in its workflow block, and a governed rejection
 * declines the proposal while the row stays OPEN. So:
 *   APPROVED                         approved
 *   OPEN, no workflow                awaiting approval; the lightweight approval may be offered
 *   OPEN, workflow still open        waiting in My Work Queue; never approved inline
 *   OPEN, workflow closed            the workflow's own outcome (rejected, void, cancelled, expired);
 *                                    never approved inline, never a My Work Queue link
 */
type ExceptionState =
  | { kind: 'approved' | 'lightweight' | 'waiting'; label: string; tone: StatusTone }
  | { kind: 'decided'; label: string; tone: StatusTone; note: string };

const DECIDED: Record<string, { label: string; tone: StatusTone; note: string }> = {
  REJECTED: { label: 'Rejected', tone: 'danger', note: 'Rejected in My Work Queue.' },
  VOID: { label: 'Void', tone: 'neutral', note: 'Its approval in My Work Queue was voided.' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', note: 'Its approval in My Work Queue was cancelled.' },
  EXPIRED: { label: 'Expired', tone: 'neutral', note: 'Its approval in My Work Queue expired.' },
  APPROVED: { label: 'Approved', tone: 'success', note: 'Approved in My Work Queue.' },
};

export function exceptionState(item: ProposalException): ExceptionState {
  if (item.status === 'APPROVED') return { kind: 'approved', label: 'Approved', tone: 'success' };
  if (!item.workflow) return { kind: 'lightweight', label: 'Awaiting approval', tone: 'warning' };
  if (OPEN_WORKFLOW.includes(item.workflow.status)) return { kind: 'waiting', label: 'Awaiting approval', tone: 'warning' };
  return { kind: 'decided', ...(DECIDED[item.workflow.status] ?? { label: humanize(item.workflow.status), tone: 'neutral', note: 'Its approval in My Work Queue is closed.' }) };
}

const ExceptionsSection: React.FC<{
  view: ProposalDetail;
  canApprove: boolean;
  canSeeTasks: boolean;
  onApprove: (exception: ProposalException) => void;
  onTask: (instanceId: string) => void;
}> = ({ view, canApprove, canSeeTasks, onApprove, onTask }) => {
  const shown = view.exceptions.filter((item) => item.status !== 'SUPERSEDED');
  return (
    <DetailGroup title="Exceptions" description="Referrals that need approval by someone who did not prepare the proposal.">
      {shown.length === 0 ? (
        <p className="text-sm text-[var(--hz-text-muted)]">{view.status === 'DRAFT' ? 'None yet. The system looks for them when the proposal is submitted.' : 'None.'}</p>
      ) : (
        <ul aria-label="Exceptions" className="flex flex-col divide-y divide-[var(--hz-divider)] rounded-lg border border-[var(--hz-border-grid)]">
          {shown.map((item) => {
            const state = exceptionState(item);
            const waiting = state.kind === 'waiting' ? item.workflow : null;
            return (
              <li key={item.id} aria-label={exceptionLabel(item.code)} className="flex flex-wrap items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--hz-text-primary)]">{exceptionLabel(item.code)}</p>
                  <p className="text-[13px] text-[var(--hz-text-secondary)]">{item.reason.charAt(0).toUpperCase() + item.reason.slice(1)}</p>
                  <p className="text-[13px] text-[var(--hz-text-muted)]">
                    {item.source === 'SYSTEM' ? 'Found by the system' : 'Raised by an underwriter'}
                    {item.raised_at ? `, ${formatDateTime(item.raised_at)}` : ''}
                    {item.status === 'APPROVED' && item.approved_at ? ` · approved ${formatDateTime(item.approved_at)}` : ''}
                    {item.status === 'APPROVED' && item.approval_note ? ` · “${item.approval_note}”` : ''}
                  </p>
                  {waiting && (
                    <p className="text-[13px] text-[var(--hz-text-secondary)]">
                      {waiting.waiting_on?.length ? `Waiting for: ${waiting.waiting_on.join(', ')}` : 'Waiting for an approver'}
                      {waiting.stage_label ? ` (${waiting.stage_label})` : ''}, in My Work Queue.
                    </p>
                  )}
                  {state.kind === 'decided' && <p className="text-[13px] text-[var(--hz-text-secondary)]">{state.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge square label={state.label} tone={state.tone} />
                  {waiting && canSeeTasks && (
                    <button type="button" className="hz-button hz-button-secondary" onClick={() => onTask(waiting.instance_id)}>
                      Open in My Work Queue
                    </button>
                  )}
                  {state.kind === 'lightweight' && canApprove && (
                    <button type="button" className="hz-button hz-button-primary" onClick={() => onApprove(item)} aria-label={`Approve: ${exceptionLabel(item.code)}`}>
                      Approve
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DetailGroup>
  );
};

// ---------------------------------------------------------------------------- dialogs

const REASON_COPY = {
  refer: { title: 'Refer the proposal', hint: 'It cannot be bound until someone who did not prepare it approves the referral.', submit: 'Refer', failed: 'The proposal was not referred' },
  decline: { title: 'Decline the proposal', hint: 'A declined proposal is closed and cannot be bound.', submit: 'Decline', failed: 'The proposal was not declined' },
  cancel: { title: 'Cancel the proposal', hint: 'A cancelled proposal is closed and cannot be bound.', submit: 'Cancel proposal', failed: 'The proposal was not cancelled' },
} as const;

const ReasonDialog: React.FC<{ kind: 'refer' | 'decline' | 'cancel'; view: ProposalDetail; etag: string; onClose: () => void; onDone: (after: ProposalDetail) => void }> = ({ kind, view, etag, onClose, onDone }) => {
  const commands = useProposalCommands();
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const copy = REASON_COPY[kind];
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (!reason.trim()) return;
    setFailure(null);
    setStale(false);
    const outcome = await commands[kind](view.id, reason.trim(), etag);
    if (outcome.ok === true) return onDone(outcome.view);
    if (outcome.kind === 'stale') setStale(true);
    else setFailure(outcome.error);
  };
  return (
    <DialogFrame
      titleId="proposal-reason-title"
      title={copy.title}
      subtitle={view.proposal_no}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form="proposal-reason-form" className="hz-button hz-button-primary" disabled={commands.pending}>
            {commands.pending ? 'Saving…' : copy.submit}
          </button>
        </>
      }
    >
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <ApiErrorAlert error={failure} title={copy.failed} />}
      <form id="proposal-reason-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-2">
        <p className="text-sm text-[var(--hz-text-secondary)]">{copy.hint}</p>
        <label htmlFor="proposal-reason" className={label}>
          Reason <span className="text-[var(--hz-danger)]">*</span>
        </label>
        <textarea id="proposal-reason" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="hz-field w-full px-3 py-2 text-sm" />
        <FieldError message={attempted && !reason.trim() ? 'Give the reason.' : undefined} />
      </form>
    </DialogFrame>
  );
};

const EvidenceDialog: React.FC<{ view: ProposalDetail; requirement: Requirement; etag: string; onClose: () => void; onDone: (after: ProposalDetail) => void }> = ({ view, requirement, etag, onClose, onDone }) => {
  const { satisfy, pending } = useProposalCommands();
  const [reference, setReference] = useState(requirement.evidence_reference);
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [stale, setStale] = useState(false);
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (!reference.trim()) return;
    setFailure(null);
    setFields({});
    setStale(false);
    const outcome = await satisfy(view.id, requirement.code, reference.trim(), etag);
    if (outcome.ok === true) return onDone(outcome.view);
    if (outcome.kind === 'stale') return setStale(true);
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(found).length) setFields(found);
    else setFailure(outcome.error);
  };
  const error = (attempted && !reference.trim() ? 'Give the evidence reference.' : undefined) ?? fields.evidence_reference;
  return (
    <DialogFrame
      titleId="proposal-evidence-title"
      title="Record evidence"
      subtitle={`${view.proposal_no} · ${requirement.name}`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="submit" form="proposal-evidence-form" className="hz-button hz-button-primary" disabled={pending}>
            {pending ? 'Saving…' : 'Record evidence'}
          </button>
        </>
      }
    >
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <ApiErrorAlert error={failure} title="The evidence was not recorded" />}
      <form id="proposal-evidence-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-2">
        <label htmlFor="proposal-evidence" className={label}>
          Evidence reference <span className="text-[var(--hz-danger)]">*</span>
        </label>
        <input id="proposal-evidence" value={reference} maxLength={255} onChange={(event) => setReference(event.target.value)} aria-invalid={!!error} className={field(!!error)} />
        {!error && <p className="text-[13px] text-[var(--hz-text-muted)]">Where the document is kept, for example a file or valuation report number. No file is uploaded here.</p>}
        <FieldError message={error} />
      </form>
    </DialogFrame>
  );
};

const ApproveDialog: React.FC<{ view: ProposalDetail; exception: ProposalException; etag: string; onClose: () => void; onDone: (after: ProposalDetail) => void }> = ({ view, exception, etag, onClose, onDone }) => {
  const { approve, pending } = useProposalCommands();
  const [note, setNote] = useState('');
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    setStale(false);
    const outcome = await approve(view.id, exception.id, note.trim(), etag);
    if (outcome.ok === true) return onDone(outcome.view);
    if (outcome.kind === 'stale') setStale(true);
    else setFailure(outcome.error);
  };
  return (
    <DialogFrame
      titleId="proposal-approve-title"
      title="Approve exception"
      subtitle={`${view.proposal_no} · ${exceptionLabel(exception.code)}`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="submit" form="proposal-approve-form" className="hz-button hz-button-primary" disabled={pending}>
            {pending ? 'Approving…' : 'Approve'}
          </button>
        </>
      }
    >
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <ApiErrorAlert error={failure} title="The exception was not approved" />}
      <form id="proposal-approve-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-3">
        <p className="text-sm text-[var(--hz-text-secondary)]">{exception.reason.charAt(0).toUpperCase() + exception.reason.slice(1)}.</p>
        {Object.keys(exception.details).length > 0 && (
          <DetailGrid dense columns={2} items={Object.entries(exception.details).map(([key, value]) => ({ label: humanize(key), value: String(value) }))} />
        )}
        <div>
          <label htmlFor="proposal-approve-note" className={label}>
            Note
          </label>
          <textarea id="proposal-approve-note" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="hz-field w-full px-3 py-2 text-sm" />
        </div>
      </form>
    </DialogFrame>
  );
};

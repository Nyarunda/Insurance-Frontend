/**
 * An endorsement (FI1-D): `GET /endorsements/{id}`, with its type, base version, requested change,
 * resulting terms, premium, levy and total deltas, status, `workflow` block and `blocker`.
 *
 * The only actions are the maker's: **Submit** (a draft) and **Withdraw** (a draft or a referred
 * endorsement). Approval happens only through the workflow instance, in the approver's queue: this
 * page never offers the lightweight `/approve` or `/decline`, and never starts another workflow.
 *
 * PTH1-D4: a referred endorsement with a `blocker`, or whose workflow is VOID, is shown as
 * "No longer actionable" with the blocker's message and required action; Withdraw is the only
 * action, and Submit is not offered. Resubmission or rework is a future lifecycle feature.
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { RefreshCw, Send, Undo2 } from 'lucide-react';
import {
  HorizonAlert,
  HorizonLoader,
  HorizonPage,
  HorizonPageContent,
  HorizonPageTitle,
  HorizonToast,
  KeyValueGrid,
  Section,
  StatusBadge,
} from '../../components/horizon';
import { CHANGED_TEXT, NOT_FOUND_TEXT, STALE_TEXT } from '../../lib/api/commandErrors';
import { describeError } from '../../lib/api/errorText';
import { ApiError } from '../../lib/api/errors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { hasPermission, useMe } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import {
  changedBenefit,
  ENDORSEMENT_STATUS_LABEL,
  ENDORSEMENT_TONE,
  formatDelta,
  isNoLongerActionable,
} from '../endorsements/format';
import { useEndorsement } from '../endorsements/queries';
import { policyHref, useRouteRefs } from '../policies/refs';
import type { EndorsementDetail } from '../endorsements/types';
import { NO_ETAG_TEXT, useEndorsementCommands } from '../endorsements/useEndorsementCommands';
import { WithdrawDialog } from '../endorsements/WithdrawDialog';
import { ENDORSEMENT_CREATE } from '../permissions';
import { formatDate } from '../policies/format';
import { displayFacts, formatDateTime, formatMoney, humanize, requiredActionText } from '../workflow/format';

export const NO_LONGER_ACTIONABLE = 'No longer actionable';
export const SENT_FOR_APPROVAL = 'Sent for approval';

type PageNotice = { tone: 'warning' | 'danger'; text?: string; error?: unknown; reference?: string | null } | null;

interface WithdrawState {
  notice: string | null;
  noticeReference: string | null;
  error: unknown;
  reasonError: string | null;
  reasonReference: string | null;
}

const freshWithdraw = (): WithdrawState => ({
  notice: null,
  noticeReference: null,
  error: null,
  reasonError: null,
  reasonReference: null,
});

const requiredActionOf = (error: unknown): string | null =>
  error instanceof ApiError && typeof error.details.required_action === 'string' ? error.details.required_action : null;

export const EndorsementPage: React.FC = () => {
  const { endorsementId, policyRef } = useRouteRefs();
  const navigate = useNavigate();
  // Carried unchanged, so the policy's Back still returns to the originating list (FI1-D-R1).
  const { state } = useLocation();
  const endorsement = useEndorsement(endorsementId);
  const me = useMe().data;
  const { submit, withdraw, pending } = useEndorsementCommands();
  const [pageNotice, setPageNotice] = useState<PageNotice>(null);
  const [withdrawing, setWithdrawing] = useState<WithdrawState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const back = () =>
    navigate(`${policyHref(endorsement.data ? endorsement.data.view.policy.policy_no : policyRef)}?tab=endorsements`, {
      state,
    });

  if (endorsement.isPending) return <HorizonLoader tip="Loading the endorsement..." />;
  if (endorsement.isError) {
    const missing = endorsement.error instanceof ApiError && endorsement.error.status === 404;
    return (
      <HorizonPage id="endorsement">
        <HorizonPageTitle title="Endorsement" onBack={back} backLabel="Back to the policy" />
        <HorizonPageContent className="p-4">
          {missing ? (
            <HorizonAlert tone="warning" title={NOT_FOUND_TEXT}>
              It does not exist, or its policy is outside the branches you can see.
              <ErrorReference reference={referenceOf(endorsement.error)} />
            </HorizonAlert>
          ) : (
            <ApiErrorAlert error={endorsement.error} title="The endorsement could not be loaded" />
          )}
        </HorizonPageContent>
      </HorizonPage>
    );
  }

  const { view, etag } = endorsement.data;
  const subject = `${view.endorsement_no} · ${view.policy.policy_no}`;
  const canPrepare = hasPermission(me, ENDORSEMENT_CREATE);
  const blocked = isNoLongerActionable(view);
  const canSubmit = canPrepare && view.status === 'DRAFT';
  const canWithdraw = canPrepare && (view.status === 'DRAFT' || view.status === 'REFERRED');

  const onSubmit = async () => {
    setPageNotice(null);
    if (!etag) {
      setPageNotice({ tone: 'warning', text: NO_ETAG_TEXT });
      return;
    }
    const outcome = await submit(view.id, etag);
    if (outcome.ok) {
      setToast(outcome.view.status === 'EFFECTIVE' ? `Effective: ${view.endorsement_no}` : `${SENT_FOR_APPROVAL}: ${view.endorsement_no}`);
      return;
    }
    const reference = referenceOf(outcome.error);
    if (outcome.kind === 'stale') setPageNotice({ tone: 'warning', text: STALE_TEXT, reference });
    else if (outcome.kind === 'changed') setPageNotice({ tone: 'warning', text: CHANGED_TEXT, reference });
    else setPageNotice({ tone: 'danger', error: outcome.error });
  };

  const onWithdraw = async (reason: string) => {
    if (!withdrawing) return;
    if (!etag) {
      setWithdrawing({ ...freshWithdraw(), notice: NO_ETAG_TEXT });
      return;
    }
    const outcome = await withdraw(view.id, reason, etag);
    if (outcome.ok) {
      setWithdrawing(null);
      setToast(`Withdrawn: ${view.endorsement_no}`);
      return;
    }
    const reference = referenceOf(outcome.error);
    switch (outcome.kind) {
      case 'stale':
        setWithdrawing({ ...freshWithdraw(), notice: STALE_TEXT, noticeReference: reference });
        return;
      case 'invalid': {
        const fields = fieldErrorsOf(outcome.error);
        setWithdrawing({
          ...freshWithdraw(),
          reasonError: fields.reason ?? describeError(outcome.error).message,
          reasonReference: reference,
        });
        return;
      }
      case 'defect':
      case 'network':
      case 'other':
        setWithdrawing({ ...freshWithdraw(), error: outcome.error });
        return;
      case 'changed':
        setWithdrawing(null);
        setPageNotice({ tone: 'warning', text: CHANGED_TEXT, reference });
        return;
      default:
        setWithdrawing(null);
        setPageNotice({ tone: 'danger', error: outcome.error });
    }
  };

  const noticeAction = pageNotice?.error ? requiredActionOf(pageNotice.error) : null;

  return (
    <HorizonPage id="endorsement">
      <HorizonPageTitle
        title={view.endorsement_no}
        subtitle={`${humanize(view.endorsement_type)} · Policy ${view.policy.policy_no}`}
        onBack={back}
        backLabel="Back to the policy"
        actions={
          <>
            <StatusBadge label={ENDORSEMENT_STATUS_LABEL[view.status] ?? humanize(view.status)} tone={ENDORSEMENT_TONE[view.status] ?? 'neutral'} />
            <button
              type="button"
              className="hz-button hz-button-secondary"
              onClick={() => void endorsement.refetch()}
              disabled={endorsement.isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${endorsement.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {canWithdraw && (
              <button
                type="button"
                className="hz-button hz-button-secondary"
                onClick={() => {
                  setPageNotice(null);
                  setWithdrawing(freshWithdraw());
                }}
                disabled={pending}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Withdraw
              </button>
            )}
            {canSubmit && (
              <button type="button" className="hz-button hz-button-primary" onClick={() => void onSubmit()} disabled={pending}>
                <Send className="h-3.5 w-3.5" />
                {pending ? 'Submitting…' : 'Submit'}
              </button>
            )}
          </>
        }
      />

      {pageNotice && (
        <div role="status">
          {pageNotice.error ? (
            <ApiErrorAlert error={pageNotice.error} title="The endorsement was not changed" />
          ) : (
            <HorizonAlert tone={pageNotice.tone}>
              {pageNotice.text}
              <ErrorReference reference={pageNotice.reference} />
            </HorizonAlert>
          )}
          {noticeAction && (
            <p className="mt-1 text-[13px] text-[var(--hz-text-secondary)]">Required action: {requiredActionText(noticeAction)}</p>
          )}
        </div>
      )}

      <StatePanel view={view} blocked={blocked} canWithdraw={canWithdraw} policyPath={policyHref(view.policy.policy_no)} returnState={state} />

      <HorizonPageContent className="p-5 space-y-2">
        <KeyValueGrid
          items={[
            { label: 'Type', value: humanize(view.endorsement_type) },
            { label: 'Policy', value: view.policy.policy_no },
            { label: 'Base version', value: `Version ${view.base_version_no}` },
            { label: 'Effective from', value: formatDate(view.effective_date) },
            { label: 'Reason', value: view.reason || '—' },
            { label: 'Submitted', value: formatDateTime(view.submitted_at) },
            ...(view.resulting_version_no !== null ? [{ label: 'Resulting version', value: `Version ${view.resulting_version_no}` }] : []),
            ...(view.decided_at ? [{ label: 'Decided', value: formatDateTime(view.decided_at) }] : []),
            ...(view.decision_reason ? [{ label: 'Decision reason', value: view.decision_reason }] : []),
          ]}
        />
        <RequestedChange view={view} />
        <Financials view={view} />
        <Approval view={view} />
      </HorizonPageContent>

      {withdrawing && (
        <WithdrawDialog
          subject={subject}
          pending={pending}
          notice={withdrawing.notice}
          noticeReference={withdrawing.noticeReference}
          error={withdrawing.error}
          reasonError={withdrawing.reasonError}
          reasonReference={withdrawing.reasonReference}
          onClose={() => setWithdrawing(null)}
          onConfirm={(reason) => void onWithdraw(reason)}
        />
      )}
      <HorizonToast message={toast} tone="success" />
    </HorizonPage>
  );
};

const StatePanel: React.FC<{
  view: EndorsementDetail;
  blocked: boolean;
  canWithdraw: boolean;
  policyPath: string;
  returnState: unknown;
}> = ({
  view,
  blocked,
  canWithdraw,
  policyPath,
  returnState,
}) => {
  if (blocked) {
    const action = view.blocker?.required_action;
    return (
      <HorizonAlert tone="warning" title={NO_LONGER_ACTIONABLE}>
        {view.blocker?.message ?? 'Its approval was cancelled, so it can no longer be approved.'}
        {action && <span className="mt-1 block">Required action: {requiredActionText(action)}</span>}
        <span className="mt-1 block text-[13px] text-[var(--hz-text-secondary)]">
          {canWithdraw ? 'Withdraw is the only action left.' : 'Its maker can withdraw it; nothing else can be done with it.'}
        </span>
      </HorizonAlert>
    );
  }
  switch (view.status) {
    case 'DRAFT':
      return (
        <HorizonAlert tone="info" title="Draft">
          {view.requires_check
            ? 'This change needs approval: submitting sends it for approval.'
            : 'This change needs no approval: submitting applies it to the policy at once.'}
        </HorizonAlert>
      );
    case 'REFERRED':
      return view.workflow?.status === 'PENDING_APPROVAL' ? (
        <HorizonAlert tone="info" title={SENT_FOR_APPROVAL}>
          Waiting at the {humanize(view.workflow.stage) || 'approval'} stage. The approver decides it from their work queue.
        </HorizonAlert>
      ) : (
        <HorizonAlert tone="info" title="Waiting for approval">
          This endorsement needs approval before it takes effect.
        </HorizonAlert>
      );
    case 'EFFECTIVE': {
      const benefit = changedBenefit(view);
      return (
        <HorizonAlert tone="success" title="Effective">
          The policy is now at version {view.resulting_version_no ?? '—'}
          {benefit && benefit.limit_amount !== null
            ? `, with the ${benefit.name} limit at ${formatMoney(benefit.limit_amount, view.financial.currency)}`
            : ''}
          . <Link to={policyPath} state={returnState} className="font-semibold underline">View the policy</Link>
        </HorizonAlert>
      );
    }
    case 'DECLINED':
      return (
        <HorizonAlert tone="danger" title="Declined">
          {view.decision_reason || 'The approval was rejected.'}
        </HorizonAlert>
      );
    case 'CANCELLED':
      return (
        <HorizonAlert tone="neutral" title="Withdrawn">
          {view.decision_reason || 'It was withdrawn and will not take effect.'}
        </HorizonAlert>
      );
    default:
      return null;
  }
};

const RequestedChange: React.FC<{ view: EndorsementDetail }> = ({ view }) => {
  const currency = view.financial.currency;
  const benefit = view.endorsement_type === 'CHANGE_LIMIT' ? changedBenefit(view) : null;
  const requested = view.endorsement_type === 'CHANGE_LIMIT' ? [] : displayFacts(view.requested_changes);
  const terms = view.resulting_terms;
  return (
    <>
      <Section title="Requested change">
        {benefit ? (
          <KeyValueGrid
            items={[
              { label: 'Benefit', value: benefit.name },
              {
                label: 'New limit',
                value: benefit.limit_amount !== null ? formatMoney(benefit.limit_amount, currency) : 'No limit stated',
              },
              ...(benefit.limit_description ? [{ label: 'Limit wording', value: benefit.limit_description }] : []),
            ]}
          />
        ) : requested.length > 0 ? (
          <KeyValueGrid items={requested} />
        ) : (
          <p className="text-[13px] text-[var(--hz-text-secondary)]">No details.</p>
        )}
      </Section>
      <Section title="Resulting terms">
        <KeyValueGrid
          items={[
            { label: 'Expiry', value: formatDate(terms.expiry_date) },
            { label: 'Sum insured', value: formatMoney(terms.sum_insured, currency) },
          ]}
        />
        {(terms.cover?.benefits ?? []).length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="hz-grid w-full" aria-label="Resulting benefits and limits">
              <thead>
                <tr>
                  <th>Benefit</th>
                  <th className="text-right">Limit</th>
                </tr>
              </thead>
              <tbody>
                {terms.cover.benefits.map((item) => (
                  <tr key={item.code}>
                    <td>{item.name}</td>
                    <td className="text-right tabular-nums">
                      {item.limit_amount !== null ? formatMoney(item.limit_amount, currency) : 'No limit stated'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
};

const Financials: React.FC<{ view: EndorsementDetail }> = ({ view }) => {
  const { currency } = view.financial;
  return (
    <Section title="Premium">
      <KeyValueGrid
        items={[
          { label: 'Premium change', value: formatDelta(view.financial.premium_delta, currency) },
          { label: 'Levy change', value: formatDelta(view.financial.levy_delta, currency) },
          { label: 'Total change', value: formatDelta(view.financial.total_delta, currency) },
          ...(view.financial.commission_delta !== undefined
            ? [{ label: 'Commission change', value: formatDelta(view.financial.commission_delta, currency) }]
            : []),
          { label: 'Annual premium before', value: formatMoney(view.old_annual.total_premium, currency) },
          { label: 'Annual premium after', value: formatMoney(view.new_annual.total_premium, currency) },
        ]}
      />
    </Section>
  );
};

const Approval: React.FC<{ view: EndorsementDetail }> = ({ view }) => (
  <Section title="Approval">
    {view.workflow ? (
      <KeyValueGrid
        items={[
          { label: 'Approval', value: humanize(view.workflow.definition_code) },
          { label: 'Approval status', value: humanize(view.workflow.status) },
          { label: 'Stage', value: humanize(view.workflow.stage) || '—' },
        ]}
      />
    ) : (
      <p className="text-[13px] text-[var(--hz-text-secondary)]">
        {view.requires_check ? 'Not sent for approval yet.' : 'This change needs no approval.'}
      </p>
    )}
  </Section>
);

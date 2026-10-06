/**
 * A workflow instance (FI1-B): approval facts, stage, quorum, history with the reason text
 * (PTH1-D4), status, and the ETag from the response header.
 *
 * APPROVE and REJECT are offered only while the instance is PENDING_APPROVAL and the caller's queue
 * holds its current step. Hiding the buttons is a convenience; the backend decides every action.
 *
 * DESIGN-1: the record layout, as the endorsement: status beside the title, the requested change set
 * apart, the other facts and the history on the left, the approval's standing in a side column.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Check, ClipboardCheck, XCircle } from 'lucide-react';
import {
  ChangeCallout,
  DetailDivider,
  DetailGrid,
  DetailGroup,
  HorizonAlert,
  HorizonLoader,
  HorizonToast,
  RecordColumns,
  SideSection,
  StatusBadge,
  StatusTone,
  SummaryList,
} from '../../components/horizon';
import { CHANGED_TEXT, NOT_FOUND_TEXT, STALE_TEXT } from '../../lib/api/commandErrors';
import { describeError } from '../../lib/api/errorText';
import { ApiError } from '../../lib/api/errors';
import { useMe } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { DecisionDialog, DecisionInput } from '../workflow/DecisionDialog';
import {
  actorLabel,
  changeSummary,
  DECISION_KEYS,
  decisionFacts,
  displayFacts,
  formatDateTime,
  formatMoney,
  humanize,
  readableReason,
  requiredActionText,
} from '../workflow/format';
import { useInstance, useWorkQueue } from '../workflow/queries';
import type { ActionBody, Decision } from '../workflow/types';
import { useDecision } from '../workflow/useDecision';

const STATUS_TONE: Record<string, StatusTone> = {
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  VOID: 'neutral',
};

export const VOID_HEADING = 'Void: this approval no longer applies';

const TITLE_ID = 'workflow-instance-title';

type PageNotice = { tone: 'warning' | 'danger'; text?: string; error?: unknown; reference?: string | null } | null;

interface DialogState {
  decision: Decision;
  notice: string | null;
  noticeReference: string | null;
  error: unknown;
  reasonError: string | null;
  reasonReference: string | null;
}

const freshDialog = (decision: Decision): DialogState => ({
  decision,
  notice: null,
  noticeReference: null,
  error: null,
  reasonError: null,
  reasonReference: null,
});

export const InstancePage: React.FC = () => {
  const { instanceId = '' } = useParams();
  const navigate = useNavigate();
  const instance = useInstance(instanceId);
  const queue = useWorkQueue();
  const me = useMe().data;
  const { submit, pending } = useDecision(instanceId);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [pageNotice, setPageNotice] = useState<PageNotice>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const back = () => navigate('/my-work/list');

  const frame = {
    titleId: TITLE_ID,
    onClose: back,
    closeLabel: 'Back to My Work Queue',
    size: 'xl' as const,
    icon: <ClipboardCheck className="h-4 w-4" />,
  };
  const close = (
    <button type="button" className="hz-button hz-button-secondary" onClick={back}>
      Cancel
    </button>
  );

  if (instance.isPending) {
    return (
      <DialogFrame {...frame} title="Approval" footer={close}>
        <HorizonLoader tip="Loading the approval..." />
      </DialogFrame>
    );
  }
  if (instance.isError) {
    const missing = instance.error instanceof ApiError && instance.error.status === 404;
    return (
      <DialogFrame {...frame} title="Approval" footer={close}>
        {missing ? (
          <HorizonAlert tone="warning" title={NOT_FOUND_TEXT}>
            It may have been completed, or it is not one you can see.
            <ErrorReference reference={referenceOf(instance.error)} />
          </HorizonAlert>
        ) : (
          <ApiErrorAlert error={instance.error} title="The approval could not be loaded" />
        )}
      </DialogFrame>
    );
  }

  const { view, etag } = instance.data;
  const myTask = queue.data?.results.find(
    (task) => task.workflow_instance_id === view.id && task.step_id === view.step_id,
  );
  const canAct = view.status === 'PENDING_APPROVAL' && !!myTask && !!view.step_id;
  const subject = `${humanize(view.resource.type)}${view.resource.reference ? ` ${view.resource.reference}` : ''}`;

  const open = (decision: Decision) => {
    setPageNotice(null);
    setDialog(freshDialog(decision));
  };

  const confirm = async ({ reasonCode, reasonText }: DecisionInput) => {
    if (!dialog || !myTask || !view.step_id) return;
    const body: ActionBody = {
      action: dialog.decision,
      step_id: view.step_id,
      ...(myTask.slot_no != null ? { slot_no: myTask.slot_no } : {}),
      ...(dialog.decision === 'REJECT' ? { reason_code: reasonCode } : {}),
      ...(reasonText ? { reason_text: reasonText } : {}),
    };
    const outcome = await submit(body, etag);
    if (outcome.ok === true) {
      setDialog(null);
      setToast(`${dialog.decision === 'APPROVE' ? 'Approved' : 'Rejected'}: ${subject}`);
      return;
    }
    const reference = referenceOf(outcome.error);
    switch (outcome.kind) {
      case 'stale':
        setDialog({ ...freshDialog(dialog.decision), notice: STALE_TEXT, noticeReference: reference });
        return;
      case 'invalid':
        setDialog({
          ...freshDialog(dialog.decision),
          reasonError: describeError(outcome.error).message,
          reasonReference: reference,
        });
        return;
      case 'defect':
      case 'network':
      case 'other':
        setDialog({ ...freshDialog(dialog.decision), error: outcome.error });
        return;
      case 'changed':
        setDialog(null);
        setPageNotice({ tone: 'warning', text: CHANGED_TEXT, reference });
        return;
      default: // refused, business, notFound: the server's message, no retry; the screen has been reloaded
        setDialog(null);
        setPageNotice({ tone: 'danger', error: outcome.error });
    }
  };

  const requiredAction =
    pageNotice?.error instanceof ApiError && typeof pageNotice.error.details.required_action === 'string'
      ? pageNotice.error.details.required_action
      : null;
  // RUP1-F1: what was asked for comes first, in words; the other governed facts follow.
  const decision = decisionFacts(view.approval_facts, view.currency);
  const rest = view.approval_facts
    ? Object.fromEntries(
        Object.entries(view.approval_facts).filter(([key]) => !(DECISION_KEYS as readonly string[]).includes(key)),
      )
    : null;
  const facts = displayFacts(rest);
  const summary = changeSummary(view.approval_facts, view.currency);
  // FI1-E: a void instance says so as a heading, with the reason recorded when it was voided.
  const voided = view.status === 'VOID' ? [...view.history].reverse().find((entry) => entry.new_status === 'VOID') : undefined;
  const voidReason = voided?.reason_text ? readableReason(voided.reason_text) : voided?.reason_code ? humanize(voided.reason_code) : null;

  return (
    <>
      {/* Under the decision dialog, this one is inert: one dialog at a time is exposed. */}
      <div inert={dialog ? true : undefined} aria-hidden={dialog ? true : undefined}>
      <DialogFrame
        {...frame}
        title={subject}
        subtitle={`${humanize(view.definition_code)} · version ${view.version_no}`}
        badge={<StatusBadge square label={humanize(view.status)} tone={STATUS_TONE[view.status] ?? 'neutral'} />}
        expandable
        footer={
          <>
            <button type="button" className="hz-button hz-button-secondary" onClick={back}>
              {canAct ? 'Cancel' : 'Close'}
            </button>
            {canAct && (
              <>
                <button type="button" className="hz-button hz-button-danger" onClick={() => open('REJECT')}>
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button type="button" className="hz-button hz-button-primary" onClick={() => open('APPROVE')}>
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </button>
              </>
            )}
          </>
        }
      >

      {pageNotice && (
        <div role="status">
          {pageNotice.error ? (
            <ApiErrorAlert error={pageNotice.error} title="The decision was not recorded" />
          ) : (
            <HorizonAlert tone={pageNotice.tone}>
              {pageNotice.text}
              <ErrorReference reference={pageNotice.reference} />
            </HorizonAlert>
          )}
          {requiredAction && (
            <p className="mt-1 text-[13px] text-[var(--hz-text-secondary)]">Required action: {requiredActionText(requiredAction)}</p>
          )}
        </div>
      )}

      {view.status === 'VOID' && (
        <HorizonAlert tone="neutral" title={VOID_HEADING}>
          {voidReason ?? 'It was cancelled before a decision.'}
          <span className="mt-1 block">No decision can be made on it.</span>
        </HorizonAlert>
      )}

      {view.status === 'PENDING_APPROVAL' && !canAct && queue.isSuccess && (
        <HorizonAlert tone="info">This approval is not in your queue, so there is nothing for you to decide.</HorizonAlert>
      )}

      <RecordColumns
        main={
          <>
            <DetailGroup title="What is being approved">
              {decision.length > 0 && (
                <ChangeCallout aria-label="Requested change" label="Requested change" change={summary}>
                  <DetailGrid dense items={decision.map((fact) => ({ label: fact.label, value: fact.value }))} />
                </ChangeCallout>
              )}
              {facts.length > 0 && (
                <div className={decision.length > 0 ? 'mt-4' : ''} aria-label="Other approval facts">
                  <DetailGrid dense items={facts.map((fact) => ({ label: fact.label, value: fact.value }))} />
                </div>
              )}
              {decision.length === 0 && facts.length === 0 && (
                <p className="text-[13px] text-[var(--hz-text-muted)]">No approval facts were recorded.</p>
              )}
            </DetailGroup>
            <DetailDivider />
            <DetailGroup title="History">
              {view.history.length === 0 ? (
                <p className="text-[13px] text-[var(--hz-text-secondary)]">No actions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="hz-grid w-full" aria-label="Workflow history">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Action</th>
                        <th>By</th>
                        <th>Outcome</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.history.map((entry, index) => (
                        <tr key={`${entry.occurred_at}-${index}`}>
                          <td className="whitespace-nowrap">{formatDateTime(entry.occurred_at)}</td>
                          <td>{humanize(entry.action)}</td>
                          <td>{actorLabel(entry, me?.user.id)}</td>
                          <td>{humanize(entry.new_status) || '—'}</td>
                          <td>
                            {entry.reason_code ? humanize(entry.reason_code) : ''}
                            {entry.reason_text && (
                              <span className="block text-[13px] text-[var(--hz-text-secondary)]">{readableReason(entry.reason_text)}</span>
                            )}
                            {!entry.reason_code && !entry.reason_text && '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DetailGroup>
          </>
        }
        side={
          <>
            <SideSection title="Standing">
              <SummaryList
                items={[
                  { label: 'Stage', value: view.stage_label || humanize(view.stage) || '—' },
                  { label: 'Approvals', value: view.quorum ? `${view.quorum.counted} of ${view.quorum.required}` : '—' },
                  { label: 'Amount', value: formatMoney(view.amount, view.currency, view.amount_reason) },
                ]}
              />
            </SideSection>
            <SideSection title="Dates">
              <SummaryList
                items={[
                  { label: 'Submitted', value: formatDateTime(view.submitted_at) },
                  { label: 'Completed', value: formatDateTime(view.completed_at) },
                ]}
              />
            </SideSection>
          </>
        }
      />
      </DialogFrame>
      </div>

      {dialog && (
        <DecisionDialog
          decision={dialog.decision}
          subject={subject}
          stageLabel={view.stage_label}
          pending={pending}
          notice={canAct ? dialog.notice : CHANGED_TEXT}
          noticeReference={dialog.noticeReference}
          error={dialog.error}
          reasonError={dialog.reasonError}
          reasonReference={dialog.reasonReference}
          unavailable={!canAct}
          onClose={() => setDialog(null)}
          onConfirm={(input) => void confirm(input)}
        />
      )}
      <HorizonToast message={toast} tone="success" />
    </>
  );
};

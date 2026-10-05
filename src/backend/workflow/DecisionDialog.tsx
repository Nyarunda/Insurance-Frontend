/**
 * The workflow decision dialog in backend mode (FI1-B; the FI1-E gaps from PR #1 that concern the
 * decision rules are applied here, because this is where they are decided):
 *
 * - APPROVE takes an optional comment, sent as `reason_text` only when given and kept on the
 *   approval in the workflow history (the backend's approve keeps it from APPROVE-COMMENT on).
 * - REJECT needs one of the tenant's reason codes, from the backend, never invented. When the code
 *   `requires_text`, the text is required; otherwise it is optional. The text is sent as
 *   `reason_text` and kept in the workflow history.
 * - With no rejection reasons configured, rejection is unavailable and the dialog says so.
 * - What the user typed is kept while the dialog is open (a 412 reload does not lose it), and a click
 *   on the backdrop does not discard it.
 */

import React, { useState } from 'react';
import { Check, XCircle } from 'lucide-react';
import { CharacterCounter, FieldError, HorizonAlert, HorizonLoader } from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { ApiErrorAlert, ErrorReference } from '../components/ApiErrorAlert';
import { useReasonCodes } from './queries';
import type { Decision } from './types';

export const REASON_TEXT_MAX = 2000;
export const NO_REJECTION_REASONS = 'No rejection reasons are configured for this tenant.';

export interface DecisionInput {
  reasonCode?: string;
  reasonText?: string;
}

interface DecisionDialogProps {
  decision: Decision;
  subject: string;
  stageLabel?: string | null;
  pending: boolean;
  /** Shown above the form, for example after a 412 reload. */
  notice?: string | null;
  /** The correlation ID of the response that caused the notice. */
  noticeReference?: string | null;
  /** A refusal to show with its reference. */
  error?: unknown;
  /** The backend's complaint about the reason (422), shown on the field. */
  reasonError?: string | null;
  /** The correlation ID of that 422. */
  reasonReference?: string | null;
  /** The task is no longer the caller's to decide (for example after a reload): nothing can be sent. */
  unavailable?: boolean;
  onClose: () => void;
  onConfirm: (input: DecisionInput) => void;
}

export const DecisionDialog: React.FC<DecisionDialogProps> = ({
  decision,
  subject,
  stageLabel,
  pending,
  notice,
  noticeReference,
  error,
  reasonError,
  reasonReference,
  unavailable = false,
  onClose,
  onConfirm,
}) => {
  const rejecting = decision === 'REJECT';
  const reasons = useReasonCodes('REJECT', rejecting);
  const [reasonCode, setReasonCode] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [attempted, setAttempted] = useState(false);

  const selected = reasons.data?.find((reason) => reason.code === reasonCode);
  const noReasons = rejecting && reasons.isSuccess && reasons.data.length === 0;
  const codeError = rejecting && !selected ? 'Choose a reason.' : undefined;
  const textError =
    rejecting && selected?.requires_text && !reasonText.trim() ? 'This reason needs an explanation.' : undefined;
  const blocked = pending || unavailable || (rejecting && (!reasons.isSuccess || noReasons));

  const confirm = () => {
    setAttempted(true);
    if (blocked || codeError || textError) return;
    onConfirm(rejecting ? { reasonCode, reasonText: reasonText.trim() || undefined } : { reasonText: reasonText.trim() || undefined });
  };

  const title = `${rejecting ? 'Reject' : 'Approve'}${stageLabel ? ` — ${stageLabel}` : ''}`;

  return (
    <DialogFrame
      titleId="workflow-decision-title"
      title={title}
      subtitle={subject}
      onClose={onClose}
      dismissOnBackdrop={!reasonCode && !reasonText}
      footer={
        <>
          <button type="button" onClick={onClose} className="hz-button hz-button-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={blocked}
            className={`hz-button ${rejecting ? 'hz-button-danger' : 'hz-button-primary'} disabled:opacity-60`}
          >
            {rejecting ? <XCircle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {pending ? 'Sending…' : rejecting ? 'Confirm rejection' : 'Confirm approval'}
          </button>
        </>
      }
    >
      {notice && (
        <div role="status">
          <HorizonAlert tone="warning">
            {notice}
            <ErrorReference reference={noticeReference} />
          </HorizonAlert>
        </div>
      )}
      {error ? <ApiErrorAlert error={error} /> : null}

      {!rejecting && (
        <>
          <p className="text-[13px] text-[var(--hz-text-secondary)]">Approving records your decision at this stage.</p>
          <div>
            <label htmlFor="workflow-approve-comment" className="mb-1 block text-[13px] font-semibold text-[var(--hz-text-primary)]">
              Comment <span className="font-normal text-[var(--hz-text-secondary)]">(optional)</span>
            </label>
            <textarea
              id="workflow-approve-comment"
              rows={4}
              maxLength={REASON_TEXT_MAX}
              value={reasonText}
              placeholder="For example, what you checked before approving"
              onChange={(event) => setReasonText(event.target.value)}
              className="hz-field w-full resize-none p-2 text-[13px]"
            />
            <div className="flex items-start justify-between gap-3">
              <p className="mt-1 text-[13px] text-[var(--hz-text-secondary)]">The comment is kept in the approval's history.</p>
              <CharacterCounter current={reasonText.length} max={REASON_TEXT_MAX} />
            </div>
          </div>
        </>
      )}

      {rejecting && reasons.isPending && <HorizonLoader tip="Loading rejection reasons..." />}
      {rejecting && reasons.isError && <ApiErrorAlert error={reasons.error} title="Rejection reasons could not be loaded" />}
      {noReasons && (
        <HorizonAlert tone="warning" title="Rejection is unavailable">
          {NO_REJECTION_REASONS}
        </HorizonAlert>
      )}

      {rejecting && reasons.isSuccess && reasons.data.length > 0 && (
        <>
          <p className="text-[13px] text-[var(--hz-text-secondary)]">Rejecting stops this request. The maker sees the reason.</p>
          <div>
            <label htmlFor="workflow-reason" className="mb-1 block text-[13px] font-semibold text-[var(--hz-text-primary)]">
              Reason <span className="text-[var(--hz-danger)]">*</span>
            </label>
            <select
              id="workflow-reason"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
              aria-invalid={attempted && !!codeError}
              className={`hz-field w-full px-2 text-[13px] ${attempted && codeError ? 'hz-field-invalid' : ''}`}
            >
              <option value="">Select a reason…</option>
              {reasons.data.map((reason) => (
                <option key={reason.code} value={reason.code}>
                  {reason.label}
                </option>
              ))}
            </select>
            {attempted && <FieldError message={codeError} />}
          </div>
          <div>
            <label htmlFor="workflow-reason-text" className="mb-1 block text-[13px] font-semibold text-[var(--hz-text-primary)]">
              Explanation{' '}
              {selected?.requires_text ? (
                <span className="text-[var(--hz-danger)]">*</span>
              ) : (
                <span className="font-normal text-[var(--hz-text-secondary)]">(optional)</span>
              )}
            </label>
            <textarea
              id="workflow-reason-text"
              rows={4}
              maxLength={REASON_TEXT_MAX}
              value={reasonText}
              onChange={(event) => setReasonText(event.target.value)}
              aria-invalid={attempted && !!(textError || reasonError)}
              className={`hz-field w-full resize-none p-2 text-[13px] ${attempted && (textError || reasonError) ? 'hz-field-invalid' : ''}`}
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                {attempted && <FieldError message={textError ?? reasonError ?? undefined} />}
                {attempted && !textError && reasonError && <ErrorReference reference={reasonReference} />}
                <p className="mt-1 text-[13px] text-[var(--hz-text-secondary)]">The explanation is kept in the workflow history.</p>
              </div>
              <CharacterCounter current={reasonText.length} max={REASON_TEXT_MAX} />
            </div>
          </div>
        </>
      )}
    </DialogFrame>
  );
};

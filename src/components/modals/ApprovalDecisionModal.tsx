import React, { useEffect, useState } from 'react';
import { Check, Send, XCircle } from 'lucide-react';
import { CharacterCounter, FieldError } from '../horizon';
import { DialogFrame } from './DialogFrame';

export type ApprovalDecision = 'APPROVE' | 'REJECT' | 'DELEGATE';

export const COMMENT_MIN_LENGTH = 10;
const COMMENT_MAX_LENGTH = 500;

const DECISION_COPY: Record<ApprovalDecision, { title: string; confirm: string; helper: string; button: string; Icon: React.ElementType }> = {
  APPROVE: {
    title: 'Approve',
    confirm: 'Confirm approval',
    helper: 'Record why this is being approved. The comment is kept in the audit trail.',
    button: 'hz-button-primary',
    Icon: Check,
  },
  REJECT: {
    title: 'Reject',
    confirm: 'Confirm rejection',
    helper: 'Rejecting stops this request. Explain the reason so the maker can act on it.',
    button: 'hz-button-danger',
    Icon: XCircle,
  },
  DELEGATE: {
    title: 'Delegate',
    confirm: 'Delegate approval',
    helper: 'Hand this decision to someone else. Say why and what you need from them.',
    button: 'hz-button-primary',
    Icon: Send,
  },
};

interface ApprovalDecisionModalProps {
  decision: ApprovalDecision | null;
  /** What is being decided, e.g. "Claim payment · CLM/MTR/2026/0081". */
  subject: string;
  /** Current stage label, e.g. "Claims Manager". */
  stageLabel?: string;
  /** People the decision can be delegated to. Required for DELEGATE. */
  delegates?: string[];
  onClose: () => void;
  onConfirm: (decision: ApprovalDecision, comment: string, delegateTo?: string) => void;
}

/** Approve, reject and delegate all land here, and none can be submitted without a comment. */
export const ApprovalDecisionModal: React.FC<ApprovalDecisionModalProps> = ({
  decision,
  subject,
  stageLabel,
  delegates = [],
  onClose,
  onConfirm,
}) => {
  const [comment, setComment] = useState('');
  const [delegateTo, setDelegateTo] = useState('');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    setComment('');
    setDelegateTo('');
    setAttempted(false);
  }, [decision]);

  if (!decision) return null;

  const copy = DECISION_COPY[decision];
  const trimmed = comment.trim();
  const commentError =
    trimmed.length === 0
      ? 'A comment is required.'
      : trimmed.length < COMMENT_MIN_LENGTH
      ? `Add at least ${COMMENT_MIN_LENGTH} characters.`
      : undefined;
  const delegateError = decision === 'DELEGATE' && !delegateTo ? 'Choose who to delegate to.' : undefined;

  const submit = () => {
    setAttempted(true);
    if (commentError || delegateError) return;
    onConfirm(decision, trimmed, decision === 'DELEGATE' ? delegateTo : undefined);
  };

  return (
    <DialogFrame
      titleId="approval-decision-title"
      title={`${copy.title}${stageLabel ? ` — ${stageLabel}` : ''}`}
      subtitle={subject}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="hz-button hz-button-secondary">
            Cancel
          </button>
          <button type="button" onClick={submit} className={`hz-button ${copy.button}`}>
            <copy.Icon className="h-3.5 w-3.5" />
            {copy.confirm}
          </button>
        </>
      }
    >
      <p className="text-xs text-[var(--hz-text-secondary)]">{copy.helper}</p>

      {decision === 'DELEGATE' && (
        <div>
          <label htmlFor="approval-delegate" className="mb-1 block text-[13px] font-semibold text-[var(--hz-text-primary)]">
            Delegate to <span className="text-[var(--hz-danger)]">*</span>
          </label>
          <select
            id="approval-delegate"
            value={delegateTo}
            onChange={(event) => setDelegateTo(event.target.value)}
            aria-invalid={attempted && !!delegateError}
            className={`hz-field w-full px-2 ${attempted && delegateError ? 'hz-field-invalid' : ''}`}
          >
            <option value="">Select a person…</option>
            {delegates.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {attempted && <FieldError message={delegateError} />}
        </div>
      )}

      <div>
        <label htmlFor="approval-comment" className="mb-1 block text-[13px] font-semibold text-[var(--hz-text-primary)]">
          Comment <span className="text-[var(--hz-danger)]">*</span>
        </label>
        <textarea
          id="approval-comment"
          autoFocus
          rows={4}
          maxLength={COMMENT_MAX_LENGTH}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          aria-invalid={attempted && !!commentError}
          placeholder="Add a note for the audit trail…"
          className={`hz-field w-full resize-none p-2 ${attempted && commentError ? 'hz-field-invalid' : ''}`}
        />
        <div className="flex items-start justify-between gap-3">
          <div>{attempted && <FieldError message={commentError} />}</div>
          <CharacterCounter current={comment.length} max={COMMENT_MAX_LENGTH} />
        </div>
      </div>
    </DialogFrame>
  );
};

/**
 * Withdraw an endorsement (FI1-D): `POST /endorsements/{id}/cancel` with a reason, which the backend
 * requires. A pending approval is voided by the backend first. What was typed survives a 412
 * reload, and a backdrop click does not discard it.
 */

import React, { useState } from 'react';
import { CharacterCounter, FieldError, HorizonAlert } from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { ApiErrorAlert, ErrorReference } from '../components/ApiErrorAlert';

export const WITHDRAW_REASON_MAX = 500;

export const WithdrawDialog: React.FC<{
  subject: string;
  pending: boolean;
  notice?: string | null;
  noticeReference?: string | null;
  error?: unknown;
  reasonError?: string | null;
  reasonReference?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}> = ({ subject, pending, notice, noticeReference, error, reasonError, reasonReference, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const missing = !reason.trim() ? 'Give the reason for withdrawing it.' : undefined;

  const confirm = () => {
    setAttempted(true);
    if (missing) return;
    onConfirm(reason.trim());
  };

  return (
    <DialogFrame
      titleId="withdraw-endorsement-title"
      title="Withdraw endorsement"
      subtitle={subject}
      onClose={onClose}
      dismissOnBackdrop={!reason}
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>
            Keep it
          </button>
          <button type="button" className="hz-button hz-button-danger" onClick={confirm} disabled={pending}>
            {pending ? 'Withdrawing…' : 'Withdraw'}
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
      {error != null && <ApiErrorAlert error={error} title="The endorsement was not withdrawn" />}
      <p className="text-[13px] text-[var(--hz-text-secondary)]">
        It will not take effect. A pending approval is cancelled. This cannot be undone.
      </p>
      <div>
        <label htmlFor="withdraw-reason" className="mb-1 block text-[13px] font-semibold text-[var(--hz-text-primary)]">
          Reason <span className="text-[var(--hz-danger)]">*</span>
        </label>
        <textarea
          id="withdraw-reason"
          rows={3}
          maxLength={WITHDRAW_REASON_MAX}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={(attempted && !!missing) || !!reasonError}
          className={`hz-field w-full px-2 py-1.5 text-[13px] ${(attempted && missing) || reasonError ? 'hz-field-invalid' : ''}`}
        />
        <div className="flex items-start justify-between gap-2">
          <div>
            <FieldError message={(attempted ? missing : undefined) ?? reasonError ?? undefined} />
            {reasonError && <ErrorReference reference={reasonReference} />}
          </div>
          <CharacterCounter current={reason.length} max={WITHDRAW_REASON_MAX} />
        </div>
      </div>
    </DialogFrame>
  );
};

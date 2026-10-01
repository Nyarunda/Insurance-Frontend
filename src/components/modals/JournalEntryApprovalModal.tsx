import React, { useState } from 'react';
import { Check, X, XCircle } from 'lucide-react';
import { JournalEntryRecord } from '../../data/recordsStore';

interface JournalEntryApprovalModalProps {
  entry: JournalEntryRecord | null;
  stepName?: string;
  onClose: () => void;
  onApprove: (comment?: string) => void;
  onReject: (comment?: string) => void;
}

export const JournalEntryApprovalModal: React.FC<JournalEntryApprovalModalProps> = ({
  entry,
  stepName,
  onClose,
  onApprove,
  onReject,
}) => {
  const [comment, setComment] = useState('');
  const [confirmingReject, setConfirmingReject] = useState(false);

  if (!entry) return null;

  const handleClose = () => {
    setComment('');
    setConfirmingReject(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
                APPROVAL REQUIRED
              </span>
              <h2 className="text-base font-bold text-slate-900">{entry.voucherNumber}</h2>
            </div>
            {stepName && <p className="text-xs text-slate-500 mt-0.5">Current step: {stepName}</p>}
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Description</div>
              <div className="font-semibold text-slate-900 mt-0.5">{entry.description}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Branch</div>
              <div className="font-semibold text-slate-900 mt-0.5">{entry.branch}</div>
            </div>
            {entry.reference && (
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Reference</div>
                <div className="font-mono text-slate-700 mt-0.5">{entry.reference}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Amount</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">KES {entry.totalKes.toLocaleString()}</div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              Ledger Lines
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 text-[10px] uppercase text-slate-400 font-mono">
                <tr>
                  <th className="px-3 py-1.5">Account</th>
                  <th className="px-3 py-1.5 text-right">Debit</th>
                  <th className="px-3 py-1.5 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entry.lines.map((line, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-mono text-slate-700">
                      {line.accountCode} — {line.accountName}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-slate-900">
                      {line.debitKes > 0 ? line.debitKes.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-slate-900">
                      {line.creditKes > 0 ? line.creditKes.toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Add a note for the audit trail..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {confirmingReject && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>This will permanently stop {entry.voucherNumber} — it will not post to the ledger. Confirm rejection?</span>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
          >
            Cancel
          </button>
          {!confirmingReject ? (
            <button
              onClick={() => setConfirmingReject(true)}
              className="px-4 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold"
            >
              Reject
            </button>
          ) : (
            <button
              onClick={() => onReject(comment.trim() || undefined)}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Confirm Reject</span>
            </button>
          )}
          <button
            onClick={() => onApprove(comment.trim() || undefined)}
            disabled={confirmingReject}
            className="px-4 py-1.5 rounded-lg bg-[var(--hz-primary-700)] hover:bg-[var(--hz-primary-800)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve</span>
          </button>
        </div>
      </div>
    </div>
  );
};

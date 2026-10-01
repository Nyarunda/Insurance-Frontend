import React, { useState } from 'react';
import { Check, CheckCircle2, Circle, ExternalLink, X, XCircle } from 'lucide-react';
import { WorkflowInstanceRecord } from '../../data/recordsStore';
import { ROLE_LABELS } from '../../data/roleRights';

interface WorkflowReviewModalProps {
  instance: WorkflowInstanceRecord | null;
  onClose: () => void;
  onApprove: (comment?: string) => void;
  onReject: (comment?: string) => void;
  onOpenRecord: () => void;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  QUOTE: 'Quotation',
  POLICY: 'Policy',
  CLAIM: 'Claim',
  PAYMENT: 'Journal Entry',
};

export const WorkflowReviewModal: React.FC<WorkflowReviewModalProps> = ({ instance, onClose, onApprove, onReject, onOpenRecord }) => {
  const [comment, setComment] = useState('');
  const [confirmingReject, setConfirmingReject] = useState(false);

  if (!instance) return null;

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
                {DOCUMENT_TYPE_LABELS[instance.documentType] ?? instance.documentType}
              </span>
              <h2 className="text-base font-bold text-slate-900">{instance.documentLabel}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{instance.definitionName}</p>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Amount</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">KES {instance.amountKes.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Branch</div>
              <div className="font-semibold text-slate-900 mt-0.5">{instance.branch}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Requested By</div>
              <div className="font-semibold text-slate-900 mt-0.5">{instance.initiatedBy}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Requested</div>
              <div className="font-mono text-slate-700 mt-0.5">{new Date(instance.createdAt).toLocaleString()}</div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              Approval Chain
            </div>
            <div className="divide-y divide-slate-100">
              {instance.applicableSteps.map((step, index) => {
                const isDone = index < instance.currentStepIndex;
                const isCurrent = index === instance.currentStepIndex;
                return (
                  <div key={step.id} className="flex items-center gap-2.5 px-3 py-2 text-xs">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      <Circle className="w-4 h-4 text-teal-600 shrink-0 fill-teal-100" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className={`font-semibold ${isCurrent ? 'text-teal-700' : isDone ? 'text-slate-500 line-through' : 'text-slate-500'}`}>
                      {step.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({ROLE_LABELS[step.approverRole]})</span>
                    {isCurrent && (
                      <span className="ml-auto text-[10px] font-bold uppercase text-teal-700 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5">
                        Awaiting You
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {instance.history.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
                History
              </div>
              <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                {instance.history.map((entry, i) => (
                  <div key={i} className="px-3 py-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${entry.action === 'APPROVE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {entry.action === 'APPROVE' ? 'Approved' : 'Rejected'} — {entry.stepName}
                      </span>
                      <span className="text-slate-400 font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-500">{entry.actor}{entry.comment ? ` — "${entry.comment}"` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              <span>This stops {instance.documentLabel} for good — it will not proceed. Confirm rejection?</span>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
          <button
            onClick={onOpenRecord}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Record</span>
          </button>
          <div className="flex items-center gap-2">
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
              <span>
                {instance.currentStepIndex < instance.applicableSteps.length - 1 ? 'Approve & Send to Next Approver' : 'Approve'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

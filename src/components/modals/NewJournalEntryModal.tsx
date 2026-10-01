import React, { useState } from 'react';
import { Check, Lock, Plus, Trash2, X } from 'lucide-react';
import { ChartOfAccountItem } from '../../data/recordsStore';
import { useHasPermission } from '../../store/permissionStore';
import { FieldError, ValidationSummary } from '../horizon';

interface JournalLineDraft {
  accountId: string;
  debitKes: string;
  creditKes: string;
}

export interface NewJournalEntryPayload {
  description: string;
  reference?: string;
  branch: string;
  lines: { accountId: string; debitKes: number; creditKes: number }[];
}

interface NewJournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ChartOfAccountItem[];
  branches: string[];
  onSuccess: (payload: NewJournalEntryPayload) => string | void;
}

const blankLine = (): JournalLineDraft => ({ accountId: '', debitKes: '', creditKes: '' });

export const NewJournalEntryModal: React.FC<NewJournalEntryModalProps> = ({ isOpen, onClose, accounts, branches, onSuccess }) => {
  const canCreate = useHasPermission('billing', 'add');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [branch, setBranch] = useState(branches[0] ?? '');
  const [lines, setLines] = useState<JournalLineDraft[]>([blankLine(), blankLine()]);
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debitKes) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.creditKes) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const errors: Record<string, string> = {};
  if (!description.trim()) errors.description = 'Description is required.';
  if (!branch) errors.branch = 'Branch is required.';
  if (lines.some((l) => !l.accountId)) errors.lines = 'Every line needs an account selected.';
  else if (lines.some((l) => (Number(l.debitKes) || 0) === 0 && (Number(l.creditKes) || 0) === 0)) {
    errors.lines = 'Every line needs a debit or credit amount.';
  } else if (!isBalanced) {
    errors.balance = `Entry does not balance: debits KES ${totalDebit.toLocaleString()} vs credits KES ${totalCredit.toLocaleString()}.`;
  }
  if (!canCreate) errors.permission = "You don't have permission to create journal entries.";
  const hasErrors = Object.keys(errors).length > 0;
  const allErrors = [...Object.values(errors), ...(submitError ? [submitError] : [])];

  const updateLine = (index: number, patch: Partial<JournalLineDraft>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, blankLine()]);
  const removeLine = (index: number) => setLines((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));

  const handleClose = () => {
    setDescription('');
    setReference('');
    setBranch(branches[0] ?? '');
    setLines([blankLine(), blankLine()]);
    setAttempted(false);
    setSubmitError(null);
    onClose();
  };

  const handleSubmit = () => {
    setSubmitError(null);
    if (!canCreate || hasErrors) {
      setAttempted(true);
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const result = onSuccess({
        description: description.trim(),
        reference: reference.trim() || undefined,
        branch,
        lines: lines.map((l) => ({ accountId: l.accountId, debitKes: Number(l.debitKes) || 0, creditKes: Number(l.creditKes) || 0 })),
      });
      setIsSubmitting(false);
      if (typeof result === 'string') {
        setSubmitError(result);
        return;
      }
      handleClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
                GENERAL LEDGER
              </span>
              <h2 className="text-base font-bold text-slate-900">New Journal Entry</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Debits must equal credits. Large entries route for approval before posting.</p>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {(attempted || submitError) && allErrors.length > 0 && <ValidationSummary errors={allErrors} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. M-Pesa premium receipt — POL/MTR/2026/00182"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.description} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference (optional)</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Policy / claim / voucher ref"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {branches.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              {attempted && <FieldError message={errors.branch} />}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 text-[11px] font-bold uppercase text-slate-500 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span>Ledger Lines</span>
              <span
                className={`font-mono text-[11px] ${isBalanced ? 'text-emerald-700' : 'text-amber-700'}`}
              >
                Dr {totalDebit.toLocaleString()} / Cr {totalCredit.toLocaleString()}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_100px_100px_32px] gap-2 px-4 py-2.5 items-center">
                  <select
                    value={line.accountId}
                    onChange={(e) => updateLine(index, { accountId: e.target.value })}
                    className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Select account...</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={line.debitKes}
                    onChange={(e) => updateLine(index, { debitKes: e.target.value, creditKes: e.target.value ? '' : line.creditKes })}
                    placeholder="Debit"
                    className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <input
                    type="number"
                    value={line.creditKes}
                    onChange={(e) => updateLine(index, { creditKes: e.target.value, debitKes: e.target.value ? '' : line.debitKes })}
                    placeholder="Credit"
                    className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    onClick={() => removeLine(index)}
                    disabled={lines.length <= 2}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Remove line"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-slate-100">
              <button onClick={addLine} className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
                <Plus className="w-3 h-3" />
                <span>Add Line</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !canCreate}
            onClick={handleSubmit}
            title={canCreate ? undefined : "You don't have permission to create journal entries."}
            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {canCreate ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isSubmitting ? 'Posting...' : 'Submit Entry'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

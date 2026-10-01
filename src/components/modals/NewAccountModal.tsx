import React, { useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { AccountType, ChartOfAccountItem } from '../../data/recordsStore';
import { useHasPermission } from '../../store/permissionStore';
import { FieldError, ValidationSummary } from '../horizon';

interface NewAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCodes: string[];
  onSuccess: (account: Omit<ChartOfAccountItem, 'id'>) => void;
}

const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
const NORMAL_BALANCE_BY_TYPE: Record<AccountType, 'DEBIT' | 'CREDIT'> = {
  ASSET: 'DEBIT',
  EXPENSE: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  INCOME: 'CREDIT',
};

export const NewAccountModal: React.FC<NewAccountModalProps> = ({ isOpen, onClose, existingCodes, onSuccess }) => {
  const canCreate = useHasPermission('billing', 'add');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('ASSET');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!isOpen) return null;

  const trimmedCode = code.trim();
  const errors: Record<string, string> = {};
  if (!trimmedCode) errors.code = 'Account code is required.';
  else if (existingCodes.includes(trimmedCode)) errors.code = `Account code "${trimmedCode}" already exists.`;
  if (!name.trim()) errors.name = 'Account name is required.';
  const hasErrors = Object.keys(errors).length > 0;

  const handleClose = () => {
    setCode('');
    setName('');
    setType('ASSET');
    setAttempted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!canCreate || hasErrors) {
      setAttempted(true);
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      onSuccess({ code: trimmedCode, name: name.trim(), type, normalBalance: NORMAL_BALANCE_BY_TYPE[type], status: 'ACTIVE' });
      setIsSubmitting(false);
      handleClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
                FINANCE
              </span>
              <h2 className="text-base font-bold text-slate-900">Add Account</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Add a new account to the chart of accounts.</p>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 1300"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.code} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Prepaid Reinsurance Premium"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {attempted && <FieldError message={errors.name} />}
          </div>

          <p className="text-[11px] text-slate-500">
            Normal balance is set automatically from type: Assets and Expenses are Debit-normal; Liabilities, Equity, and Income
            are Credit-normal.
          </p>

          {attempted && !canCreate && <FieldError message="You don't have permission to add accounts." />}
          {attempted && <ValidationSummary errors={Object.values(errors)} />}
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
            title={canCreate ? undefined : "You don't have permission to add accounts."}
            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {canCreate ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isSubmitting ? 'Adding...' : 'Add Account'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

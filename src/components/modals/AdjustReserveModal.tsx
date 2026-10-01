import React, { useState } from 'react';
import { X, Check, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { recordsStore, ClaimRecordItem } from '../../data/recordsStore';
import { useHasPermission } from '../../store/permissionStore';
import { CharacterCounter, FieldError, ValidationSummary } from '../horizon';

const REASON_MAX_LENGTH = 500;

interface AdjustReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimRecordItem;
  onSuccess: (newReserve: number) => void;
}

export const AdjustReserveModal: React.FC<AdjustReserveModalProps> = ({
  isOpen,
  onClose,
  claim,
  onSuccess,
}) => {
  const canAdjustReserve = useHasPermission('claims', 'edit');
  const [newReserve, setNewReserve] = useState<number>(claim.outstandingReserveKes);
  const [reason, setReason] = useState('Supplementary Assessor Report Received - Additional Internal Chassis Damage');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!isOpen) return null;

  const errors: Record<string, string> = {};
  if (newReserve < 0) errors.newReserve = 'Reserve cannot be a negative amount.';
  if (reason.trim().length < 10) errors.reason = 'Provide an actuarial justification of at least 10 characters.';
  const hasErrors = Object.keys(errors).length > 0;

  const handleSave = () => {
    if (hasErrors) {
      setAttempted(true);
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      recordsStore.adjustClaimReserve(claim.id, newReserve, reason);
      setIsSubmitting(false);
      onSuccess(newReserve);
      onClose();
    }, 400);
  };

  const diff = newReserve - claim.outstandingReserveKes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                ACTUARIAL & RESERVES
              </span>
              <h2 className="text-base font-bold text-slate-900">Adjust Claims Reserve</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Claim: {claim.claimNumber} • Policy: {claim.policyNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Outstanding Reserve:</span>
              <span className="font-mono font-bold text-slate-900">
                KES {claim.outstandingReserveKes.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Settled to Date:</span>
              <span className="font-mono text-slate-700">
                KES {claim.amountPaidKes.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Revised Outstanding Reserve (KES)
            </label>
            <input
              type="number"
              step={10000}
              value={newReserve}
              onChange={(e) => setNewReserve(Number(e.target.value))}
              className="w-full text-base font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <div className="flex justify-between text-xs mt-1">
              <span className="text-slate-500">Variance:</span>
              <span
                className={`font-mono font-bold ${
                  diff > 0 ? 'text-amber-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                {diff > 0 ? `+KES ${diff.toLocaleString()}` : diff < 0 ? `-KES ${Math.abs(diff).toLocaleString()}` : 'No change'}
              </span>
            </div>
            {attempted && <FieldError message={errors.newReserve} />}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Actuarial Justification / Reason
            </label>
            <textarea
              rows={3}
              maxLength={REASON_MAX_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
            />
            <CharacterCounter current={reason.length} max={REASON_MAX_LENGTH} />
            {attempted && <FieldError message={errors.reason} />}
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Underwriter DOA Level 3 Approved (Threshold Limit KES 5,000,000)</span>
          </div>

          {attempted && <ValidationSummary errors={Object.values(errors)} />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !canAdjustReserve}
            onClick={handleSave}
            title={canAdjustReserve ? undefined : "You don't have permission to adjust claim reserves."}
            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {canAdjustReserve ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>Commit Reserve Adjustment</span>
          </button>
        </div>
      </div>
    </div>
  );
};

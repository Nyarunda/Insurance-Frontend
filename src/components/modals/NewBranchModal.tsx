import React, { useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { BranchRecordItem } from '../../data/recordsStore';
import { useHasPermission } from '../../store/permissionStore';
import { FieldError, ValidationSummary } from '../horizon';

interface NewBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNames: string[];
  onSuccess: (branch: Omit<BranchRecordItem, 'id'>) => void;
}

export const NewBranchModal: React.FC<NewBranchModalProps> = ({ isOpen, onClose, existingNames, onSuccess }) => {
  const canCreateBranch = useHasPermission('regulatory-admin', 'add');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const errors: Record<string, string> = {};
  if (!trimmedName) errors.name = 'Branch name is required.';
  else if (existingNames.some((existing) => existing.toLowerCase() === trimmedName.toLowerCase())) {
    errors.name = `A branch named "${trimmedName}" already exists.`;
  }
  if (!region.trim()) errors.region = 'Region is required.';
  const hasErrors = Object.keys(errors).length > 0;

  const handleClose = () => {
    setName('');
    setRegion('');
    setAttempted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!canCreateBranch || hasErrors) {
      setAttempted(true);
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      onSuccess({ name: trimmedName, region: region.trim(), status: 'ACTIVE' });
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
                PLATFORM ADMIN
              </span>
              <h2 className="text-base font-bold text-slate-900">Add New Branch</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Register a new physical or virtual branch.</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nakuru Regional Branch"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {attempted && <FieldError message={errors.name} />}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Region</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Rift Valley"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {attempted && <FieldError message={errors.region} />}
          </div>

          {attempted && !canCreateBranch && (
            <FieldError message="You don't have permission to add branches." />
          )}
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
            disabled={isSubmitting || !canCreateBranch}
            onClick={handleSubmit}
            title={canCreateBranch ? undefined : "You don't have permission to add branches."}
            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {canCreateBranch ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isSubmitting ? 'Adding...' : 'Add Branch'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

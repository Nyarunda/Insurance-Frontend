import React, { useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { CustomerRecord } from '../../data/recordsStore';
import { useHasPermission } from '../../store/permissionStore';
import { FieldError, ValidationSummary } from '../horizon';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lockCustomerType?: 'Individual' | 'Corporate';
  onSuccess: (customer: Omit<CustomerRecord, 'id'>) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(0|\+254)\d{9}$/;
const KRA_PIN_PATTERN = /^[A-Z]\d{9}[A-Z]$/i;

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  isOpen,
  onClose,
  lockCustomerType,
  onSuccess,
}) => {
  const canCreateCustomer = useHasPermission('customers', 'add');
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState<'Individual' | 'Corporate'>(lockCustomerType ?? 'Individual');
  const [kraPin, setKraPin] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [branch, setBranch] = useState('Nairobi HQ');
  const [assignedUnderwriter, setAssignedUnderwriter] = useState('');
  const [headquarters, setHeadquarters] = useState('');
  const [riskProfile, setRiskProfile] = useState<CustomerRecord['riskProfile']>('MEDIUM');
  const [status, setStatus] = useState<CustomerRecord['status']>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!isOpen) return null;

  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = `${customerType === 'Corporate' ? 'Organization' : 'Customer'} name is required.`;
  if (!KRA_PIN_PATTERN.test(kraPin.trim())) errors.kraPin = 'Enter a valid KRA PIN, e.g. A001928472B.';
  if (!PHONE_PATTERN.test(phone.trim())) errors.phone = 'Enter a valid Kenyan phone number, e.g. 0712345678.';
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!branch.trim()) errors.branch = 'Servicing branch is required.';
  if (!assignedUnderwriter.trim()) errors.assignedUnderwriter = 'Assign a relationship underwriter.';
  if (!headquarters.trim()) {
    errors.headquarters = customerType === 'Corporate' ? 'Registered address is required.' : 'Residential address is required.';
  }
  const hasErrors = Object.keys(errors).length > 0;

  const handleClose = () => {
    setName('');
    setCustomerType(lockCustomerType ?? 'Individual');
    setKraPin('');
    setNationalId('');
    setPhone('');
    setEmail('');
    setBranch('Nairobi HQ');
    setAssignedUnderwriter('');
    setHeadquarters('');
    setRiskProfile('MEDIUM');
    setStatus('ACTIVE');
    setAttempted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!canCreateCustomer || hasErrors) {
      setAttempted(true);
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      onSuccess({
        name: name.trim(),
        customerType,
        kraPin: kraPin.trim().toUpperCase(),
        nationalId: nationalId.trim() || undefined,
        phone: phone.trim(),
        email: email.trim(),
        branch: branch.trim(),
        relationshipSince: new Date().getFullYear(),
        relationshipValueKes: 0,
        lifetimeClaimsKes: 0,
        lossRatioPct: 0,
        outstandingKes: 0,
        riskProfile,
        activePoliciesCount: 0,
        assignedUnderwriter: assignedUnderwriter.trim(),
        headquarters: headquarters.trim(),
        status,
      });
      setIsSubmitting(false);
      handleClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
                CUSTOMER REGISTRY
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Add New {lockCustomerType === 'Corporate' ? 'Organization' : 'Customer'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Onboard a new policyholder account.</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {customerType === 'Corporate' ? 'Organization Name' : 'Full Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.name} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as 'Individual' | 'Corporate')}
                disabled={!!lockCustomerType}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Individual">Individual</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">KRA PIN</label>
              <input
                type="text"
                value={kraPin}
                onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                placeholder="A001928472B"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.kraPin} />}
            </div>
            {customerType === 'Individual' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">National ID (optional)</label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.phone} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.email} />}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {customerType === 'Corporate' ? 'Registered Address' : 'Residential Address'}
            </label>
            <input
              type="text"
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder={customerType === 'Corporate' ? 'e.g. Upper Hill Chambers, Nairobi' : 'e.g. Kilimani, Nairobi'}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {attempted && <FieldError message={errors.headquarters} />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Servicing Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.branch} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship Underwriter</label>
              <input
                type="text"
                value={assignedUnderwriter}
                onChange={(e) => setAssignedUnderwriter(e.target.value)}
                placeholder="e.g. Jane Mwangi"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.assignedUnderwriter} />}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Risk Profile</label>
              <select
                value={riskProfile}
                onChange={(e) => setRiskProfile(e.target.value as CustomerRecord['riskProfile'])}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CustomerRecord['status'])}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="KYC REVIEW">KYC Review</option>
              </select>
            </div>
          </div>

          {attempted && !canCreateCustomer && (
            <FieldError message="You don't have permission to add customers." />
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
            disabled={isSubmitting || !canCreateCustomer}
            onClick={handleSubmit}
            title={canCreateCustomer ? undefined : "You don't have permission to add customers."}
            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {canCreateCustomer ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isSubmitting ? 'Saving...' : `Add ${customerType === 'Corporate' ? 'Organization' : 'Customer'}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

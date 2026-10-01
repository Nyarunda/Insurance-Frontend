import React, { useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { TenantRecordItem } from '../../data/recordsStore';
import { useHasPermission } from '../../store/permissionStore';
import { FieldError, ValidationSummary } from '../horizon';

interface NewTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCodes: string[];
  onSuccess: (tenant: Omit<TenantRecordItem, 'id'>) => void;
}

const CURRENCIES = ['KES', 'UGX', 'TZS', 'RWF', 'USD'];

export const NewTenantModal: React.FC<NewTenantModalProps> = ({
  isOpen,
  onClose,
  existingCodes,
  onSuccess,
}) => {
  const canCreateTenant = useHasPermission('regulatory-admin', 'add');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [domain, setDomain] = useState('');
  const [region, setRegion] = useState('');
  const [regulator, setRegulator] = useState('IRA (Kenya)');
  const [currency, setCurrency] = useState('KES');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!isOpen) return null;

  const normalizedCode = code.trim().toUpperCase();
  const normalizedDomain = domain.trim().toLowerCase();
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = 'Tenant / company name is required.';
  if (!normalizedCode) errors.code = 'A short tenant code is required.';
  else if (existingCodes.includes(normalizedCode)) errors.code = `Tenant code "${normalizedCode}" is already in use.`;
  if (!normalizedDomain) errors.domain = 'An email domain is required for sign-in routing.';
  else if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalizedDomain)) errors.domain = 'Enter a valid domain, e.g. company.co.ke.';
  if (!region.trim()) errors.region = 'Region / description is required.';
  if (!regulator.trim()) errors.regulator = 'Regulator is required.';
  const hasErrors = Object.keys(errors).length > 0;

  const handleClose = () => {
    setName('');
    setCode('');
    setDomain('');
    setRegion('');
    setRegulator('IRA (Kenya)');
    setCurrency('KES');
    setAttempted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!canCreateTenant || hasErrors) {
      setAttempted(true);
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      onSuccess({
        name: name.trim(),
        code: normalizedCode,
        domain: normalizedDomain,
        region: region.trim(),
        regulator: regulator.trim(),
        currency,
        status: 'ACTIVE',
      });
      setIsSubmitting(false);
      handleClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
                PLATFORM ADMIN
              </span>
              <h2 className="text-base font-bold text-slate-900">Add New Tenant</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Onboard a new company / underwriting entity.</p>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tenant / Company Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Old Mutual General Insurance Ltd"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {attempted && <FieldError message={errors.name} />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tenant Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. OMG-KE"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.code} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase())}
                placeholder="e.g. company.co.ke"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.domain} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Region / Description</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Nairobi HQ • Retail Bancassurance"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {attempted && <FieldError message={errors.region} />}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Regulator</label>
            <input
              type="text"
              value={regulator}
              onChange={(e) => setRegulator(e.target.value)}
              placeholder="e.g. IRA (Kenya)"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {attempted && <FieldError message={errors.regulator} />}
          </div>

          {attempted && !canCreateTenant && (
            <FieldError message="You don't have permission to onboard new tenants." />
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
            disabled={isSubmitting || !canCreateTenant}
            onClick={handleSubmit}
            title={canCreateTenant ? undefined : "You don't have permission to onboard new tenants."}
            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {canCreateTenant ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isSubmitting ? 'Onboarding...' : 'Add Tenant'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

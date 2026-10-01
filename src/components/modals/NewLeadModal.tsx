import React, { useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { LeadRecordItem } from '../../data/recordsStore';
import { useHasPermission } from '../../store/permissionStore';
import { FieldError, ValidationSummary } from '../horizon';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Omit<LeadRecordItem, 'id' | 'createdDate' | 'stage' | 'convertedCustomerId'>) => void;
}

const SOURCES: LeadRecordItem['source'][] = ['Referral', 'Website', 'Broker', 'Cold Call', 'Marketing Campaign'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(0|\+254)\d{9}$/;

export const NewLeadModal: React.FC<NewLeadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const canCreateLead = useHasPermission('customers', 'add');
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState<'Individual' | 'Corporate'>('Corporate');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadRecordItem['source']>('Referral');
  const [lineOfBusinessInterest, setLineOfBusinessInterest] = useState('');
  const [estimatedPremiumKes, setEstimatedPremiumKes] = useState(0);
  const [assignedTo, setAssignedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!isOpen) return null;

  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = 'Lead / prospect name is required.';
  if (!contactPerson.trim()) errors.contactPerson = 'Contact person is required.';
  if (!PHONE_PATTERN.test(phone.trim())) errors.phone = 'Enter a valid Kenyan phone number, e.g. 0712345678.';
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!lineOfBusinessInterest.trim()) errors.lineOfBusinessInterest = 'Line of business interest is required.';
  if (!(estimatedPremiumKes > 0)) errors.estimatedPremiumKes = 'Estimated premium must be greater than zero.';
  if (!assignedTo.trim()) errors.assignedTo = 'Assign this lead to an owner.';
  const hasErrors = Object.keys(errors).length > 0;

  const handleClose = () => {
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setSource('Referral');
    setLineOfBusinessInterest('');
    setEstimatedPremiumKes(0);
    setAssignedTo('');
    setAttempted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!canCreateLead || hasErrors) {
      setAttempted(true);
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      onSuccess({
        name: name.trim(),
        customerType,
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        source,
        lineOfBusinessInterest: lineOfBusinessInterest.trim(),
        estimatedPremiumKes,
        assignedTo: assignedTo.trim(),
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
                PIPELINE
              </span>
              <h2 className="text-base font-bold text-slate-900">Capture New Lead</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Log a prospect before they're onboarded as a customer.</p>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lead / Prospect Name</label>
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
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="Corporate">Corporate</option>
                <option value="Individual">Individual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {attempted && <FieldError message={errors.contactPerson} />}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadRecordItem['source'])}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Est. Premium (KES)</label>
              <input
                type="number"
                value={estimatedPremiumKes}
                onChange={(e) => setEstimatedPremiumKes(Number(e.target.value))}
                step={10000}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.estimatedPremiumKes} />}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Line of Business Interest</label>
            <input
              type="text"
              value={lineOfBusinessInterest}
              onChange={(e) => setLineOfBusinessInterest(e.target.value)}
              placeholder="e.g. Commercial Motor Fleet"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {attempted && <FieldError message={errors.lineOfBusinessInterest} />}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assign To</label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g. Jane Mwangi (Senior Underwriter)"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {attempted && <FieldError message={errors.assignedTo} />}
          </div>

          {attempted && !canCreateLead && (
            <FieldError message="You don't have permission to capture new leads." />
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
            disabled={isSubmitting || !canCreateLead}
            onClick={handleSubmit}
            title={canCreateLead ? undefined : "You don't have permission to capture new leads."}
            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {canCreateLead ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isSubmitting ? 'Saving...' : 'Capture Lead'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

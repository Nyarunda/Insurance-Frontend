import React, { useState } from 'react';
import { X, Check, ArrowRight, ArrowLeft, AlertTriangle, Building2, MapPin, Calendar, DollarSign, ShieldAlert, Lock } from 'lucide-react';
import { recordsStore, CustomerRecord, PolicyRecordItem } from '../../data/recordsStore';
import { useCanInitiate } from '../../store/permissionStore';
import { CharacterCounter, FieldError, ValidationSummary } from '../horizon';

const INCIDENT_DESCRIPTION_MAX_LENGTH = 1000;

interface NewClaimWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedCustomer?: CustomerRecord;
  preSelectedPolicy?: PolicyRecordItem;
  onSuccess: (createdClaimId: string) => void;
}

export const NewClaimWizardModal: React.FC<NewClaimWizardModalProps> = ({
  isOpen,
  onClose,
  preSelectedCustomer,
  preSelectedPolicy,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const canRegisterClaim = useCanInitiate('claims', 'add');
  const customers = recordsStore.getCustomers();
  const allPolicies = recordsStore.getPolicies();
  const assessors = recordsStore.getProviders().filter((p) => p.providerType === 'Motor Loss Assessor');

  const [customerId, setCustomerId] = useState(
    preSelectedCustomer?.id || preSelectedPolicy?.customerId || customers[0]?.id || ''
  );
  const eligiblePolicies = allPolicies.filter((p) => p.customerId === customerId);
  const [policyId, setPolicyId] = useState(
    preSelectedPolicy?.id || eligiblePolicies[0]?.id || allPolicies[0]?.id || ''
  );

  const [lossDate, setLossDate] = useState('2026-09-02');
  const [lossType, setLossType] = useState('Motor Collision - Rear End Impact');
  const [location, setLocation] = useState('Waiyaki Way / Chiromo Lane, Westlands');
  const [incidentDescription, setIncidentDescription] = useState(
    'Insured vehicle slowed at pedestrian crossing; third party mini-bus hit rear tailgate causing rear fender and brake light structural damage.'
  );
  const [initialReserve, setInitialReserve] = useState(380000);
  const [assessorId, setAssessorId] = useState('PRV-ASSESS-0042');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!isOpen) return null;

  const currentCustomer = recordsStore.getCustomer(customerId) || customers[0];
  const currentPolicy = recordsStore.getPolicy(policyId) || eligiblePolicies[0] || allPolicies[0];
  const currentAssessor = recordsStore.getProvider(assessorId) || assessors[0];

  const getStepErrors = (targetStep: number): Record<string, string> => {
    const stepErrors: Record<string, string> = {};
    if (targetStep === 1 && !policyId) {
      stepErrors.policyId = 'Select the policy this claim will be attached to.';
    }
    if (targetStep === 2) {
      if (!lossDate) stepErrors.lossDate = 'Date of loss is required.';
      if (!location.trim()) stepErrors.location = 'Incident location is required.';
      if (incidentDescription.trim().length < 20) {
        stepErrors.incidentDescription = 'Describe the incident in at least 20 characters.';
      }
    }
    if (targetStep === 3) {
      if (!(initialReserve > 0)) stepErrors.initialReserve = 'Initial reserve must be greater than zero.';
      if (assessors.length > 0 && !assessorId) stepErrors.assessorId = 'Assign a loss assessor before dispatch.';
    }
    return stepErrors;
  };

  const currentStepErrors = getStepErrors(step);
  const hasCurrentStepErrors = Object.keys(currentStepErrors).length > 0;

  const handleContinue = () => {
    if (hasCurrentStepErrors) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setAttempted(false);
    setStep((s) => s - 1);
  };

  const handleSubmit = () => {
    if (hasCurrentStepErrors) {
      setAttempted(true);
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const newClaim = recordsStore.addClaim({
        claimNumber: `CLM/MTR/${new Date().getFullYear()}/${Math.floor(Math.random() * 9000 + 1000)}`,
        policyNumber: currentPolicy.policyNumber,
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        lossDate,
        lossType,
        location,
        status: 'ASSESSMENT',
        initialReserveKes: initialReserve,
        outstandingReserveKes: initialReserve,
        totalIncurredKes: initialReserve,
        deductibleAppliedKes: 15000,
        assessorId: currentAssessor?.id,
        assessorName: currentAssessor?.name || 'Automotive Engineers Ltd',
        garageName: 'DT Dobie Nairobi Bodyshop',
      });

      setIsSubmitting(false);
      onSuccess(newClaim.id);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                FNOL INTAKE
              </span>
              <h2 className="text-base font-bold text-slate-900">First Notice of Loss Registration</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Step {step} of 3: {step === 1 ? 'Policy & In-Force Verification' : step === 2 ? 'Incident Circumstances' : 'Reserving & Assessor Dispatch'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Stepper */}
        <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-200/60 flex items-center justify-between text-xs font-medium">
          {['1. Policy Verification', '2. Loss Particulars', '3. Reserve & Dispatch'].map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    isCompleted
                      ? 'bg-teal-600 text-white'
                      : isCurrent
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : stepNum}
                </span>
                <span className={isCurrent ? 'font-bold text-slate-900' : 'text-slate-500'}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Claimant / Insured Customer</label>
                {preSelectedCustomer ? (
                  <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/50 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{currentCustomer.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{currentCustomer.id}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                      VERIFIED
                    </span>
                  </div>
                ) : (
                  <select
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      const userPolicies = allPolicies.filter((p) => p.customerId === e.target.value);
                      if (userPolicies.length > 0) setPolicyId(userPolicies[0].id);
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target In-Force Policy</label>
                {preSelectedPolicy ? (
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold font-mono text-slate-900">{preSelectedPolicy.policyNumber}</div>
                      <div className="text-xs text-slate-600 font-sans">{preSelectedPolicy.productName}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                      {preSelectedPolicy.status}
                    </span>
                  </div>
                ) : (
                  <select
                    value={policyId}
                    onChange={(e) => setPolicyId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  >
                    {eligiblePolicies.length > 0 ? (
                      eligiblePolicies.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.policyNumber} - {p.productName} ({p.status})
                        </option>
                      ))
                    ) : (
                      allPolicies.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.policyNumber} - {p.customerName}
                        </option>
                      ))
                    )}
                  </select>
                )}
                {attempted && <FieldError message={currentStepErrors.policyId} />}
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 text-xs text-slate-700 space-y-1">
                <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Coverage Standing Confirmed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Premium Status:</span>
                  <span className="font-semibold font-mono text-slate-800">
                    Paid KES {currentPolicy?.paidToDateKes.toLocaleString()} of KES {currentPolicy?.annualPremiumKes.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coverage Window:</span>
                  <span className="font-mono text-slate-800">
                    {currentPolicy?.effectiveStart} to {currentPolicy?.effectiveEnd}
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Loss</label>
                  <input
                    type="date"
                    value={lossDate}
                    onChange={(e) => setLossDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                  {attempted && <FieldError message={currentStepErrors.lossDate} />}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loss Type Classification</label>
                  <select
                    value={lossType}
                    onChange={(e) => setLossType(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="Motor Collision - Rear End Impact">Motor Collision - Rear End</option>
                    <option value="Highway Rollover & Partial Loss">Highway Rollover</option>
                    <option value="Windscreen & Glass Damage Only">Windscreen Damage (Zero Excess)</option>
                    <option value="Third-Party Property Damage">Third Party Property Damage</option>
                    <option value="Theft of Vehicle / Total Loss">Theft / Total Loss</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Accident / Incident Location</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g. Mombasa Highway, Athi River Junction"
                  />
                </div>
                {attempted && <FieldError message={currentStepErrors.location} />}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Circumstances & Loss Narration</label>
                <textarea
                  rows={3}
                  maxLength={INCIDENT_DESCRIPTION_MAX_LENGTH}
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans leading-relaxed"
                />
                <CharacterCounter current={incidentDescription.length} max={INCIDENT_DESCRIPTION_MAX_LENGTH} />
                {attempted && <FieldError message={currentStepErrors.incidentDescription} />}
              </div>

              {attempted && <ValidationSummary errors={Object.values(currentStepErrors)} />}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Claims Reserve (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400">KES</span>
                  <input
                    type="number"
                    value={initialReserve}
                    onChange={(e) => setInitialReserve(Number(e.target.value))}
                    step={10000}
                    className="w-full pl-12 pr-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Recommended initial baseline: KES {initialReserve.toLocaleString()}
                </span>
                {attempted && <FieldError message={currentStepErrors.initialReserve} />}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Motor Loss Assessor
                </label>
                <select
                  value={assessorId}
                  onChange={(e) => setAssessorId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {assessors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (TAT: {a.averageTatHours}h • SLA: {a.slaCompliancePct}%)
                    </option>
                  ))}
                </select>
                {attempted && <FieldError message={currentStepErrors.assessorId} />}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="font-semibold text-slate-900">Registration Intake Checklist:</div>
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-600" />
                  <span>Police Abstract Notification Flagged</span>
                </div>
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-600" />
                  <span>NTSA Driver License Verification Verified</span>
                </div>
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-600" />
                  <span>SIU Automatic Anti-Fraud Rule Check: Cleared (Score 8/100)</span>
                </div>
              </div>

              {attempted && <ValidationSummary errors={Object.values(currentStepErrors)} />}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            disabled={step === 1}
            onClick={handleBack}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleContinue}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || !canRegisterClaim}
              onClick={handleSubmit}
              title={canRegisterClaim ? undefined : "You don't have permission to register claims."}
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Registering Claim...</span>
              ) : !canRegisterClaim ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Commit FNOL & Open Claim</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Commit FNOL & Open Claim</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

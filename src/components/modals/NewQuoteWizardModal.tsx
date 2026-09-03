import React, { useState } from 'react';
import { X, Check, ArrowRight, ArrowLeft, ShieldCheck, Calculator, Sparkles, Building2, User } from 'lucide-react';
import { recordsStore, CustomerRecord } from '../../data/recordsStore';

interface NewQuoteWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedCustomer?: CustomerRecord;
  onSuccess: (createdQuoteId: string) => void;
}

export const NewQuoteWizardModal: React.FC<NewQuoteWizardModalProps> = ({
  isOpen,
  onClose,
  preSelectedCustomer,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const customers = recordsStore.getCustomers();
  const brokers = recordsStore.getBrokers();

  // Form state
  const [customerId, setCustomerId] = useState(preSelectedCustomer?.id || customers[0]?.id || '');
  const [brokerId, setBrokerId] = useState('BRK-00291');
  const [lineOfBusiness, setLineOfBusiness] = useState('Commercial Motor');
  const [productTier, setProductTier] = useState('Comprehensive Premier');
  const [sumInsured, setSumInsured] = useState(14500000);
  const [baseRate, setBaseRate] = useState(4.5);
  const [includeExcessProtector, setIncludeExcessProtector] = useState(true);
  const [includePvt, setIncludePvt] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedCustomer = preSelectedCustomer || recordsStore.getCustomer(customerId) || customers[0];
  const selectedBroker = recordsStore.getBroker(brokerId) || brokers[0];

  // Calculate calculated premium
  const basePremium = (sumInsured * baseRate) / 100;
  const excessProtectorFee = includeExcessProtector ? (sumInsured * 0.25) / 100 : 0;
  const pvtFee = includePvt ? (sumInsured * 0.15) / 100 : 0;
  const calculatedPremium = Math.round(basePremium + excessProtectorFee + pvtFee);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newQuote = recordsStore.addQuote({
        quoteNumber: `Q/MTR/${new Date().getFullYear()}/${Math.floor(Math.random() * 90000 + 10000)}`,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        lineOfBusiness,
        productName: `${lineOfBusiness} - ${productTier}`,
        sumInsuredKes: sumInsured,
        premiumKes: calculatedPremium,
        brokerId: selectedBroker?.id,
        brokerName: selectedBroker?.name || 'Direct Online',
        effectiveDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 86400000 * 372).toISOString().split('T')[0],
        status: 'QUOTED',
        riskScore: 82,
        lossRatioPct: selectedCustomer.lossRatioPct,
      });

      setIsSubmitting(false);
      onSuccess(newQuote.id);
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
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
                WIZARD
              </span>
              <h2 className="text-base font-bold text-slate-900">New Underwriting Quotation</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Step {step} of 4: {step === 1 ? 'Customer & Channel' : step === 2 ? 'Coverage Scope' : step === 3 ? 'Sum Insured & Rating' : 'Underwriter Review'}
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
          {['1. Parties', '2. Coverage', '3. Rating', '4. Review'].map((label, idx) => {
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Insured Customer</label>
                {preSelectedCustomer ? (
                  <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/50 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{selectedCustomer.name}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {selectedCustomer.id} • KRA: {selectedCustomer.kraPin}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                      CONTEXT LOCKED
                    </span>
                  </div>
                ) : (
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id}) - {c.branch}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Servicing Intermediary / Broker</label>
                <select
                  value={brokerId}
                  onChange={(e) => setBrokerId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.licenseNumber}) - {b.type}
                    </option>
                  ))}
                  <option value="direct">Direct Channel (No Broker)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Account Baseline Quality</div>
                <div className="flex justify-between">
                  <span>3-Year Historical Loss Ratio:</span>
                  <span className="font-bold font-mono text-slate-800">{selectedCustomer.lossRatioPct}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Active In-Force Policies:</span>
                  <span className="font-bold font-mono text-slate-800">{selectedCustomer.activePoliciesCount} Policies</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Line of Business</label>
                <select
                  value={lineOfBusiness}
                  onChange={(e) => setLineOfBusiness(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Commercial Motor">Commercial Motor Fleet</option>
                  <option value="Private Motor">Private Motor Comprehensive</option>
                  <option value="Property & Fire">Commercial Fire & Special Perils</option>
                  <option value="Marine & Transit">Marine Cargo & Inland Transit</option>
                  <option value="Health & Medical">Corporate Group Health</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Package Tier</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['Standard Commercial', 'Comprehensive Premier', 'Executive Fleet Umbrella', 'Third Party Plus'].map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setProductTier(tier)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        productTier === tier
                          ? 'border-teal-600 bg-teal-50/60 font-bold text-slate-900 ring-1 ring-teal-500'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div>{tier}</div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                        {tier.includes('Premier') ? 'Includes 0% depreciation on glass' : 'Baseline tariff coverage'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Special Endorsement Extensions:</span>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExcessProtector}
                    onChange={(e) => setIncludeExcessProtector(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Excess Protector Extension (+0.25% of sum insured)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePvt}
                    onChange={(e) => setIncludePvt(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Political Violence & Terrorism (PVT) Endorsement (+0.15%)</span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sum Insured Value (KES)
                </label>
                <input
                  type="number"
                  value={sumInsured}
                  onChange={(e) => setSumInsured(Number(e.target.value))}
                  step={100000}
                  className="w-full text-sm font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Current: KES {sumInsured.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Base Technical Rating (%):
                </label>
                <input
                  type="number"
                  value={baseRate}
                  onChange={(e) => setBaseRate(Number(e.target.value))}
                  step={0.1}
                  className="w-full text-sm font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Dynamic Calculation Box */}
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Base Premium ({baseRate}%):</span>
                  <span className="font-mono">KES {Math.round(basePremium).toLocaleString()}</span>
                </div>
                {includeExcessProtector && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Excess Protector (0.25%):</span>
                    <span className="font-mono">KES {Math.round(excessProtectorFee).toLocaleString()}</span>
                  </div>
                )}
                {includePvt && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>PVT Endorsement (0.15%):</span>
                    <span className="font-mono">KES {Math.round(pvtFee).toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-teal-200/80 flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>Annual Calculated Premium:</span>
                  <span className="font-mono text-teal-800 text-base">KES {calculatedPremium.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm pb-1 border-b border-slate-200">
                  Quotation Pre-Authorization Summary
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold text-slate-900">{selectedCustomer.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Product / Tier:</span>
                  <span className="font-semibold text-slate-900">{lineOfBusiness} • {productTier}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Sum Insured:</span>
                  <span className="font-mono font-bold text-slate-900">KES {sumInsured.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Servicing Intermediary:</span>
                  <span className="font-semibold text-slate-900">{selectedBroker?.name || 'Direct'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Annual Gross Premium:</span>
                  <span className="font-mono font-bold text-teal-700 text-sm">KES {calculatedPremium.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Underwriter DOA Sign-off:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Within Automatic UW Authority
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => s - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {isSubmitting ? (
                <span>Generating Quote...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Issue Quotation & Open 360</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

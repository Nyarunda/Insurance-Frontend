import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  FileText,
  UserCheck,
  Users,
  Check,
  X,
  Send,
  AlertOctagon,
  Scale,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { ScreenId, UnderwritingRule, DensityMode } from '../types';
import { mockUnderwritingRules, mockCorporateCustomer } from '../data/mockData';

interface UnderwritingWorkbenchProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
}

export const UnderwritingWorkbench: React.FC<UnderwritingWorkbenchProps> = ({
  onNavigate,
  densityMode,
}) => {
  const [rules, setRules] = useState<UnderwritingRule[]>(mockUnderwritingRules);
  const [decisionState, setDecisionState] = useState<'pending' | 'approved' | 'declined' | 'terms_modified'>('pending');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [excessPercentage, setExcessPercentage] = useState<number>(5.0);
  const [trackerRequired, setTrackerRequired] = useState<boolean>(true);
  const [maxDriverAge, setMaxDriverAge] = useState<number>(65);

  const handleDecision = (action: 'approve' | 'decline' | 'request_info' | 'modify_terms') => {
    if (action === 'approve') {
      setDecisionState('approved');
      setFeedbackMessage('Referral Approved with Special Terms. Policy ready for binding in Policy.');
    } else if (action === 'decline') {
      setDecisionState('declined');
      setFeedbackMessage('Risk Declined due to commercial exposure exceeding portfolio risk tolerances.');
    } else if (action === 'request_info') {
      setFeedbackMessage('Request sent to Intermediary Marsh McLennan: Vehicle Telematics Inspection Report Required.');
    } else if (action === 'modify_terms') {
      setDecisionState('terms_modified');
      setFeedbackMessage('Special conditions applied: 5% excess protector minimum and telematics warranty added.');
    }
  };

  return (
    <div id="underwriting-workbench-view" className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="hz-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                UNDERWRITING
              </span>
              <span className="font-mono font-bold text-xs text-teal-700">MTR/Q/2026/00821</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Referral Triggered
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              ABC Logistics Ltd — Commercial Haulage Fleet Risk Assessment
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Broker: Marsh McLennan Wholesale • Assigned Senior Underwriter: Marcus Vance (Authority Limit: KES 15.0M)
            </p>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('quote-workspace')}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Quote</span>
            </button>
            <button
              onClick={() => onNavigate('customer-workspace')}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Customer</span>
            </button>
            <button
              id="refer-btn"
              onClick={() => onNavigate('user-permissions-workflows', 'push')}
              className="px-3 py-2 rounded-lg bg-white border border-[var(--hz-border-default)] hover:bg-[var(--hz-surface-subtle)] text-[var(--hz-text-primary)] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Authority & DOA Matrix</span>
            </button>
          </div>
        </div>

        {/* 3-Column Risk / Premium / History Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Col 1: RISK */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5">
              Risk Factors
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Vehicle Value:</span>
              <span className="font-mono font-bold text-slate-900">KES 18,500,000</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Vehicle Age:</span>
              <span className="font-medium text-slate-800">7 years (2019 Model)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Operating Use:</span>
              <span className="font-medium text-slate-800">Commercial Haulage</span>
            </div>
          </div>

          {/* Col 2: PREMIUM */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5">
              Premium Structure
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Base Premium:</span>
              <span className="font-mono font-bold text-slate-900">KES 832,500</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Statutory Levies:</span>
              <span className="font-mono text-slate-800">KES 24,975</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Statutory Rate:</span>
              <span className="font-mono text-teal-700 font-semibold">4.50% Tariff</span>
            </div>
          </div>

          {/* Col 3: HISTORY */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5">
              Account Loss History
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Claims 3Y:</span>
              <span className="font-mono font-bold text-slate-900">KES 1,400,000 (2 Incidents)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Historical Loss Ratio:</span>
              <span className="font-mono text-emerald-700 font-bold">41.2%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Safety Track Record:</span>
              <span className="font-medium text-slate-800">Satisfactory Rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decisioning Engine: Automated Evaluation & Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Automated Decision & Triggered Rules */}
        <div className="lg:col-span-2 space-y-6">
          <div className="hz-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Automated Decision Engine
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time algorithmic underwriting evaluation and policy constraint validation
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>⚠ REFER TO SENIOR UNDERWRITER</span>
              </span>
            </div>

            {/* Risk Score Progress Bar */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 mb-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700">Calculated Composite Risk Score</span>
                <span className="font-mono font-bold text-slate-900 text-sm">72 / 100</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-[72%]" />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1 font-mono">
                <span>0 (Prime Low Risk)</span>
                <span>50 (Moderate Standard)</span>
                <span className="text-amber-700 font-bold">72 (Referral Band)</span>
                <span>100 (Unacceptable)</span>
              </div>
            </div>

            {/* Triggered Rules List with Explainability */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Rule Evaluation & Explainability
              </h3>

              {rules.map((rule) => {
                const isReferral = rule.severity === 'referral';
                const isWarning = rule.severity === 'warning';
                const isPass = rule.severity === 'pass';

                return (
                  <div
                    key={rule.id}
                    className={`p-3 rounded-lg border text-xs transition-colors flex items-start justify-between gap-3 ${
                      isReferral
                        ? 'bg-amber-50/50 border-amber-200'
                        : isWarning
                        ? 'bg-amber-50/20 border-amber-200/60'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className="mt-0.5 shrink-0">
                        {isReferral ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        ) : isWarning ? (
                          <AlertOctagon className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{rule.name}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase ${
                              isReferral
                                ? 'bg-amber-100 text-amber-800'
                                : isWarning
                                ? 'bg-amber-100/70 text-amber-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {rule.severity}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs mt-0.5">{rule.description}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                          <span>Observed: {rule.currentValue}</span>
                          <span>•</span>
                          <span>Threshold: {rule.threshold}</span>
                        </div>
                      </div>
                    </div>

                    {rule.actionRequired && (
                      <span className="text-xs font-medium text-amber-800 bg-amber-100/80 px-2 py-1 rounded max-w-[160px] text-right shrink-0">
                        {rule.actionRequired}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: System Recommendation & Sign-Off Controls */}
        <div className="space-y-6">
          {/* System Recommendation Panel */}
          <div className="hz-card">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono pb-3 border-b border-slate-100">
              System Recommendation
            </h2>

            <div className="mt-3 p-3.5 rounded-lg bg-teal-50/60 border border-teal-200/80 text-xs space-y-2">
              <div className="font-bold text-teal-900">Approve with Conditions:</div>
              <ul className="space-y-1.5 text-teal-950 text-xs">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span>5% Policy Excess (Min. KES 50,000)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span>Mandatory GPS Tracker warranty</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span>Maximum authorized driver age: 65 years</span>
                </li>
              </ul>
            </div>

            {/* Condition Customization */}
            <div className="mt-4 space-y-3 text-xs border-t border-slate-100 pt-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deductible Excess (%)</label>
                <input
                  type="number"
                  value={excessPercentage}
                  onChange={(e) => setExcessPercentage(parseFloat(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-mono font-bold"
                  step="0.5"
                  min="2.5"
                  max="15"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">GPS Tracker Warranty:</span>
                <input
                  type="checkbox"
                  checked={trackerRequired}
                  onChange={(e) => setTrackerRequired(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Max Authorized Driver Age</label>
                <input
                  type="number"
                  value={maxDriverAge}
                  onChange={(e) => setMaxDriverAge(parseInt(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>

            {/* Feedback Alert if Action Taken */}
            {feedbackMessage && (
              <div className="mt-4 p-3 rounded-lg bg-slate-900 text-white text-xs leading-relaxed animate-in fade-in">
                {feedbackMessage}
              </div>
            )}

            {/* Decision Action Buttons */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => handleDecision('approve')}
                className="w-full py-2.5 rounded-lg bg-[var(--hz-primary-700)] hover:bg-[var(--hz-primary-800)] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve with Terms</span>
              </button>

              <button
                onClick={() => handleDecision('modify_terms')}
                className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-4 h-4" />
                <span>Apply Modified Terms</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDecision('request_info')}
                  className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors border border-slate-200 flex items-center justify-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                  <span>Request Info</span>
                </button>
                <button
                  onClick={() => handleDecision('decline')}
                  className="py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors border border-rose-200 flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Decline Risk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

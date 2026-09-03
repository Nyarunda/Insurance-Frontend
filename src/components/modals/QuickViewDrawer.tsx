import React from 'react';
import { X, ExternalLink, ShieldCheck, ArrowRight, FileText, Calendar, DollarSign } from 'lucide-react';
import { PolicyRecordItem, ClaimRecordItem } from '../../data/recordsStore';

interface QuickViewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'policy' | 'claim';
  policyData?: PolicyRecordItem;
  claimData?: ClaimRecordItem;
  onOpenFull: () => void;
}

export const QuickViewDrawer: React.FC<QuickViewDrawerProps> = ({
  isOpen,
  onClose,
  type,
  policyData,
  claimData,
  onOpenFull,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                QUICK VIEW
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {type === 'policy' ? 'Policy Record Snapshot' : 'Claim Record Snapshot'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {type === 'policy' ? policyData?.policyNumber : claimData?.claimNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {type === 'policy' && policyData && (
            <>
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 space-y-1">
                <div className="text-xs text-teal-900 font-bold">{policyData.productName}</div>
                <div className="text-xs text-teal-700 font-sans">Insured: {policyData.customerName}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
                    {policyData.status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {policyData.effectiveStart} – {policyData.effectiveEnd}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Sum Insured:</span>
                  <span className="font-mono font-bold text-slate-900">
                    KES {policyData.sumInsuredKes.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Annual Premium:</span>
                  <span className="font-mono font-bold text-teal-700">
                    KES {policyData.annualPremiumKes.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Servicing Intermediary:</span>
                  <span className="font-semibold text-slate-900">{policyData.brokerName}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Risk Asset / Unit:</span>
                  <span className="font-mono text-slate-800">{policyData.vehicleReg || 'Standard Asset Schedule'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Lead Underwriter:</span>
                  <span className="text-slate-800">{policyData.underwriter}</span>
                </div>
              </div>
            </>
          )}

          {type === 'claim' && claimData && (
            <>
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 space-y-1">
                <div className="text-xs text-rose-900 font-bold">{claimData.lossType}</div>
                <div className="text-xs text-rose-700">Customer: {claimData.customerName}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                    {claimData.status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Date: {claimData.lossDate}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Outstanding Reserve:</span>
                  <span className="font-mono font-bold text-slate-900">
                    KES {claimData.outstandingReserveKes.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Assigned Assessor:</span>
                  <span className="font-semibold text-slate-900">{claimData.assessorName}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Accident Location:</span>
                  <span className="text-slate-800">{claimData.location}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFull();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <span>Open Full 360 Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

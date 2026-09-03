import React, { useState } from 'react';
import {
  UserCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  Layers,
  ArrowLeft,
  ArrowRight,
  Shield,
  FileSpreadsheet,
  Users,
  AlertTriangle,
  Lock,
  Award,
  Check,
  Building2,
  FileCheck,
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';

interface UserPermissionsWorkflowsProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
}

export const UserPermissionsWorkflows: React.FC<UserPermissionsWorkflowsProps> = ({
  onNavigate,
  densityMode,
}) => {
  const [selectedCase, setSelectedCase] = useState<'case1' | 'case2'>('case1');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState(
    'Approved by CUO Marcus Vance subject to 5% excess protector minimum and telematics warranty.'
  );

  const [auditLog, setAuditLog] = useState([
    {
      time: '03 Sep 2026 10:45 EAT',
      actor: 'Marcus Vance (CUO)',
      action: 'Delegated Sign-off Approved',
      caseId: 'REF-2026-081',
      details: 'Overrode Junior limit of KES 15M for ABC Logistics Actros prime mover (KES 18.5M).',
    },
    {
      time: '02 Sep 2026 16:12 EAT',
      actor: 'Amanda Wright (Claims Head)',
      action: 'Claim Reserve Sign-off',
      caseId: 'CLM/MTR/2026/0081',
      details: 'Approved reserve increase to KES 450,000 following preliminary assessor report.',
    },
    {
      time: '01 Sep 2026 09:30 EAT',
      actor: 'David Ochieng (Finance Director)',
      action: 'Reinsurance Treaty Clearance',
      caseId: 'FAC-2026-012',
      details: 'Cleared 20% facultative placement with Kenya Re.',
    },
  ]);

  const handleApproveCase = () => {
    setStatusMessage('Case REF-2026-081 formally APPROVED under Chief Underwriting Authority.');
    setAuditLog((prev) => [
      {
        time: 'Just now',
        actor: 'Marcus Vance (CUO)',
        action: 'Underwriting Referral Approved',
        caseId: 'REF-2026-081',
        details: approvalNotes,
      },
      ...prev,
    ]);
  };

  const doaMatrix = [
    {
      role: 'Junior Underwriter',
      maxSumInsured: 'KES 5,000,000',
      maxClaim: 'KES 200,000',
      maxDiscount: '5.0%',
      escTo: 'Senior UW',
      badge: 'Tier 1',
    },
    {
      role: 'Senior Underwriter',
      maxSumInsured: 'KES 15,000,000',
      maxClaim: 'KES 1,000,000',
      maxDiscount: '10.0%',
      escTo: 'Chief UW',
      badge: 'Tier 2',
    },
    {
      role: 'Chief Underwriting Officer (CUO)',
      maxSumInsured: 'KES 50,000,000',
      maxClaim: 'KES 5,000,000',
      maxDiscount: '15.0%',
      escTo: 'Board / Reinsurance',
      badge: 'Tier 3',
    },
    {
      role: 'Board & Reinsurance Syndicate',
      maxSumInsured: '> KES 50,000,000',
      maxClaim: '> KES 5,000,000',
      maxDiscount: '> 15.0%',
      escTo: 'Treaty Panel',
      badge: 'Tier 4',
    },
  ];

  return (
    <div id="user-permissions-workflows-view" className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                GOVERNANCE
              </span>
              <span className="font-mono font-bold text-xs text-teal-700">DOA FRAMEWORK</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                ● IRA AUDIT COMPLIANT
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              Delegation of Authority (DOA) & Underwriting Referrals
            </h1>

            <p className="text-xs text-slate-500 mt-1">
              Enforces binding authority limits, automatic multi-tier referral triggers, and immutable audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('underwriting-workbench')}
              className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Underwriting Workbench</span>
            </button>
          </div>
        </div>
      </div>

      {/* DOA Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
        <div className="pb-3 border-b border-slate-100 mb-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
            Statutory Delegation of Authority (DOA) Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Limits ratified by Board Risk Committee and lodged with Insurance Regulatory Authority
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase font-mono">
                <th className="p-3">Governance Tier</th>
                <th className="p-3">Organizational Role</th>
                <th className="p-3">Max Sum Insured (Asset)</th>
                <th className="p-3">Max Claim Settlement</th>
                <th className="p-3">Discretionary Discount</th>
                <th className="p-3">Escalation Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doaMatrix.map((tier) => (
                <tr key={tier.role} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-teal-700">{tier.badge}</td>
                  <td className="p-3 font-bold text-slate-900">{tier.role}</td>
                  <td className="p-3 font-mono font-semibold text-slate-800">{tier.maxSumInsured}</td>
                  <td className="p-3 font-mono font-semibold text-slate-800">{tier.maxClaim}</td>
                  <td className="p-3 font-mono text-emerald-700 font-bold">{tier.maxDiscount}</td>
                  <td className="p-3 text-slate-500 font-medium">→ {tier.escTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Referral Approval Workflow & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active Referral Action */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                Pending Referral Sign-off
              </h2>
              <p className="text-xs text-slate-500">Case #REF-2026-081 • ABC Logistics Ltd</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Awaiting CUO Sign-off
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-50/50 border border-amber-200/80 text-xs space-y-1.5">
            <div className="font-bold text-amber-950 flex items-center justify-between">
              <span>Trigger: Sum Insured Exceeds Senior UW Delegation</span>
              <span className="font-mono">KES 18,500,000</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Senior UW Jane Mwangi holds authority up to KES 15M. Mercedes Actros asset sum insured of KES 18.5M
              requires Tier 3 CUO sign-off.
            </p>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1 text-xs">
              Executive Approver Notes & Subjectivities:
            </label>
            <textarea
              rows={3}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          {statusMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-medium">
              {statusMessage}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleApproveCase}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Check className="w-4 h-4" />
              <span>Sign Off & Approve Referral</span>
            </button>
            <button
              onClick={() => setStatusMessage('Returned to Senior UW for restated valuation.')}
              className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
            >
              Return for Rework
            </button>
          </div>
        </div>

        {/* Right: Immutable Governance Audit Log */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
              Immutable Governance Audit Log
            </h2>
            <span className="text-[11px] font-mono text-slate-400">SHA-256 Ledger</span>
          </div>

          <div className="space-y-3">
            {auditLog.map((entry, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-900">{entry.action}</span>
                  <span className="font-mono text-slate-400 text-[10px]">{entry.time}</span>
                </div>
                <div className="text-[11px] text-teal-700 font-medium font-mono">
                  {entry.actor} • Ref: {entry.caseId}
                </div>
                <p className="text-[11px] text-slate-600 mt-1">{entry.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

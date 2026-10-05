import React, { useState } from 'react';
import {
  Scale,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Building2,
  FileText,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { FieldError, ValidationSummary, WorkflowProgress } from './horizon';

interface RegulatoryAdminProps {
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
}

type ReturnAuthority = 'IRA' | 'KRA';
type ReturnStatus = 'Draft' | 'Ready to File' | 'Lodged & Approved';

interface StatutoryReturnPack {
  id: string;
  name: string;
  authority: ReturnAuthority;
  period: string;
  status: ReturnStatus;
  deadline: string;
}

const STANDARD_RETURN_NAMES: Record<ReturnAuthority, string[]> = {
  IRA: ['IRA Quarterly Prudential Return', 'IRA Annual Statutory Accounts', 'IRA Reinsurance Cession Return'],
  KRA: ['KRA VAT Return', 'KRA Withholding Tax Return', 'KRA Insurance Training Levy Return'],
};

const INITIAL_RETURNS: StatutoryReturnPack[] = [
  { id: 'RTN-2026-Q2-IRA-01', name: 'IRA Quarterly Prudential Return', authority: 'IRA', period: 'Q2 2026', status: 'Lodged & Approved', deadline: '15 Jul 2026' },
  { id: 'RTN-2026-Q2-KRA-01', name: 'KRA VAT Return', authority: 'KRA', period: 'Jun 2026', status: 'Lodged & Approved', deadline: '20 Jul 2026' },
  { id: 'RTN-2026-Q3-IRA-01', name: 'IRA Quarterly Prudential Return', authority: 'IRA', period: 'Q3 2026', status: 'Ready to File', deadline: '15 Oct 2026' },
  { id: 'RTN-2026-08-KRA-01', name: 'KRA Withholding Tax Return', authority: 'KRA', period: 'Aug 2026', status: 'Draft', deadline: '20 Sep 2026' },
];

export const RegulatoryAdmin: React.FC<RegulatoryAdminProps> = ({
  onNavigate,
  densityMode,
}) => {
  const [packs, setPacks] = useState<StatutoryReturnPack[]>(INITIAL_RETURNS);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [authority, setAuthority] = useState<ReturnAuthority>('IRA');
  const [returnName, setReturnName] = useState(STANDARD_RETURN_NAMES.IRA[0]);
  const [period, setPeriod] = useState('Q4 2026');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateAttempted, setGenerateAttempted] = useState(false);

  const generateErrors: Record<string, string> = {};
  if (!returnName.trim()) generateErrors.returnName = 'Select a return type.';
  if (!period.trim()) generateErrors.period = 'Filing period is required.';
  const hasGenerateErrors = Object.keys(generateErrors).length > 0;

  const handleGenerateReturn = () => {
    if (hasGenerateErrors) {
      setGenerateAttempted(true);
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const deadline = new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      setPacks((prev) => [
        {
          id: `RTN-${Date.now().toString().slice(-6)}`,
          name: returnName,
          authority,
          period,
          status: 'Draft',
          deadline,
        },
        ...prev,
      ]);
      setIsGenerating(false);
      setGenerateAttempted(false);
      setIsGenerateOpen(false);
    }, 600);
  };

  const handleDownload = (packId: string) => {
    if (downloadProgress[packId] !== undefined) return;
    setDownloadProgress((prev) => ({ ...prev, [packId]: 0 }));
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        const current = prev[packId] ?? 0;
        if (current >= 100) {
          clearInterval(interval);
          const { [packId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [packId]: Math.min(100, current + 20) };
      });
    }, 150);
  };

  return (
    <div id="regulatory-admin-view" className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="hz-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                STATUTORY COMPLIANCE
              </span>
              <span className="font-mono font-bold text-xs text-teal-700">IRA & KRA PACKS</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                ● CAPITAL ADEQUACY: 184% (SURPLUS)
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              Regulatory Compliance & Statutory Solvency Returns
            </h1>

            <p className="text-xs text-slate-500 mt-1">
              Automated compilation of Insurance Regulatory Authority (IRA) Q3 returns, Solvency II equivalent ratio, and KRA withholding schedules.
            </p>
          </div>
        </div>

        {/* Regulatory Ratios Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="hz-panel p-3 border-t-2 border-t-emerald-600">
            <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">
              Solvency Margin Ratio
            </div>
            <div className="text-emerald-700 font-bold font-mono text-base mt-1">184.2%</div>
            <div className="text-slate-500 text-xs mt-0.5">Statutory min: 100.0%</div>
          </div>
          <div className="hz-panel p-3 border-t-2 border-t-teal-600">
            <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">
              Admitted Capital Base
            </div>
            <div className="text-slate-900 font-bold font-mono text-base mt-1">KES 1.42B</div>
            <div className="text-slate-500 text-xs mt-0.5">Govt securities & bank deposits</div>
          </div>
          <div className="hz-panel p-3 border-t-2 border-t-teal-600">
            <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">
              Insurance Training Levy
            </div>
            <div className="text-slate-900 font-bold font-mono text-base mt-1">KES 248,000</div>
            <div className="text-emerald-700 text-xs font-semibold mt-0.5">Remitted on 20th</div>
          </div>
          <div className="hz-panel p-3 border-t-2 border-t-teal-600">
            <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">
              Policyholders Fund Levy
            </div>
            <div className="text-slate-900 font-bold font-mono text-base mt-1">KES 310,000</div>
            <div className="text-emerald-700 text-xs font-semibold mt-0.5">Paid via KRA Paybill</div>
          </div>
        </div>
      </div>

      {/* Statutory Filing Packs Table */}
      <div className="hz-panel overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
            Mandatory Statutory Return Schedules
          </h2>
          <button
            onClick={() => setIsGenerateOpen((open) => !open)}
            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Return</span>
          </button>
        </div>

        {isGenerateOpen && (
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Regulatory Body</label>
                <select
                  value={authority}
                  onChange={(e) => {
                    const nextAuthority = e.target.value as ReturnAuthority;
                    setAuthority(nextAuthority);
                    setReturnName(STANDARD_RETURN_NAMES[nextAuthority][0]);
                  }}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="IRA">IRA</option>
                  <option value="KRA">KRA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Return Type</label>
                <select
                  value={returnName}
                  onChange={(e) => setReturnName(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {STANDARD_RETURN_NAMES[authority].map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {generateAttempted && <FieldError message={generateErrors.returnName} />}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Filing Period</label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="e.g. Q4 2026"
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {generateAttempted && <FieldError message={generateErrors.period} />}
              </div>
            </div>

            {generateAttempted && <ValidationSummary errors={Object.values(generateErrors)} />}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateReturn}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60"
              >
                <span>{isGenerating ? 'Generating...' : 'Generate Draft Return'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase font-mono">
              <tr>
                <th className="p-3">Return Schedule</th>
                <th className="p-3">Regulatory Body</th>
                <th className="p-3">Filing Period</th>
                <th className="p-3">Status</th>
                <th className="p-3">Statutory Deadline</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {packs.map((pack) => (
                <tr key={pack.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{pack.name}</div>
                    <div className="text-xs font-mono text-teal-700">{pack.id}</div>
                  </td>
                  <td className="p-3 font-semibold text-slate-800">{pack.authority}</td>
                  <td className="p-3 font-mono text-slate-600">{pack.period}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pack.status === 'Lodged & Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : pack.status === 'Ready to File'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {pack.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-500 text-xs">{pack.deadline}</td>
                  <td className="p-3 text-right">
                    {downloadProgress[pack.id] !== undefined ? (
                      <div className="w-32 ml-auto">
                        <WorkflowProgress value={downloadProgress[pack.id]} />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDownload(pack.id)}
                        className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs border border-teal-200/60 inline-flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export Pack</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

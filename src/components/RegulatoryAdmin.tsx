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
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { mockRegulatoryPacks } from '../data/mockData';

interface RegulatoryAdminProps {
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
}

export const RegulatoryAdmin: React.FC<RegulatoryAdminProps> = ({
  onNavigate,
  densityMode,
}) => {
  const [packs, setPacks] = useState(mockRegulatoryPacks);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = (packId: string) => {
    setDownloadingId(packId);
    setTimeout(() => {
      setDownloadingId(null);
    }, 1000);
  };

  return (
    <div id="regulatory-admin-view" className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                STATUTORY COMPLIANCE
              </span>
              <span className="font-mono font-bold text-xs text-teal-700">IRA & KRA PACKS</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
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
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Solvency Margin Ratio
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">184.2%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Statutory min: 100.0%</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Admitted Capital Base
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">KES 1.42B</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Govt securities & bank deposits</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Insurance Training Levy
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">KES 248,000</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Remitted on 20th</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Policyholders Fund Levy
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">KES 310,000</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Paid via KRA Paybill</div>
          </div>
        </div>
      </div>

      {/* Statutory Filing Packs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
            Mandatory Statutory Return Schedules
          </h2>
        </div>

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
                    <div className="text-[11px] font-mono text-teal-700">{pack.id}</div>
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
                  <td className="p-3 font-mono text-slate-500 text-[11px]">{pack.deadline}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDownload(pack.id)}
                      className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs border border-teal-200/60 inline-flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>{downloadingId === pack.id ? 'Exporting...' : 'Export Pack'}</span>
                    </button>
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

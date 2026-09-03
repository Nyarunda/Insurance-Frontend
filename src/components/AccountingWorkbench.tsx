import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  Building2,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  Scale,
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { mockJournalEntries, mockTrialBalance } from '../data/mockData';

interface AccountingWorkbenchProps {
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
}

export const AccountingWorkbench: React.FC<AccountingWorkbenchProps> = ({
  onNavigate,
  densityMode,
}) => {
  const [activeTab, setActiveTab] = useState<'journal' | 'trial-balance' | 'recon' | 'reinsurance'>('journal');
  const [searchTerm, setSearchTerm] = useState('');

  const paddingClass =
    densityMode === 'compact' ? 'p-2' : densityMode === 'spacious' ? 'p-4' : 'p-3';

  return (
    <div id="accounting-workbench-view" className="space-y-6 animate-in fade-in duration-150">
      {/* Top Master Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                FINANCE & TREASURY
              </span>
              <span className="font-mono font-bold text-xs text-teal-700">GENERAL LEDGER</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                ● BOOKS BALANCED
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              Insurance Accounting & Financial Operations
            </h1>

            <p className="text-xs text-slate-500 mt-1">
              Automated double-entry general journal, real-time trial balance, M-Pesa float settlement, and reinsurance bordereaux.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('regulatory-admin')}
              className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>IRA Solvency Pack</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Cash & M-Pesa Float
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">KES 81,240,000</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Reconciled to 99.98%</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Outstanding Receivables
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">KES 42,800,000</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Corporate 30-day debtors</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Claims Reserves Incurred
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">KES 16,450,000</div>
            <div className="text-[11px] text-slate-500 mt-0.5">IBNR actuarial reserve</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Trial Balance Delta
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">KES 0.00</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Debits = Credits (KES 194.6M)</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-slate-200 flex space-x-6 text-xs font-semibold overflow-x-auto">
          {(
            [
              { id: 'journal', label: 'General Journal Entries' },
              { id: 'trial-balance', label: 'Chart of Accounts & Trial Balance' },
              { id: 'recon', label: 'M-Pesa & Bank Reconciliation' },
              { id: 'reinsurance', label: 'Reinsurance Bordereaux Clearing' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 transition-colors relative whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-teal-700 font-bold border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: General Journal */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                Double-Entry General Journal
              </h2>
              <p className="text-xs text-slate-500">Every policy bind, receipt, or claim disbursement creates balancing entries</p>
            </div>
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter vouchers..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs border border-slate-200 bg-slate-50 focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase font-mono">
                <tr>
                  <th className={paddingClass}>Voucher / Date</th>
                  <th className={paddingClass}>Description & Policy</th>
                  <th className={paddingClass}>Debit Account</th>
                  <th className={paddingClass}>Credit Account</th>
                  <th className={`${paddingClass} text-right`}>Amount (KES)</th>
                  <th className={paddingClass}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockJournalEntries.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className={paddingClass}>
                      <div className="font-mono font-bold text-teal-700">{j.voucherNumber || j.reference || j.id}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{j.date}</div>
                    </td>
                    <td className={paddingClass}>
                      <div className="font-semibold text-slate-900">{j.description}</div>
                      <div className="text-[11px] font-mono text-slate-500">{j.policyNumber || j.reference}</div>
                    </td>
                    <td className={paddingClass}>
                      <div className="font-mono text-slate-800 font-medium">{j.debitAccount || (j.debit > 0 ? j.account : '—')}</div>
                    </td>
                    <td className={paddingClass}>
                      <div className="font-mono text-slate-800 font-medium">{j.creditAccount || (j.credit > 0 ? j.account : '—')}</div>
                    </td>
                    <td className={`${paddingClass} text-right font-mono font-bold text-slate-900`}>
                      KES {(j.amountKes || j.debit || j.credit).toLocaleString()}
                    </td>
                    <td className={paddingClass}>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {j.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Trial Balance */}
      {activeTab === 'trial-balance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                General Ledger Trial Balance
              </h2>
              <p className="text-xs text-slate-500">Period ending 30 September 2026 (Month-to-Date)</p>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-700 px-3 py-1 rounded bg-emerald-50 border border-emerald-200">
              Balanced: Total Debits = Total Credits
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase font-mono">
                <tr>
                  <th className={paddingClass}>Account Code</th>
                  <th className={paddingClass}>Account Description</th>
                  <th className={paddingClass}>Category</th>
                  <th className={`${paddingClass} text-right`}>Debit (KES)</th>
                  <th className={`${paddingClass} text-right`}>Credit (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockTrialBalance.map((row) => (
                  <tr key={row.accountCode} className="hover:bg-slate-50">
                    <td className={`${paddingClass} font-mono font-bold text-teal-700`}>{row.accountCode}</td>
                    <td className={`${paddingClass} font-semibold text-slate-900`}>{row.accountName}</td>
                    <td className={paddingClass}>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                        {row.category}
                      </span>
                    </td>
                    <td className={`${paddingClass} text-right font-mono font-bold text-slate-900`}>
                      {(row.debitKes ?? row.debit) > 0 ? `KES ${(row.debitKes ?? row.debit).toLocaleString()}` : '—'}
                    </td>
                    <td className={`${paddingClass} text-right font-mono font-bold text-slate-900`}>
                      {(row.creditKes ?? row.credit) > 0 ? `KES ${(row.creditKes ?? row.credit).toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-mono text-xs font-bold text-slate-900">
                <tr>
                  <td colSpan={3} className={`${paddingClass} text-right uppercase`}>
                    Total Verified Sum:
                  </td>
                  <td className={`${paddingClass} text-right text-emerald-800`}>KES 194,600,000</td>
                  <td className={`${paddingClass} text-right text-emerald-800`}>KES 194,600,000</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: M-Pesa & Bank Recon */}
      {activeTab === 'recon' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Automated Clearing & Settlement Gateway</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Safaricom Paybill 881200</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">KES 2,450,800</div>
              <div className="text-emerald-700 text-[11px] mt-1">100% matched to invoice numbers</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Pesalink Clearing</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">KES 14,200,000</div>
              <div className="text-emerald-700 text-[11px] mt-1">Real-time interbank settlement</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Unallocated Payments</span>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-1">KES 0.00</div>
              <div className="text-slate-500 text-[11px] mt-1">Zero unmapped client remittances</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Reinsurance */}
      {activeTab === 'reinsurance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Reinsurance Bordereaux Clearing (Kenya Re, Zep-Re, Africa Re)</h2>
          <p className="text-xs text-slate-500">
            Automated quota share and surplus treaty apportionments generated from quarterly underwriting closes.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-2">
            <div className="flex justify-between">
              <span>Treaty Year: 2026 Quota Share 20%</span>
              <span className="font-bold text-teal-700">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Ceded Gross Premium (YTD):</span>
              <span>KES 24,800,000</span>
            </div>
            <div className="flex justify-between">
              <span>Reinsurance Commission Earned (25%):</span>
              <span className="text-emerald-700 font-bold">KES 6,200,000</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

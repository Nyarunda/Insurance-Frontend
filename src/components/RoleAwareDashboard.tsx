import React from 'react';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  Building2,
  ShieldAlert,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { ScreenId, UserRole, DensityMode } from '../types';
import { mockWorkTasks } from '../data/mockData';
import { ROLE_LABELS } from '../data/roleRights';
import { LiveDot } from './horizon';

interface RoleAwareDashboardProps {
  onNavigate: (screen: ScreenId) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  densityMode: DensityMode;
  assignedRoleCenters?: UserRole[];
}

export const RoleAwareDashboard: React.FC<RoleAwareDashboardProps> = ({
  onNavigate,
  currentRole,
  onRoleChange,
  densityMode,
  assignedRoleCenters,
}) => {
  const pendingTasks = mockWorkTasks.slice(0, 3);
  const switchableRoleCenters = assignedRoleCenters?.length ? assignedRoleCenters : [currentRole];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Welcome & Operational Context Banner */}
      <div className="hz-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 uppercase tracking-wider font-mono mb-1">
            <span>Portfolio Operations</span>
            <span>•</span>
            <span>Apex Insurance Kenya Ltd</span>
            <span>•</span>
            <span className="text-slate-500 font-normal">Thursday, 03 Sep 2026</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {currentRole === 'executive' && 'Executive Leadership Portfolio & Loss Performance'}
            {currentRole === 'underwriter' && 'Senior Underwriting Workbench & Referral Command'}
            {currentRole === 'claims' && 'Claims Operations, Reserves & Settlement Triage'}
            {currentRole === 'finance' && 'Treasury, Premium Accounting & Reinsurance Clearing'}
            {currentRole === 'agent' && 'Intermediary Production, Quotations & Field Collections'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Active Role Center:{' '}
            <span className="font-semibold text-slate-800">{ROLE_LABELS[currentRole]}</span>. Displays tailored KPIs,
            statutory controls, and assigned SLA priorities.
          </p>
        </div>

        {/* Role Center Switcher — limited to what this account is assigned */}
        {switchableRoleCenters.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
            {switchableRoleCenters.map((r) => (
              <button
                key={r}
                onClick={() => onRoleChange(r)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  currentRole === r
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
            {ROLE_LABELS[currentRole]}
          </div>
        )}
      </div>

      {/* Dynamic KPI Cards Based on Role */}
      {currentRole === 'executive' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium flex items-center justify-between">
              <span>Gross Written Premium</span>
              <span className="text-emerald-700 font-semibold text-xs flex items-center">
                +14.2% <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">KES 124.0M</div>
            <div className="text-xs text-slate-500 mt-1">Target: KES 150M Q3 Run Rate</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium flex items-center justify-between">
              <span>Combined Loss Ratio</span>
              <span className="text-teal-700 font-semibold text-xs flex items-center">
                -3.1% <ArrowDownRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">62.4%</div>
            <div className="text-xs text-slate-500 mt-1">Net loss ratio 41.8% + expense 20.6%</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium flex items-center justify-between">
              <span>Cash Collected</span>
              <span className="text-emerald-700 font-semibold text-xs">94.1% rate</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">KES 81.2M</div>
            <div className="text-xs text-slate-500 mt-1">M-Pesa & Pesalink bank clearing</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium flex items-center justify-between">
              <span>Policy Retention</span>
              <span className="text-teal-700 font-semibold text-xs">Commercial focus</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">91.8%</div>
            <div className="text-xs text-slate-500 mt-1">1,432 Active In-Force policies</div>
          </div>
        </div>
      )}

      {currentRole === 'underwriter' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-amber-200 bg-amber-50/20 shadow-2xs">
            <div className="text-slate-600 text-xs font-semibold flex items-center justify-between">
              <span>Pending UW Referrals</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                1 Over Limit
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">14 Cases</div>
            <div className="text-xs text-amber-700 font-medium mt-1">ABC Logistics KES 18.5M Actros</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Portfolio Total Exposure</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">KES 648.5M</div>
            <div className="text-xs text-slate-500 mt-1">Treaty retention capacity 82%</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Commercial Auto Loss Ratio</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">41.2%</div>
            <div className="text-xs text-emerald-700 font-medium mt-1">Well within 50.0% statutory band</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-rose-200 bg-rose-50/20 shadow-2xs">
            <div className="text-slate-600 text-xs font-semibold flex items-center justify-between">
              <span>SLA Breaches Countdown</span>
              <LiveDot tone="danger" size="md" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-700 mt-1">15m Remaining</div>
            <div className="text-xs text-rose-600 font-medium mt-1">Escalated to Chief Underwriter</div>
          </div>
        </div>
      )}

      {currentRole === 'claims' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Open Claim Files</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">23 Active</div>
            <div className="text-xs text-slate-500 mt-1">3 FNOL reports taken today</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Outstanding Reserves</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">KES 16.4M</div>
            <div className="text-xs text-slate-500 mt-1">Incurred but not reported (IBNR) covered</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Average Resolution Speed</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">4.2 Days</div>
            <div className="text-xs text-emerald-700 font-medium mt-1">M-Pesa B2C instant settlement</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Subrogation Recovery Identified</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">KES 290,000</div>
            <div className="text-xs text-slate-500 mt-1">Third-party insurer admission received</div>
          </div>
        </div>
      )}

      {currentRole === 'finance' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Gross Premium Receivables</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">KES 42.8M</div>
            <div className="text-xs text-slate-500 mt-1">30-day corporate credit accounts</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Liquid Bank & M-Pesa Float</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">KES 81.2M</div>
            <div className="text-xs text-emerald-700 font-medium mt-1">Standard Chartered & Safaricom</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Claims Payable Accrual</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">KES 16.4M</div>
            <div className="text-xs text-slate-500 mt-1">Approved discharge vouchers awaiting pay</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-2xs">
            <div className="text-slate-600 text-xs font-semibold flex items-center justify-between">
              <span>Trial Balance Status</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">Balanced ✓</div>
            <div className="text-xs text-emerald-700 font-medium mt-1">Total Debits = Total Credits (KES 194.6M)</div>
          </div>
        </div>
      )}

      {currentRole === 'agent' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Today&apos;s New Quotations</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">12 Quotes</div>
            <div className="text-xs text-teal-700 font-medium mt-1">Average turnaround: 3 minutes</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Policies Bound (Today)</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">7 Bound</div>
            <div className="text-xs text-emerald-700 font-medium mt-1">58.3% immediate conversion</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Premium Collected</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">KES 420,000</div>
            <div className="text-xs text-slate-500 mt-1">M-Pesa STK push & Paybill</div>
          </div>
          <div className="hz-card">
            <div className="text-slate-500 text-xs font-medium">Earned Commission Accrual</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">KES 32,500</div>
            <div className="text-xs text-slate-500 mt-1">Paid on weekly Friday cycle</div>
          </div>
        </div>
      )}

      {/* Main Grid: My Work Queue Widget & Portfolio Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: My Work Highlights with Direct Action */}
        <div className="hz-card lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Immediate Action Required (My Work)</h2>
              <p className="text-xs text-slate-500">Tasks with active SLAs requiring underwriter or manager sign-off</p>
            </div>
            <button
              onClick={() => onNavigate('my-work')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <span>View All (23)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {pendingTasks.map((t) => (
              <div
                key={t.id}
                className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {t.priority === 'HIGH' ? (
                      <LiveDot tone="danger" size="md" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>{t.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                        {t.referenceId}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {t.insuredName} • Assigned to {t.assignedTo} • Age: {t.age}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div
                      className={`text-xs font-mono font-bold ${
                        t.slaOverdue ? 'text-rose-700' : 'text-slate-700'
                      }`}
                    >
                      {t.sla}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">{t.sourceModule}</div>
                  </div>

                  <button
                    onClick={() => {
                      if (t.sourceModule === 'Underwriting') onNavigate('underwriting-workbench');
                      else if (t.sourceModule === 'Claims') onNavigate('claim-workspace');
                      else onNavigate('accounting-workbench');
                    }}
                    className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs transition-colors border border-teal-200/60"
                  >
                    Open →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick links to primary record workspaces */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-xs">
            <button
              onClick={() => onNavigate('customer-workspace')}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 text-left transition-colors"
            >
              <div className="font-bold text-slate-800">Customer</div>
              <div className="text-xs text-slate-500 mt-0.5">Party intelligence & relationships</div>
            </button>
            <button
              onClick={() => onNavigate('quote-workspace')}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 text-left transition-colors"
            >
              <div className="font-bold text-slate-800">Quote</div>
              <div className="text-xs text-slate-500 mt-0.5">Commercial fleet & multi-insurer</div>
            </button>
            <button
              onClick={() => onNavigate('policy-workspace')}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 text-left transition-colors"
            >
              <div className="font-bold text-slate-800">Policy</div>
              <div className="text-xs text-slate-500 mt-0.5">Version history V1-V4 & timeline</div>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Operational Pulse & Integration Gateway Health */}
        <div className="space-y-4">
          <div className="hz-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Integration Gateway Health</h2>
              <button
                onClick={() => onNavigate('integration-hub')}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
              >
                Full Hub →
              </button>
            </div>
            <div className="space-y-2.5 mt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Safaricom M-Pesa B2C/C2B</span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> 128ms • 142 TPS
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Oracle Flexcube Banking</span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> 42ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Insurance Regulatory Authority (IRA)</span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">KRA iTax PIN Verification</span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--hz-primary-900)] text-white rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">
                Product Studio
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-mono">v4.2</span>
            </div>
            <h3 className="text-base font-bold mt-1">Motor Comprehensive v4.2</h3>
            <p className="text-xs text-slate-300 mt-1">
              Visual formula engine with live Product Test Lab Sandbox for immediate premium verification.
            </p>
            <button
              onClick={() => onNavigate('product-factory')}
              className="mt-4 w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Launch Product Sandbox</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

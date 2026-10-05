import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Users,
  ShieldCheck,
  DollarSign,
  FileSpreadsheet,
  Calendar,
  Clock,
  Briefcase,
  TrendingUp,
  Percent,
  Download,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Check,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { HorizonToast } from './horizon';

interface BrokerWorkspaceProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
  recordId?: string;
}

export const BrokerWorkspace: React.FC<BrokerWorkspaceProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'policies' | 'commissions' | 'loss-ratio' | 'pipeline' | 'compliance' | 'audit'
  >('overview');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const broker = {
    code: 'BRK-00291',
    name: 'Marsh McLennan Wholesale',
    iraLicense: 'IRA/BRK/2026/041',
    kraPin: 'P051294812K',
    principalOfficer: 'Sarah Jenkins',
    email: 'sarah.jenkins@marshmclennan.co.ke',
    phone: '+254 20 4912000',
    address: 'Marsh House, 5th Floor, Upper Hill, Nairobi',
    status: 'ACTIVE / ACCREDITED',
    activePolicies: 428,
    totalGwpKes: 148500000,
    lossRatioPct: 44.2,
    ytdCommissionKes: 14850000,
    piCoverLimitKes: 100000000,
    piInsurer: 'Heritage Insurance Ltd',
    piExpiry: '31 Dec 2026',
    bankName: 'Stanbic Bank Kenya Ltd',
    bankAccount: '0100294812 (Chiromo Branch)',
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'policies', label: 'Production (428)' },
    { id: 'commissions', label: 'Commissions' },
    { id: 'loss-ratio', label: 'Loss Ratio (44%)' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'compliance', label: 'IRA & KYC' },
    { id: 'audit', label: 'Audit Log' },
  ] as const;

  return (
    <div id="broker-workspace" className="space-y-4 pb-12 animate-in fade-in duration-150">
      <HorizonToast message={toastMessage} />

      {/* ==================================================================== */}
      {/* 1. RECORD HEADER: Follows standard layout                            */}
      {/* ← Broker / BRK-00291                           ● ACTIVE / ACCREDITED */}
      {/*   Marsh McLennan Wholesale • IRA/BRK/2026/041 • Upper Hill, Nairobi  */}
      {/* ==================================================================== */}
      <div className="hz-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('intermediaries')}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mr-1"
                title="Back to Intermediaries"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span
                onClick={() => onNavigate('intermediaries')}
                className="text-xs font-mono text-slate-500 hover:text-teal-700 cursor-pointer"
              >
                Intermediary
              </span>
              <span className="text-slate-400">/</span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {broker.code}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {broker.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono pl-7 sm:pl-0">
              <span className="font-semibold text-slate-800 font-sans text-sm">{broker.name}</span>
              <span>•</span>
              <span>IRA: {broker.iraLicense}</span>
              <span>•</span>
              <span className="font-sans text-slate-600">PO: {broker.principalOfficer}</span>
              <span>•</span>
              <span className="text-slate-600">KRA: {broker.kraPin}</span>
            </div>
          </div>

          {/* Quick Portfolio Metric Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              <span>GWP: KES {(broker.totalGwpKes / 1000000).toFixed(1)}M (428 Policies)</span>
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. RECORD ACTION BAR                                                 */}
        {/* [New Quotation] [Remit Commission] [KYC Compliance] [More ▼]         */}
        {/* ==================================================================== */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('quote-workspace')}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Create Quotation</span>
            </button>

            <button
              onClick={() => {
                triggerToast('Commission batch remittance approved for KES 1,245,000');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--hz-primary-700)] hover:bg-[var(--hz-primary-800)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Remit Commission</span>
            </button>

            <button
              onClick={() => setActiveTab('compliance')}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>IRA Compliance Check</span>
            </button>

            {/* More Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 border border-slate-200 transition-colors"
              >
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showMoreMenu && (
                <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-30 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      triggerToast('Full Broker Portfolio Statement exported');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download Commission Statement</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerToast('Broker SLA & Agreement Dossier downloaded');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>Download Broker Agreement</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Context Links */}
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => onNavigate('intermediaries')}
              className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <span>All Intermediaries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Activity Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. WORKSPACE 3-COLUMN GRID PATTERN                                   */}
      {/* Left Column (lg:col-span-3): Persistent Broker Identity & Summary    */}
      {/* Center Column (lg:col-span-6): Main Tabbed Workspace                 */}
      {/* Right Column (lg:col-span-3): Quality Score, Next Payout & Reg Status*/}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: PERSISTENT BROKER IDENTITY (lg:col-span-3)              */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="hz-card space-y-4">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-2 flex items-center justify-between">
              <span>BROKER PROFILE</span>
              <span className="font-mono text-xs text-emerald-700 font-bold">TIER 1</span>
            </div>

            {/* Core Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-sm truncate">{broker.name}</div>
                  <div className="text-xs text-slate-500 font-medium truncate">
                    Code: {broker.code}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-slate-400 uppercase font-medium">IRA License</span>
                  <span className="font-bold text-slate-800">{broker.iraLicense}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-slate-400 uppercase font-medium">KRA PIN</span>
                  <span className="font-bold text-slate-800">{broker.kraPin}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-slate-400 uppercase font-medium">PI Coverage</span>
                  <span className="font-bold text-slate-800">KES 100M</span>
                </div>
              </div>
            </div>

            {/* CONTACT DETAILS */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                PRINCIPAL & CONTACT
              </div>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-900">{broker.principalOfficer}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-600 truncate">{broker.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-600">{broker.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-600 leading-tight">{broker.address}</span>
                </div>
              </div>
            </div>

            {/* SETTLEMENT ACCOUNT */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                COMMISSION DISBURSEMENT
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Bank</span>
                  <span className="font-semibold text-slate-800 text-xs">{broker.bankName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Account</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{broker.bankAccount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Payment Mode</span>
                  <span className="font-mono text-emerald-700 font-bold text-xs">Direct EFT / RTGS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CENTER COLUMN: MAIN WORKSPACE (lg:col-span-6)                        */}
        {/* TABS: Overview | Policies | Commissions | Loss Ratio | Pipeline |    */}
        {/*       IRA & KYC | Audit Log                                          */}
        {/* ==================================================================== */}
        <div className="min-w-0 space-y-4 lg:col-span-9 min-[1680px]:col-span-6">
          {/* Sticky Tab Bar */}
          <div className="sticky top-0 z-10 border-b border-[var(--hz-border-grid)] bg-[var(--hz-bg-app)]">
            <div className="flex items-center gap-4 text-[13px] overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`-mb-px border-b-2 py-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'border-[var(--hz-primary-700)] text-[var(--hz-primary-700)] font-semibold'
                      : 'border-transparent text-[var(--hz-text-secondary)] hover:text-[var(--hz-text-primary)]'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Production KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Total In-Force GWP</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    KES 148.5M
                  </div>
                  <div className="text-emerald-700 text-xs font-semibold mt-0.5">+18.4% YoY</div>
                </div>
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Active Policies</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    428
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">85% Commercial</div>
                </div>
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Book Loss Ratio</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    44.2%
                  </div>
                  <div className="text-emerald-700 text-xs font-semibold mt-0.5">Target &lt; 55%</div>
                </div>
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">YTD Commission</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    KES 14.8M
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">Avg rate: 10.0%</div>
                </div>
              </div>

              {/* Major Corporate Accounts Under Management */}
              <div className="hz-card">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--hz-border-grid)] mb-3">
                  <h2 className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                    Top Insured Accounts Brokered
                  </h2>
                  <button
                    onClick={() => setActiveTab('policies')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                  >
                    View All 428 →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {[
                    { name: 'Apex Logistics & Freight Corp', line: 'Commercial Auto & Cargo Package', gwp: 'KES 1,485,000', ratio: '41.8%' },
                    { name: 'Titan Bulk Fuel Transport LLC', line: 'HazMat Commercial Auto Liability', gwp: 'KES 2,150,000', ratio: '64.2%' },
                    { name: 'NorthStar Cold Chain Solutions', line: 'Refrigerated Cargo & Inland Marine', gwp: 'KES 980,000', ratio: '28.5%' },
                  ].map((acc, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{acc.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{acc.line}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900 text-xs">{acc.gwp}</div>
                        <div className="text-xs text-slate-500 font-mono">Loss Ratio: {acc.ratio}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: POLICIES */}
          {activeTab === 'policies' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Active Brokered Policies Ledger
              </h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-xs">
                    <th className="py-2 px-3">Policy No</th>
                    <th className="py-2 px-3">Insured Name</th>
                    <th className="py-2 px-3">Class</th>
                    <th className="py-2 px-3 text-right">Annual GWP (KES)</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  <tr>
                    <td className="py-2 px-3 font-bold text-teal-700 cursor-pointer" onClick={() => onNavigate('policy-workspace')}>
                      POL/MTR/2026/001239
                    </td>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900">Apex Logistics</td>
                    <td className="py-2 px-3 font-sans text-slate-600">Commercial Motor</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">1,485,000</td>
                    <td className="py-2 px-3 text-right text-emerald-700 font-bold font-sans">In Force</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-teal-700 cursor-pointer" onClick={() => onNavigate('policy-workspace')}>
                      POL/CARGO/2026/0491
                    </td>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900">Titan Bulk Fuel</td>
                    <td className="py-2 px-3 font-sans text-slate-600">HazMat Cargo</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">2,150,000</td>
                    <td className="py-2 px-3 text-right text-emerald-700 font-bold font-sans">In Force</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: COMMISSIONS */}
          {activeTab === 'commissions' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Standard Intermediary Commission Scales
              </h3>
              <div className="space-y-2">
                {[
                  { class: 'Motor Commercial & Haulage', statutoryCap: '10.0%', brokerAgreed: '10.0%', wht: '5.0% WHT' },
                  { class: 'Fire & Industrial Special Risks', statutoryCap: '20.0%', brokerAgreed: '17.5%', wht: '5.0% WHT' },
                  { class: 'Marine Cargo & Transit', statutoryCap: '15.0%', brokerAgreed: '12.5%', wht: '5.0% WHT' },
                  { class: 'Group Medical & Life', statutoryCap: '10.0%', brokerAgreed: '8.5%', wht: '5.0% WHT' },
                ].map((row, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{row.class}</div>
                      <div className="text-xs text-slate-500">Statutory IRA Cap: {row.statutoryCap}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-teal-700">{row.brokerAgreed}</div>
                      <div className="text-xs text-slate-400 font-mono">{row.wht}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LOSS RATIO */}
          {activeTab === 'loss-ratio' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Portfolio Underwriting Quality & Loss Ratio
              </h3>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-emerald-950">Combined 3-Year Loss Ratio</span>
                  <span className="font-mono font-bold text-emerald-800 text-xl">44.2%</span>
                </div>
                <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full w-[44%]" />
                </div>
                <p className="text-xs text-emerald-900 mt-1">
                  Exemplary loss ratio performance. Marsh McLennan qualifies for Preferred Intermediary Profit Commission bonus.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Active Submissions & Quotations in Pipeline
              </h3>
              <div className="space-y-2">
                <div
                  onClick={() => onNavigate('quote-workspace')}
                  className="p-3 rounded-lg border border-teal-200 bg-teal-50/40 cursor-pointer hover:bg-teal-50 transition-colors flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-slate-900">Q/MTR/2026/008291 — ABC Logistics Ltd</div>
                    <div className="text-xs text-slate-500">Mercedes Actros Prime Mover (Sum Insured KES 18.5M)</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 font-mono">
                      REFERRAL
                    </span>
                    <div className="font-mono text-xs text-slate-600 mt-0.5">KES 832,500</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: COMPLIANCE */}
          {activeTab === 'compliance' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Statutory Licensing & KYC Status
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-950">IRA Annual Intermediary License</div>
                    <div className="text-emerald-800 text-xs">License #IRA/BRK/2026/041 valid through 31 Dec 2026.</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    CURRENT ✓
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-950">Professional Indemnity Policy (KES 100M)</div>
                    <div className="text-emerald-800 text-xs">Heritage Insurance policy #PI-2026-8191 on file.</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    VERIFIED ✓
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-950">KRA Tax Compliance Certificate</div>
                    <div className="text-emerald-800 text-xs">TCC #KRA-2026-09184 valid. 5% WHT automated.</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    VALID ✓
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT */}
          {activeTab === 'audit' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Intermediary Activity Trace
              </h3>
              <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <div className="font-bold text-slate-900">Quotation Submitted via API</div>
                  <div className="text-slate-500 text-xs">Broker system generated quotation Q/MTR/2026/008291.</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">03 Sep 2026 10:42 EAT</div>
                </div>
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="font-bold text-slate-900">Annual IRA License Renewal Uploaded</div>
                  <div className="text-slate-500 text-xs">Sarah Jenkins uploaded IRA 2026 compliance certificate.</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">15 Jan 2026 14:15 EAT</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: CONTEXTUAL QUALITY, NEXT PAYOUT & COMPLIANCE (lg:col-3)*/}
        {/* ==================================================================== */}
        <div className="grid items-start gap-4 md:grid-cols-2 lg:col-span-12 lg:grid-cols-3 min-[1680px]:col-span-3 min-[1680px]:grid-cols-1">
          {/* Next Payout Card */}
          <div className="hz-card space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hz-border-grid)]">
              <span className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                NEXT COMMISSION BATCH
              </span>
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                SCHEDULED
              </span>
            </div>

            <div>
              <div className="text-slate-500 text-xs">Pending Remittance</div>
              <div className="text-2xl font-bold font-mono text-teal-700 mt-0.5">
                KES 1,245,000
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Settlement Date: 05 Sep 2026</div>
            </div>

            <button
              onClick={() => triggerToast('EFT Payment batch #EFT-2026-0905 initiated to Stanbic')}
              className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Authorize EFT Remittance</span>
            </button>
          </div>

          {/* Quality Tier Card */}
          <div className="bg-slate-900 rounded-xl p-4 text-slate-200 text-xs space-y-2">
            <div className="font-mono text-teal-400 font-bold uppercase text-[10px]">
              Quality Classification
            </div>
            <div className="text-white font-bold text-sm">Tier 1 Platinum Partner</div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Consistently under 50% loss ratio. Authorized for instant STP binding up to KES 25M sum insured.
            </p>
          </div>

          {/* IRA Regulatory Compliance */}
          <div className="hz-card space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5">
              REGULATORY COMPLIANCE
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Ombudsman Complaints</span>
                <span className="font-bold text-emerald-700 text-xs">0 Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Section 156 (Cash & Carry)</span>
                <span className="font-bold text-emerald-700 text-xs">99.4% Compliant</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">IRA Returns Audited</span>
                <span className="font-mono font-bold text-slate-900 text-xs">Q2 2026 Clean</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

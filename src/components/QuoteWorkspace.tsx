import React, { useState } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  Sliders,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Send,
  Download,
  Building2,
  Users,
  ShieldCheck,
  Percent,
  Check,
  AlertTriangle,
  Scale,
  Car,
  ChevronRight,
  ChevronDown,
  Plus,
  Clock,
  Sparkles,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { mockInsurerQuotes } from '../data/mockData';
import { recordsStore } from '../data/recordsStore';
import { HorizonToast, LiveDot } from './horizon';

interface QuoteWorkspaceProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
  recordId?: string;
}

export const QuoteWorkspace: React.FC<QuoteWorkspaceProps> = ({ onNavigate, densityMode, recordId }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'risk' | 'insurers' | 'premium' | 'underwriting' | 'documents' | 'audit'
  >('overview');
  const [selectedInsurer, setSelectedInsurer] = useState<string>('CIC Insurance Group');
  const [proposalSent, setProposalSent] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedQuote = recordId ? recordsStore.getQuote(recordId) : undefined;
  const quoteRef = selectedQuote?.quoteNumber || 'Q/MTR/2026/008291';
  const insuredName = selectedQuote?.customerName || 'ABC Logistics Ltd';
  const productName = selectedQuote?.productName || 'Commercial Heavy Prime Mover Package';
  const brokerName = selectedQuote?.brokerName || 'Marsh McLennan Wholesale';
  const quoteStatus = selectedQuote?.status || 'REFERRAL';
  const quotePremium = selectedQuote?.premiumKes || 832500;
  const quoteSumInsured = selectedQuote?.sumInsuredKes || 18500000;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'risk', label: 'Insured Risk' },
    { id: 'insurers', label: 'Insurer Quotes' },
    { id: 'premium', label: 'Premium Breakdown' },
    { id: 'underwriting', label: 'UW Rules' },
    { id: 'documents', label: 'Documents' },
    { id: 'audit', label: 'Audit Log' },
  ] as const;

  return (
    <div id="quote-workspace" className="space-y-4 pb-12 animate-in fade-in duration-150">
      <HorizonToast message={toastMessage} />

      {/* ==================================================================== */}
      {/* 1. RECORD HEADER: Follows standard layout                            */}
      {/* ← Quotation / Q/MTR/2026/008291                ● UNDER REVIEW        */}
      {/*   Commercial Heavy Prime Mover • ABC Logistics • Marsh McLennan      */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('quotations')}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mr-1"
                title="Back to Quotations list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span
                onClick={() => onNavigate('quotations')}
                className="text-xs font-mono text-slate-500 hover:text-teal-700 cursor-pointer"
              >
                Quotation
              </span>
              <span className="text-slate-400">/</span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {quoteRef}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-[3px] bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 ml-1">
                <LiveDot tone="warning" />
                {quoteStatus === 'REFERRAL' ? 'UNDER REVIEW (REFERRAL)' : quoteStatus}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono pl-7 sm:pl-0">
              <span className="font-semibold text-slate-700">{productName}</span>
              <span>•</span>
              <span
                onClick={() => onNavigate('customer-workspace')}
                className="text-teal-700 hover:underline cursor-pointer font-semibold font-sans"
              >
                {insuredName}
              </span>
              <span>•</span>
              <span>Broker: {brokerName}</span>
              <span>•</span>
              <span className="text-slate-600">Expires: 01 Oct 2026 (28 days left)</span>
            </div>
          </div>

          {/* Quick SLA / Referral Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>Assigned UW: Marcus Vance (Senior Underwriter)</span>
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. RECORD ACTION BAR                                                 */}
        {/* [Bind Policy] [UW Workbench] [Refer to Senior UW] [Send Proposal]    */}
        {/* ==================================================================== */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                triggerToast('Quotation bound to active policy POL/MTR/2026/00182!');
                onNavigate('policy-workspace');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--hz-primary-700)] hover:bg-[var(--hz-primary-800)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bind Policy</span>
            </button>

            <button
              onClick={() => onNavigate('underwriting-workbench')}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>UW Workbench</span>
            </button>

            <button
              onClick={() => {
                setProposalSent(true);
                triggerToast('Official Quotation Proposal dispatched to customer and broker');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                proposalSent
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-slate-600" />
              <span>{proposalSent ? 'Proposal Sent ✓' : 'Send Proposal'}</span>
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
                      triggerToast('Quotation Slip PDF generated');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download Quotation Slip</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('product-sandbox');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5 text-teal-600" />
                    <span>Re-rate in Product Sandbox</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('customer-workspace');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Open Customer</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Context Links */}
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => onNavigate('customer-workspace')}
              className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <span>Customer</span>
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
      {/* Left Column (lg:col-span-3): Persistent Quotation Identity & Summary */}
      {/* Center Column (lg:col-span-6): Main Tabbed Workspace                 */}
      {/* Right Column (lg:col-span-3): Recommended Insurer & UW Rule Triggers */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: PERSISTENT QUOTATION IDENTITY (lg:col-span-3)           */}
        {/* Fields: QUOTATION, PROSPECT, RISK SUMMARY, DOA & REFERRAL            */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-2 flex items-center justify-between">
              <span>QUOTATION SUMMARY</span>
              <span className="font-mono text-[10px] text-amber-700 font-bold">REFERRAL</span>
            </div>

            {/* Core Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold shrink-0">
                  <Car className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-sm truncate">Mercedes Actros 3340</div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Prime Mover (KDG 123Z)
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 uppercase font-medium">Quote No</span>
                  <span className="font-bold text-slate-800">{quoteRef}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 uppercase font-medium">Sum Insured</span>
                  <span className="font-bold text-slate-800">KES {quoteSumInsured.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 uppercase font-medium">Validity</span>
                  <span className="font-bold text-slate-800">Until 01 Oct 2026</span>
                </div>
              </div>
            </div>

            {/* PROSPECT & BROKER */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                CLIENT & INTERMEDIARY
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Prospect Name</span>
                  <button
                    onClick={() => onNavigate('customer-workspace')}
                    className="font-bold text-teal-700 hover:underline text-[11px]"
                  >
                    {insuredName} →
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Broker Firm</span>
                  <button
                    onClick={() => onNavigate('broker-workspace')}
                    className="font-semibold text-teal-700 hover:underline text-[11px] text-right"
                  >
                    {brokerName} →
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Commission</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">10.0% (KES {(quotePremium * 0.1).toLocaleString()})</span>
                </div>
              </div>
            </div>

            {/* RATING & FINANCIALS */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                INDICATIVE RATING
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Base Rate</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">4.50%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Basic Premium</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">KES {quotePremium.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Statutory Levies</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">KES 3,786.25</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Total Quoted</span>
                  <span className="font-mono font-bold text-teal-700 text-[11px]">KES 836,286.25</span>
                </div>
              </div>
            </div>

            {/* DOA & REFERRAL */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                DOA & REFERRAL REASON
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Trigger Rule</span>
                  <span className="font-mono font-bold text-amber-800 text-[11px]">UW-MTR-004</span>
                </div>
                <div className="text-[11px] text-slate-600 leading-snug">
                  Sum insured (KES 18.5M) exceeds Underwriter Level 1 threshold (KES 15.0M). Escalated to Marcus Vance.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CENTER COLUMN: MAIN WORKSPACE (lg:col-span-6)                        */}
        {/* TABS: Overview | Insured Risk | Insurer Quotes | Premium Breakdown | */}
        {/*       UW Rules | Documents | Audit Log                               */}
        {/* ==================================================================== */}
        <div className="lg:col-span-6 space-y-4">
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
              {/* Insured Risk Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--hz-border-grid)] mb-3">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-teal-600" />
                    <h2 className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                      Scheduled Commercial Motor Asset
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                    Reg: KDG 123Z
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Vehicle Model</div>
                    <div className="text-slate-900 font-bold text-sm mt-0.5">2023 Mercedes Actros 3340</div>
                    <div className="text-slate-500 text-[10px]">Commercial Prime Mover 6x4</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Sum Insured Value</div>
                    <div className="text-slate-900 font-bold font-mono text-sm mt-0.5">KES 18,500,000</div>
                    <div className="text-amber-700 text-[10px] font-semibold">Exceeds standard 15M DOA</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Operating Usage</div>
                    <div className="text-slate-900 font-bold text-sm mt-0.5">Transit Haulage</div>
                    <div className="text-slate-500 text-[10px]">Northern Transit Corridor</div>
                  </div>
                </div>
              </div>

              {/* Insurer Comparison Cards */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--hz-border-grid)] mb-3">
                  <h2 className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                    Underwriter Market Comparison (4 Options)
                  </h2>
                  <button
                    onClick={() => setActiveTab('insurers')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                  >
                    Compare All →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {mockInsurerQuotes.map((q) => (
                    <div
                      key={q.insurer}
                      onClick={() => setSelectedInsurer(q.insurer)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedInsurer === q.insurer
                          ? 'border-teal-500 bg-teal-50/40 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{q.insurer}</span>
                          {q.decision === 'ACCEPT' && (
                            <span className="px-1.5 py-0.2 rounded-[3px] text-[9px] font-bold bg-teal-100 text-teal-800">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          KES {q.premium.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] mt-1 flex justify-between">
                        <span>Excess: {q.excess} • Rating Score: {q.ratingScore}/100</span>
                        <span className="text-teal-700 font-semibold">{q.benefits[0] || 'Comprehensive'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INSURED RISK */}
          {activeTab === 'risk' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Detailed Prime Mover Asset Profile
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-mono text-[10px]">CHASSIS & ENGINE NO</div>
                  <div className="font-bold text-slate-900 mt-0.5">WDB9340321K912048</div>
                  <div className="text-slate-500 text-[10px]">OM501LA 12.0L V6 Turbo Intercooled</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-mono text-[10px]">CORRIDOR & ROUTE HAZARD</div>
                  <div className="font-bold text-slate-900 mt-0.5">Mombasa – Nairobi – Malaba Transit</div>
                  <div className="text-slate-500 text-[10px]">Salgaa / Mau Summit blackspot avoidance protocol active</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-mono text-[10px]">TELEMATICS SPEED LIMITER</div>
                  <div className="font-bold text-emerald-700 mt-0.5">Cartrack Fleet IQ Active</div>
                  <div className="text-slate-500 text-[10px]">Hard speed cutoff capped at 80 km/h (NTSA compliant)</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-mono text-[10px]">FLEET LOSS EXPERIENCE</div>
                  <div className="font-bold text-slate-900 mt-0.5">3-Year Loss Ratio: 41.2%</div>
                  <div className="text-slate-500 text-[10px]">2 minor fender claims settled; no fatal incidents</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INSURER COMPARISON */}
          {activeTab === 'insurers' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Comparative Underwriting Grid
              </h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                    <th className="py-2 px-3">Underwriter</th>
                    <th className="py-2 px-3">Annual Premium</th>
                    <th className="py-2 px-3">Excess Level</th>
                    <th className="py-2 px-3">PVT Extension</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockInsurerQuotes.map((q) => (
                    <tr key={q.insurer} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {q.insurer}
                        {q.decision === 'ACCEPT' && (
                          <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-teal-800">
                            REC
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        KES {q.premium.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {q.excess}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700 font-semibold">Included</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedInsurer(q.insurer);
                            triggerToast(`Selected ${q.insurer} proposal`);
                          }}
                          className="px-2 py-1 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold hover:bg-teal-100 text-[11px]"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: PREMIUM BREAKDOWN */}
          {activeTab === 'premium' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Actuarial Rating & Statutory Breakdown
              </h3>
              <div className="space-y-2 max-w-md">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Sum Insured</span>
                  <span className="font-mono font-bold text-slate-900">KES 18,500,000</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Base Rate (4.50%)</span>
                  <span className="font-mono font-bold text-slate-900">KES 832,500.00</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Training Levy (0.2%)</span>
                  <span className="font-mono font-bold text-slate-900">KES 1,665.00</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Policyholders Compensation Fund (PCF 0.25%)</span>
                  <span className="font-mono font-bold text-slate-900">KES 2,081.25</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Stamp Duty</span>
                  <span className="font-mono font-bold text-slate-900">KES 40.00</span>
                </div>
                <div className="flex justify-between py-2 pt-3 border-t-2 border-slate-800 text-sm font-bold">
                  <span className="text-slate-900">Total Premium</span>
                  <span className="font-mono text-teal-700">KES 836,286.25</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: UNDERWRITING RULES */}
          {activeTab === 'underwriting' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Automated Underwriting Engine Findings
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-amber-950">Rule UW-MTR-004: Sum Insured &gt; KES 15,000,000</div>
                    <div className="text-amber-800 text-[11px]">
                      Triggered referral to Underwriter Level 2. Authorizer: Marcus Vance.
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    REFERRAL
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-950">Rule UW-FLT-002: Fleet Loss Ratio &lt; 45%</div>
                    <div className="text-emerald-800 text-[11px]">
                      Historical 3-year loss ratio is 41.2%. Standard discount rate preserved.
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    PASSED ✓
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-950">Rule UW-TEL-001: Telematics & Anti-Theft Installed</div>
                    <div className="text-emerald-800 text-[11px]">
                      Cartrack certificate #CT-2026-991 verified live with Safaricom IoT SIM.
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    PASSED ✓
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Quotation Documents & Proposal Slips
              </h3>
              <div className="space-y-2">
                {[
                  { name: 'Formal Quotation Proposal Slip - Q/MTR/2026/008291.pdf', size: '1.4 MB' },
                  { name: 'Commercial Vehicle Valuation (AA Kenya).pdf', size: '3.2 MB' },
                  { name: 'Marsh McLennan Broker Instruction Slip.pdf', size: '420 KB' },
                  { name: 'Cartrack Telematics Calibration Certificate.pdf', size: '890 KB' }
                ].map((doc, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between hover:border-teal-500/50">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                      <span className="font-semibold text-slate-900">{doc.name}</span>
                    </div>
                    <button
                      onClick={() => triggerToast(`Downloaded ${doc.name}`)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Quotation Lifecycle History
              </h3>
              <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="font-bold text-slate-900">Underwriting Referral Triggered</div>
                  <div className="text-slate-500 text-[11px]">Sum insured exceeds Level 1 threshold. Assigned to Marcus Vance.</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">03 Sep 2026 10:45 EAT</div>
                </div>
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <div className="font-bold text-slate-900">Quotation Created & Rated</div>
                  <div className="text-slate-500 text-[11px]">Jane Mwangi generated comparative rate across 4 panel underwriters.</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">03 Sep 2026 10:42 EAT</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: CONTEXTUAL RECOMMENDATION & RULES (lg:col-span-3)       */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Recommended Option Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hz-border-grid)]">
              <span className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                SELECTED PROPOSAL
              </span>
              <span className="px-1.5 py-0.2 rounded-[3px] text-[9px] font-bold bg-teal-100 text-teal-800">
                BEST FIT
              </span>
            </div>

            <div>
              <div className="font-bold text-slate-900 text-sm">{selectedInsurer}</div>
              <div className="text-2xl font-bold font-mono text-teal-700 mt-1">
                KES 832,500
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Annual Gross Written Premium</div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-700">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-teal-600" />
                <span>Zero excess on windscreen replacement</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-teal-600" />
                <span>Political Violence & Terrorism included</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-teal-600" />
                <span>Excess protector on own damage</span>
              </div>
            </div>

            <button
              onClick={() => {
                triggerToast(`Policy bound with ${selectedInsurer}!`);
                onNavigate('policy-workspace');
              }}
              className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bind Policy Directly</span>
            </button>
          </div>

          {/* Underwriting Referral SLA */}
          <div className="bg-slate-900 rounded-xl p-4 text-slate-200 text-xs space-y-2">
            <div className="font-mono text-amber-400 font-bold uppercase text-[10px]">
              Underwriting SLA Timer
            </div>
            <div className="text-white font-mono font-bold text-lg">1h 18m remaining</div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Target turnaround: 2 hours. Senior Underwriter Marcus Vance is actively reviewing telematics speed data.
            </p>
          </div>

          {/* Intermediary Commission Split */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5">
              BROKER COMMISSION
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">Broker</span>
                <span className="font-semibold text-slate-800 text-[11px]">Marsh McLennan</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">Commission Rate</span>
                <span className="font-mono font-bold text-slate-900 text-[11px]">10.0%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">Payable Amount</span>
                <span className="font-mono font-bold text-teal-700 text-[11px]">KES 83,250.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

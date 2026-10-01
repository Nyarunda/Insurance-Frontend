import React, { useState } from 'react';
import {
  ArrowLeft,
  Wrench,
  DollarSign,
  ShieldCheck,
  Calendar,
  Clock,
  Briefcase,
  TrendingUp,
  Download,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Check,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  FileText,
  Building,
  Award,
  Send
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { HorizonToast } from './horizon';

interface ProviderWorkspaceProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
  recordId?: string;
}

export const ProviderWorkspace: React.FC<ProviderWorkspaceProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'work-orders' | 'completed' | 'invoices' | 'sla' | 'credentials' | 'audit'
  >('overview');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const provider = {
    code: 'PRV-ASSESS-0042',
    name: 'Peter Githinji (Automotive Engineers Ltd)',
    type: 'Certified Motor Loss Assessor',
    regNumber: 'EBK/ENG/8192',
    kraPin: 'P051829104A',
    status: 'ACCREDITED / ACTIVE',
    leadContact: 'Eng. Peter Githinji',
    phone: '+254 722 341890',
    email: 'peter@autoengineers.co.ke',
    address: 'Enterprise Road, Industrial Area, Nairobi',
    openWorkOrders: 4,
    completedAssessments: 312,
    avgTatHours: 18.2,
    slaTargetHours: 24.0,
    slaCompliancePct: 98.4,
    ytdFeesKes: 4680000,
    pendingInvoicesKes: 45000,
    bankDetails: 'KCB Bank Kenya • Industrial Area Branch',
    mpesaPaybill: '891200 (Account: GITHINJI)',
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'work-orders', label: 'Work Orders (4)' },
    { id: 'completed', label: 'History (312)' },
    { id: 'invoices', label: 'Invoices & Payouts' },
    { id: 'sla', label: 'SLA & Quality' },
    { id: 'credentials', label: 'Accreditation' },
    { id: 'audit', label: 'Audit Log' },
  ] as const;

  return (
    <div id="provider-workspace" className="space-y-4 pb-12 animate-in fade-in duration-150">
      <HorizonToast message={toastMessage} />

      {/* ==================================================================== */}
      {/* 1. RECORD HEADER: Follows standard layout                            */}
      {/* ← Service Provider / PRV-ASSESS-0042           ● ACCREDITED / ACTIVE */}
      {/*   Peter Githinji • EBK/ENG/8192 • Industrial Area, Nairobi           */}
      {/* ==================================================================== */}
      <div className="hz-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('claim-workspace')}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mr-1"
                title="Back to Claims"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span
                onClick={() => onNavigate('claim-workspace')}
                className="text-xs font-mono text-slate-500 hover:text-teal-700 cursor-pointer"
              >
                Service Provider
              </span>
              <span className="text-slate-400">/</span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {provider.code}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-[3px] bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {provider.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono pl-7 sm:pl-0">
              <span className="font-semibold text-slate-800 font-sans text-sm">{provider.name}</span>
              <span>•</span>
              <span>EBK: {provider.regNumber}</span>
              <span>•</span>
              <span className="font-sans text-slate-600">Type: {provider.type}</span>
              <span>•</span>
              <span className="text-slate-600">KRA: {provider.kraPin}</span>
            </div>
          </div>

          {/* Quick SLA Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Avg SLA: {provider.avgTatHours}h (Target: {provider.slaTargetHours}h)</span>
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. RECORD ACTION BAR                                                 */}
        {/* [Dispatch Inspection] [Settle Fees] [Update SLA] [More ▼]            */}
        {/* ==================================================================== */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                triggerToast('Inspection work order dispatched via SMS & Email to Peter Githinji');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Inspection</span>
            </button>

            <button
              onClick={() => {
                triggerToast('Fee invoice batch of KES 45,000 sent for M-Pesa B2B payout');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--hz-primary-700)] hover:bg-[var(--hz-primary-800)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Settle Invoices</span>
            </button>

            <button
              onClick={() => setActiveTab('sla')}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-slate-600" />
              <span>SLA Agreement</span>
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
                      triggerToast('Assessor scorecard exported');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download Scorecard PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('claim-workspace');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Wrench className="w-3.5 h-3.5 text-teal-600" />
                    <span>View Latest Claim #0081</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Context Links */}
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => onNavigate('claim-workspace')}
              className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <span>View Active Claim</span>
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
      {/* Left Column (lg:col-span-3): Persistent Provider Identity & Summary  */}
      {/* Center Column (lg:col-span-6): Main Tabbed Workspace                 */}
      {/* Right Column (lg:col-span-3): SLA Performance, Fee Payouts & Certs  */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: PERSISTENT PROVIDER IDENTITY (lg:col-span-3)            */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="hz-card space-y-4">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-2 flex items-center justify-between">
              <span>ASSESSOR SUMMARY</span>
              <span className="font-mono text-xs text-emerald-700 font-bold">PANEL A</span>
            </div>

            {/* Core Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-sm truncate">{provider.name}</div>
                  <div className="text-xs text-slate-500 font-medium truncate">
                    {provider.type}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-medium">EBK Board</span>
                  <span className="font-bold text-slate-800">{provider.regNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-medium">KRA PIN</span>
                  <span className="font-bold text-slate-800">{provider.kraPin}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-medium">Open Tasks</span>
                  <span className="font-bold text-amber-700">{provider.openWorkOrders} Orders</span>
                </div>
              </div>
            </div>

            {/* CONTACT & LOCATION */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                COMMUNICATIONS
              </div>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-600 truncate">{provider.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-600">{provider.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-600 leading-tight">{provider.address}</span>
                </div>
              </div>
            </div>

            {/* PAYMENT DETAILS */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                FEE DISBURSEMENT
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Settlement</span>
                  <span className="font-semibold text-slate-800 text-xs">M-Pesa B2B / Bank</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Tariff Scale</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">AKI Assessor Tariff</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CENTER COLUMN: MAIN WORKSPACE (lg:col-span-6)                        */}
        {/* TABS: Overview | Work Orders | Completed | Invoices | SLA | Audit    */}
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
              {/* Assessor Performance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Total Inspections</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    312
                  </div>
                  <div className="text-emerald-700 text-xs font-semibold mt-0.5">Top rated panelist</div>
                </div>
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Open Orders</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    4
                  </div>
                  <div className="text-amber-700 text-xs font-semibold mt-0.5">All within SLA</div>
                </div>
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Average TAT</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    18.2h
                  </div>
                  <div className="text-emerald-700 text-xs font-semibold mt-0.5">Target: 24h</div>
                </div>
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">YTD Fees Paid</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    KES 4.68M
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">100% Tax cleared</div>
                </div>
              </div>

              {/* Active Inspection Task Spotlight */}
              <div className="hz-card">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--hz-border-grid)] mb-3">
                  <h2 className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                    Latest Active Assessment
                  </h2>
                  <button
                    onClick={() => onNavigate('claim-workspace')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                  >
                    Open in Claim →
                  </button>
                </div>

                <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-200/80 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      Claim #CLM/MTR/2026/0081 — John Kamau (Prado KDJ 123A)
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Accident on Waiyaki Way • Garage: DT Dobie Nairobi • Assessed at KES 380,000
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] font-mono">
                    REPORT SUBMITTED
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WORK ORDERS */}
          {activeTab === 'work-orders' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Active Assessment Instructions
              </h3>
              <div className="space-y-2">
                {[
                  { claim: 'CLM/MTR/2026/0081', car: 'Toyota Prado KDJ 123A', garage: 'DT Dobie Nairobi', status: 'Report Filed', tat: '14h elapsed' },
                  { claim: 'CLM/MTR/2026/8291', car: 'Actros Prime Mover KDG 123Z', garage: 'CMC Motors Nakuru', status: 'Inspection Underway', tat: '6h elapsed' },
                  { claim: 'CLM/MTR/2026/0492', car: 'Isuzu FRR Truck KDA 991B', garage: 'General Motors Mombasa', status: 'Dispatched', tat: '2h elapsed' },
                  { claim: 'CLM/MTR/2026/1029', car: 'Toyota Landcruiser KCF 881P', garage: 'Toyota Kenya Westlands', status: 'Dispatched', tat: '1h elapsed' },
                ].map((wo, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{wo.claim} — {wo.car}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Location: {wo.garage}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-bold font-mono text-[10px]">
                        {wo.status}
                      </span>
                      <div className="text-xs font-mono text-slate-400 mt-1">{wo.tat}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: COMPLETED */}
          {activeTab === 'completed' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Historical Assessment Record
              </h3>
              <p className="text-slate-600">312 total inspections completed with zero contested engineering disputes.</p>
            </div>
          )}

          {/* TAB 4: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Assessor Professional Invoices
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">Invoice #INV-2026-0812 (Claim #CLM/MTR/2026/0081)</div>
                    <div className="text-xs text-slate-500">Statutory Assessment Fee: KES 15,000 + Mileage KES 2,500</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900">KES 17,500</span>
                    <div className="text-xs font-mono text-emerald-700 font-bold mt-0.5">Approved for M-Pesa</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SLA */}
          {activeTab === 'sla' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Service Level Agreement (SLA) Matrix
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-emerald-950">Turnaround Time (TAT) Target: 24 Hours</div>
                    <div className="text-emerald-800 text-xs">Actual average is 18.2 hours (Score: 98.4%).</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    EXCELLENT
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CREDENTIALS */}
          {activeTab === 'credentials' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Engineering Board & Regulatory Credentials
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">Engineers Board of Kenya (EBK) Practicing License</div>
                    <div className="text-slate-500 text-xs">License #EBK/ENG/8192 active for calendar year 2026.</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    VERIFIED ✓
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT */}
          {activeTab === 'audit' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Provider Activity Log
              </h3>
              <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <div className="font-bold text-slate-900">Engineering Assessment Uploaded</div>
                  <div className="text-slate-500 text-xs">Report and photos for Prado KDJ 123A submitted to claims desk.</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">01 Sep 2026 14:00 EAT</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: CONTEXTUAL SLA & FEE CLEARANCE (lg:col-span-3)          */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* SLA Performance Card */}
          <div className="hz-card space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hz-border-grid)]">
              <span className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                SLA COMPLIANCE
              </span>
              <span className="px-1.5 py-0.2 rounded-[3px] text-[10px] font-bold bg-emerald-100 text-emerald-800">
                98.4%
              </span>
            </div>

            <div>
              <div className="text-slate-500 text-xs">Average Turnaround</div>
              <div className="text-2xl font-bold font-mono text-teal-700 mt-0.5">
                18.2 Hours
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Benchmark SLA: 24.0 Hours</div>
            </div>

            <button
              onClick={() => triggerToast('M-Pesa B2B payout initiated for KES 45,000')}
              className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Settle Outstanding Fees</span>
            </button>
          </div>

          {/* Panel Quality Badge */}
          <div className="bg-slate-900 rounded-xl p-4 text-slate-200 text-xs space-y-2">
            <div className="font-mono text-teal-400 font-bold uppercase text-[10px]">
              Insurer Panel Rating
            </div>
            <div className="text-white font-bold text-sm">Tier A Motor Assessor</div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Designated first-responder for commercial prime movers and high-value fleet claims.
            </p>
          </div>

          {/* Accreditation Card */}
          <div className="hz-card space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5">
              CERTIFICATIONS
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">AKI Panel</span>
                <span className="font-bold text-emerald-700 text-xs">Approved</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">EBK Registration</span>
                <span className="font-bold text-emerald-700 text-xs">Active (2026)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

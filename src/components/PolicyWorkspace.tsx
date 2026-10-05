import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  DollarSign,
  Calendar,
  AlertCircle,
  Download,
  Plus,
  ArrowRight,
  Briefcase,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  History,
  Clock,
  Car,
  QrCode,
  Share2,
  ExternalLink,
  ChevronDown,
  Check,
  Search,
  Filter,
  RefreshCw,
  FileCheck,
  CreditCard,
  Building2,
  Shield,
  ArrowUpRight,
  Sparkles,
  Award
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { mockPolicyVersions } from '../data/mockData';
import { recordsStore } from '../data/recordsStore';
import { HorizonToast } from './horizon';

interface PolicyWorkspaceProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
  recordId?: string;
}

export const PolicyWorkspace: React.FC<PolicyWorkspaceProps> = ({ onNavigate, densityMode, recordId }) => {
  const [selectedVersion, setSelectedVersion] = useState<string>('V4');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'risks' | 'coverage' | 'premium' | 'billing' | 'claims' | 'endorsements' | 'documents' | 'accounting' | 'audit'
  >('overview');
  const [certificateModal, setCertificateModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentVersionRecord = mockPolicyVersions.find((v) => v.version === selectedVersion) || mockPolicyVersions[0];
  const selectedPolicy = recordId ? recordsStore.getPolicy(recordId) : undefined;
  const policyNumber = selectedPolicy?.policyNumber || 'POL/MTR/2026/001239';
  const policyCustomerName = selectedPolicy?.customerName || 'ABC Logistics Limited';
  const policyCustomerId = selectedPolicy?.customerId || 'CUS-000184';
  const policyProductName = selectedPolicy?.productName || 'Commercial Motor Comprehensive';
  const policyStatus = selectedPolicy?.status || 'ACTIVE IN FORCE';
  const policyBranch = selectedPolicy?.branch || 'Nairobi Commercial';
  const policyStart = selectedPolicy?.effectiveStart || '01 Sep 2026';
  const policyEnd = selectedPolicy?.effectiveEnd || '31 Aug 2027';

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const timelineEvents = [
    { date: '01 Sep 2026 09:12 EAT', title: 'Policy Application Bound', desc: 'Authorized by underwriter Jane Mwangi' },
    { date: '01 Sep 2026 09:14 EAT', title: 'Premium Invoice Created', desc: 'Invoice #INV-2026-9901 posted to General Ledger' },
    { date: '01 Sep 2026 09:22 EAT', title: 'M-Pesa Payment Received', desc: 'KES 182,450 confirmed via Paybill receipt RK89104JK2' },
    { date: '01 Sep 2026 09:23 EAT', title: 'Official Receipt Generated', desc: 'Receipt #REC-2026-8812 dispatched via SMS' },
    { date: '03 Sep 2026 10:15 EAT', title: 'Digital Motor Certificate Generated', desc: 'IRA QR code authenticated & synced with Police Traffic DB' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'risks', label: 'Risk Schedule' },
    { id: 'coverage', label: 'Coverage' },
    { id: 'premium', label: 'Premium & Levies' },
    { id: 'billing', label: 'Billing' },
    { id: 'claims', label: 'Claims', count: 1 },
    { id: 'endorsements', label: 'Endorsements', count: 3 },
    { id: 'documents', label: 'Documents' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'audit', label: 'Audit Timeline' },
  ] as const;

  return (
    <div id="policy-workspace" className="space-y-4 pb-12 animate-in fade-in duration-150">
      <HorizonToast message={toastMessage} />

      {/* ==================================================================== */}
      {/* 1. RECORD HEADER: Follows standard layout                            */}
      {/* ← Policy / POL-MTR-2026-001239                             ● ACTIVE  */}
      {/*   Motor Comprehensive • ABC Logistics Ltd                            */}
      {/* ==================================================================== */}
      <div className="hz-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('policies')}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mr-1"
                title="Back to Policies list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span
                onClick={() => onNavigate('policies')}
                className="text-xs font-mono text-slate-500 hover:text-teal-700 cursor-pointer"
              >
                Policy
              </span>
              <span className="text-slate-400">/</span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {policyNumber}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                {policyStatus}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono pl-7 sm:pl-0">
              <span
                onClick={() => onNavigate('product-workspace')}
                className="font-semibold text-slate-700 hover:text-teal-700 hover:underline cursor-pointer font-sans"
              >
                {policyProductName}
              </span>
              <span>•</span>
              <span
                onClick={() => onNavigate('customer-workspace')}
                className="font-sans text-teal-700 hover:underline cursor-pointer font-semibold"
              >
                {policyCustomerName} ({policyCustomerId})
              </span>
              <span>•</span>
              <span>Term: {policyStart} - {policyEnd}</span>
              <span>•</span>
              <span className="text-slate-600">Branch: {policyBranch}</span>
            </div>
          </div>

          {/* Quick Version Reconstruction Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-teal-600" />
              <span>Version: {selectedVersion} {selectedVersion === 'V4' ? '(Current)' : '(Historical)'}</span>
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. RECORD ACTION BAR                                                 */}
        {/* [Endorse] [Renew] [Cancel] [Collect Payment] [Digital Cert] [More ▼]  */}
        {/* ==================================================================== */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => triggerToast(`Endorsement workflow initiated for ${policyNumber}`)}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Endorse Policy</span>
            </button>

            <button
              onClick={() => triggerToast('Renewal calculation proposal generated')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              <span>Renew</span>
            </button>

            <button
              onClick={() => onNavigate('accounting-workbench')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-600" />
              <span>Collect Payment</span>
            </button>

            <button
              onClick={() => setCertificateModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-teal-700" />
              <span>IRA Certificate</span>
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
                      triggerToast('Policy Schedule PDF generated');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download Policy Schedule</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerToast('Kenya Re Bordereau Cession Record generated');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                    <span>Export Reinsurance Bordereau</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerToast('Cancellation request routed to Underwriting Committee');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-700 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cancel / Non-Renew Policy</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Context Selector: Version & Activity Quick Link */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="font-medium text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                Version:
              </span>
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              >
                {mockPolicyVersions.map((v) => (
                  <option key={v.version} value={v.version}>
                    {v.version} - {v.changeDescription} ({v.date})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setActiveTab('audit')}
              className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Activity Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. WORKSPACE 3-COLUMN GRID PATTERN                                   */}
      {/* Left Column (lg:col-span-3): Persistent Policy Identity & Summary    */}
      {/* Center Column (lg:col-span-6): Main Tabbed Workspace                */}
      {/* Right Column (lg:col-span-3): Reinsurance, Risk Controls & DMVIC     */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: PERSISTENT POLICY IDENTITY (lg:col-span-3)              */}
        {/* Fields: POLICY, CUSTOMER, PRODUCT, TERM, PREMIUM, REINSURANCE        */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="hz-card space-y-4">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-2 flex items-center justify-between">
              <span>POLICY IDENTITY</span>
              <span className="font-mono text-xs text-teal-700 font-bold">{selectedVersion}</span>
            </div>

            {/* Core Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold shrink-0">
                  <Car className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-sm truncate">Toyota Prado (KDJ 123A)</div>
                  <button
                    onClick={() => onNavigate('product-workspace')}
                    className="text-xs text-teal-700 hover:underline font-medium block text-left"
                  >
                    PRD-MTR-COMP Comprehensive →
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-slate-400 uppercase font-medium">Policy No</span>
                  <span className="font-bold text-slate-800">POL/MTR/2026/001239</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-slate-400 uppercase font-medium">Status</span>
                  <span className="text-emerald-700 font-bold">● ACTIVE</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-slate-400 uppercase font-medium">Term</span>
                  <span className="font-bold text-slate-800">01 Sep 2026 – 31 Aug 2027</span>
                </div>
              </div>
            </div>

            {/* CUSTOMER & INTERMEDIARY */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                INSURED & INTERMEDIARY
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Named Insured</span>
                  <button
                    onClick={() => onNavigate('customer-workspace')}
                    className="font-bold text-teal-700 hover:underline text-xs"
                  >
                    ABC Logistics Ltd →
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">KRA PIN</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">P051289102X</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Broker / Intermediary</span>
                  <button
                    onClick={() => onNavigate('broker-workspace')}
                    className="font-semibold text-teal-700 hover:underline text-xs text-right"
                  >
                    Marsh McLennan →
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Servicing Branch</span>
                  <span className="font-semibold text-slate-800 text-xs">Nairobi Commercial</span>
                </div>
              </div>
            </div>

            {/* FINANCIAL AT CURRENT VERSION */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                FINANCIAL SNAPSHOT ({selectedVersion})
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Sum Insured</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    KES {currentVersionRecord.sumInsuredAtVersion.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Gross Annual Premium</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    KES {currentVersionRecord.premiumAtVersion.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Loss Ratio</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">12.4% (Profitable)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Ledger Balance</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">KES 0.00 (Fully Settled)</span>
                </div>
              </div>
            </div>

            {/* REINSURANCE TREATY CESSION */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                REINSURANCE CESSION
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Treaty Program</span>
                  <span className="font-semibold text-slate-800 text-xs">Motor Surplus 2026</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Kenya Re Quota Share</span>
                  <span className="font-mono font-bold text-teal-700 text-xs">25% Mandatory</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Net Retention</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">75% (KES 3,375,000)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CENTER COLUMN: MAIN WORKSPACE (lg:col-span-6)                        */}
        {/* TABS: Overview | Risk Schedule | Coverage | Premium | Billing |      */}
        {/*       Claims | Endorsements | Documents | Accounting | Audit         */}
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
                  {'count' in tab && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                        activeTab === tab.id ? 'bg-teal-700 text-teal-100' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Historical Snapshot Banner if selectedVersion != V4 */}
          {selectedVersion !== 'V4' && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Reconstructed Snapshot: Showing state as of <strong>{currentVersionRecord.date}</strong> ({currentVersionRecord.changeDescription}).
                </span>
              </div>
              <button
                onClick={() => setSelectedVersion('V4')}
                className="font-bold underline text-amber-800 hover:text-amber-950 shrink-0"
              >
                Restore Current (V4)
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Scheduled Asset Summary */}
              <div className="hz-card">
                <h2 className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider pb-2 border-b border-[var(--hz-border-grid)]">
                  Insured Asset Profile
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Vehicle Reg</div>
                    <div className="text-slate-900 font-bold font-mono text-sm mt-0.5">KDJ 123A</div>
                    <div className="text-slate-500 text-xs">Chassis: JTEBU29J00K091823</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Make & Model</div>
                    <div className="text-slate-900 font-bold text-sm mt-0.5">Toyota Prado TX</div>
                    <div className="text-slate-500 text-xs">2022 • 2,755 cc Turbo Diesel</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Sum Insured ({selectedVersion})</div>
                    <div className="text-slate-900 font-bold font-mono text-sm mt-0.5">
                      KES {currentVersionRecord.sumInsuredAtVersion.toLocaleString()}
                    </div>
                    <div className="text-emerald-700 text-xs font-medium">AA Kenya Certified</div>
                  </div>
                </div>
              </div>

              {/* Coverage Highlight */}
              <div className="hz-card">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--hz-border-grid)] mb-3">
                  <h2 className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                    Coverage Schedule Highlights ({selectedVersion})
                  </h2>
                  <button
                    onClick={() => setActiveTab('coverage')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                  >
                    View All →
                  </button>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">Accidental Damage, Fire & Theft</span>
                      <p className="text-xs text-slate-500">Comprehensive market value indemnity with authorized garage repair</p>
                    </div>
                    <span className="font-mono font-semibold text-slate-800">
                      KES {currentVersionRecord.sumInsuredAtVersion.toLocaleString()}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">Third Party Property Damage</span>
                      <p className="text-xs text-slate-500">Statutory unlimited injury + KES 20M property damage indemnity</p>
                    </div>
                    <span className="font-mono font-semibold text-slate-800">KES 20,000,000</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">Windscreen & Glass Damage</span>
                      <p className="text-xs text-slate-500">Zero excess replacement via Impala Glass / AutoXpress</p>
                    </div>
                    <span className="font-mono font-semibold text-slate-800">
                      {selectedVersion === 'V1' ? 'Not included' : 'KES 100,000'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Claim Alert */}
              <div className="hz-card">
                <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500/30 mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                      Associated Claims (1)
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate('claim-workspace')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                  >
                    Open Claim →
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-teal-700">CLM-00982</span>
                      <span className="font-semibold text-slate-800">Athi River Guardrail Collision</span>
                      <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Assessment in Progress
                      </span>
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      Loss Date: 28 Aug 2026 • Outstanding Reserve: KES 820,000 • Assessor: Apex
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('claim-workspace')}
                    className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700"
                  >
                    View Claim
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RISK SCHEDULE */}
          {activeTab === 'risks' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Detailed Motor Asset Specifications
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-mono text-xs">ENGINE & TRANSMISSION</div>
                  <div className="font-bold text-slate-900">2,755 cc 1GD-FTV Inline-4 Turbo Diesel</div>
                  <div className="text-slate-500 text-xs">6-speed automatic 4WD with locking center differential</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-mono text-xs">SECURITY & TELEMATICS</div>
                  <div className="font-bold text-emerald-700">Cartrack Real-Time GPS Installed</div>
                  <div className="text-slate-500 text-xs">Active subscription • Immobilizer bypass alert enabled</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-mono text-xs">PARKING & USAGE</div>
                  <div className="font-bold text-slate-900">Commercial Carriage / Private Fleet</div>
                  <div className="text-slate-500 text-xs">Garaged at Upper Hill secure premises at night</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-mono text-xs">VALUATION REPORT</div>
                  <div className="font-bold text-slate-900">AA Kenya Certified Valuation</div>
                  <div className="text-slate-500 text-xs">Certificate #AAK-VAL-2026-991 • Done 18 Jan 2026</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COVERAGE */}
          {activeTab === 'coverage' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Endorsed Coverage Schedule & Excess Table
              </h3>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-xs">
                    <th className="py-2 px-3">Cover Section</th>
                    <th className="py-2 px-3">Limit of Liability</th>
                    <th className="py-2 px-3">Applicable Excess</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">Accidental Collision Damage</td>
                    <td className="py-2 px-3 font-mono">KES {currentVersionRecord.sumInsuredAtVersion.toLocaleString()}</td>
                    <td className="py-2 px-3 text-slate-600">2.5% of claim (Min KES 15,000)</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">INCLUDED</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">Third Party Property Damage</td>
                    <td className="py-2 px-3 font-mono">KES 20,000,000</td>
                    <td className="py-2 px-3 text-slate-600">KES 5,000 each and every loss</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">INCLUDED</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">Third Party Bodily Injury / Death</td>
                    <td className="py-2 px-3 font-mono">Statutory Unlimited</td>
                    <td className="py-2 px-3 text-slate-600">Nil statutory excess</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">INCLUDED</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">Windscreen & Window Glass</td>
                    <td className="py-2 px-3 font-mono">KES 100,000</td>
                    <td className="py-2 px-3 text-slate-600">Nil if replaced by appointed glazier</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">ENDORSED</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">Political Violence & Terrorism (PVT)</td>
                    <td className="py-2 px-3 font-mono">KES {currentVersionRecord.sumInsuredAtVersion.toLocaleString()}</td>
                    <td className="py-2 px-3 text-slate-600">5% of claim (Min KES 25,000)</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">ENDORSED</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">Emergency Medical Expenses</td>
                    <td className="py-2 px-3 font-mono">KES 50,000 per person</td>
                    <td className="py-2 px-3 text-slate-600">Nil</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">INCLUDED</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: PREMIUM & LEVIES */}
          {activeTab === 'premium' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Statutory Rating & Premium Breakdown ({selectedVersion})
              </h3>

              <div className="space-y-2 max-w-lg">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Basic Rate (4.0% of Sum Insured)</span>
                  <span className="font-mono font-bold text-slate-900">
                    KES {(currentVersionRecord.sumInsuredAtVersion * 0.04).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Windscreen Extension</span>
                  <span className="font-mono font-bold text-slate-900">KES 1,500</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">PVT Extension (0.25%)</span>
                  <span className="font-mono font-bold text-slate-900">
                    KES {(currentVersionRecord.sumInsuredAtVersion * 0.0025).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Training Levy (0.2% statutory)</span>
                  <span className="font-mono font-bold text-slate-900">
                    KES {(currentVersionRecord.premiumAtVersion * 0.002).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Policyholders Compensation Fund (PCF 0.25%)</span>
                  <span className="font-mono font-bold text-slate-900">
                    KES {(currentVersionRecord.premiumAtVersion * 0.0025).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Stamp Duty (Revenue Stamp)</span>
                  <span className="font-mono font-bold text-slate-900">KES 40.00</span>
                </div>
                <div className="flex justify-between py-2 pt-3 border-t-2 border-slate-800 text-sm font-bold">
                  <span className="text-slate-900">Total Premium Payable</span>
                  <span className="font-mono text-teal-700">
                    KES {currentVersionRecord.premiumAtVersion.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BILLING */}
          {activeTab === 'billing' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Invoices & Collections Schedule
              </h3>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-mono font-bold text-slate-900">INV-2026-9901 • Annual Premium Invoice</div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    Due: 01 Sep 2026 • Paid via M-Pesa (Ref: RK89104JK2) on 01 Sep 2026
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-700 text-sm">
                    KES {currentVersionRecord.premiumAtVersion.toLocaleString()}
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    PAID IN FULL
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CLAIMS */}
          {activeTab === 'claims' && (
            <div className="hz-card space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900">
                  Claims Incurred Under This Policy (1)
                </h3>
                <button
                  onClick={() => onNavigate('claims-landing')}
                  className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700"
                >
                  + New Claim FNOL
                </button>
              </div>

              <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-700">CLM-00982</span>
                    <span className="font-semibold text-slate-900">Athi River Guardrail Collision</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      Assessment
                    </span>
                  </div>
                  <div className="text-slate-600 text-xs mt-1">
                    Loss Date: 28 Aug 2026 • Driver: Peter Mutua • Assessor: Apex Loss Assessors
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900">KES 820,000</div>
                  <button
                    onClick={() => onNavigate('claim-workspace')}
                    className="mt-1 text-teal-700 font-bold hover:underline"
                  >
                    Open Claim →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ENDORSEMENTS */}
          {activeTab === 'endorsements' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Policy Endorsement Revisions History (3)
              </h3>

              <div className="space-y-3">
                {mockPolicyVersions.map((ver) => (
                  <div
                    key={ver.version}
                    className={`p-3.5 rounded-lg border transition-colors ${
                      selectedVersion === ver.version ? 'border-teal-500 bg-teal-50/40' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{ver.version}</span>
                        {ver.isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            CURRENT
                          </span>
                        )}
                        <span className="font-semibold text-slate-800">• {ver.changeDescription}</span>
                      </div>
                      <button
                        onClick={() => setSelectedVersion(ver.version)}
                        className="text-teal-700 font-bold hover:underline"
                      >
                        Reconstruct Snapshot →
                      </button>
                    </div>
                    <div className="text-slate-500 text-xs mt-1 flex justify-between font-mono">
                      <span>Sum: KES {ver.sumInsuredAtVersion.toLocaleString()} • Premium: KES {ver.premiumAtVersion.toLocaleString()}</span>
                      <span>By: {ver.author} ({ver.date})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Policy Documents & Official Schedules
              </h3>

              <div className="space-y-2">
                {[
                  { name: 'Policy Schedule - POL/MTR/2026/001239 (V4).pdf', type: 'Schedule', date: '03 Sep 2026', size: '1.2 MB' },
                  { name: 'IRA DMVIC Digital Motor Sticker (KDJ 123A).pdf', type: 'Certificate', date: '01 Sep 2026', size: '340 KB' },
                  { name: 'AA Kenya Valuation Certificate #AAK-VAL-2026.pdf', type: 'Valuation', date: '18 Jan 2026', size: '2.8 MB' },
                  { name: 'Official Premium Receipt #REC-2026-8812.pdf', type: 'Receipt', date: '01 Sep 2026', size: '210 KB' },
                  { name: 'Endorsement Voucher #END-003.pdf', type: 'Endorsement', date: '03 Sep 2026', size: '420 KB' }
                ].map((doc, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between hover:border-teal-500/50">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-teal-700" />
                      <div>
                        <div className="font-semibold text-slate-900">{doc.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{doc.type} • {doc.date} • {doc.size}</div>
                      </div>
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

          {/* TAB 9: ACCOUNTING */}
          {activeTab === 'accounting' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Sub-Ledger Postings & Journal Vouchers
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-xs">
                      <th className="py-2 px-3">JV Number</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Debit Account</th>
                      <th className="py-2 px-3">Credit Account</th>
                      <th className="py-2 px-3 text-right">Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    <tr>
                      <td className="py-2 px-3 text-teal-700 font-bold">JV-2026-08129</td>
                      <td className="py-2 px-3 text-slate-500">01 Sep 2026</td>
                      <td className="py-2 px-3">1200 - Premium Debtors</td>
                      <td className="py-2 px-3">4010 - Gross Written Premium</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">182,450.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-teal-700 font-bold">JV-2026-08130</td>
                      <td className="py-2 px-3 text-slate-500">01 Sep 2026</td>
                      <td className="py-2 px-3">1010 - Safaricom M-Pesa Settlement</td>
                      <td className="py-2 px-3">1200 - Premium Debtors</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">182,450.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-teal-700 font-bold">JV-2026-08131</td>
                      <td className="py-2 px-3 text-slate-500">01 Sep 2026</td>
                      <td className="py-2 px-3">5010 - Reinsurance Ceded Premium</td>
                      <td className="py-2 px-3">2100 - Kenya Re Treaty Payable</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">45,612.50</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 10: AUDIT TIMELINE */}
          {activeTab === 'audit' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Immutable Lifecycle Audit Log
              </h3>

              <div className="space-y-4 pl-3 border-l-2 border-slate-200">
                {timelineEvents.map((evt, idx) => (
                  <div key={idx} className="relative pl-4">
                    <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-teal-50" />
                    <div className="font-bold text-slate-900">{evt.title}</div>
                    <p className="text-slate-600 text-xs mt-0.5">{evt.desc}</p>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{evt.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: CONTEXTUAL RISK, AUDIT & DMVIC (lg:col-span-3)          */}
        {/* ==================================================================== */}
        <div className="grid items-start gap-4 md:grid-cols-2 lg:col-span-12 lg:grid-cols-3 min-[1680px]:col-span-3 min-[1680px]:grid-cols-1">
          {/* Version Switcher Card */}
          <div className="hz-card">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hz-border-grid)] mb-3">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-teal-600" />
                <span className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                  VERSION RECONSTRUCTION
                </span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                4 Versions
              </span>
            </div>

            <div className="space-y-2">
              {mockPolicyVersions.map((ver) => {
                const isSelected = selectedVersion === ver.version;
                return (
                  <button
                    key={ver.version}
                    onClick={() => setSelectedVersion(ver.version)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-500 shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
                        <span>{ver.version}</span>
                        {ver.isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            CURR
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-slate-400 text-xs">{ver.date}</span>
                    </div>
                    <div className="text-xs font-medium text-slate-700 mt-1 truncate">{ver.changeDescription}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* IRA DMVIC Certificate Preview */}
          <div className="bg-slate-900 rounded-xl p-4 text-white text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-teal-400 text-xs uppercase">IRA Kenya e-Certificate</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                AUTHENTICATED
              </span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Certificate No: <strong>IRA/MTR/2026/990142</strong>. Official QR verification seal authenticated.
            </p>
            <button
              onClick={() => setCertificateModal(true)}
              className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>View Full Certificate</span>
            </button>
          </div>

          {/* Underwriting & Risk Controls Card */}
          <div className="hz-card space-y-3 text-xs">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-2">
              RISK CONTROLS & AUDIT
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Underwriting DOA</span>
                <span className="font-semibold text-slate-800 text-xs">Level 2 (Authorized)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Telematics Score</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">88/100 (Safe Driver)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Renewal Propensity</span>
                <span className="font-mono font-bold text-teal-700 text-xs">94% (High)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Police DB Sync</span>
                <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                  <Check className="w-3 h-3" /> Live
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Digital Motor Certificate */}
      {certificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Insurance Regulatory Authority (IRA)</h3>
              </div>
              <button
                onClick={() => setCertificateModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center space-y-3">
              <div className="w-28 h-28 mx-auto bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-center shadow-2xs">
                <QrCode className="w-24 h-24 text-slate-800" />
              </div>
              <div className="text-xs font-mono font-bold text-slate-900">
                CERTIFICATE #IRA/MTR/2026/990142
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div>Vehicle: <strong>KDJ 123A (Toyota Prado)</strong></div>
                <div>Insured: <strong>ABC Logistics Ltd</strong></div>
                <div>Policy: <strong>POL/MTR/2026/001239</strong></div>
                <div>Valid: <strong>01 Sep 2026 to 31 Aug 2027</strong></div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  triggerToast('Official IRA DMVIC Certificate PDF downloaded');
                  setCertificateModal(false);
                }}
                className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
              >
                Download Official PDF
              </button>
              <button
                onClick={() => setCertificateModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

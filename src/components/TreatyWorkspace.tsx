import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldAlert,
  Building2,
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
  FileText,
  Percent,
  Layers,
  Send,
  PieChart,
  Scale,
  Lock
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { useHasPermission } from '../store/permissionStore';
import { FieldError, HorizonToast, ValidationSummary } from './horizon';

const BORDEREAU_FILE_PATTERN = /\.(xlsx|xls|csv)$/i;

interface TreatyWorkspaceProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
  recordId?: string;
}

export const TreatyWorkspace: React.FC<TreatyWorkspaceProps> = ({ onNavigate, densityMode }) => {
  const canSubmitBordereau = useHasPermission('reinsurance-treaties', 'add');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'panel' | 'ceded-policies' | 'bordereaux' | 'recoveries' | 'wording' | 'audit'
  >('overview');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const [bordereauSubmissions, setBordereauSubmissions] = useState([
    { quarter: 'Q2 2026 Premium & Loss Bordereau', status: 'Settled & Paid', gwp: 'KES 38,420,000', comm: 'KES 9,605,000' },
    { quarter: 'Q1 2026 Premium & Loss Bordereau', status: 'Settled & Paid', gwp: 'KES 36,800,000', comm: 'KES 9,200,000' },
  ]);
  const [bordereauTitle, setBordereauTitle] = useState('Q3 2026 Premium & Loss Bordereau');
  const [bordereauFile, setBordereauFile] = useState<File | null>(null);
  const [isSubmittingBordereau, setIsSubmittingBordereau] = useState(false);
  const [bordereauAttempted, setBordereauAttempted] = useState(false);

  const bordereauErrors: Record<string, string> = {};
  if (!bordereauTitle.trim()) bordereauErrors.title = 'Bordereau title is required.';
  if (!bordereauFile) {
    bordereauErrors.file = 'Attach the completed bordereau file (XLSX, XLS or CSV).';
  } else if (!BORDEREAU_FILE_PATTERN.test(bordereauFile.name)) {
    bordereauErrors.file = 'Only XLSX, XLS or CSV files are accepted.';
  }
  const hasBordereauErrors = Object.keys(bordereauErrors).length > 0;

  const handleSubmitBordereau = () => {
    if (hasBordereauErrors) {
      setBordereauAttempted(true);
      return;
    }
    setIsSubmittingBordereau(true);
    setTimeout(() => {
      setBordereauSubmissions((prev) => [
        { quarter: bordereauTitle, status: 'Pending Review', gwp: 'Pending', comm: 'Pending' },
        ...prev,
      ]);
      setIsSubmittingBordereau(false);
      setBordereauAttempted(false);
      setBordereauFile(null);
      triggerToast(`${bordereauTitle} submitted for actuarial review.`);
    }, 600);
  };

  const treaty = {
    code: 'TRT-2026-MTR-QS',
    name: 'Commercial Motor Quota Share Treaty 2026',
    type: '40% Quota Share Treaty',
    classCovered: 'Commercial Motor & Heavy Haulage Fleet',
    uwYear: '2026',
    period: '01 Jan 2026 – 31 Dec 2026',
    status: 'ACTIVE / IN EFFECT',
    leadReinsurer: 'Kenya Reinsurance Corporation (Lead 20%)',
    treatyCapacityKes: 250000000,
    companyRetentionPct: 60.0,
    cededQuotaPct: 40.0,
    maxRetentionPerRiskKes: 10000000,
    riCommissionRatePct: 25.0,
    ytdCededGwpKes: 153680000,
    ytdCededClaimsKes: 71922240,
    ytdRiCommissionKes: 38420000,
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'panel', label: 'Reinsurer Panel (3)' },
    { id: 'ceded-policies', label: 'Cessions Ledger' },
    { id: 'bordereaux', label: 'Quarterly Bordereaux' },
    { id: 'recoveries', label: 'Claims Recoveries' },
    { id: 'wording', label: 'Treaty Slip' },
    { id: 'audit', label: 'Audit Log' },
  ] as const;

  return (
    <div id="treaty-workspace" className="space-y-4 pb-12 animate-in fade-in duration-150">
      <HorizonToast message={toastMessage} />

      {/* ==================================================================== */}
      {/* 1. RECORD HEADER: Follows standard layout                            */}
      {/* ← Treaty / TRT-2026-MTR-QS                     ● ACTIVE / IN EFFECT  */}
      {/*   Commercial Motor Quota Share • Kenya Re (20%) • UW Year 2026       */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('reinsurance-treaties')}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mr-1"
                title="Back to Treaties"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span
                onClick={() => onNavigate('reinsurance-treaties')}
                className="text-xs font-mono text-slate-500 hover:text-teal-700 cursor-pointer"
              >
                Reinsurance Treaty
              </span>
              <span className="text-slate-400">/</span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {treaty.code}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-[3px] bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {treaty.status}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                UW {treaty.uwYear}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono pl-7 sm:pl-0">
              <span className="font-semibold text-slate-800 font-sans text-sm">{treaty.name}</span>
              <span>•</span>
              <span className="font-sans text-slate-600">Lead: {treaty.leadReinsurer}</span>
              <span>•</span>
              <span>Capacity: KES {(treaty.treatyCapacityKes / 1000000).toFixed(0)}M</span>
              <span>•</span>
              <span className="text-slate-600">Cession: {treaty.cededQuotaPct}%</span>
            </div>
          </div>

          {/* Quick Capacity Metric */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Ceded GWP: KES {(treaty.ytdCededGwpKes / 1000000).toFixed(1)}M</span>
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. RECORD ACTION BAR                                                 */}
        {/* [Generate Bordereau] [Cession Ledger] [Trigger Recovery] [More ▼]    */}
        {/* ==================================================================== */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                triggerToast('Q3 2026 Reinsurance Premium & Loss Bordereau compiled');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate Bordereau</span>
            </button>

            <button
              onClick={() => {
                triggerToast('Treaty cash loss recovery notice dispatched to Kenya Re');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--hz-primary-700)] hover:bg-[var(--hz-primary-800)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Trigger Cash Call</span>
            </button>

            <button
              onClick={() => setActiveTab('panel')}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Reinsurer Panel</span>
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
                      triggerToast('Signed Treaty Slip PDF downloaded');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download Signed Treaty Slip</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerToast('Commission Statement exported');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                    <span>Download RI Commission Statement</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Context Links */}
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => onNavigate('reinsurance-treaties')}
              className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <span>All Treaties</span>
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
      {/* Left Column (lg:col-span-3): Persistent Treaty Identity & Summary    */}
      {/* Center Column (lg:col-span-6): Main Tabbed Workspace                 */}
      {/* Right Column (lg:col-span-3): Solvency, Next Bordereau & Recoveries  */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: PERSISTENT TREATY IDENTITY (lg:col-span-3)              */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-2 flex items-center justify-between">
              <span>TREATY STRUCTURE</span>
              <span className="font-mono text-[10px] text-teal-700 font-bold">QUOTA SHARE</span>
            </div>

            {/* Core Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-sm truncate">{treaty.name}</div>
                  <div className="text-[11px] text-slate-500 font-medium truncate">
                    Code: {treaty.code}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 uppercase font-medium">Cession Rate</span>
                  <span className="font-bold text-slate-800">{treaty.cededQuotaPct}%</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 uppercase font-medium">Retention</span>
                  <span className="font-bold text-slate-800">{treaty.companyRetentionPct}%</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 uppercase font-medium">Max Net Risk</span>
                  <span className="font-bold text-slate-800">KES 10.0M</span>
                </div>
              </div>
            </div>

            {/* FINANCIAL SUMMARY */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                FINANCIALS (YTD)
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Ceded GWP</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">
                    KES {(treaty.ytdCededGwpKes / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">RI Commission (25%)</span>
                  <span className="font-mono font-bold text-emerald-700 text-[11px]">
                    KES {(treaty.ytdRiCommissionKes / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Ceded Incurred Losses</span>
                  <span className="font-mono font-bold text-rose-700 text-[11px]">
                    KES {(treaty.ytdCededClaimsKes / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>

            {/* PANEL REINSURERS */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                PARTICIPATING SYNDICATE
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Kenya Re (Lead)</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">20.0%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">East Africa Re</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">12.5%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Zep-Re (PTA Bank)</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">7.5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CENTER COLUMN: MAIN WORKSPACE (lg:col-span-6)                        */}
        {/* TABS: Overview | Panel | Cessions | Bordereaux | Recoveries | Slip  */}
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
              {/* Financial Performance KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Treaty Capacity</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    KES 250M
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Per Event Limit</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Ceded GWP</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    KES 153.6M
                  </div>
                  <div className="text-teal-700 text-[11px] font-semibold mt-0.5">40% of Gross</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">RI Commission</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    KES 38.4M
                  </div>
                  <div className="text-emerald-700 text-[11px] font-semibold mt-0.5">25% Override</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Treaty Loss Ratio</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    46.8%
                  </div>
                  <div className="text-emerald-700 text-[11px] font-semibold mt-0.5">Within treaty terms</div>
                </div>
              </div>

              {/* Treaty Mechanics Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 text-xs space-y-3">
                <h2 className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider pb-2 border-b border-[var(--hz-border-grid)]">
                  Treaty Structure & Cession Terms
                </h2>
                <p className="text-slate-700 leading-relaxed">
                  Proportional Quota Share treaty automatically binding 40% of every in-scope Commercial Motor risk written
                  under product <strong>PRD-MTR-COMP</strong>. Cedant retains 60% with a maximum net company retention of KES 10,000,000
                  per vehicle / risk.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="font-bold text-slate-900">Commission Override</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">25.0% provisional ceding commission credited to cedant</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="font-bold text-slate-900">Cash Call Threshold</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Immediate settlement for single losses exceeding KES 15,000,000</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PANEL */}
          {activeTab === 'panel' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Syndicate Reinsurers & Security Ratings
              </h3>
              <div className="space-y-2">
                {[
                  { name: 'Kenya Reinsurance Corporation (Kenya Re)', share: '20.0%', role: 'Lead Underwriter', rating: 'AM Best: B+ (Good)' },
                  { name: 'East Africa Reinsurance Company Ltd', share: '12.5%', role: 'Follow Underwriter', rating: 'GCR: A+ (Stable)' },
                  { name: 'Zep-Re (PTA Reinsurance Company)', share: '7.5%', role: 'Follow Underwriter', rating: 'AM Best: B++ (Very Good)' },
                ].map((r, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{r.name}</div>
                      <div className="text-[11px] text-slate-500">{r.role} • {r.rating}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-teal-700 text-sm">{r.share}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CEDED POLICIES */}
          {activeTab === 'ceded-policies' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Recent Automatic Cessions
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">POL/MTR/2026/001239 — John Kamau (Prado KDJ 123A)</div>
                    <div className="text-[11px] text-slate-500">Gross Premium: KES 182,450 • Ceded Share (40%): KES 72,980</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] font-mono">
                    CEDED ✓
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BORDEREAUX */}
          {activeTab === 'bordereaux' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900">
                  Quarterly Reinsurance Bordereaux
                </h3>
                <button
                  type="button"
                  onClick={() => triggerToast('Bordereau template (XLSX) downloaded')}
                  className="flex items-center gap-1.5 text-teal-700 hover:text-teal-800 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
                <div className="font-semibold text-slate-800">Submit New Bordereau</div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bordereau Title</label>
                  <input
                    type="text"
                    value={bordereauTitle}
                    onChange={(e) => setBordereauTitle(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  {bordereauAttempted && <FieldError message={bordereauErrors.title} />}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bordereau File (XLSX / CSV)</label>
                  <label className="flex items-center justify-between gap-2 p-3 rounded-lg border border-slate-300 bg-white cursor-pointer hover:border-teal-400 transition-colors">
                    <span className="flex items-center gap-2 text-slate-600 truncate">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {bordereauFile ? bordereauFile.name : 'Click to choose a file, or drag it here'}
                      </span>
                    </span>
                    <span className="shrink-0 px-2 py-1 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                      Browse
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => setBordereauFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {bordereauAttempted && <FieldError message={bordereauErrors.file} />}
                </div>

                {bordereauAttempted && <ValidationSummary errors={Object.values(bordereauErrors)} />}

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isSubmittingBordereau || !canSubmitBordereau}
                    onClick={handleSubmitBordereau}
                    title={canSubmitBordereau ? undefined : "You don't have permission to submit bordereaux."}
                    className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {canSubmitBordereau ? <Send className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{isSubmittingBordereau ? 'Submitting...' : 'Submit for Actuarial Review'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {bordereauSubmissions.map((b, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{b.quarter}</div>
                      <div className="text-[11px] text-slate-500">Ceded GWP: {b.gwp} • Commission: {b.comm}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono ${
                        b.status === 'Pending Review' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: RECOVERIES */}
          {activeTab === 'recoveries' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Treaty Reinsurance Recoveries
              </h3>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Claim #CLM/MTR/2026/0081 (Net Liability: KES 370,000)</div>
                  <div className="text-[11px] text-slate-500">Treaty Cession Share (40%): KES 148,000 recoverable from panel</div>
                </div>
                <span className="font-mono font-bold text-emerald-700">KES 148,000.00</span>
              </div>
            </div>
          )}

          {/* TAB 6: WORDING */}
          {activeTab === 'wording' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Treaty Slip & Endorsement Documents
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <span className="font-semibold text-slate-900">Signed Treaty Slip - TRT-2026-MTR-QS.pdf</span>
                  </div>
                  <button
                    onClick={() => triggerToast('Treaty slip downloaded')}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Treaty Lifecycle Trace
              </h3>
              <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="font-bold text-slate-900">Treaty Executed & Incepted</div>
                  <div className="text-slate-500 text-[11px]">Signed slips returned by Kenya Re, East Africa Re, and Zep-Re.</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">01 Jan 2026 00:00 EAT</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: CONTEXTUAL SOLVENCY & RECOVERIES (lg:col-span-3)       */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Next Bordereau Settlement */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hz-border-grid)]">
              <span className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                NEXT SETTLEMENT
              </span>
              <span className="px-1.5 py-0.2 rounded-[3px] text-[9px] font-bold bg-teal-100 text-teal-800">
                Q3 2026
              </span>
            </div>

            <div>
              <div className="text-slate-500 text-[11px]">Due Date</div>
              <div className="text-2xl font-bold font-mono text-teal-700 mt-0.5">
                15 Oct 2026
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Estimated Net Cession: KES 28.8M</div>
            </div>

            <button
              onClick={() => triggerToast('Interim bordereau drafted for review')}
              className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Preview Q3 Bordereau</span>
            </button>
          </div>

          {/* Reinsurer Solvency Rating Card */}
          <div className="bg-slate-900 rounded-xl p-4 text-slate-200 text-xs space-y-2">
            <div className="font-mono text-teal-400 font-bold uppercase text-[10px]">
              Panel Security Assessment
            </div>
            <div className="text-white font-bold text-sm">100% Investment Grade</div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              All 3 treaty participants maintain AM Best / GCR ratings above A-. Zero collateral escrow required.
            </p>
          </div>

          {/* IRA Statutory Cession Rule */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5">
              REGULATORY MANDATE
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">Mandatory Kenya Re</span>
                <span className="font-bold text-emerald-700 text-[11px]">20.0% Statutory</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">Mandatory Zep-Re</span>
                <span className="font-bold text-emerald-700 text-[11px]">7.5% COMESA</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

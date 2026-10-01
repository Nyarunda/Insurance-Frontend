import React, { useState } from 'react';
import {
  ArrowLeft,
  Layers,
  Sliders,
  DollarSign,
  ShieldCheck,
  FileSpreadsheet,
  Calendar,
  Clock,
  TrendingUp,
  Percent,
  Download,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Check,
  AlertTriangle,
  FileText,
  Boxes,
  Plus,
  Zap,
  Building2,
  Scale
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { HorizonToast } from './horizon';

interface ProductWorkspaceProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
  recordId?: string;
}

export const ProductWorkspace: React.FC<ProductWorkspaceProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'coverage' | 'rating' | 'rules' | 'reinsurance' | 'documents' | 'audit'
  >('overview');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const product = {
    code: 'PRD-MTR-COMP',
    name: 'Commercial Motor Comprehensive (Fleet & Heavy Haulage)',
    category: 'Motor Commercial',
    version: 'v2.4 (Published)',
    status: 'ACTIVE / PUBLISHED',
    effectiveDate: '01 Jan 2026',
    iraApproval: 'IRA/PRD/2025/11',
    productOwner: 'Jane Mwangi',
    actuary: 'David Ochieng (FIA)',
    inForcePolicies: 1482,
    totalGwpKes: 384200000,
    lossRatioPct: 46.8,
    retentionPct: 88.4,
    baseRatePct: 4.5,
    minPremiumKes: 75000,
    maxStpSumInsuredKes: 15000000,
    treatyCode: 'T-2026-MTR-QS',
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'coverage', label: 'Coverage & Limits' },
    { id: 'rating', label: 'Rating Matrix' },
    { id: 'rules', label: 'UW Rules (STP)' },
    { id: 'reinsurance', label: 'Treaty Cessions' },
    { id: 'documents', label: 'Wording & Forms' },
    { id: 'audit', label: 'Version History' },
  ] as const;

  return (
    <div id="product-workspace" className="space-y-4 pb-12 animate-in fade-in duration-150">
      <HorizonToast message={toastMessage} />

      {/* ==================================================================== */}
      {/* 1. RECORD HEADER: Follows standard layout                            */}
      {/* ← Product / PRD-MTR-COMP                       ● ACTIVE / PUBLISHED  */}
      {/*   Commercial Motor Comprehensive • IRA/PRD/2025/11 • Jane Mwangi     */}
      {/* ==================================================================== */}
      <div className="hz-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('product-studio')}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mr-1"
                title="Back to Product Studio"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span
                onClick={() => onNavigate('product-studio')}
                className="text-xs font-mono text-slate-500 hover:text-teal-700 cursor-pointer"
              >
                Product
              </span>
              <span className="text-slate-400">/</span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {product.code}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-[3px] bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {product.status}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {product.version}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono pl-7 sm:pl-0">
              <span className="font-semibold text-slate-800 font-sans text-sm">{product.name}</span>
              <span>•</span>
              <span>IRA: {product.iraApproval}</span>
              <span>•</span>
              <span className="font-sans text-slate-600">Owner: {product.productOwner}</span>
              <span>•</span>
              <span className="text-slate-600">Actuary: {product.actuary}</span>
            </div>
          </div>

          {/* Quick Portfolio Metric Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-semibold flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-teal-600" />
              <span>GWP: KES {(product.totalGwpKes / 1000000).toFixed(1)}M ({product.inForcePolicies} Policies)</span>
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. RECORD ACTION BAR                                                 */}
        {/* [Simulate Sandbox] [New Version] [Edit UW Rules] [More ▼]            */}
        {/* ==================================================================== */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('product-sandbox')}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Simulate in Sandbox</span>
            </button>

            <button
              onClick={() => {
                triggerToast('Draft Version v2.5 initialized for editing');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>Create New Version</span>
            </button>

            <button
              onClick={() => onNavigate('underwriting-rules')}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Edit UW Rules</span>
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
                      triggerToast('Statutory IRA Filing Product Dossier exported');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download IRA Filing Dossier</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerToast('Rating Table JSON exported');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                    <span>Export Rating Table</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Context Links */}
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => onNavigate('product-studio')}
              className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <span>Product Studio</span>
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
      {/* Left Column (lg:col-span-3): Persistent Product Identity & Summary   */}
      {/* Center Column (lg:col-span-6): Main Tabbed Workspace                 */}
      {/* Right Column (lg:col-span-3): Profitability, Channels & IRA Approval */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: PERSISTENT PRODUCT IDENTITY (lg:col-span-3)             */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="hz-card space-y-4">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-2 flex items-center justify-between">
              <span>PRODUCT METADATA</span>
              <span className="font-mono text-xs text-emerald-700 font-bold">PRODUCTION</span>
            </div>

            {/* Core Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-sm truncate">{product.name}</div>
                  <div className="text-xs text-slate-500 font-medium truncate">
                    Class: {product.category}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-medium">Code</span>
                  <span className="font-bold text-slate-800">{product.code}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-medium">Base Rate</span>
                  <span className="font-bold text-slate-800">{product.baseRatePct}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-medium">Min Premium</span>
                  <span className="font-bold text-slate-800">KES {product.minPremiumKes.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* GOVERNANCE & ACTUARIAL */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                GOVERNANCE & APPROVALS
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Product Manager</span>
                  <span className="font-semibold text-slate-800 text-xs">{product.productOwner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Actuarial Lead</span>
                  <span className="font-semibold text-slate-800 text-xs">{product.actuary}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">IRA Filing</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">{product.iraApproval}</span>
                </div>
              </div>
            </div>

            {/* UNDERWRITING THRESHOLDS */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                STP & DOA LIMITS
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Auto STP Max SI</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    KES {(product.maxStpSumInsuredKes / 1000000).toFixed(0)}M
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Treaty Cession</span>
                  <span className="font-mono font-bold text-teal-700 text-xs">{product.treatyCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Statutory Commission</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">10.0% Max</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CENTER COLUMN: MAIN WORKSPACE (lg:col-span-6)                        */}
        {/* TABS: Overview | Coverage | Rating | Rules | Reinsurance | Documents */}
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
              {/* Performance KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Total In-Force GWP</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    KES 384.2M
                  </div>
                  <div className="text-emerald-700 text-xs font-semibold mt-0.5">+14.2% YoY</div>
                </div>
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">In-Force Policies</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    1,482
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">88.4% Retention</div>
                </div>
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Loss Ratio</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    46.8%
                  </div>
                  <div className="text-emerald-700 text-xs font-semibold mt-0.5">Under budget (52%)</div>
                </div>
                <div className="hz-panel p-3">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Combined Ratio</div>
                  <div className="text-slate-900 font-bold font-mono text-base mt-1">
                    82.4%
                  </div>
                  <div className="text-emerald-700 text-xs font-semibold mt-0.5">Profitable margin</div>
                </div>
              </div>

              {/* Product Target & Specification */}
              <div className="hz-card text-xs space-y-3">
                <h2 className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider pb-2 border-b border-[var(--hz-border-grid)]">
                  Target Market & Product Archetype
                </h2>
                <p className="text-slate-700 leading-relaxed">
                  Designed specifically for commercial transport operators, fleet logistics firms, and corporate hauliers
                  operating within East Africa. Features cross-border COMESA Yellow Card support, telematics-driven dynamic
                  re-rating, and fast-track M-Pesa B2C claims discharge.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="font-bold text-slate-900">Eligibility Scope</div>
                    <div className="text-slate-500 text-xs mt-0.5">Commercial trucks, prime movers, trailers & tankers</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="font-bold text-slate-900">Geographic Coverage</div>
                    <div className="text-slate-500 text-xs mt-0.5">Kenya, Uganda, Tanzania, Rwanda (Northern & Central Corridors)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COVERAGE */}
          {activeTab === 'coverage' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Insured Perils & Standard Sub-Limits
              </h3>
              <div className="space-y-2">
                {[
                  { peril: 'Own Damage & Accidental Impact', limit: 'Sum Insured (up to KES 50M)', type: 'Core' },
                  { peril: 'Third Party Property Damage (TPPD)', limit: 'KES 50,000,000 Combined Single Limit', type: 'Core' },
                  { peril: 'Third Party Bodily Injury / Death', limit: 'Unlimited statutory liability', type: 'Core' },
                  { peril: 'Fire, Explosion & Lightning', limit: 'Sum Insured', type: 'Core' },
                  { peril: 'Political Violence & Terrorism (PVT)', limit: 'Full Value Extension', type: 'Optional Add-on' },
                  { peril: 'Excess Protector (Own Damage)', limit: '100% Deductible Waiver', type: 'Optional Add-on' },
                ].map((c, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{c.peril}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{c.limit}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.type === 'Core' ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {c.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RATING MATRIX */}
          {activeTab === 'rating' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Actuarial Rating Algorithm & Loadings
              </h3>
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="text-slate-400 uppercase font-bold text-[10px]">Formula</div>
                  <div className="text-slate-900 font-bold">
                    Premium = Sum_Insured * Base_Rate (4.50%) * Age_Factor * Fleet_Discount + Levies (0.45%) + Stamp Duty (KES 40)
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-900 font-sans">Age Loading Factors</div>
                    <div className="text-slate-600 text-xs mt-1 space-y-0.5">
                      <div>0 - 5 Years: 1.00x</div>
                      <div>6 - 10 Years: 1.15x</div>
                      <div>11 - 15 Years: 1.30x</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-900 font-sans">Telematics Discounts</div>
                    <div className="text-slate-600 text-xs mt-1 space-y-0.5">
                      <div>Cartrack / Tramigo Level 1: -10%</div>
                      <div>NTSA Limiter Verified: -5%</div>
                      <div>Fleet &gt; 20 units: -7.5%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RULES */}
          {activeTab === 'rules' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Straight-Through Processing (STP) & Referral Rules
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-950">STP Rule: Sum Insured &lt;= KES 15,000,000</div>
                    <div className="text-emerald-800 text-xs">Instant automated quotation and policy bind eligible.</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    AUTO STP ✓
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-amber-950">Referral Rule: Sum Insured &gt; KES 15,000,000</div>
                    <div className="text-amber-800 text-xs">Requires Level 2 Senior Underwriter sign-off.</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                    UW REFERRAL
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REINSURANCE */}
          {activeTab === 'reinsurance' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Automatic Treaty Cession Structure
              </h3>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900">Treaty Code: T-2026-MTR-QS (Commercial Motor Quota Share)</div>
                <div className="text-slate-600 text-xs leading-relaxed">
                  40% Quota Share treaty automatically applied. Reinsurers: Kenya Re (20%), East Africa Re (15%), Zep-Re (5%).
                  Net company retention capped at KES 10,000,000 per single risk.
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Approved Policy Wording & Schedule Templates
              </h3>
              <div className="space-y-2">
                {[
                  { name: 'Commercial Motor Policy Wording - PRD-MTR-COMP-v2.4.pdf', size: '2.8 MB' },
                  { name: 'Standard Proposal Form Template.pdf', size: '640 KB' },
                  { name: 'IRA Regulatory Product Endorsement Letter.pdf', size: '1.1 MB' },
                ].map((doc, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-700" />
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
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Product Version Timeline
              </h3>
              <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="font-bold text-slate-900">Version 2.4 Published to Production</div>
                  <div className="text-slate-500 text-xs">Telematics discount logic updated to include NTSA calibrated speed limiters.</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">01 Jan 2026 00:01 EAT</div>
                </div>
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <div className="font-bold text-slate-900">IRA Approval Granted</div>
                  <div className="text-slate-500 text-xs">Insurance Regulatory Authority endorsed tariff revision IRA/PRD/2025/11.</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">18 Dec 2025 11:30 EAT</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: CONTEXTUAL PROFITABILITY & CHANNELS (lg:col-span-3)    */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Profitability Card */}
          <div className="hz-card space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hz-border-grid)]">
              <span className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                PORTFOLIO HEALTH
              </span>
              <span className="px-1.5 py-0.2 rounded-[3px] text-[10px] font-bold bg-emerald-100 text-emerald-800">
                PROFITABLE
              </span>
            </div>

            <div>
              <div className="text-slate-500 text-xs">Combined Ratio</div>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-0.5">
                82.4%
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Technical underwriting margin: +17.6%</div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Loss Ratio</span>
                <span className="font-mono font-bold text-slate-800">46.8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expense Ratio</span>
                <span className="font-mono font-bold text-slate-800">25.6%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Commission Ratio</span>
                <span className="font-mono font-bold text-slate-800">10.0%</span>
              </div>
            </div>
          </div>

          {/* Distribution Channels */}
          <div className="bg-slate-900 rounded-xl p-4 text-slate-200 text-xs space-y-2">
            <div className="font-mono text-teal-400 font-bold uppercase text-[10px]">
              Distribution Mix
            </div>
            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between">
                <span>Brokers (e.g. Marsh)</span>
                <span className="font-mono font-bold text-white">64%</span>
              </div>
              <div className="flex justify-between">
                <span>Direct Digital / Portal</span>
                <span className="font-mono font-bold text-white">22%</span>
              </div>
              <div className="flex justify-between">
                <span>Bancassurance</span>
                <span className="font-mono font-bold text-white">14%</span>
              </div>
            </div>
          </div>

          {/* IRA Regulatory Compliance */}
          <div className="hz-card space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5">
              STATUTORY STATUS
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">IRA Tariff Code</span>
                <span className="font-mono font-bold text-slate-800 text-xs">TAR-MTR-2026</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Next Review</span>
                <span className="font-mono text-slate-700 text-xs">31 Dec 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

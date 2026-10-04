import React, { useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  DollarSign,
  ShieldCheck,
  Calendar,
  Clock,
  Car,
  User,
  AlertOctagon,
  ArrowRight,
  ExternalLink,
  Users,
  Briefcase,
  Layers,
  Wrench,
  Check,
  Building2,
  Send,
  Download,
  Plus,
  ChevronDown,
  RefreshCw,
  Share2,
  CreditCard,
  Building
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { mockClaims } from '../data/mockData';
import { recordsStore } from '../data/recordsStore';
import { ApprovalBar, ApprovalStage, HorizonToast, StatusBadge, StatusTone } from './horizon';
import { ApprovalDecision, ApprovalDecisionModal } from './modals/ApprovalDecisionModal';

/** Business state drives badge color: settled/approved green, repudiated red, referral amber, work in progress blue. */
const claimStatusTone = (status: string): StatusTone => {
  const value = status.toUpperCase();
  if (/(APPROV|CLOSED|SETTLED|PAID)/.test(value)) return 'success';
  if (/(REPUDIAT|REJECT|DECLIN)/.test(value)) return 'danger';
  if (/(REFER|SIU|FRAUD)/.test(value)) return 'warning';
  if (/(VOID|REVERS|WITHDRAWN)/.test(value)) return 'neutral';
  return 'info';
};

interface ClaimWorkspaceProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
  recordId?: string;
}

export const ClaimWorkspace: React.FC<ClaimWorkspaceProps> = ({ onNavigate, densityMode, recordId }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'incident' | 'coverage' | 'reserves' | 'assessments' | 'payments' | 'salvage' | 'audit'
  >('overview');
  const [reserveApproved, setReserveApproved] = useState(false);
  const [paymentDischarged, setPaymentDischarged] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const storeClaim = recordId ? recordsStore.getClaim(recordId) : undefined;
  const fallbackClaim = mockClaims[0]; // CLM/MTR/2026/0081
  const claim = {
    ...fallbackClaim,
    claimNumber: storeClaim?.claimNumber || fallbackClaim.claimNumber,
    policyNumber: storeClaim?.policyNumber || fallbackClaim.policyNumber,
    claimant: storeClaim?.customerName || fallbackClaim.claimant,
    lossDate: storeClaim?.lossDate || fallbackClaim.lossDate,
    reportDate: storeClaim?.reportDate || fallbackClaim.reportDate,
    lossType: storeClaim?.lossType || fallbackClaim.lossType,
    location: storeClaim?.location || fallbackClaim.location,
    status: storeClaim?.status || fallbackClaim.status,
    initialReserveKes: storeClaim?.initialReserveKes || fallbackClaim.initialReserveKes,
    outstandingReserve: storeClaim?.outstandingReserveKes || fallbackClaim.outstandingReserve,
    totalIncurred: storeClaim?.totalIncurredKes || fallbackClaim.totalIncurred,
    amountPaid: storeClaim?.amountPaidKes || fallbackClaim.amountPaid,
    deductibleApplied: storeClaim?.deductibleAppliedKes || fallbackClaim.deductibleApplied,
    adjuster: storeClaim?.assessorName || fallbackClaim.adjuster,
    siuFraudScore: storeClaim?.siuFraudScore || fallbackClaim.siuFraudScore,
    garage: storeClaim?.garageName || fallbackClaim.garage,
  };

  // Approval path is selected from the reserve amount using the workflow threshold bands
  // (exclusive lower / inclusive upper bound). Prototype data until the workflow API exists.
  const approvalPath = [
    'Claims Officer',
    ...(claim.outstandingReserve > 100000 ? ['Claims Manager'] : []),
    ...(claim.outstandingReserve > 1000000 ? ['Head of Insurance'] : []),
  ];
  const [approvalStep, setApprovalStep] = useState(Math.min(1, approvalPath.length - 1));
  const [approvalOutcome, setApprovalOutcome] = useState<'PENDING' | 'REJECTED'>('PENDING');
  const [pendingDecision, setPendingDecision] = useState<ApprovalDecision | null>(null);
  const [delegatedTo, setDelegatedTo] = useState<string | null>(null);
  const approvalStages: ApprovalStage[] = approvalPath.map((label, index) => {
    if (index < approvalStep) {
      return { label, state: 'APPROVED', actor: index === 0 ? 'Jane Wanjiku' : 'Peter Otieno', timestamp: '30 Sep 2026 08:50' };
    }
    if (index === approvalStep) {
      return {
        label,
        state: approvalOutcome,
        assignee: delegatedTo ?? (index === 0 ? 'Jane Wanjiku' : 'Peter Otieno'),
        dueAt: '30 Sep 2026 12:50',
        slaRemaining: '3h 47m',
      };
    }
    return { label, state: 'WAITING' };
  });
  const approvalOpen = approvalStep < approvalPath.length && approvalOutcome !== 'REJECTED';

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleDecision = (decision: ApprovalDecision, _comment: string, delegateTo?: string) => {
    setPendingDecision(null);
    if (decision === 'APPROVE') {
      const nextStep = approvalStep + 1;
      setApprovalStep(nextStep);
      setDelegatedTo(null);
      triggerToast(
        nextStep >= approvalPath.length
          ? `Claim payment approved for ${claim.claimNumber}`
          : `Approved. Assigned to ${approvalPath[nextStep]}`
      );
    } else if (decision === 'REJECT') {
      setApprovalOutcome('REJECTED');
      triggerToast(`Claim payment rejected for ${claim.claimNumber}`);
    } else {
      setDelegatedTo(delegateTo ?? null);
      triggerToast(`Delegated to ${delegateTo}`);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'incident', label: 'Incident & FNOL' },
    { id: 'coverage', label: 'Coverage Check' },
    { id: 'reserves', label: 'Reserves' },
    { id: 'assessments', label: 'Assessor Report' },
    { id: 'payments', label: 'Discharge & Pay' },
    { id: 'salvage', label: 'Salvage' },
    { id: 'audit', label: 'Audit Log' },
  ] as const;

  return (
    <div id="claim-workspace" className="space-y-4 pb-12 animate-in fade-in duration-150">
      <HorizonToast message={toastMessage} />

      {/* ==================================================================== */}
      {/* 1. RECORD HEADER: Follows standard layout                            */}
      {/* ← Claim / CLM/MTR/2026/0081                      ● ASSESSMENT        */}
      {/*   Accidental Collision • Waiyaki Way • John Kamau                   */}
      {/* ==================================================================== */}
      <div className="hz-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('claims-landing')}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mr-1"
                title="Back to Claims list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span
                onClick={() => onNavigate('claims-landing')}
                className="text-xs font-mono text-slate-500 hover:text-teal-700 cursor-pointer"
              >
                Claim
              </span>
              <span className="text-slate-400">/</span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {claim.claimNumber}
              </h1>
              <StatusBadge label={claim.status} tone={claimStatusTone(String(claim.status))} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono pl-7 sm:pl-0">
              <span className="font-semibold text-slate-700">{claim.lossType}</span>
              <span>•</span>
              <span className="font-sans text-slate-600">{claim.location}</span>
              <span>•</span>
              <span
                onClick={() => onNavigate('policy-workspace')}
                className="text-teal-700 hover:underline cursor-pointer font-semibold"
              >
                {claim.policyNumber}
              </span>
              <span>•</span>
              <span
                onClick={() => onNavigate('customer-workspace')}
                className="text-slate-700 hover:underline cursor-pointer font-sans"
              >
                {claim.claimant}
              </span>
            </div>
          </div>

          {/* Quick SLA Status Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>SLA Target: 24h (4h 21m remaining)</span>
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. RECORD ACTION BAR                                                 */}
        {/* [Approve Reserve] [Discharge & Pay] [Assign Assessor] [More ▼]       */}
        {/* ==================================================================== */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setReserveApproved(true);
                triggerToast('Claim reserve authorized at KES 450,000');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs ${
                reserveApproved
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{reserveApproved ? 'Reserve Approved ✓' : 'Approve Reserve'}</span>
            </button>

            <button
              onClick={() => {
                setPaymentDischarged(true);
                triggerToast('Instant M-Pesa B2C settlement dispatched to garage');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                paymentDischarged
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>{paymentDischarged ? 'Payment Dispatched ✓' : 'Discharge & Pay'}</span>
            </button>

            <button
              onClick={() => triggerToast('Assessor instruction dispatch sent to Peter Githinji')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-600" />
              <span>Re-Inspect</span>
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
                      triggerToast('Full Claims Dossier PDF exported');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download Claim Dossier</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerToast('Referred to Special Investigation Unit (SIU)');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-rose-700"
                  >
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    <span>Refer to SIU Fraud Unit</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerToast('Salvage record posted to AKI portal');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Share2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Post Salvage to AKI</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Context Links */}
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => onNavigate('policy-workspace')}
              className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <span>View Policy</span>
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

      <ApprovalBar
        title="Payment Approval"
        maker="Robert Mwangi"
        submittedAt="30 Sep 2026 08:42"
        stages={approvalStages}
        canApprove={approvalOpen}
        canReject={approvalOpen}
        canDelegate={approvalOpen}
        onApprove={() => setPendingDecision('APPROVE')}
        onReject={() => setPendingDecision('REJECT')}
        onDelegate={() => setPendingDecision('DELEGATE')}
      />
      <ApprovalDecisionModal
        decision={pendingDecision}
        subject={`Claim payment · ${claim.claimNumber}`}
        stageLabel={approvalPath[approvalStep]}
        delegates={['Jane Wanjiku', 'Peter Otieno', 'Mary Achieng', 'Daniel Kiprop'].filter((n) => n !== delegatedTo)}
        onClose={() => setPendingDecision(null)}
        onConfirm={handleDecision}
      />

      {/* ==================================================================== */}
      {/* 3. WORKSPACE 3-COLUMN GRID PATTERN                                   */}
      {/* Left Column (lg:col-span-3): Persistent Claim Identity & Summary     */}
      {/* Center Column (lg:col-span-6): Main Tabbed Workspace                 */}
      {/* Right Column (lg:col-span-3): SIU Fraud Score, Salvage & SLA Clock   */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: PERSISTENT CLAIM IDENTITY (lg:col-span-3)               */}
        {/* Fields: CLAIM, POLICY, LOSS DETAILS, FINANCIALS, SERVICE PROVIDERS   */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="hz-card space-y-4">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-2 flex items-center justify-between">
              <span>CLAIM SUMMARY</span>
              <span className="font-mono text-xs text-amber-700 font-bold">FNOL-2026</span>
            </div>

            {/* Core Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-sm truncate">{claim.lossType}</div>
                  <div className="text-xs text-slate-500 font-medium truncate">
                    {claim.location}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-medium">Claim No</span>
                  <span className="font-bold text-slate-800">{claim.claimNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-medium">Loss Date</span>
                  <span className="font-bold text-slate-800">{claim.lossDate}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-medium">Reported</span>
                  <span className="font-bold text-slate-800">{claim.reportDate}</span>
                </div>
              </div>
            </div>

            {/* INSURED & POLICY LINK */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                INSURED & POLICY
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Policy Number</span>
                  <button
                    onClick={() => onNavigate('policy-workspace')}
                    className="font-mono font-bold text-teal-700 hover:underline text-xs"
                  >
                    {claim.policyNumber} →
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Insured Party</span>
                  <button
                    onClick={() => onNavigate('customer-workspace')}
                    className="font-bold text-slate-800 hover:underline text-xs"
                  >
                    {claim.claimant}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Scheduled Asset</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">Toyota Prado (KDJ 123A)</span>
                </div>
              </div>
            </div>

            {/* FINANCIALS & RESERVES */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                RESERVES & LIABILITIES
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Initial Reserve</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    KES {claim.initialReserveKes.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Estimated Repair</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    KES {claim.estimatedRepairKes.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Betterment Deduction</span>
                  <span className="font-mono font-bold text-rose-700 text-xs">
                    - KES {claim.bettermentDeductionKes.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Net Liability</span>
                  <span className="font-mono font-bold text-teal-700 text-xs">
                    KES {claim.netLiabilityKes.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* SERVICE PROVIDERS */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                SERVICE PROVIDERS
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Assessor</span>
                  <button
                    onClick={() => onNavigate('provider-workspace')}
                    className="font-semibold text-teal-700 hover:underline text-xs text-right"
                  >
                    Peter Githinji (Auto Eng) →
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Authorized Garage</span>
                  <span className="font-semibold text-slate-800 text-xs">{claim.garage}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Police Station</span>
                  <span className="font-semibold text-slate-800 text-xs">Kabete Police Post</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CENTER COLUMN: MAIN WORKSPACE (lg:col-span-6)                        */}
        {/* TABS: Overview | Incident | Coverage Check | Reserves | Assessor |   */}
        {/*       Payments & M-Pesa | Salvage | Audit Log                        */}
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
              {/* Assessor Detailed Sheet */}
              <div className="hz-card">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--hz-border-grid)] mb-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-teal-600" />
                    <h2 className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                      Assessor Engineering Assessment
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    Assessor: <strong>Peter Githinji</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Authorized Garage</div>
                    <div className="font-bold text-slate-900 mt-0.5">{claim.garage}</div>
                    <div className="text-slate-500 text-xs">Dealer Partner</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Estimated Repair</div>
                    <div className="font-bold font-mono text-slate-900 mt-0.5">
                      KES {claim.estimatedRepairKes.toLocaleString()}
                    </div>
                    <div className="text-slate-500 text-xs">OEM Parts & Labour</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Betterment</div>
                    <div className="font-bold font-mono text-rose-700 mt-0.5">
                      - KES {claim.bettermentDeductionKes.toLocaleString()}
                    </div>
                    <div className="text-slate-500 text-xs">Wear on tyres/shocks</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Assessor Fee</div>
                    <div className="font-bold font-mono text-slate-900 mt-0.5">
                      KES {claim.assessorFeeKes.toLocaleString()}
                    </div>
                    <div className="text-slate-500 text-xs">Statutory Tariff</div>
                  </div>
                </div>

                {/* Net Liability Banner */}
                <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-teal-900 uppercase font-mono tracking-wider">
                      Net Insurer Liability
                    </span>
                    <p className="text-xs text-teal-800 mt-0.5">
                      Estimated Repair (KES 380K) - Betterment (KES 25K) + Assessor (KES 15K)
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xl font-bold font-mono text-teal-900">
                      KES {claim.netLiabilityKes.toLocaleString()}
                    </div>
                    <div className="text-xs text-teal-700 font-medium">Discharge Voucher Prepared</div>
                  </div>
                </div>
              </div>

              {/* Circumstances of Loss */}
              <div className="hz-card text-xs space-y-3">
                <h2 className="text-xs font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider pb-2 border-b border-[var(--hz-border-grid)]">
                  Circumstances of Loss & Police Abstract
                </h2>
                <div className="space-y-1.5 text-slate-700 leading-relaxed">
                  <p>
                    Insured vehicle Toyota Prado KDJ 123A was traveling outbound on Waiyaki Way near Mountain View
                    junction when sudden traffic stoppage caused collision with the roadside safety barrier.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-mono text-slate-600">
                    <div>Police Station: <strong>Kabete Police Post</strong></div>
                    <div>Abstract No: <strong>OB/44/02/09/2026</strong></div>
                    <div>Third-Party Damage: <strong>None</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INCIDENT & FNOL */}
          {activeTab === 'incident' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                First Notice of Loss (FNOL) Registration
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-400 font-mono text-xs">INCIDENT DATE & TIME</div>
                  <div className="font-bold text-slate-900 mt-0.5">28 Aug 2026 08:30 EAT</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-400 font-mono text-xs">INCIDENT LOCATION</div>
                  <div className="font-bold text-slate-900 mt-0.5">Waiyaki Way (Mountain View Junction), Nairobi</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-400 font-mono text-xs">AUTHORIZED DRIVER</div>
                  <div className="font-bold text-slate-900 mt-0.5">Peter Mutua (DL #B291048)</div>
                  <div className="text-slate-500 text-xs">Licensed Class B • Over 5 years driving experience</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-400 font-mono text-xs">POLICE ABSTRACT DETAILS</div>
                  <div className="font-bold text-slate-900 mt-0.5">OB/44/02/09/2026 (Kabete)</div>
                  <div className="text-slate-500 text-xs">Verified authentic by Claims Desk</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COVERAGE CHECK */}
          {activeTab === 'coverage' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Policy Coverage Validation & Excess Verification
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-950">Policy In Force at Date of Loss</div>
                    <div className="text-emerald-800 text-xs">
                      Policy active from 01 Sep 2025 to 31 Aug 2026; loss occurred 28 Aug 2026.
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    VALID ✓
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-950">Premium Fully Paid (Cash and Carry Rule)</div>
                    <div className="text-emerald-800 text-xs">
                      Section 156 Insurance Act compliant. Receipt #REC-2026-8812 verified.
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    VALID ✓
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-950">Applicable Policy Excess</div>
                    <div className="text-emerald-800 text-xs">
                      Standard Own Damage excess: 2.5% of claim (KES 9,500) payable by insured to garage.
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    APPLIED ✓
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RESERVES */}
          {activeTab === 'reserves' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Reserve Movements & Adjustments
              </h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-xs">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Transaction</th>
                    <th className="py-2 px-3">Reason / Author</th>
                    <th className="py-2 px-3 text-right">Movement (KES)</th>
                    <th className="py-2 px-3 text-right">Balance (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  <tr>
                    <td className="py-2 px-3 text-slate-500">28 Aug 2026</td>
                    <td className="py-2 px-3 font-bold text-slate-900">Initial Reserve</td>
                    <td className="py-2 px-3 text-slate-600 font-sans">FNOL Auto-Estimate (System)</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">+ 450,000.00</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">450,000.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500">01 Sep 2026</td>
                    <td className="py-2 px-3 font-bold text-slate-900">Assessor Adjustment</td>
                    <td className="py-2 px-3 text-slate-600 font-sans">Assessor Report Received (Peter Githinji)</td>
                    <td className="py-2 px-3 text-right font-bold text-rose-700">- 80,000.00</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">370,000.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: ASSESSOR REPORT */}
          {activeTab === 'assessments' && (
            <div className="hz-card space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900">
                  Itemized Repair & Parts Schedule
                </h3>
                <button
                  onClick={() => triggerToast('Assessor report PDF downloaded')}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Report PDF</span>
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { item: 'Front Bumper Assembly (OEM)', cat: 'Parts', cost: 'KES 120,000' },
                  { item: 'Radiator & AC Condenser', cat: 'Parts', cost: 'KES 95,000' },
                  { item: 'Right Headlight Assembly (LED)', cat: 'Parts', cost: 'KES 85,000' },
                  { item: 'Panel Beating & Jig Alignment (18 hrs)', cat: 'Labour', cost: 'KES 45,000' },
                  { item: '2-Stage Oven Baked Spray Painting', cat: 'Paintwork', cost: 'KES 35,000' },
                  { item: 'Betterment Deduction (Suspension/Tyre)', cat: 'Deduction', cost: '- KES 25,000' },
                ].map((row, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-900">{row.item}</span>
                      <span className="text-xs font-mono text-slate-400 ml-2">({row.cat})</span>
                    </div>
                    <span className={`font-mono font-bold ${row.cost.startsWith('-') ? 'text-rose-700' : 'text-slate-900'}`}>
                      {row.cost}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Discharge Voucher & M-Pesa Settlement
              </h3>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">Discharge Voucher #DV-2026-0912</span>
                  <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-bold font-mono text-[10px]">
                    READY FOR DISCHARGE
                  </span>
                </div>
                <div className="text-slate-600 leading-relaxed">
                  Payee: <strong>{claim.garage}</strong> (Authorized Motor Repairer).<br />
                  Amount: <strong>KES {claim.netLiabilityKes.toLocaleString()}</strong> via Safaricom M-Pesa B2C Bulk Disbursement.
                </div>
                <button
                  onClick={() => {
                    setPaymentDischarged(true);
                    triggerToast('M-Pesa B2C Transaction initiated (Ref: MP-B2C-981298)');
                  }}
                  className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Execute M-Pesa B2C Settlement (KES {claim.netLiabilityKes.toLocaleString()})</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: SALVAGE */}
          {activeTab === 'salvage' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Salvage Recovery & Subrogation Rights
              </h3>
              <p className="text-slate-600">
                Damaged components listed for recovery auction via the Association of Kenya Insurers (AKI) portal.
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Lot #AKI-SALV-2026-0914: Front Radiator & Bumper Shell</div>
                <div className="text-slate-500 font-mono text-xs">Minimum Reserve Price: KES 35,000 • Bidding Closes: 15 Sep 2026</div>
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT */}
          {activeTab === 'audit' && (
            <div className="hz-card space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-100 pb-2">
                Chronological Claim Event Trace
              </h3>
              <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <div className="font-bold text-slate-900">Assessor Report Uploaded</div>
                  <div className="text-slate-500 text-xs">Automotive Engineers Ltd posted full itemized assessment of KES 380,000.</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">01 Sep 2026 14:00 EAT</div>
                </div>
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="font-bold text-slate-900">Assessor Dispatched</div>
                  <div className="text-slate-500 text-xs">Peter Githinji appointed to inspect vehicle at Toyota Kenya Westlands.</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">29 Aug 2026 10:30 EAT</div>
                </div>
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="font-bold text-slate-900">Claim Registered (FNOL)</div>
                  <div className="text-slate-500 text-xs">Customer reported incident via portal; police abstract attached.</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">28 Aug 2026 09:30 EAT</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: CONTEXTUAL FRAUD, SALVAGE & AUDIT (lg:col-span-3)       */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* SIU Fraud Scorecard */}
          <div className="hz-card">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hz-border-grid)] mb-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider">
                  SIU FRAUD SCORE
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                LOW RISK (8/100)
              </span>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80 mb-3">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-bold text-emerald-950 text-xs">Automated SIU Index</span>
                <span className="font-mono font-bold text-emerald-700 text-lg">8 / 100</span>
              </div>
              <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-[8%]" />
              </div>
              <p className="text-xs text-emerald-800 mt-1.5">
                All high-risk triggers cleared. Fast-track automated settlement eligible.
              </p>
            </div>

            {/* Validation Indicators */}
            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider font-mono">
                Verified Risk Checks
              </div>
              <div className="space-y-1 text-slate-700 text-xs">
                {claim.fraudIndicators.map((indicator, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{indicator}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subrogation & Salvage Card */}
          <div className="bg-slate-900 rounded-xl p-4 text-slate-200 text-xs space-y-2">
            <div className="font-mono text-teal-400 font-bold uppercase text-[10px]">
              Subrogation & Salvage Recovery
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Damaged radiator and bumper registered with AKI salvage auction portal. Estimated recovery: <strong>KES 35,000</strong>.
            </p>
          </div>

          {/* SLA Clock & Adjudication Controls */}
          <div className="hz-card space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5">
              ADJUDICATION CONTROLS
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">DOA Clearance</span>
                <span className="font-semibold text-slate-800 text-xs">Level 1 Claims Mgr</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">TAT to Date</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">19h 39m / 24h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Police Sync</span>
                <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                  <Check className="w-3 h-3" /> Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

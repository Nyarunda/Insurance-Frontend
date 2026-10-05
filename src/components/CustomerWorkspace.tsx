import React, { useState } from 'react';
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  GitBranch,
  ArrowUpRight,
  ChevronDown,
  Calendar,
  Clock,
  Car,
  Heart,
  Briefcase,
  Share2,
  FileText,
  Download,
  ExternalLink,
  Search,
  Check,
  Filter,
  Shield,
  Home,
  FileCheck,
  Receipt,
  MessageSquare,
  Users,
  Building,
  RefreshCw,
  AlertCircle,
  Truck,
  Flame,
  Ship,
  LockKeyhole,
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import {
  mockCustomer,
  mockCorporateCustomer,
  mockRelationships,
  mockPolicies,
  mockClaims,
} from '../data/mockData';
import { recordsStore } from '../data/recordsStore';
import { MODAL_IDS, useModalWrapper } from '../store/modalStore';
import { CollectPaymentModalPayload, NewClaimModalPayload, NewQuoteModalPayload } from './GlobalModals';
import { HorizonToast, Metric, Section, Status, WorkspaceTabs } from './horizon';

// Mock documents. ``restricted`` marks KYC/UBO material only compliance roles may open;
// the real access decision belongs to the server.
const CUSTOMER_DOCUMENTS: {
  name: string; cat: string; date: string; size: string; status: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral'; restricted?: boolean;
}[] = [
  { name: 'CR12 Official Search 2026.pdf', cat: 'Corporate Governance', date: '14 Jan 2026', size: '1.2 MB', status: 'Current', tone: 'success', restricted: true },
  { name: 'KRA Tax Compliance Certificate 2026.pdf', cat: 'Tax & Compliance', date: '04 Feb 2026', size: '420 KB', status: 'Current', tone: 'success', restricted: true },
  { name: 'Fleet Valuation Certificate (AA Kenya).pdf', cat: 'Asset Survey', date: '18 Jan 2026', size: '4.8 MB', status: 'Current', tone: 'success' },
  { name: 'Warehouse Fire Safety Inspection Report.pdf', cat: 'Risk Inspection', date: '12 Feb 2026', size: '3.1 MB', status: 'Review due', tone: 'warning' },
  { name: 'Certificate of Incorporation (PVT-2018).pdf', cat: 'Legal Registration', date: '10 Jan 2026', size: '940 KB', status: 'Current', tone: 'success', restricted: true },
  { name: 'Commercial Haulage Goods-In-Transit Agreement.pdf', cat: 'Contracts', date: '01 Jan 2026', size: '2.4 MB', status: 'Signed', tone: 'neutral' },
  { name: 'Police Traffic Abstract OB 42-01-09.pdf', cat: 'Claims Documentation', date: '29 Aug 2026', size: '850 KB', status: 'Received', tone: 'neutral' },
  { name: 'Digital Motor Insurance Stickers (IRA QR).zip', cat: 'Statutory Certificates', date: '01 Sep 2026', size: '6.2 MB', status: 'Current', tone: 'success' },
];

interface CustomerWorkspaceProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
  recordId?: string;
}

export const CustomerWorkspace: React.FC<CustomerWorkspaceProps> = ({ onNavigate, densityMode, recordId }) => {
  const [partyType, setPartyType] = useState<'individual' | 'corporate'>('corporate');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'policies' | 'quotes' | 'claims' | 'billing' | 'payments' | 'documents' | 'relationships' | 'communications' | 'activity'
  >('overview');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('ABC Logistics Ltd (HQ - Nairobi)');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [policySearch, setPolicySearch] = useState('');
  const [claimSearch, setClaimSearch] = useState('');
  const newQuoteModal = useModalWrapper<NewQuoteModalPayload>(MODAL_IDS.NEW_QUOTE);
  const newClaimModal = useModalWrapper<NewClaimModalPayload>(MODAL_IDS.NEW_CLAIM);
  const collectPaymentModal = useModalWrapper<CollectPaymentModalPayload>(MODAL_IDS.COLLECT_PAYMENT);

  const storeCustomer = recordId ? recordsStore.getCustomer(recordId) : undefined;
  const customerBase = partyType === 'individual' ? mockCustomer : mockCorporateCustomer;
  const customer = storeCustomer
    ? {
        ...customerBase,
        id: storeCustomer.id,
        name: storeCustomer.name,
        customerType: storeCustomer.customerType,
        kraPin: storeCustomer.kraPin,
        branch: storeCustomer.branch,
      }
    : customerBase;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Tab definitions
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'policies', label: 'Policies', count: partyType === 'corporate' ? 12 : 4 },
    { id: 'quotes', label: 'Quotes', count: 4 },
    { id: 'claims', label: 'Claims', count: 3 },
    { id: 'billing', label: 'Billing' },
    { id: 'payments', label: 'Payments' },
    { id: 'documents', label: 'Documents', count: 8 },
    { id: 'relationships', label: 'Relationships' },
    { id: 'communications', label: 'Communications' },
    { id: 'activity', label: 'Activity' },
  ] as const;

  // Rich mock corporate policies
  const corporatePolicies = [
    {
      no: 'POL/MTR/2026/00182',
      product: 'Fleet Motor Comprehensive',
      class: 'Commercial Motor',
      sumInsured: 'KES 148,000,000',
      premium: 'KES 4,820,000',
      term: '01 Jan 2026 – 31 Dec 2026',
      expiry: '31 Dec 2026',
      status: 'ACTIVE',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      units: '18 Prime Movers & Haulers'
    },
    {
      no: 'POL/FIR/2026/00031',
      product: 'Industrial Fire & Perils',
      class: 'Property & Engineering',
      sumInsured: 'KES 180,000,000',
      premium: 'KES 1,240,000',
      term: '01 Jan 2026 – 31 Dec 2026',
      expiry: '31 Dec 2026',
      status: 'ACTIVE',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      units: 'Mombasa Road Godown & Warehouses'
    },
    {
      no: 'POL/GPA/2026/00092',
      product: 'Group Personal Accident & WIBA',
      class: 'Casualty / Employee Benefits',
      sumInsured: 'KES 45,000,000',
      premium: 'KES 820,000',
      term: '01 Jul 2026 – 30 Jun 2027',
      expiry: '30 Jun 2027',
      status: 'ACTIVE',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      units: '142 Logistical Staff & Drivers'
    },
    {
      no: 'POL/MAR/2026/00412',
      product: 'Marine Cargo (Open Cover)',
      class: 'Marine & Transit',
      sumInsured: 'KES 80,000,000',
      premium: 'KES 1,120,000',
      term: '15 Nov 2025 – 14 Nov 2026',
      expiry: '14 Nov 2026',
      status: 'EXPIRING',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      units: 'Port of Mombasa to Hinterland Transit'
    },
    {
      no: 'POL/GIT/2026/00084',
      product: 'Goods In Transit (All Risks)',
      class: 'Casualty',
      sumInsured: 'KES 50,000,000',
      premium: 'KES 580,000',
      term: '01 Jan 2026 – 31 Dec 2026',
      expiry: '31 Dec 2026',
      status: 'ACTIVE',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      units: 'Containerized Cargo Transit'
    },
    {
      no: 'POL/PL/2026/00015',
      product: 'Public & Products Liability',
      class: 'Liability',
      sumInsured: 'KES 100,000,000',
      premium: 'KES 380,000',
      term: '01 Jan 2026 – 31 Dec 2026',
      expiry: '31 Dec 2026',
      status: 'ACTIVE',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      units: 'Depot & Terminal Operations'
    }
  ];

  // Invoices
  const mockInvoices = [
    {
      no: 'INV-2026-10928',
      policy: 'POL/MTR/2026/00182',
      product: 'Fleet Motor Comprehensive',
      invoiced: 'KES 2,410,000',
      paid: 'KES 2,410,000',
      balance: 'KES 0',
      dueDate: '15 Jan 2026',
      status: 'PAID',
      method: 'RTGS Central Bank KEPSS'
    },
    {
      no: 'INV-2026-10929',
      policy: 'POL/MTR/2026/00182',
      product: 'Fleet Motor Comprehensive (Q3 Installment)',
      invoiced: 'KES 1,205,000',
      paid: 'KES 785,000',
      balance: 'KES 420,000',
      dueDate: '15 Sep 2026',
      status: 'PARTIAL',
      method: 'Pending M-Pesa / Bank Slip'
    },
    {
      no: 'INV-2026-10915',
      policy: 'POL/FIR/2026/00031',
      product: 'Industrial Fire & Perils',
      invoiced: 'KES 1,240,000',
      paid: 'KES 1,240,000',
      balance: 'KES 0',
      dueDate: '01 Feb 2026',
      status: 'PAID',
      method: 'Standard Chartered EFT'
    },
    {
      no: 'INV-2026-10884',
      policy: 'POL/GPA/2026/00092',
      product: 'Group Personal Accident & WIBA',
      invoiced: 'KES 820,000',
      paid: 'KES 820,000',
      balance: 'KES 0',
      dueDate: '15 Jul 2026',
      status: 'PAID',
      method: 'M-Pesa Paybill 247247'
    },
    {
      no: 'INV-2026-10850',
      policy: 'POL/MAR/2026/00412',
      product: 'Marine Cargo Renewal Deposit',
      invoiced: 'KES 500,000',
      paid: 'KES 0',
      balance: 'KES 500,000',
      dueDate: '30 Sep 2026',
      status: 'DUE',
      method: 'Invoice Dispatched'
    }
  ];

  // Payments
  const mockPayments = [
    {
      ref: 'RCP-2026-99120',
      extRef: 'RK89104JK2',
      method: 'M-Pesa Paybill 247247',
      date: '01 Sep 2026 09:22 EAT',
      amount: 'KES 182,450',
      allocatedTo: 'INV-2026-10929 (POL/MTR/2026/00182)',
      status: 'ALLOCATED',
      receiptUrl: '#'
    },
    {
      ref: 'RCP-2026-98410',
      extRef: 'FT260814981',
      method: 'StanChart Direct RTGS',
      date: '14 Aug 2026 15:40 EAT',
      amount: 'KES 602,550',
      allocatedTo: 'INV-2026-10929 (POL/MTR/2026/00182)',
      status: 'ALLOCATED',
      receiptUrl: '#'
    },
    {
      ref: 'RCP-2026-97201',
      extRef: 'KEPSS-CBK-8812',
      method: 'Central Bank KEPSS RTGS',
      date: '12 Jan 2026 11:15 EAT',
      amount: 'KES 2,410,000',
      allocatedTo: 'INV-2026-10928 (POL/MTR/2026/00182)',
      status: 'ALLOCATED',
      receiptUrl: '#'
    },
    {
      ref: 'RCP-2026-96500',
      extRef: 'SCB-EFT-9914',
      method: 'EFT Direct Credit',
      date: '05 Jan 2026 10:00 EAT',
      amount: 'KES 1,240,000',
      allocatedTo: 'INV-2026-10915 (POL/FIR/2026/00031)',
      status: 'ALLOCATED',
      receiptUrl: '#'
    }
  ];

  // Communications
  const mockCommunications = [
    {
      id: 'COMM-109',
      channel: 'SMS',
      recipient: customer.phone,
      subject: 'M-Pesa Payment Receipt Confirmed',
      snippet: 'Confirmed: KES 182,450 received for POL/MTR/2026/00182. Official Receipt #REC-2026-8812.',
      date: '01 Sep 2026 09:23 EAT',
      status: 'DELIVERED',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'COMM-108',
      channel: 'Email',
      recipient: customer.email,
      subject: 'Policy Schedule & Digital Motor Sticker - KDJ 123A',
      snippet: 'Enclosed please find the IRA digital insurance certificate with QR validation link.',
      date: '01 Sep 2026 09:25 EAT',
      status: 'OPENED',
      badge: 'bg-teal-50 text-teal-700 border-teal-200'
    },
    {
      id: 'COMM-107',
      channel: 'WhatsApp',
      recipient: customer.phone,
      subject: 'Claim FNOL Acknowledgement (CLM-00982)',
      snippet: 'Your claim has been registered. Loss Assessor Apex Assessors has been assigned.',
      date: '28 Aug 2026 10:14 EAT',
      status: 'DELIVERED',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'COMM-106',
      channel: 'Email',
      recipient: customer.email,
      subject: 'Marine Cargo Renewal Notice - 60 Days Notice',
      snippet: 'Policy POL/MAR/2026/00412 will expire on 14 Nov 2026. Review quotation proposal attached.',
      date: '15 Aug 2026 08:30 EAT',
      status: 'SENT',
      badge: 'bg-slate-100 text-slate-700 border-slate-200'
    }
  ];

  return (
    <div id="customer-workspace" className="space-y-4 pb-12 animate-in fade-in duration-150">
      <HorizonToast message={toastMessage} />

      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <button
                onClick={() => onNavigate('customers')}
                className="rounded p-1 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
                title="Back to Customers list"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button onClick={() => onNavigate('customers')} className="font-medium text-slate-600 hover:text-teal-700">
                Customers
              </button>
              <span>/</span>
              <span className="truncate text-slate-700">{customer.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{customer.name}</h1>
              <Status tone="success">Active</Status>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span className="font-mono font-semibold text-slate-800">{customer.id}</span>
              <span>{customer.customerType}</span>
              <span>Nairobi Commercial Hub</span>
              <span>RM: {customer.assignedUnderwriter.split('(')[0].trim()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPartyType('corporate')}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${
                partyType === 'corporate' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              ABC Logistics
            </button>
            <button
              onClick={() => setPartyType('individual')}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${
                partyType === 'individual' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              John Kamau
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                newQuoteModal.open({ onSuccess: (quoteId) => onNavigate('quote-workspace', 'none', quoteId) })
              }
              className="flex items-center gap-1.5 rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Quote</span>
            </button>
            <button
              onClick={() =>
                newClaimModal.open({ onSuccess: (claimId) => onNavigate('claim-workspace', 'none', claimId) })
              }
              className="flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200/70"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Create Claim</span>
            </button>
            <button
              onClick={() =>
                collectPaymentModal.open({
                  customer: { id: customer.id, name: customer.name, phone: customer.phone, outstandingKes: customer.outstandingKes },
                  onSuccess: (receiptRef) => triggerToast(`Payment recorded (Ref: ${receiptRef}).`),
                })
              }
              className="flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200/70"
            >
              <CreditCard className="h-3.5 w-3.5 text-slate-600" />
              <span>Collect Payment</span>
            </button>
            <button
              onClick={() => triggerToast('Document upload modal initiated')}
              className="flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200/70"
            >
              <FileCheck className="h-3.5 w-3.5 text-slate-600" />
              <span>Upload Document</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/70"
              >
                <span>More</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showMoreMenu && (
                <div className="absolute left-0 z-30 mt-1 w-52 rounded border border-slate-200 bg-white py-1.5 text-xs text-slate-700 shadow-lg">
                  <button
                    onClick={() => {
                      triggerToast('Full Customer Dossier PDF exported');
                      setShowMoreMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Download Dossier PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerToast('IPRS & KRA live verification: SYNCHRONIZED');
                      setShowMoreMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-teal-600" />
                    <span>Sync IPRS & KRA Live</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('authority-doa');
                      setShowMoreMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                    <span>View Underwriting DOA</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 text-slate-500">
              <span className="text-[10px] font-semibold uppercase tracking-wide">Relationship</span>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="ABC Logistics Ltd (HQ - Nairobi)">ABC Logistics Ltd (HQ - Nairobi)</option>
                <option value="ABC Freight Mombasa Ltd (Subsidiary)">ABC Freight Mombasa Ltd (Subsidiary)</option>
                <option value="ABC Warehousing & Cold Storage">ABC Warehousing & Cold Storage</option>
                <option value="Kamau Holdings (Parent)">Kamau Holdings (Parent)</option>
              </select>
            </label>
            <button onClick={() => setActiveTab('activity')} className="flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900">
              <Clock className="h-3.5 w-3.5" />
              <span>Activity Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. WORKSPACE: PERSISTENT LEFT PANEL + RIGHT DOMAIN TABS              */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: PERSISTENT CUSTOMER SUMMARY (lg:col-span-3)             */}
        {/* Fields: IDENTITY, CONTACT, ORGANIZATION, COMPLIANCE, RELATIONSHIPS   */}
        {/* Stays visible as user switches between all domain tabs!              */}
        {/* ==================================================================== */}
        <div className="space-y-4 lg:col-span-3">
          <aside className="space-y-4 border-r border-slate-200 pr-0 lg:pr-5">
            {/* Header / Customer Tag */}
            <div className="flex items-center justify-between border-b border-[var(--hz-border-grid)] pb-2 text-[11px] font-bold uppercase tracking-wide text-teal-700">
              <span>CUSTOMER SUMMARY</span>
              <span className="font-mono text-xs text-slate-500">{customer.id}</span>
            </div>

            {/* IDENTITY */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-700">
                  {partyType === 'individual' ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-sm truncate">{customer.name}</div>
                  <div className="text-xs text-slate-500 font-medium">
                    {customer.customerType} • Key Account
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-2 font-mono text-xs text-slate-600">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-slate-400 uppercase font-medium">Customer No</span>
                  <span className="font-bold text-slate-800">{customer.id}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-slate-400 uppercase font-medium">Status</span>
                  <span className="text-emerald-700 font-bold">● ACTIVE</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-slate-400 uppercase font-medium">Client Since</span>
                  <span className="font-bold text-slate-800">{customer.relationshipSince}</span>
                </div>
              </div>
            </div>

            {/* IDENTIFICATION */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                IDENTIFICATION
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Registration / ID</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {partyType === 'corporate' ? 'PVT-2018/98214' : customer.nationalId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">KRA PIN</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{customer.kraPin}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">IPRS / BRS</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1 text-xs">
                    <Check className="w-3 h-3" /> Verified
                  </span>
                </div>
              </div>
            </div>

            {/* CONTACT */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                CONTACT
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs font-mono text-slate-800">{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate text-xs font-mono text-slate-800">{customer.email}</span>
                </div>
                <div className="flex items-start gap-2 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-600">
                    {customer.headquarters || customer.address || 'Upper Hill Chambers, Nairobi'}
                  </span>
                </div>
              </div>
            </div>

            {/* ORGANIZATION */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                ORGANIZATION
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Servicing Branch</span>
                  <span className="font-semibold text-slate-800 text-xs">Nairobi Commercial</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Account UW</span>
                  <span className="font-semibold text-slate-800 text-xs">{customer.assignedUnderwriter.split('(')[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Risk Rating</span>
                  <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                    {customer.riskProfile} (Score: 24/100)
                  </span>
                </div>
              </div>
            </div>

            {/* COMPLIANCE */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2">
                COMPLIANCE
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">KYC Status</span>
                  <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" /> Valid
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">KRA Tax Compliance</span>
                  <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" /> Certified 2026
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">UBO / CR12</span>
                  <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" /> On File
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Sanctions / PEP</span>
                  <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" /> Cleared
                  </span>
                </div>
              </div>
            </div>

            {/* RELATIONSHIP SUMMARY */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider border-b border-[var(--hz-border-grid)] pb-1.5 mb-2 flex items-center justify-between">
                <span>RELATIONSHIP</span>
                <button
                  onClick={() => setActiveTab('relationships')}
                  className="text-xs text-teal-700 font-bold hover:underline"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Parent:</span> Kamau Holdings Ltd
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Subsidiaries:</span> 2 Active entities
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Fleet Units:</span> 18 scheduled vehicles
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: MAIN WORKSPACE (lg:col-span-9)                         */}
        {/* TABS: Overview | Policies | Quotes | Claims | Billing | Payments |   */}
        {/*       Documents | Relationships | Communications | Activity          */}
        {/* ==================================================================== */}
        <div className="space-y-4 lg:col-span-9">
          {/* Sticky Tab Bar */}
          <WorkspaceTabs tabs={tabs} activeTab={activeTab} onChange={(tab) => setActiveTab(tab)} />

          {/* ================================================================== */}
          {/* TAB 1: OVERVIEW                                                    */}
          {/* ================================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <Section eyebrow="Portfolio" title="Relationship At A Glance">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Metric label="Active Policies" value={partyType === 'corporate' ? '12' : '4'} note="All in good standing" tone="success" />
                  <Metric label="Annual Premium" value={partyType === 'corporate' ? 'KES 8,240,000' : 'KES 182,450'} note={partyType === 'corporate' ? '6 lines of cover' : '4 personal lines'} />
                  <Metric label="Outstanding" value={partyType === 'corporate' ? 'KES 920,000' : 'KES 12,500'} note="Q3 installment due in 12d" tone="warning" />
                  <Metric label="Lifetime Claims" value={partyType === 'corporate' ? 'KES 4,200,000' : 'KES 450,000'} note="Loss ratio 41.2%" />
                </div>
              </Section>

              <Section
                eyebrow="Portfolio"
                title="Primary Active Policies"
                action={
                  <button onClick={() => setActiveTab('policies')} className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900">
                    <span>View All ({partyType === 'corporate' ? 12 : 4})</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                }
              >
                <div className="overflow-x-auto border-y border-slate-200">
                  <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3">Policy</th>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Risk / Units</th>
                        <th className="px-3 py-2 text-right">Premium</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="py-2 pl-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(partyType === 'corporate' ? corporatePolicies.slice(0, 3) : mockPolicies.slice(0, 3)).map((p: any, idx) => (
                        <tr key={idx} className="hover:bg-white/70">
                          <td className="py-2.5 pr-3 font-mono font-semibold text-slate-900">{p.no || p.policyNumber}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-900">{p.product || p.productName || p.productLine}</td>
                          <td className="px-3 py-2.5 text-slate-600">{p.units || `Sum insured KES ${(p.sumInsuredKes || 4500000).toLocaleString()}`}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900">
                            {p.premium || `KES ${(p.premiumKes || 182450).toLocaleString()}`}
                          </td>
                          <td className="px-3 py-2.5"><Status tone={p.status === 'EXPIRING' ? 'warning' : 'success'}>{p.status}</Status></td>
                          <td className="py-2.5 pl-3 text-right">
                            <button onClick={() => onNavigate('policy-workspace')} className="font-semibold text-teal-700 hover:text-teal-900">Open Workspace</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section
                eyebrow="Claims"
                title="Open Claims And Incidents"
                action={
                  <button onClick={() => setActiveTab('claims')} className="text-xs font-semibold text-teal-700 hover:text-teal-900">
                    View Claims
                  </button>
                }
              >
                <div className="flex flex-col gap-3 border-l-2 border-amber-400 bg-amber-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">CLM-00982 (POL/MTR/2026/00182)</span>
                      <Status tone="warning">Assessment In Progress</Status>
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-800">
                      Commercial Haulier Prime Mover (KDJ 123A) - collision with guardrail, Athi River
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      Assessor: Apex Loss Assessors | Reserve: KES 820,000 | SLA: 4h 21m remaining
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('claim-workspace')}
                    className="flex items-center justify-center gap-1 rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    <span>Claim</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Section>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 2: POLICIES                                                    */}
          {/* ================================================================== */}
          {activeTab === 'policies' && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              {/* Policies Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">ACTIVE POLICIES</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">12</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">EXPIRING IN 30 DAYS</div>
                  <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">3</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">CANCELLED / LAPSED</div>
                  <div className="text-lg font-bold font-mono text-slate-700 mt-0.5">1</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">TOTAL SUM INSURED</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">KES 340,000,000</div>
                </div>
              </div>

              {/* Table Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search policy number, product, asset..."
                    value={policySearch}
                    onChange={(e) => setPolicySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <button
                  onClick={() => onNavigate('quote-workspace')}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bind New Policy</span>
                </button>
              </div>

              {/* Wide Dense Operational Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-xs">
                      <th className="py-2.5 px-3">Policy No</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Insured Risk / Units</th>
                      <th className="py-2.5 px-3">Sum Insured</th>
                      <th className="py-2.5 px-3">Premium (KES)</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {corporatePolicies
                      .filter((p) => p.product.toLowerCase().includes(policySearch.toLowerCase()) || p.no.toLowerCase().includes(policySearch.toLowerCase()))
                      .map((p) => (
                        <tr key={p.no} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-700">
                            <button
                              onClick={() => onNavigate('policy-workspace')}
                              className="hover:underline text-left"
                            >
                              {p.no}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{p.product}</td>
                          <td className="py-2.5 px-3 text-slate-600 text-xs">{p.units}</td>
                          <td className="py-2.5 px-3 font-mono font-medium">{p.sumInsured}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.premium}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{p.expiry}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.badgeClass}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onNavigate('policy-workspace')}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                              >
                                View Workspace
                              </button>
                              <button
                                onClick={() => triggerToast(`Endorsement wizard initiated for ${p.no}`)}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                              >
                                Endorse
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 3: QUOTES                                                      */}
          {/* ================================================================== */}
          {activeTab === 'quotes' && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">OPEN QUOTES</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">4</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">TOTAL PROPOSAL VALUE</div>
                  <div className="text-lg font-bold font-mono text-teal-700 mt-0.5">KES 3,420,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">AVG TURNAROUND</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">2.4 hrs</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">REFERRED TO UW</div>
                  <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">1</div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  {
                    no: 'Q/MTR/2026/008291',
                    product: 'Commercial Heavy Prime Mover Package',
                    sumInsured: 'KES 48,000,000',
                    premium: 'KES 4,820,000',
                    validity: 'Expires in 28 days',
                    status: 'UNDER REVIEW',
                    badge: 'bg-amber-50 text-amber-800 border-amber-200',
                    desc: '18 Prime Movers • Referred for high sum insured limit'
                  },
                  {
                    no: 'Q/FIR/2026/004910',
                    product: 'Industrial Fire & Perils Extension',
                    sumInsured: 'KES 35,000,000',
                    premium: 'KES 420,000',
                    validity: 'Expires in 14 days',
                    status: 'APPROVED (STP)',
                    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    desc: 'New Godown Unit 18, Mombasa Road Logistics Center'
                  },
                  {
                    no: 'Q/CYB/2026/00012',
                    product: 'Corporate Cyber Risk & Data Protection',
                    sumInsured: 'KES 50,000,000',
                    premium: 'KES 650,000',
                    validity: 'Expires in 21 days',
                    status: 'PROPOSAL DISPATCHED',
                    badge: 'bg-blue-50 text-blue-800 border-blue-200',
                    desc: 'ERP & Cloud Supply Chain Ransomware Indemnity'
                  }
                ].map((q) => (
                  <div
                    key={q.no}
                    className="p-3.5 rounded-lg border border-slate-200 hover:border-teal-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-700">{q.no}</span>
                        <span className="font-bold text-slate-900">• {q.product}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${q.badge}`}>
                          {q.status}
                        </span>
                      </div>
                      <div className="text-slate-600 text-xs mt-1">{q.desc}</div>
                      <div className="text-slate-400 font-mono text-xs mt-0.5">{q.validity}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-slate-900">{q.premium}</div>
                      <div className="text-xs text-slate-500">Sum: {q.sumInsured}</div>
                      <div className="mt-1.5 flex items-center justify-end gap-2">
                        <button
                          onClick={() => onNavigate('quote-workspace')}
                          className="px-2.5 py-1 rounded bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700"
                        >
                          View Quote →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 4: CLAIMS                                                      */}
          {/* ================================================================== */}
          {activeTab === 'claims' && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">OPEN CLAIMS</div>
                  <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">3</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">HISTORICAL PAID CLAIMS</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">18</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">OUTSTANDING RESERVE</div>
                  <div className="text-lg font-bold font-mono text-rose-700 mt-0.5">KES 4,200,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">LOSS RATIO (LIFETIME)</div>
                  <div className="text-lg font-bold font-mono text-teal-700 mt-0.5">42.0%</div>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="relative w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search claim, policy, loss..."
                    value={claimSearch}
                    onChange={(e) => setClaimSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => onNavigate('claims-landing')}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register FNOL</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-xs">
                      <th className="py-2.5 px-3">Claim Ref</th>
                      <th className="py-2.5 px-3">Policy No</th>
                      <th className="py-2.5 px-3">Loss Description</th>
                      <th className="py-2.5 px-3">Loss Date</th>
                      <th className="py-2.5 px-3">Current Reserve</th>
                      <th className="py-2.5 px-3">Stage / Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      {
                        ref: 'CLM-00982',
                        policy: 'POL/MTR/2026/00182',
                        loss: 'Collision with guardrail (Athi River)',
                        date: '28 Aug 2026',
                        reserve: 'KES 820,000',
                        status: 'Assessment',
                        badge: 'bg-amber-50 text-amber-800 border-amber-200'
                      },
                      {
                        ref: 'CLM-00812',
                        policy: 'POL/MTR/2026/00182',
                        loss: 'Attempted Hijack & Cargo Theft (Voi)',
                        date: '14 Jul 2026',
                        reserve: 'KES 1,420,000',
                        status: 'Investigation',
                        badge: 'bg-rose-50 text-rose-800 border-rose-200'
                      },
                      {
                        ref: 'CLM-00741',
                        policy: 'POL/FIR/2026/00031',
                        loss: 'Electrical Short Fire (Depot Cold Store)',
                        date: '02 May 2026',
                        reserve: 'KES 2,100,000',
                        status: 'Settlement Review',
                        badge: 'bg-blue-50 text-blue-800 border-blue-200'
                      }
                    ].map((c) => (
                      <tr key={c.ref} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-teal-700">
                          <button
                            onClick={() => onNavigate('claim-workspace')}
                            className="hover:underline text-left"
                          >
                            {c.ref}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{c.policy}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{c.loss}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{c.date}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{c.reserve}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${c.badge}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onNavigate('claim-workspace')}
                            className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold hover:bg-teal-100 text-xs"
                          >
                            Open Claim →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 5: BILLING                                                     */}
          {/* ================================================================== */}
          {activeTab === 'billing' && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">TOTAL INVOICED</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">KES 8,240,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">TOTAL PAID</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">KES 7,320,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">OUTSTANDING BALANCE</div>
                  <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">KES 920,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">OVERDUE (30+ DAYS)</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">KES 0</div>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900">
                  Invoices & Debit Notes
                </h3>
                <button
                  onClick={() => onNavigate('accounting-workbench')}
                  className="px-3 py-1.5 rounded bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Debit Note</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-xs">
                      <th className="py-2.5 px-3">Invoice / Debit Note</th>
                      <th className="py-2.5 px-3">Policy Number</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Paid</th>
                      <th className="py-2.5 px-3">Balance</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mockInvoices.map((inv) => (
                      <tr key={inv.no} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.no}</td>
                        <td className="py-2.5 px-3 font-mono text-teal-700">{inv.policy}</td>
                        <td className="py-2.5 px-3 text-slate-700">{inv.product}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.invoiced}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">{inv.paid}</td>
                        <td className="py-2.5 px-3 font-mono text-amber-700 font-bold">{inv.balance}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : inv.status === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => triggerToast(`Payment prompt initiated for ${inv.no}`)}
                            className="text-teal-700 hover:text-teal-900 font-semibold text-xs"
                          >
                            Pay via M-Pesa →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 6: PAYMENTS                                                    */}
          {/* ================================================================== */}
          {activeTab === 'payments' && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">TOTAL RECEIPTS</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">KES 7,320,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">M-PESA PAYBILL</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">42 Txns</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">BANK RTGS / KEPSS</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">14 Txns</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">UNALLOCATED CASH</div>
                  <div className="text-lg font-bold font-mono text-teal-700 mt-0.5">KES 0.00</div>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900">
                  Receipted Premium Collections
                </h3>
                <button
                  onClick={() => onNavigate('accounting-workbench')}
                  className="px-3 py-1.5 rounded bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
                >
                  + Manual Receipt Entry
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-xs">
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Channel Reference</th>
                      <th className="py-2.5 px-3">Payment Channel</th>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Allocated Policy/Invoice</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mockPayments.map((p) => (
                      <tr key={p.ref} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.ref}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 font-semibold">{p.extRef}</td>
                        <td className="py-2.5 px-3 text-slate-700">{p.method}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-xs">{p.date}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{p.amount}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-700">{p.allocatedTo}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => triggerToast(`Receipt ${p.ref} PDF downloaded`)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600"
                            title="Download Official Receipt PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 7: DOCUMENTS                                                   */}
          {/* ================================================================== */}
          {activeTab === 'documents' && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[13px] font-semibold text-[var(--hz-text-primary)]">
                  Compliance, Asset Proof & Policy Documents
                </h3>
                <button
                  type="button"
                  onClick={() => triggerToast('Document upload dialog launched')}
                  className="flex h-7 items-center gap-1 rounded-md bg-[var(--hz-primary-700)] px-2.5 text-xs font-semibold text-white hover:bg-[var(--hz-primary-800)]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  <span>Upload File</span>
                </button>
              </div>

              <div className="overflow-x-auto border-y border-slate-200">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <caption className="sr-only">Documents held on this customer record</caption>
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="w-2/5 py-2 pr-3">Document</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Updated</th>
                      <th className="px-3 py-2 text-right">Size</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="py-2 pl-3 text-right">Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {CUSTOMER_DOCUMENTS.map((doc) => (
                      <tr key={doc.name} className="hover:bg-white/70">
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-2 font-medium text-slate-900">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                            <span className="truncate">{doc.name}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{doc.cat}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{doc.date}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">{doc.size}</td>
                        <td className="px-3 py-2"><Status tone={doc.tone}>{doc.status}</Status></td>
                        <td className="py-2 pl-3 text-right">
                          {doc.restricted ? (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500" title="Restricted to compliance roles">
                              <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
                              Restricted
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => triggerToast(`Downloading ${doc.name}`)}
                              aria-label={`Download ${doc.name}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                            >
                              <Download className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 8: RELATIONSHIPS                                               */}
          {/* ================================================================== */}
          {activeTab === 'relationships' && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900">
                  Corporate Hierarchy & Named Parties
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connected parent holdings, operating subsidiaries, directors, drivers, and insured collateral.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {mockRelationships.map((rel) => (
                  <div key={rel.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{rel.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                        {rel.relationType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{rel.detail}</div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono text-slate-500">
                      <span>Status: {rel.status}</span>
                      <button
                        onClick={() => triggerToast(`Opened relationship dossier for ${rel.name}`)}
                        className="text-teal-700 font-bold hover:underline"
                      >
                        View Dossier →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 9: COMMUNICATIONS                                             */}
          {/* ================================================================== */}
          {activeTab === 'communications' && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900">
                  Customer Notification & Dispatch Logs
                </h3>
                <button
                  onClick={() => triggerToast('Direct SMS / Email composer launched')}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Notification</span>
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {mockCommunications.map((comm) => (
                  <div key={comm.id} className="p-3.5 rounded-lg border border-slate-200 hover:border-teal-500/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-700">{comm.channel}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-slate-900">{comm.subject}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${comm.badge}`}>
                        {comm.status}
                      </span>
                    </div>
                    <div className="text-slate-600 text-xs mt-1">{comm.snippet}</div>
                    <div className="text-xs font-mono text-slate-400 mt-1 flex items-center justify-between">
                      <span>Recipient: {comm.recipient}</span>
                      <span>{comm.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 10: ACTIVITY & AUDIT                                           */}
          {/* ================================================================== */}
          {activeTab === 'activity' && (
            <div className="space-y-4 border-t border-slate-200 pt-4 text-xs">
              <div className="text-[11px] font-semibold text-[var(--hz-text-secondary)] uppercase tracking-wider pb-2 border-b border-[var(--hz-border-grid)] flex justify-between items-center">
                <span>AUDIT TRAIL & EVENT SOURCING LOGS</span>
                <span className="text-xs text-slate-400">Synchronized with Immutable Event Store</span>
              </div>

              <div className="space-y-4 pl-3 border-l-2 border-slate-200">
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <div className="font-bold text-slate-900">Motor Fleet Policy Endorsement Bound</div>
                  <div className="text-slate-600 text-xs">
                    2 Prime Movers added to POL/MTR/2026/00182; pro-rata premium of KES 240,000 debited.
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    Today 14:15 EAT • Jane Mwangi (Senior Commercial Underwriter)
                  </div>
                </div>

                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="font-bold text-slate-900">Claim Registered (FNOL #CLM-00982)</div>
                  <div className="text-slate-600 text-xs">
                    Accident on Athi River corridor; initial reserve posted at KES 820,000. Assessor Peter Githinji dispatched.
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    28 Aug 2026 09:30 EAT • Claims Operations Desk
                  </div>
                </div>

                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="font-bold text-slate-900">M-Pesa Paybill Collection Reconciled</div>
                  <div className="text-slate-600 text-xs">
                    KES 182,450 confirmed via Safaricom API (Ref: RK89104JK2); allocated to INV-2026-10929.
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    01 Sep 2026 09:22 EAT • Automated Core Reconciliation Engine
                  </div>
                </div>

                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <div className="font-bold text-slate-900">Digital Motor Certificate Generated</div>
                  <div className="text-slate-600 text-xs">
                    IRA DMVIC QR code authenticated; synced with National Police Traffic Enforcement Database.
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    01 Sep 2026 09:24 EAT • Digital Integration Hub
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

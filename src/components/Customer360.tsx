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
  CheckCircle2,
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
  Sparkles
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
import { NewQuoteWizardModal } from './modals/NewQuoteWizardModal';
import { NewClaimWizardModal } from './modals/NewClaimWizardModal';
import { CollectPaymentModal } from './modals/CollectPaymentModal';

interface Customer360Props {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
  recordId?: string;
}

export const Customer360: React.FC<Customer360Props> = ({ onNavigate, densityMode, recordId }) => {
  const [partyType, setPartyType] = useState<'individual' | 'corporate'>('corporate');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'policies' | 'quotes' | 'claims' | 'billing' | 'payments' | 'documents' | 'relationships' | 'communications' | 'activity'
  >('overview');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('ABC Logistics Ltd (HQ - Nairobi)');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [policySearch, setPolicySearch] = useState('');
  const [claimSearch, setClaimSearch] = useState('');
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);

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
    <div id="customer-360-workspace" className="space-y-4 pb-12 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. RECORD HEADER: Follows standard layout                            */}
      {/* ← Customer / ABC LOGISTICS LIMITED                         ● ACTIVE  */}
      {/*   CUS-000184 • Corporate                                            */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Subtitle */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('customers')}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mr-1"
                title="Back to Customers list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span
                onClick={() => onNavigate('customers')}
                className="text-xs font-mono text-slate-500 hover:text-teal-700 cursor-pointer"
              >
                Customer
              </span>
              <span className="text-slate-400">/</span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {customer.name}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                ACTIVE
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono pl-7 sm:pl-0">
              <span className="font-semibold text-slate-700">{customer.id}</span>
              <span>•</span>
              <span className="font-sans text-slate-600">{customer.customerType} Account</span>
              <span>•</span>
              <span>Since {customer.relationshipSince}</span>
              <span>•</span>
              <span className="text-slate-600">Branch: Nairobi Commercial Hub</span>
            </div>
          </div>

          {/* Quick Party Switcher (For demonstration of Individual vs Corporate 360) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600">
              <button
                onClick={() => setPartyType('corporate')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  partyType === 'corporate' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                ABC Logistics (Corp)
              </button>
              <button
                onClick={() => setPartyType('individual')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  partyType === 'individual' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                John Kamau (Ind)
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. RECORD ACTION BAR                                                 */}
        {/* [New Quote] [Collect Payment] [Create Claim] [Upload Doc] [More ▼]   */}
        {/* ==================================================================== */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsNewQuoteOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Quote</span>
            </button>

            <button
              onClick={() => setIsCollectPaymentOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-600" />
              <span>Collect Payment</span>
            </button>

            <button
              onClick={() => setIsNewClaimOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Create Claim</span>
            </button>

            <button
              onClick={() => triggerToast('Document upload modal initiated')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>Upload Document</span>
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
                <div className="absolute left-0 mt-1 w-52 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-30 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      triggerToast('Full Customer Dossier PDF exported');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download Dossier PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerToast('IPRS & KRA live verification: SYNCHRONIZED');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
                    <span>Sync IPRS & KRA Live</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('authority-doa');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>View Underwriting DOA</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Context Selector: Entity / Signatory & Activity Quick Link */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="font-medium text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                Relationship:
              </span>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              >
                <option value="ABC Logistics Ltd (HQ - Nairobi)">ABC Logistics Ltd (HQ - Nairobi)</option>
                <option value="ABC Freight Mombasa Ltd (Subsidiary)">ABC Freight Mombasa Ltd (Subsidiary)</option>
                <option value="ABC Warehousing & Cold Storage">ABC Warehousing & Cold Storage</option>
                <option value="Kamau Holdings (Parent)">Kamau Holdings (Parent)</option>
              </select>
            </div>

            <button
              onClick={() => setActiveTab('activity')}
              className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>View Activity Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. WORKSPACE: PERSISTENT LEFT PANEL + RIGHT DOMAIN TABS              */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: PERSISTENT CUSTOMER SUMMARY (lg:col-span-3)             */}
        {/* Fields: IDENTITY, CONTACT, ORGANIZATION, COMPLIANCE, RELATIONSHIPS   */}
        {/* Stays visible as user switches between all domain tabs!              */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
            {/* Header / Customer Tag */}
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>CUSTOMER SUMMARY</span>
              <span className="font-mono text-[10px] text-slate-500">{customer.id}</span>
            </div>

            {/* IDENTITY */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-base shrink-0">
                  {partyType === 'individual' ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-sm truncate">{customer.name}</div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {customer.customerType} • Key Account
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 uppercase font-medium">Customer No</span>
                  <span className="font-bold text-slate-800">{customer.id}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 uppercase font-medium">Status</span>
                  <span className="text-emerald-700 font-bold">● ACTIVE</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 uppercase font-medium">Client Since</span>
                  <span className="font-bold text-slate-800">{customer.relationshipSince}</span>
                </div>
              </div>
            </div>

            {/* IDENTIFICATION */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
                IDENTIFICATION
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Registration / ID</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                    {partyType === 'corporate' ? 'PVT-2018/98214' : customer.nationalId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">KRA PIN</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">{customer.kraPin}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">IPRS / BRS</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1 text-[11px]">
                    <Check className="w-3 h-3" /> Verified
                  </span>
                </div>
              </div>
            </div>

            {/* CONTACT */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
                CONTACT
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] font-mono text-slate-800">{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate text-[11px] font-mono text-slate-800">{customer.email}</span>
                </div>
                <div className="flex items-start gap-2 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-slate-600">
                    {customer.headquarters || customer.address || 'Upper Hill Chambers, Nairobi'}
                  </span>
                </div>
              </div>
            </div>

            {/* ORGANIZATION */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
                ORGANIZATION
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Servicing Branch</span>
                  <span className="font-semibold text-slate-800 text-[11px]">Nairobi Commercial</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Account UW</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{customer.assignedUnderwriter.split('(')[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Risk Rating</span>
                  <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                    {customer.riskProfile} (Score: 24/100)
                  </span>
                </div>
              </div>
            </div>

            {/* COMPLIANCE */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
                COMPLIANCE
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">KYC Status</span>
                  <span className="font-bold text-emerald-700 text-[11px] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Valid
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">KRA Tax Compliance</span>
                  <span className="font-bold text-emerald-700 text-[11px] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Certified 2026
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">UBO / CR12</span>
                  <span className="font-bold text-emerald-700 text-[11px] flex items-center gap-1">
                    <Check className="w-3 h-3" /> On File
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Sanctions / PEP</span>
                  <span className="font-bold text-emerald-700 text-[11px] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Cleared
                  </span>
                </div>
              </div>
            </div>

            {/* RELATIONSHIP SUMMARY */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-2 flex items-center justify-between">
                <span>RELATIONSHIP</span>
                <button
                  onClick={() => setActiveTab('relationships')}
                  className="text-[10px] text-teal-700 font-bold hover:underline"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="text-[11px]">
                  <span className="font-semibold text-slate-800">Parent:</span> Kamau Holdings Ltd
                </div>
                <div className="text-[11px]">
                  <span className="font-semibold text-slate-800">Subsidiaries:</span> 2 Active entities
                </div>
                <div className="text-[11px]">
                  <span className="font-semibold text-slate-800">Fleet Units:</span> 18 scheduled vehicles
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: MAIN WORKSPACE (lg:col-span-9)                         */}
        {/* TABS: Overview | Policies | Quotes | Claims | Billing | Payments |   */}
        {/*       Documents | Relationships | Communications | Activity          */}
        {/* ==================================================================== */}
        <div className="lg:col-span-9 space-y-4">
          {/* Sticky Tab Bar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-2.5 sticky top-0 z-10">
            <div className="flex items-center space-x-1 text-xs font-semibold overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-teal-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {'count' in tab && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
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

          {/* ================================================================== */}
          {/* TAB 1: OVERVIEW                                                    */}
          {/* ================================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* PORTFOLIO METRICS BANNER */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-3 flex items-center justify-between">
                  <span>PORTFOLIO AT A GLANCE</span>
                  <span className="text-[10px] text-slate-500 font-mono">Consolidated Relationship Balance</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500 font-medium">Active Policies</div>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                      {partyType === 'corporate' ? '12' : '4'}
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">100% in good standing</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500 font-medium">Annual Premium</div>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                      {partyType === 'corporate' ? 'KES 8,240,000' : 'KES 182,450'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {partyType === 'corporate' ? '6 Lines of Cover' : '4 Personal Lines'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500 font-medium">Outstanding Balance</div>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                      {partyType === 'corporate' ? 'KES 920,000' : 'KES 12,500'}
                    </div>
                    <div className="text-[10px] text-amber-700 font-medium mt-0.5">Q3 Installment due in 12d</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500 font-medium">Claims Paid (Lifetime)</div>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                      {partyType === 'corporate' ? 'KES 4,200,000' : 'KES 450,000'}
                    </div>
                    <div className="text-[10px] text-teal-700 mt-0.5">Loss Ratio: 41.2% (Healthy)</div>
                  </div>
                </div>
              </div>

              {/* ACTIVE POLICIES QUICK GLANCE */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    PRIMARY ACTIVE POLICIES
                  </div>
                  <button
                    onClick={() => setActiveTab('policies')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                  >
                    <span>View All ({partyType === 'corporate' ? 12 : 4})</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(partyType === 'corporate' ? corporatePolicies.slice(0, 3) : mockPolicies.slice(0, 3)).map(
                    (p: any, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-slate-200 hover:border-teal-500/50 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-lg bg-teal-50 text-teal-700 shrink-0">
                            {idx === 0 ? <Truck className="w-4 h-4" /> : idx === 1 ? <Flame className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">
                                {p.product || p.productName || p.productLine}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {p.status}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">{p.no || p.policyNumber}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {p.units || `Sum Insured: KES ${(p.sumInsuredKes || 4500000).toLocaleString()}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-slate-900">
                            {p.premium || `KES ${(p.premiumKes || 182450).toLocaleString()}`}
                          </div>
                          <div className="text-[10px] text-slate-500">Expires {p.expiry || '31 Dec 2026'}</div>
                          <button
                            onClick={() => onNavigate('policy-360')}
                            className="mt-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center justify-end gap-0.5"
                          >
                            <span>Open Policy 360</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* OPEN CLAIMS ALERT */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      OPEN CLAIMS & INCIDENTS (3)
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('claims')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                  >
                    <span>View Claims Tab →</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">CLM-00982 (POL/MTR/2026/00182)</span>
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        Assessment in Progress
                      </span>
                    </div>
                    <div className="text-xs text-slate-800 mt-1 font-medium">
                      Commercial Haulier Prime Mover (KDJ 123A) - Collision with guardrail, Athi River
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Assessor: Apex Loss Assessors • Reserve: KES 820,000 • SLA: 4h 21m remaining
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <button
                      onClick={() => onNavigate('claims-360')}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Claim 360</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 2: POLICIES                                                    */}
          {/* ================================================================== */}
          {activeTab === 'policies' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
              {/* Policies Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">ACTIVE POLICIES</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">12</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">EXPIRING IN 30 DAYS</div>
                  <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">3</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">CANCELLED / LAPSED</div>
                  <div className="text-lg font-bold font-mono text-slate-700 mt-0.5">1</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">TOTAL SUM INSURED</div>
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
                  onClick={() => onNavigate('quote-360')}
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
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
                              onClick={() => onNavigate('policy-360')}
                              className="hover:underline text-left"
                            >
                              {p.no}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{p.product}</td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">{p.units}</td>
                          <td className="py-2.5 px-3 font-mono font-medium">{p.sumInsured}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.premium}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{p.expiry}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.badgeClass}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onNavigate('policy-360')}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition-colors"
                              >
                                View 360
                              </button>
                              <button
                                onClick={() => triggerToast(`Endorsement wizard initiated for ${p.no}`)}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">OPEN QUOTES</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">4</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">TOTAL PROPOSAL VALUE</div>
                  <div className="text-lg font-bold font-mono text-teal-700 mt-0.5">KES 3,420,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">AVG TURNAROUND</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">2.4 hrs</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">REFERRED TO UW</div>
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${q.badge}`}>
                          {q.status}
                        </span>
                      </div>
                      <div className="text-slate-600 text-[11px] mt-1">{q.desc}</div>
                      <div className="text-slate-400 font-mono text-[10px] mt-0.5">{q.validity}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-slate-900">{q.premium}</div>
                      <div className="text-[11px] text-slate-500">Sum: {q.sumInsured}</div>
                      <div className="mt-1.5 flex items-center justify-end gap-2">
                        <button
                          onClick={() => onNavigate('quote-360')}
                          className="px-2.5 py-1 rounded bg-teal-600 text-white font-semibold text-[11px] hover:bg-teal-700"
                        >
                          View Quote 360 →
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">OPEN CLAIMS</div>
                  <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">3</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">HISTORICAL PAID CLAIMS</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">18</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">OUTSTANDING RESERVE</div>
                  <div className="text-lg font-bold font-mono text-rose-700 mt-0.5">KES 4,200,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">LOSS RATIO (LIFETIME)</div>
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
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
                            onClick={() => onNavigate('claims-360')}
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.badge}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onNavigate('claims-360')}
                            className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold hover:bg-teal-100 text-[11px]"
                          >
                            Open Claim 360 →
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">TOTAL INVOICED</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">KES 8,240,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">TOTAL PAID</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">KES 7,320,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">OUTSTANDING BALANCE</div>
                  <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">KES 920,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">OVERDUE (30+ DAYS)</div>
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
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
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                            className="text-teal-700 hover:text-teal-900 font-semibold text-[11px]"
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">TOTAL RECEIPTS</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">KES 7,320,000</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">M-PESA PAYBILL</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">42 Txns</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">BANK RTGS / KEPSS</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">14 Txns</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">UNALLOCATED CASH</div>
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
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
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{p.date}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{p.amount}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">{p.allocatedTo}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900">
                  Compliance, Asset Proof & Policy Documents
                </h3>
                <button
                  onClick={() => triggerToast('Document upload dialog launched')}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {[
                  { name: 'CR12 Official Search 2026.pdf', cat: 'Corporate Governance', date: '14 Jan 2026', size: '1.2 MB' },
                  { name: 'KRA Tax Compliance Certificate 2026.pdf', cat: 'Tax & Compliance', date: '04 Feb 2026', size: '420 KB' },
                  { name: 'Fleet Valuation Certificate (AA Kenya).pdf', cat: 'Asset Survey', date: '18 Jan 2026', size: '4.8 MB' },
                  { name: 'Warehouse Fire Safety Inspection Report.pdf', cat: 'Risk Inspection', date: '12 Feb 2026', size: '3.1 MB' },
                  { name: 'Certificate of Incorporation (PVT-2018).pdf', cat: 'Legal Registration', date: '10 Jan 2026', size: '940 KB' },
                  { name: 'Commercial Haulage Goods-In-Transit Agreement.pdf', cat: 'Contracts', date: '01 Jan 2026', size: '2.4 MB' },
                  { name: 'Police Traffic Abstract OB 42-01-09.pdf', cat: 'Claims Documentation', date: '29 Aug 2026', size: '850 KB' },
                  { name: 'Digital Motor Insurance Stickers (IRA QR).zip', cat: 'Statutory Certificates', date: '01 Sep 2026', size: '6.2 MB' }
                ].map((doc, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 hover:border-teal-500/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-teal-50 text-teal-700 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 truncate max-w-xs">{doc.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {doc.cat} • {doc.date} • {doc.size}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerToast(`Downloading ${doc.name}`)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 8: RELATIONSHIPS                                               */}
          {/* ================================================================== */}
          {activeTab === 'relationships' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900">
                  Corporate Hierarchy & Named Parties
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
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
                    <div className="text-[11px] text-slate-600 mt-1">{rel.detail}</div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${comm.badge}`}>
                        {comm.status}
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px] mt-1">{comm.snippet}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center justify-between">
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono pb-2 border-b border-slate-100 flex justify-between items-center">
                <span>AUDIT TRAIL & EVENT SOURCING LOGS</span>
                <span className="text-[10px] text-slate-400">Synchronized with Immutable Event Store</span>
              </div>

              <div className="space-y-4 pl-3 border-l-2 border-slate-200">
                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <div className="font-bold text-slate-900">Motor Fleet Policy Endorsement Bound</div>
                  <div className="text-slate-600 text-[11px]">
                    2 Prime Movers added to POL/MTR/2026/00182; pro-rata premium of KES 240,000 debited.
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Today 14:15 EAT • Jane Mwangi (Senior Commercial Underwriter)
                  </div>
                </div>

                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="font-bold text-slate-900">Claim Registered (FNOL #CLM-00982)</div>
                  <div className="text-slate-600 text-[11px]">
                    Accident on Athi River corridor; initial reserve posted at KES 820,000. Assessor Peter Githinji dispatched.
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    28 Aug 2026 09:30 EAT • Claims Operations Desk
                  </div>
                </div>

                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="font-bold text-slate-900">M-Pesa Paybill Collection Reconciled</div>
                  <div className="text-slate-600 text-[11px]">
                    KES 182,450 confirmed via Safaricom API (Ref: RK89104JK2); allocated to INV-2026-10929.
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    01 Sep 2026 09:22 EAT • Automated Core Reconciliation Engine
                  </div>
                </div>

                <div className="relative pl-4">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <div className="font-bold text-slate-900">Digital Motor Certificate Generated</div>
                  <div className="text-slate-600 text-[11px]">
                    IRA DMVIC QR code authenticated; synced with National Police Traffic Enforcement Database.
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
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

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  FileSpreadsheet,
  CheckSquare,
  Users,
  Building2,
  DollarSign,
  Layers,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';

interface ActionTile {
  id: string;
  title: string;
  subtitle: string;
  count?: string | number;
  icon: React.ElementType;
  color: string;
  badge?: string;
  onClick: () => void;
}

interface GridRow {
  id: string;
  col1: string; // e.g. Quote / Ref / Claim ID / Policy ID
  col2: string; // e.g. Customer / Insured
  col3: string; // e.g. Product / Line
  col4: string; // e.g. Risk Score / Amount / Premium
  col5: string; // e.g. SLA / Due Date / Age
  status: string;
  statusColor: string;
  actionText: string;
  onAction: () => void;
}

interface ModuleLandingViewProps {
  module: 'claims' | 'underwriting' | 'customers' | 'policies' | 'finance' | 'sales';
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
  initialTab?: string;
}

export const ModuleLandingView: React.FC<ModuleLandingViewProps> = ({
  module,
  onNavigate,
  densityMode,
  initialTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterColumn, setFilterColumn] = useState('All');
  const [page, setPage] = useState(1);

  // Configuration for CLAIMS
  if (module === 'claims') {
    const [selectedTab, setSelectedTab] = useState(initialTab || 'All');

    const tabs = [
      { id: 'All', label: 'All', count: 64 },
      { id: 'FNOL', label: 'FNOL', count: 9 },
      { id: 'Validation', label: 'Validation', count: 14 },
      { id: 'Assessment', label: 'Assessment', count: 12 },
      { id: 'Approval', label: 'Approval', count: 8 },
      { id: 'Settlement', label: 'Settlement', count: 15 },
      { id: 'Closed', label: 'Closed', count: 6 },
    ];

    const actionTiles: ActionTile[] = [
      {
        id: 'fnol',
        title: '+ Register FNOL',
        subtitle: 'Create new loss notification',
        icon: Plus,
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        badge: 'Instant Intake',
        onClick: () => onNavigate('claims-360'),
      },
      {
        id: 'view_claims',
        title: 'View Claims',
        subtitle: '1,482 lifecycle records',
        count: '1,482',
        icon: AlertTriangle,
        color: 'bg-slate-50 text-slate-800 border-slate-200',
        onClick: () => setSelectedTab('All'),
      },
      {
        id: 'assessments',
        title: 'My Assessments',
        subtitle: '12 awaiting surveyor reports',
        count: '12',
        icon: Clock,
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        onClick: () => setSelectedTab('Assessment'),
      },
      {
        id: 'approval_queue',
        title: 'Approval Queue',
        subtitle: '8 awaiting claim sign-off',
        count: '8',
        icon: CheckSquare,
        color: 'bg-teal-50 text-teal-700 border-teal-200',
        onClick: () => setSelectedTab('Approval'),
      },
      {
        id: 'service_providers',
        title: 'Service Providers',
        subtitle: 'Garages / Assessors network',
        icon: Building2,
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        onClick: () => onNavigate('integration-hub'),
      },
    ];

    const rows: GridRow[] = [
      {
        id: '1',
        col1: 'CLM/MTR/2026/0081',
        col2: 'John Kamau',
        col3: 'Motor Comp (Toyota Prado)',
        col4: 'KES 420,000',
        col5: '01:15 SLA',
        status: 'Assessment',
        statusColor: 'bg-amber-50 text-amber-800 border-amber-200',
        actionText: 'Review Claim',
        onAction: () => onNavigate('claims-360'),
      },
      {
        id: '2',
        col1: 'CLM/MTR/2026/8291',
        col2: 'ABC Logistics Ltd',
        col3: 'Commercial Heavy Actros',
        col4: 'KES 1,850,000',
        col5: '00:30 SLA',
        status: 'Approval',
        statusColor: 'bg-purple-50 text-purple-800 border-purple-200',
        actionText: 'Sign Off',
        onAction: () => onNavigate('claims-360'),
      },
      {
        id: '3',
        col1: 'CLM/MED/2026/1042',
        col2: 'Sarah Njeri',
        col3: 'Medical Family Executive',
        col4: 'KES 185,000',
        col5: '03:40 SLA',
        status: 'Settlement',
        statusColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        actionText: 'Disburse M-Pesa',
        onAction: () => onNavigate('accounting-workbench'),
      },
      {
        id: '4',
        col1: 'CLM/FIR/2026/0419',
        col2: 'Rift Valley Millers',
        col3: 'Industrial Fire & Perils',
        col4: 'KES 8,500,000',
        col5: '00:10 SLA',
        status: 'Validation',
        statusColor: 'bg-blue-50 text-blue-800 border-blue-200',
        actionText: 'Assign Adjuster',
        onAction: () => onNavigate('claims-360'),
      },
      {
        id: '5',
        col1: 'CLM/GIT/2026/0991',
        col2: 'Swift Couriers Ltd',
        col3: 'Goods in Transit (Mombasa)',
        col4: 'KES 620,000',
        col5: '04:15 SLA',
        status: 'FNOL',
        statusColor: 'bg-rose-50 text-rose-800 border-rose-200',
        actionText: 'Intake Review',
        onAction: () => onNavigate('claims-360'),
      },
    ];

    const filteredRows = rows.filter((r) => {
      if (selectedTab !== 'All' && r.status !== selectedTab) return false;
      if (
        searchQuery &&
        !r.col1.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !r.col2.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    return (
      <div id="module-landing-claims" className="space-y-6 pb-12 animate-in fade-in duration-150">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900">
              CLAIMS OPERATIONS & LIFECYCLE
            </h1>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Automated FNOL, assessment dispatch, reserving, and settlement execution.
            </p>
          </div>
          <button
            onClick={() => onNavigate('claims-360')}
            className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Register FNOL</span>
          </button>
        </div>

        {/* Action Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {actionTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.id}
                onClick={tile.onClick}
                className="bg-white rounded-xl border border-slate-200 hover:border-teal-500/50 hover:shadow-xs transition-all p-4 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg border ${tile.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {tile.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                        {tile.badge}
                      </span>
                    )}
                    {tile.count && (
                      <span className="font-mono text-lg font-bold text-slate-900">{tile.count}</span>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-xs mt-1">{tile.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{tile.subtitle}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dense Operational Grid Pattern */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Contextual State Tabs */}
          <div className="border-b border-slate-200 px-4 pt-3 flex space-x-2 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                  selectedTab === tab.id
                    ? 'border-teal-600 text-teal-700 bg-teal-50/40 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    selectedTab === tab.id ? 'bg-teal-200 text-teal-900' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Grid Toolbar */}
          <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 gap-1.5">
                <span className="text-[11px] text-slate-400 font-mono">Filter column:</span>
                <select
                  value={filterColumn}
                  onChange={(e) => setFilterColumn(e.target.value)}
                  className="bg-transparent text-slate-700 font-semibold focus:outline-none text-xs cursor-pointer"
                >
                  <option value="All">All Columns</option>
                  <option value="Claim">Claim Number</option>
                  <option value="Insured">Insured Customer</option>
                  <option value="Product">Insurance Product</option>
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search value..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-48 sm:w-64 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchQuery('')}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-1 font-medium"
              >
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Filter</span>
              </button>
              <button
                onClick={() => setSelectedTab('All')}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                title="Refresh Grid"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dense Enterprise Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono">
                  <th className="py-2.5 px-4">Claim Reference</th>
                  <th className="py-2.5 px-4">Insured Party</th>
                  <th className="py-2.5 px-4">Product Line</th>
                  <th className="py-2.5 px-4">Claimed Reserve</th>
                  <th className="py-2.5 px-4">SLA Clock</th>
                  <th className="py-2.5 px-4">Workflow Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-teal-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                      <span>{row.col1}</span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{row.col2}</td>
                    <td className="py-2.5 px-4 text-slate-600">{row.col3}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{row.col4}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-rose-600 font-semibold">
                      {row.col5}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.statusColor}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={row.onAction}
                        className="px-2.5 py-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold border border-teal-200 text-[11px]"
                      >
                        {row.actionText} →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-mono">
            <div>1–5 of 1,482 records</div>
            <div className="flex items-center gap-3">
              <span className="text-[11px]">50 / page</span>
              <div className="flex items-center gap-1">
                <button className="p-1 rounded hover:bg-slate-200 disabled:opacity-50">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-300 font-bold text-slate-900">
                  1
                </span>
                <span className="px-2 py-0.5">2</span>
                <span className="px-2 py-0.5">3</span>
                <button className="p-1 rounded hover:bg-slate-200">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Configuration for UNDERWRITING (Workbench & Referrals)
  const [uwTab, setUwTab] = useState(initialTab || 'Referred');

  const uwTabs = [
    { id: 'All', label: 'All', count: 48 },
    { id: 'Draft', label: 'Draft', count: 12 },
    { id: 'Submitted', label: 'Submitted', count: 8 },
    { id: 'Referred', label: 'Referred', count: 7 },
    { id: 'Approved', label: 'Approved', count: 15 },
    { id: 'Declined', label: 'Declined', count: 6 },
    { id: 'Expired', label: 'Expired', count: 0 },
  ];

  const uwActionTiles: ActionTile[] = [
    {
      id: 'new_quote',
      title: '+ New Quote',
      subtitle: 'Instant rating & proposal',
      icon: Plus,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      onClick: () => onNavigate('quote-360'),
    },
    {
      id: 'referrals',
      title: 'Referral Queue',
      subtitle: '7 awaiting senior sign-off',
      count: '7',
      icon: ShieldAlert,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      badge: 'High Priority',
      onClick: () => setUwTab('Referred'),
    },
    {
      id: 'risk_assessments',
      title: 'Risk Assessments',
      subtitle: 'Surveys & valuations',
      count: '14',
      icon: CheckSquare,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      onClick: () => onNavigate('underwriting-workbench'),
    },
    {
      id: 'inspections',
      title: 'Field Inspections',
      subtitle: 'Vehicle & property survey',
      count: '9',
      icon: Clock,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      onClick: () => onNavigate('underwriting-workbench'),
    },
    {
      id: 'doa',
      title: 'Authority / DOA',
      subtitle: 'Delegation matrix & limits',
      icon: SlidersHorizontal,
      color: 'bg-slate-50 text-slate-800 border-slate-200',
      onClick: () => onNavigate('authority-doa'),
    },
  ];

  const uwRows: GridRow[] = [
    {
      id: '1',
      col1: 'Q-10492',
      col2: 'ABC Logistics Ltd',
      col3: 'Commercial Multi-peril',
      col4: '82 HIGH',
      col5: '00:42 SLA',
      status: 'Referred',
      statusColor: 'bg-amber-50 text-amber-800 border-amber-200',
      actionText: 'Workbench',
      onAction: () => onNavigate('underwriting-workbench'),
    },
    {
      id: '2',
      col1: 'Q-10491',
      col2: 'John Kamau',
      col3: 'Motor Comprehensive',
      col4: '31 LOW',
      col5: '02:12 SLA',
      status: 'Submitted',
      statusColor: 'bg-blue-50 text-blue-800 border-blue-200',
      actionText: 'Review',
      onAction: () => onNavigate('underwriting-workbench'),
    },
    {
      id: '3',
      col1: 'Q-10488',
      col2: 'Mombasa Freight Hub',
      col3: 'Marine Cargo (All Risks)',
      col4: '74 HIGH',
      col5: '00:15 SLA',
      status: 'Referred',
      statusColor: 'bg-amber-50 text-amber-800 border-amber-200',
      actionText: 'DOA Approve',
      onAction: () => onNavigate('underwriting-workbench'),
    },
    {
      id: '4',
      col1: 'Q-10485',
      col2: 'Equity Logistics',
      col3: 'Goods in Transit',
      col4: '45 MED',
      col5: '04:30 SLA',
      status: 'Submitted',
      statusColor: 'bg-blue-50 text-blue-800 border-blue-200',
      actionText: 'Evaluate',
      onAction: () => onNavigate('underwriting-workbench'),
    },
    {
      id: '5',
      col1: 'Q-10480',
      col2: 'Naomi Wanjiku',
      col3: 'Personal Accident Prime',
      col4: '18 LOW',
      col5: '06:10 SLA',
      status: 'Approved',
      statusColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      actionText: 'Bind Policy',
      onAction: () => onNavigate('policy-360'),
    },
  ];

  const filteredUwRows = uwRows.filter((r) => {
    if (uwTab !== 'All' && r.status !== uwTab) return false;
    if (
      searchQuery &&
      !r.col1.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.col2.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div id="module-landing-underwriting" className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900">
            UNDERWRITING REFERRALS & WORKBENCH
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Risk scoring, STP rating decision engine, and delegation of authority matrix.
          </p>
        </div>
        <button
          onClick={() => onNavigate('quote-360')}
          className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ New Quote</span>
        </button>
      </div>

      {/* Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {uwActionTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.id}
              onClick={tile.onClick}
              className="bg-white rounded-xl border border-slate-200 hover:border-teal-500/50 hover:shadow-xs transition-all p-4 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg border ${tile.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {tile.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                      {tile.badge}
                    </span>
                  )}
                  {tile.count && (
                    <span className="font-mono text-lg font-bold text-slate-900">{tile.count}</span>
                  )}
                </div>
                <div className="font-bold text-slate-900 text-xs mt-1">{tile.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{tile.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dense Operational Grid Pattern */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Contextual State Tabs */}
        <div className="border-b border-slate-200 px-4 pt-3 flex space-x-2 overflow-x-auto no-scrollbar">
          {uwTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setUwTab(tab.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                uwTab === tab.id
                  ? 'border-teal-600 text-teal-700 bg-teal-50/40 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  uwTab === tab.id ? 'bg-teal-200 text-teal-900' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Grid Toolbar */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 gap-1.5">
              <span className="text-[11px] text-slate-400 font-mono">Filter column:</span>
              <select
                value={filterColumn}
                onChange={(e) => setFilterColumn(e.target.value)}
                className="bg-transparent text-slate-700 font-semibold focus:outline-none text-xs cursor-pointer"
              >
                <option value="All">All Columns</option>
                <option value="Quote">Quote Number</option>
                <option value="Customer">Customer Name</option>
                <option value="Risk">Risk Score</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search value..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-48 sm:w-64 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchQuery('')}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-1 font-medium"
            >
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter</span>
            </button>
            <button
              onClick={() => setUwTab('All')}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              title="Refresh Grid"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dense Enterprise Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono">
                <th className="py-2.5 px-4">Quote</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4">Risk</th>
                <th className="py-2.5 px-4">SLA</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUwRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-teal-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                    <span>{row.col1}</span>
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{row.col2}</td>
                  <td className="py-2.5 px-4 text-slate-600">{row.col3}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{row.col4}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-amber-700 font-semibold">
                    {row.col5}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.statusColor}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={row.onAction}
                      className="px-2.5 py-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold border border-teal-200 text-[11px]"
                    >
                      {row.actionText} →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-mono">
          <div>1–50 of 1,284</div>
          <div className="flex items-center gap-3">
            <span className="text-[11px]">50 / page</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded hover:bg-slate-200 disabled:opacity-50">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 py-0.5 rounded bg-white border border-slate-300 font-bold text-slate-900">
                1
              </span>
              <span className="px-2 py-0.5">2</span>
              <span className="px-2 py-0.5">3</span>
              <button className="p-1 rounded hover:bg-slate-200">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

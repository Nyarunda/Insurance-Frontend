import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Bell,
  Users,
  Building2,
  UserPlus,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  Briefcase,
  Layers,
  ShieldAlert,
  ClipboardCheck,
  FileCheck,
  Lock,
  AlertTriangle,
  Receipt,
  Scale,
  Settings,
  Database,
  Cpu,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  FileText,
  Boxes,
  Activity,
  History,
  Repeat,
  Car,
  RefreshCw,
  FolderTree,
} from 'lucide-react';
import { ScreenId } from '../types';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavChildItem {
  id: ScreenId;
  label: string;
  badge?: string | number;
  badgeColor?: string;
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  defaultScreen: ScreenId;
  badge?: string | number;
  badgeColor?: string;
  items: NavChildItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) => {
  // Navigation Domain Specification
  const domainSections: NavSection[] = [
    {
      id: 'OVERVIEW',
      title: 'OVERVIEW',
      icon: LayoutDashboard,
      defaultScreen: 'dashboard',
      items: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'my-work', label: 'My Work', badge: 12, badgeColor: 'bg-rose-500/25 text-rose-300 font-bold' },
        { id: 'notifications', label: 'Notifications' },
      ],
    },
    {
      id: 'CUSTOMERS',
      title: 'CUSTOMERS',
      icon: Users,
      defaultScreen: 'customers',
      items: [
        { id: 'customers', label: 'Customers' },
        { id: 'organizations', label: 'Organizations' },
        { id: 'leads', label: 'Leads' },
        { id: 'kyc-compliance', label: 'KYC / Compliance' },
        { id: 'intermediaries', label: 'Intermediaries' },
        { id: 'providers', label: 'Service Providers' },
      ],
    },
    {
      id: 'SALES_DISTRIBUTION',
      title: 'SALES & DISTRIBUTION',
      icon: TrendingUp,
      defaultScreen: 'quotations',
      items: [
        { id: 'quotations', label: 'Quotations' },
        { id: 'applications', label: 'Applications' },
        { id: 'brokers', label: 'Brokers' },
        { id: 'agents', label: 'Agents' },
        { id: 'bancassurance', label: 'Bancassurance' },
      ],
    },
    {
      id: 'UNDERWRITING',
      title: 'UNDERWRITING',
      icon: ShieldAlert,
      defaultScreen: 'underwriting-workbench',
      items: [
        { id: 'underwriting-workbench', label: 'Workbench' },
        { id: 'referrals', label: 'Referrals', badge: 7, badgeColor: 'bg-amber-500/25 text-amber-300 font-bold' },
        { id: 'risk-assessments', label: 'Risk Assessments' },
        { id: 'inspections', label: 'Inspections' },
        { id: 'authority-doa', label: 'Authority / DOA' },
      ],
    },
    {
      id: 'POLICIES',
      title: 'POLICIES',
      icon: ShieldCheck,
      defaultScreen: 'policies',
      items: [
        { id: 'policies', label: 'Policies' },
        { id: 'endorsements', label: 'Endorsements' },
        { id: 'renewals', label: 'Renewals', badge: 23, badgeColor: 'bg-teal-500/25 text-teal-300 font-bold' },
        { id: 'cancellations', label: 'Cancellations' },
        { id: 'certificates', label: 'Certificates' },
      ],
    },
    {
      id: 'CLAIMS',
      title: 'CLAIMS',
      icon: AlertTriangle,
      defaultScreen: 'claims',
      items: [
        { id: 'claims', label: 'Claims Register' },
        { id: 'fnol', label: 'FNOL' },
        { id: 'assessments', label: 'Assessments' },
        { id: 'reserves', label: 'Reserves' },
        { id: 'settlements', label: 'Settlements' },
        { id: 'recoveries', label: 'Recoveries' },
        { id: 'salvage', label: 'Salvage' },
      ],
    },
    {
      id: 'FINANCE',
      title: 'FINANCE',
      icon: DollarSign,
      defaultScreen: 'finance-landing',
      items: [
        { id: 'billing', label: 'Billing' },
        { id: 'receivables', label: 'Receivables' },
        { id: 'payments', label: 'Payments' },
        { id: 'reconciliation', label: 'Reconciliation' },
        { id: 'commissions', label: 'Commissions' },
        { id: 'accounting', label: 'Accounting' },
        { id: 'period-close', label: 'Period Close' },
      ],
    },
    {
      id: 'REINSURANCE',
      title: 'REINSURANCE',
      icon: Layers,
      defaultScreen: 'reinsurance-treaties',
      items: [
        { id: 'reinsurance-treaties', label: 'Treaties' },
        { id: 'reinsurance-facultative', label: 'Facultative' },
        { id: 'reinsurance-cessions', label: 'Cessions' },
        { id: 'reinsurance-recoveries', label: 'Recoveries' },
        { id: 'reinsurance-bordereaux', label: 'Bordereaux' },
      ],
    },
    {
      id: 'PRODUCTS',
      title: 'PRODUCTS',
      icon: Boxes,
      defaultScreen: 'products',
      items: [
        { id: 'products', label: 'Product Catalog' },
        { id: 'product-studio', label: 'Product Studio' },
        { id: 'product-versions', label: 'Product Versions' },
        { id: 'rating', label: 'Rating' },
        { id: 'underwriting-rules', label: 'Underwriting Rules' },
        { id: 'product-sandbox', label: 'Product Sandbox' },
      ],
    },
    {
      id: 'OPERATIONS',
      title: 'OPERATIONS',
      icon: Cpu,
      defaultScreen: 'integration-hub',
      items: [
        { id: 'integration-hub', label: 'Integration Hub' },
        { id: 'workflows', label: 'Workflows' },
        { id: 'background-jobs', label: 'Background Jobs' },
        { id: 'failed-transactions', label: 'Failed Transactions' },
        { id: 'activity-logs', label: 'Activity Logs' },
      ],
    },
    {
      id: 'REPORTING',
      title: 'REPORTING',
      icon: BarChart3,
      defaultScreen: 'reporting-operational',
      items: [
        { id: 'reporting-operational', label: 'Operational' },
        { id: 'reporting-financial', label: 'Financial' },
        { id: 'reporting-claims', label: 'Claims' },
        { id: 'reporting-underwriting', label: 'Underwriting' },
        { id: 'reporting-regulatory', label: 'Regulatory' },
        { id: 'reporting-bi', label: 'BI' },
      ],
    },
    {
      id: 'ADMINISTRATION',
      title: 'ADMINISTRATION',
      icon: Settings,
      defaultScreen: 'regulatory-admin',
      items: [
        { id: 'admin-organization', label: 'Organization' },
        { id: 'admin-branches', label: 'Branches' },
        { id: 'admin-users-roles', label: 'Users & Roles' },
        { id: 'admin-doa', label: 'Delegation of Authority' },
        { id: 'admin-workflows', label: 'Workflows' },
        { id: 'admin-documents', label: 'Documents' },
        { id: 'admin-number-series', label: 'Number Series' },
        { id: 'regulatory-admin', label: 'Regulatory Packs' },
        { id: 'admin-integrations', label: 'Integrations' },
        { id: 'admin-audit', label: 'Audit' },
        { id: 'admin-subscription', label: 'Subscription' },
      ],
    },
  ];

  // Helper to determine which section contains the given screen
  const findParentSection = (screen: ScreenId): string => {
    for (const section of domainSections) {
      if (section.defaultScreen === screen) return section.id;
      if (section.items.some((item) => item.id === screen)) return section.id;
    }
    // Backward compatibility mappings
    if (screen === 'underwriter-dashboard') return 'OVERVIEW';
    if (screen === 'customer-360') return 'CUSTOMERS';
    if (screen === 'quote-360') return 'SALES_DISTRIBUTION';
    if (screen === 'policy-360') return 'POLICIES';
    if (screen === 'claims-360' || screen === 'claims-landing') return 'CLAIMS';
    if (screen === 'accounting-workbench' || screen === 'finance-landing') return 'FINANCE';
    if (screen === 'product-factory-designer' || screen === 'product-factory') return 'PRODUCTS';
    if (screen === 'user-permissions-workflows') return 'UNDERWRITING';
    return 'OVERVIEW';
  };

  // Single-open accordion state: only one section can be open at a time
  const [openSectionId, setOpenSectionId] = useState<string>(() => findParentSection(currentScreen));

  // Automatically ensure active section is open when currentScreen changes externally
  useEffect(() => {
    const parent = findParentSection(currentScreen);
    setOpenSectionId(parent);
  }, [currentScreen]);

  const handleSectionToggle = (sectionId: string, defaultScreen: ScreenId) => {
    if (openSectionId === sectionId) {
      // Toggle close
      setOpenSectionId('');
    } else {
      // Single-open accordion: opening Claims collapses Policies automatically
      setOpenSectionId(sectionId);
    }
  };

  const isChildActive = (childId: ScreenId): boolean => {
    if (childId === currentScreen) return true;
    if (childId === 'dashboard' && (currentScreen === 'dashboard' || currentScreen === 'underwriter-dashboard')) return true;
    if (childId === 'customers' && currentScreen === 'customer-360') return true;
    if (childId === 'quotations' && currentScreen === 'quote-360') return true;
    if (childId === 'policies' && currentScreen === 'policy-360') return true;
    if (childId === 'claims' && (currentScreen === 'claims-360' || currentScreen === 'claims-landing')) return true;
    if (childId === 'accounting' && currentScreen === 'accounting-workbench') return true;
    if (childId === 'product-studio' && (currentScreen === 'product-factory' || currentScreen === 'product-factory-designer')) return true;
    if (childId === 'authority-doa' && currentScreen === 'user-permissions-workflows') return true;
    return false;
  };

  const activeParentSection = findParentSection(currentScreen);

  return (
    <aside
      id="insure-erp-sidebar"
      className={`bg-slate-950 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 transition-all duration-200 select-none z-20 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950">
        {!collapsed ? (
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white text-base tracking-wider shadow-sm">
              IE
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>InsureERP</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  KENYA
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-tight">Enterprise Suite v4.2</div>
            </div>
          </div>
        ) : (
          <div
            className="w-9 h-9 mx-auto rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white text-sm cursor-pointer shadow-sm"
            onClick={() => onNavigate('dashboard')}
            title="InsureERP Home"
          >
            IE
          </div>
        )}

        {/* Collapse Sidebar Toggle */}
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${
            collapsed ? 'hidden' : 'block'
          }`}
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Accordion Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {domainSections.map((sec) => {
          const Icon = sec.icon;
          const isOpen = openSectionId === sec.id;
          const isParentActive = activeParentSection === sec.id;

          return (
            <div key={sec.id} className="rounded-lg overflow-hidden transition-colors">
              {/* Section Header */}
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => handleSectionToggle(sec.id, sec.defaultScreen)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                    isParentActive
                      ? 'text-teal-300 bg-slate-900/80 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isParentActive ? 'text-teal-400' : 'text-slate-400'}`} />
                    <span className="truncate uppercase tracking-wider text-[11px] font-mono">{sec.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Section Badge if any */}
                    {sec.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${sec.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {sec.badge}
                      </span>
                    )}
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                  </div>
                </button>
              ) : (
                /* Collapsed Icon-Only Button */
                <button
                  type="button"
                  onClick={() => {
                    onToggleCollapse();
                    setOpenSectionId(sec.id);
                  }}
                  title={sec.title}
                  className={`w-full p-2.5 flex items-center justify-center rounded-lg my-0.5 transition-colors relative ${
                    isParentActive ? 'bg-teal-600/20 text-teal-300' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {isParentActive && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-teal-400" />
                  )}
                </button>
              )}

              {/* Accordion Child Pages: Visible ONLY when this section is open and not collapsed */}
              {!collapsed && isOpen && (
                <div className="pl-6 pr-1 pt-1 pb-1 space-y-0.5 border-l border-slate-800/80 ml-4 my-1">
                  {sec.items.map((item) => {
                    const active = isChildActive(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-path={item.id}
                        onClick={() => onNavigate(item.id, 'none')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors text-left ${
                          active
                            ? 'bg-teal-500/15 text-teal-300 font-semibold border-l-2 border-teal-400'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-mono leading-none ${
                              item.badgeColor || 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Profile & Re-expand Button if Collapsed */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950">
        {!collapsed ? (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-teal-800 border border-teal-600 flex items-center justify-center text-teal-200 font-bold text-xs">
                MV
              </div>
              <div className="truncate">
                <div className="font-semibold text-slate-200 truncate">Marcus Vance</div>
                <div className="text-[10px] text-slate-500 font-mono">CUO • Horizon Kenya</div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
          </div>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="w-full p-2 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};

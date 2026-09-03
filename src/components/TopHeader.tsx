import React, { useState } from 'react';
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Building2,
  Shield,
  Layers,
  Sparkles,
  Sliders,
  Check,
  UserCheck,
  Globe,
  FileText,
  AlertTriangle,
  CreditCard,
  X,
} from 'lucide-react';
import { ScreenId, UserRole, DensityMode } from '../types';

interface TopHeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenCommandPalette: () => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  densityMode: DensityMode;
  onDensityChange: (density: DensityMode) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentScreen,
  onNavigate,
  onOpenCommandPalette,
  currentRole,
  onRoleChange,
  densityMode,
  onDensityChange,
}) => {
  const [tenantOpen, setTenantOpen] = useState(false);
  const [activeTenant, setActiveTenant] = useState('Apex Insurance Kenya Ltd');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [densityMenuOpen, setDensityMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const tenants = [
    { name: 'Apex Insurance Kenya Ltd', code: 'APX-KE', region: 'Nairobi HQ • Primary Underwriter' },
    { name: 'Jubilee Allianz Bancassurance', code: 'JBL-BA', region: 'East Africa Retail Syndicate' },
    { name: 'Britam General Intermediary', code: 'BRT-INT', region: 'Commercial Broker Gateway' },
  ];

  const roles: { role: UserRole; title: string; subtitle: string }[] = [
    { role: 'underwriter', title: 'Senior Underwriter', subtitle: 'Marcus Vance • DOA: KES 15.0M' },
    { role: 'executive', title: 'CEO / Executive', subtitle: 'Portfolio KPIs, Loss Ratio & Retention' },
    { role: 'claims', title: 'Claims Manager', subtitle: 'FNOL, Reserves, Assessor Authorizations' },
    { role: 'finance', title: 'Finance Officer', subtitle: 'M-Pesa Receipts, Journals & Trial Balance' },
    { role: 'agent', title: 'Broker / Field Agent', subtitle: 'Production, Fast Quotes & Commissions' },
  ];

  const roleLabels: Record<UserRole, string> = {
    underwriter: 'Underwriter',
    executive: 'CEO / Exec',
    claims: 'Claims Mgr',
    finance: 'Finance',
    agent: 'Agent',
  };

  const notifications = [
    {
      id: 'notif-1',
      title: 'SLA Breach Warning (15m remaining)',
      desc: 'UW Referral Q-10292 (ABC Logistics KES 18.5M Actros) awaiting CUO decision.',
      time: '12m ago',
      urgent: true,
      screen: 'underwriting-workbench' as ScreenId,
    },
    {
      id: 'notif-2',
      title: 'M-Pesa Instant Receipt Confirmed',
      desc: 'KES 182,450 received via Paybill 89104 for POL/MTR/2026/001239 (John Kamau).',
      time: '24m ago',
      urgent: false,
      screen: 'policy-360' as ScreenId,
    },
    {
      id: 'notif-3',
      title: 'New Claim Assessor Report Uploaded',
      desc: 'CLM/MTR/2026/0081 assessment report finalized by Peter Githinji.',
      time: '1h ago',
      urgent: false,
      screen: 'claims-360' as ScreenId,
    },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 text-slate-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Brand + Tenant Selector */}
      <div className="flex items-center space-x-3 md:space-x-4 shrink-0">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-2 font-bold text-slate-900 tracking-tight hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
            ◈
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-extrabold tracking-wide uppercase font-mono">INSURE ERP</span>
            <span className="text-[10px] text-teal-600 font-semibold tracking-wider uppercase -mt-0.5">HORIZON 2.0</span>
          </div>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Tenant Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setTenantOpen(!tenantOpen);
              setRoleMenuOpen(false);
              setQuickAddOpen(false);
              setNotificationsOpen(false);
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 text-slate-800 border border-slate-200 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            <span className="max-w-[140px] md:max-w-[180px] truncate">{activeTenant}</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {tenantOpen && (
            <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 text-xs animate-in fade-in duration-100">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Switch Operating Tenant
              </div>
              {tenants.map((t) => (
                <button
                  key={t.code}
                  onClick={() => {
                    setActiveTenant(t.name);
                    setTenantOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50/60 flex items-start justify-between transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      {t.name}
                      {activeTenant === t.name && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{t.region}</div>
                  </div>
                  <span className="text-[10px] font-mono font-medium px-1 rounded bg-slate-100 text-slate-600">
                    {t.code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Global Search Bar triggering Command Palette */}
      <div className="flex-1 max-w-xl mx-3 lg:mx-8 hidden md:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-100/90 hover:bg-slate-100 text-slate-500 border border-slate-200/80 hover:border-slate-300 transition-all text-xs group"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
            <span className="text-slate-500 group-hover:text-slate-700">
              Search anything... (John Kamau, POL/MTR, Claims, M-Pesa)
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white text-slate-500 font-mono text-[10px] border border-slate-200 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right Controls: Quick Add, Notifications, Density, Role Switcher, Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenCommandPalette}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 md:hidden"
          title="Search (⌘K)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Quick Action (+) Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setQuickAddOpen(!quickAddOpen);
              setTenantOpen(false);
              setNotificationsOpen(false);
              setRoleMenuOpen(false);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors shadow-2xs"
            title="Create new record"
          >
            <Plus className="w-4 h-4" />
          </button>

          {quickAddOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Fast Actions
              </div>
              <button
                onClick={() => {
                  onNavigate('quote-360');
                  setQuickAddOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center space-x-2 text-slate-700 hover:text-teal-900"
              >
                <FileText className="w-4 h-4 text-teal-600" />
                <span>+ New Motor Quotation</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('customer-360');
                  setQuickAddOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center space-x-2 text-slate-700 hover:text-teal-900"
              >
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>+ Onboard Party / Customer</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('claims-360');
                  setQuickAddOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center space-x-2 text-slate-700 hover:text-teal-900"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>+ Submit FNOL Claim</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('accounting-workbench');
                  setQuickAddOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center space-x-2 text-slate-700 hover:text-teal-900"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>+ Receive M-Pesa Payment</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Icon with Counter */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setQuickAddOpen(false);
              setTenantOpen(false);
              setRoleMenuOpen(false);
            }}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in duration-100">
              <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-900">Notifications & Alerts</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                  1 Critical
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      onNavigate(n.screen);
                      setNotificationsOpen(false);
                    }}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-slate-800 font-semibold mb-0.5">
                      <span className={n.urgent ? 'text-rose-700' : 'text-slate-800'}>{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
              <div className="px-3 py-1.5 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    onNavigate('my-work');
                    setNotificationsOpen(false);
                  }}
                  className="text-[11px] text-teal-600 hover:text-teal-800 font-semibold"
                >
                  View All Work Items →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Display Density Switcher */}
        <div className="relative hidden xl:block">
          <button
            onClick={() => {
              setDensityMenuOpen(!densityMenuOpen);
              setRoleMenuOpen(false);
              setQuickAddOpen(false);
              setNotificationsOpen(false);
            }}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200"
            title="Density Mode"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="capitalize">{densityMode}</span>
          </button>
          {densityMenuOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 text-xs">
              {(['compact', 'comfortable', 'spacious'] as DensityMode[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    onDensityChange(d);
                    setDensityMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between capitalize text-slate-700"
                >
                  <span>{d}</span>
                  {densityMode === d && <Check className="w-3.5 h-3.5 text-teal-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Locale indicator */}
        <div className="hidden lg:flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">
          <Globe className="w-3 h-3 text-slate-400" />
          <span>EN</span>
        </div>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => {
              setRoleMenuOpen(!roleMenuOpen);
              setQuickAddOpen(false);
              setNotificationsOpen(false);
              setTenantOpen(false);
            }}
            className="flex items-center space-x-2 pl-2 pr-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
              JD
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {roleLabels[currentRole]}
              </div>
              <div className="text-[9px] text-teal-700 font-semibold uppercase tracking-wider">
                Active Role
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in duration-100">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Switch Operational Persona
              </div>
              {roles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => {
                    onRoleChange(r.role);
                    setRoleMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-start justify-between transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      {r.title}
                      {currentRole === r.role && (
                        <Check className="w-3 h-3 text-teal-600" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{r.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

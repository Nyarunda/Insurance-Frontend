import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Users,
  FileText,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  Sparkles,
  Command,
  X,
  CreditCard,
  Layers,
  Settings,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { ScreenId } from '../types';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
  onQuickAction?: (actionName: string) => void;
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onQuickAction,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickActions = [
    {
      id: 'act-quote',
      title: 'New Motor Quotation',
      subtitle: 'Create rating proposal for commercial or private motor',
      icon: PlusCircle,
      action: () => {
        onNavigate('quote-workspace');
        onClose();
      },
      badge: 'Sales',
    },
    {
      id: 'act-fnol',
      title: 'Submit FNOL First Notice of Loss',
      subtitle: 'Intake new motor or cargo collision incident',
      icon: AlertTriangle,
      action: () => {
        onNavigate('claim-workspace');
        onClose();
      },
      badge: 'Claims',
    },
    {
      id: 'act-payment',
      title: 'Receive M-Pesa / Pesalink Payment',
      subtitle: 'Reconcile C2B mobile money transaction against invoice',
      icon: CreditCard,
      action: () => {
        onNavigate('accounting-workbench');
        onClose();
      },
      badge: 'Finance',
    },
    {
      id: 'act-uw',
      title: 'Open Underwriting Referral Queue',
      subtitle: 'Review high-sum-insured requests exceeding limits',
      icon: ShieldCheck,
      action: () => {
        onNavigate('underwriting-workbench');
        onClose();
      },
      badge: 'Underwriting',
    },
  ];

  const searchRecords = [
    {
      type: 'Customer',
      id: 'CUST-23456789',
      title: 'John Kamau',
      subtitle: 'ID: 23456789 • KRA: A001928472B • 4 Active Policies',
      screen: 'customer-workspace' as ScreenId,
      icon: Users,
    },
    {
      type: 'Customer',
      id: 'CUST-ABC-9910',
      title: 'ABC Logistics Ltd',
      subtitle: 'PIN: P051294820Z • Commercial Prime Mover Fleet (12 Policies)',
      screen: 'customer-workspace' as ScreenId,
      icon: Users,
    },
    {
      type: 'Policy',
      id: 'POL/MTR/2026/001239',
      title: 'POL/MTR/2026/001239 • John Kamau',
      subtitle: 'Motor Comprehensive (Land Cruiser Prado KDJ 123A) • In Force',
      screen: 'policy-workspace' as ScreenId,
      icon: FileText,
    },
    {
      type: 'Policy',
      id: 'POL/FLEET/2026/0082',
      title: 'POL/FLEET/2026/0082 • ABC Logistics',
      subtitle: 'Commercial Fleet Haulage Umbrella • Premium KES 4.2M',
      screen: 'policy-workspace' as ScreenId,
      icon: FileText,
    },
    {
      type: 'Claim',
      id: 'CLM/MTR/2026/0081',
      title: 'CLM/MTR/2026/0081 • John Kamau',
      subtitle: 'Collision Damage Waiyaki Way • Reserve KES 450,000 • Approved',
      screen: 'claim-workspace' as ScreenId,
      icon: AlertTriangle,
    },
    {
      type: 'Quote',
      id: 'Q/MTR/2026/008291',
      title: 'Q/MTR/2026/008291 • ABC Logistics Ltd',
      subtitle: 'Mercedes Actros 3340 (KES 18.5M) • Britam / CIC / Jubilee Comparison',
      screen: 'quote-workspace' as ScreenId,
      icon: FileText,
    },
    {
      type: 'Product',
      id: 'PRD-MTR-COMP',
      title: 'Commercial Motor Comprehensive v2.4 (PRD-MTR-COMP)',
      subtitle: 'Product • 1,482 In-Force Policies • Base Rate 4.5% • KES 384M GWP',
      screen: 'product-workspace' as ScreenId,
      icon: Layers,
    },
    {
      type: 'Broker',
      id: 'BRK-00291',
      title: 'Marsh McLennan Wholesale (BRK-00291)',
      subtitle: 'Broker • 428 In-Force Policies • KES 148.5M GWP • Loss Ratio 44.2%',
      screen: 'broker-workspace' as ScreenId,
      icon: Users,
    },
    {
      type: 'Provider',
      id: 'PRV-ASSESS-0042',
      title: 'Peter Githinji (Automotive Engineers) (PRV-ASSESS-0042)',
      subtitle: 'Provider • Motor Loss Assessor • EBK/ENG/8192 • 18.2h TAT SLA',
      screen: 'provider-workspace' as ScreenId,
      icon: Users,
    },
    {
      type: 'Reinsurance',
      id: 'TRT-2026-MTR-QS',
      title: 'Commercial Motor Quota Share Treaty 2026 (TRT-2026-MTR-QS)',
      subtitle: 'Treaty • 40% Quota Share • Kenya Re / EA Re / Zep-Re • KES 250M Capacity',
      screen: 'treaty-workspace' as ScreenId,
      icon: ShieldCheck,
    },
    {
      type: 'Module',
      id: 'MOD-ACC',
      title: 'Finance & Accounting Workbench',
      subtitle: 'General Journal Entries JNL-9821 & Balanced Trial Balance',
      screen: 'accounting-workbench' as ScreenId,
      icon: CreditCard,
    },
    {
      type: 'Module',
      id: 'MOD-INT',
      title: 'Integration Hub & API Gateway',
      subtitle: 'M-Pesa, Flexcube, T24, IRA, KRA Real-Time Health',
      screen: 'integration-hub' as ScreenId,
      icon: Settings,
    },
  ];

  const filteredRecords = searchRecords.filter((rec) => {
    const term = query.toLowerCase().trim();
    if (!term) return true;
    return (
      rec.title.toLowerCase().includes(term) ||
      rec.subtitle.toLowerCase().includes(term) ||
      rec.id.toLowerCase().includes(term) ||
      rec.type.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50/70">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, policies, claims, quotes or commands... (e.g. John Kamau, Actros, M-Pesa)"
            className="w-full bg-transparent border-none text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">ESC</span>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Container */}
        <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100 p-2 text-xs">
          {/* Quick Actions if query is empty */}
          {!query && (
            <div className="py-2 px-2">
              <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-2 px-2">
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.id}
                      onClick={qa.action}
                      className="flex items-start text-left p-2.5 rounded-lg border border-slate-200/80 hover:border-teal-500 hover:bg-teal-50/40 transition-all group"
                    >
                      <div className="p-1.5 rounded-md bg-teal-100 text-teal-700 mr-2.5 shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                          {qa.title}
                          <span className="text-[9px] font-medium px-1 rounded bg-slate-100 text-slate-600">
                            {qa.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{qa.subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Record Results */}
          <div className="py-2 px-1">
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1.5 px-2">
              {query ? `Search Results (${filteredRecords.length})` : 'Recent & Suggested Records'}
            </p>
            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium text-slate-600">No matching records or commands</p>
                <p className="text-xs text-slate-400 mt-1">Try searching for &apos;Kamau&apos;, &apos;POL&apos;, &apos;Reserve&apos; or &apos;Flexcube&apos;</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredRecords.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.screen);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100/80 transition-colors group text-left"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="p-2 rounded-md bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-800 transition-colors shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 text-xs truncate flex items-center gap-2">
                            <span>{item.title}</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-sm bg-slate-200/70 text-slate-600">
                              {item.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono shadow-2xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono ml-0.5 shadow-2xs">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono shadow-2xs">↵</kbd> to select
            </span>
          </div>
          <span className="text-slate-400 font-medium">Insurance Cloud</span>
        </div>
      </div>
    </div>
  );
};

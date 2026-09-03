import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenId, UserRole, DensityMode } from './types';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { GlobalCommandPalette } from './components/GlobalCommandPalette';
import { RoleAwareDashboard } from './components/RoleAwareDashboard';
import { UniversalWorkQueue } from './components/UniversalWorkQueue';
import { Customer360 } from './components/Customer360';
import { Quote360 } from './components/Quote360';
import { Policy360 } from './components/Policy360';
import { Claims360 } from './components/Claims360';
import { UnderwritingWorkbench } from './components/UnderwritingWorkbench';
import { ProductFactoryDesigner } from './components/ProductFactoryDesigner';
import { UserPermissionsWorkflows } from './components/UserPermissionsWorkflows';
import { AccountingWorkbench } from './components/AccountingWorkbench';
import { IntegrationHub } from './components/IntegrationHub';
import { RegulatoryAdmin } from './components/RegulatoryAdmin';
import { ModuleLandingView } from './components/ModuleLandingView';
import { Broker360 } from './components/Broker360';
import { Product360 } from './components/Product360';
import { Provider360 } from './components/Provider360';
import { ReinsuranceTreaty360 } from './components/ReinsuranceTreaty360';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('underwriter-dashboard');
  const [transitionType, setTransitionType] = useState<'none' | 'push'>('none');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('underwriter');
  const [densityMode, setDensityMode] = useState<DensityMode>('comfortable');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync with browser hash if present
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ScreenId;
      const validScreens: ScreenId[] = [
        'underwriter-dashboard',
        'dashboard',
        'my-work',
        'customer-360',
        'broker-360',
        'product-360',
        'provider-360',
        'reinsurance-treaty-360',
        'quote-360',
        'policy-360',
        'claims-360',
        'underwriting-workbench',
        'product-factory-designer',
        'product-factory',
        'user-permissions-workflows',
        'accounting-workbench',
        'integration-hub',
        'regulatory-admin',
      ];
      if (validScreens.includes(hash)) {
        setCurrentScreen(hash);
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (screen: ScreenId, transition: 'none' | 'push' = 'none') => {
    setTransitionType(transition);
    setCurrentScreen(screen);
    window.location.hash = screen;
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'underwriter-dashboard':
      case 'dashboard':
      case 'reporting-operational':
      case 'reporting-financial':
      case 'reporting-claims':
      case 'reporting-underwriting':
      case 'reporting-regulatory':
      case 'reporting-bi':
        return (
          <RoleAwareDashboard
            onNavigate={handleNavigate}
            currentRole={currentRole}
            onRoleChange={setCurrentRole}
            densityMode={densityMode}
          />
        );
      case 'my-work':
      case 'notifications':
        return <UniversalWorkQueue onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'customer-360':
      case 'customers':
      case 'organizations':
      case 'leads':
      case 'kyc-compliance':
        return <Customer360 onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'broker-360':
      case 'brokers':
      case 'intermediaries':
      case 'agents':
        return <Broker360 onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'quote-360':
      case 'quotations':
      case 'applications':
      case 'bancassurance':
        return <Quote360 onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'provider-360':
        return <Provider360 onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'policy-360':
      case 'policies':
      case 'endorsements':
      case 'renewals':
      case 'cancellations':
      case 'certificates':
        return <Policy360 onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'claims-landing':
      case 'fnol':
      case 'assessments':
      case 'reserves':
      case 'settlements':
      case 'recoveries':
      case 'salvage':
        return (
          <ModuleLandingView
            module="claims"
            onNavigate={handleNavigate}
            densityMode={densityMode}
            initialTab={
              currentScreen === 'fnol'
                ? 'FNOL'
                : currentScreen === 'assessments'
                ? 'Assessment'
                : currentScreen === 'reserves'
                ? 'Validation'
                : currentScreen === 'settlements'
                ? 'Settlement'
                : 'All'
            }
          />
        );
      case 'claims-360':
      case 'claims':
        return <Claims360 onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'referrals':
      case 'risk-assessments':
      case 'inspections':
        return (
          <ModuleLandingView
            module="underwriting"
            onNavigate={handleNavigate}
            densityMode={densityMode}
            initialTab={currentScreen === 'referrals' ? 'Referred' : 'Submitted'}
          />
        );
      case 'underwriting-workbench':
        return <UnderwritingWorkbench onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'authority-doa':
      case 'admin-doa':
      case 'user-permissions-workflows':
        return <UserPermissionsWorkflows onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'product-360':
        return <Product360 onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'product-factory-designer':
      case 'product-factory':
      case 'product-studio':
      case 'product-versions':
      case 'rating':
      case 'underwriting-rules':
      case 'product-sandbox':
        return <ProductFactoryDesigner onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'reinsurance-treaty-360':
      case 'reinsurance-treaties':
        return <ReinsuranceTreaty360 onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'finance-landing':
      case 'billing':
      case 'receivables':
      case 'payments':
      case 'reconciliation':
      case 'commissions':
      case 'accounting':
      case 'accounting-workbench':
      case 'period-close':
      case 'reinsurance-facultative':
      case 'reinsurance-cessions':
      case 'reinsurance-recoveries':
      case 'reinsurance-bordereaux':
        return <AccountingWorkbench onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'integration-hub':
      case 'workflows':
      case 'background-jobs':
      case 'failed-transactions':
      case 'activity-logs':
        return <IntegrationHub onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'regulatory-admin':
      case 'admin-organization':
      case 'admin-branches':
      case 'admin-users-roles':
      case 'admin-workflows':
      case 'admin-documents':
      case 'admin-number-series':
      case 'admin-integrations':
      case 'admin-audit':
      case 'admin-subscription':
        return <RegulatoryAdmin onNavigate={handleNavigate} densityMode={densityMode} />;
      default:
        return (
          <RoleAwareDashboard
            onNavigate={handleNavigate}
            currentRole={currentRole}
            onRoleChange={setCurrentRole}
            densityMode={densityMode}
          />
        );
    }
  };

  const densityPadding =
    densityMode === 'compact' ? 'p-3 sm:p-4' : densityMode === 'spacious' ? 'p-6 sm:p-8' : 'p-4 sm:p-6';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans antialiased overflow-x-hidden">
      {/* Persistent Grouped Navigation Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <TopHeader
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          densityMode={densityMode}
          onDensityChange={setDensityMode}
        />

        <main className={`flex-1 pb-16 ${densityPadding} max-w-7xl mx-auto w-full`}>
          <AnimatePresence mode="wait">
            {transitionType === 'push' ? (
              <motion.div
                key={currentScreen}
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                {renderScreen()}
              </motion.div>
            ) : (
              <div key={currentScreen} className="w-full">
                {renderScreen()}
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Global Command Palette (⌘K) */}
      <GlobalCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

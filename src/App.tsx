import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthSession, ScreenId, UserRole, DensityMode } from './types';
import { Sidebar } from './components/Sidebar';
import { MockTopBar } from './mock/MockTopBar';
import { useMockNavGroups } from './mock/useMockNavGroups';
import { LoginPage } from './components/auth/LoginPage';
import { GlobalCommandPalette } from './components/GlobalCommandPalette';
import { GlobalModals } from './components/GlobalModals';
import { usePermissionStore, useCanAccessApplication } from './store/permissionStore';
import { recordsStore } from './data/recordsStore';
import { SCREEN_MODULE_MAP } from './data/screenModuleMap';
import { NAV_COUNTERS } from './data/navigation';
import { MODULE_LABELS } from './data/roleRights';
import { HorizonAlert, HorizonLoader, HorizonPage, HorizonPageContent, HorizonPageTitle } from './components/horizon';
import { ShellBreadcrumb } from './components/ShellBreadcrumb';
import { readDensity, readPreference, writePreference } from './store/preferences';

// Lazy-loaded: only one of these renders at a time (inside renderScreen's switch), so there's
// no reason to ship all of them in the initial bundle — each becomes its own chunk on demand.
const RoleAwareDashboard = lazy(() => import('./components/RoleAwareDashboard').then((m) => ({ default: m.RoleAwareDashboard })));
const UniversalWorkQueue = lazy(() => import('./components/UniversalWorkQueue').then((m) => ({ default: m.UniversalWorkQueue })));
const CustomerWorkspace = lazy(() => import('./components/CustomerWorkspace').then((m) => ({ default: m.CustomerWorkspace })));
const QuoteWorkspace = lazy(() => import('./components/QuoteWorkspace').then((m) => ({ default: m.QuoteWorkspace })));
const PolicyWorkspace = lazy(() => import('./components/PolicyWorkspace').then((m) => ({ default: m.PolicyWorkspace })));
const ClaimWorkspace = lazy(() => import('./components/ClaimWorkspace').then((m) => ({ default: m.ClaimWorkspace })));
const UnderwritingWorkbench = lazy(() => import('./components/UnderwritingWorkbench').then((m) => ({ default: m.UnderwritingWorkbench })));
const ProductFactoryDesigner = lazy(() => import('./components/ProductFactoryDesigner').then((m) => ({ default: m.ProductFactoryDesigner })));
const UserPermissionsWorkflows = lazy(() => import('./components/UserPermissionsWorkflows').then((m) => ({ default: m.UserPermissionsWorkflows })));
const RolePermissionsAdmin = lazy(() => import('./components/RolePermissionsAdmin').then((m) => ({ default: m.RolePermissionsAdmin })));
const MyProfilePage = lazy(() => import('./components/MyProfilePage').then((m) => ({ default: m.MyProfilePage })));
const AccountingWorkbench = lazy(() => import('./components/AccountingWorkbench').then((m) => ({ default: m.AccountingWorkbench })));
const IntegrationHub = lazy(() => import('./components/IntegrationHub').then((m) => ({ default: m.IntegrationHub })));
const RegulatoryAdmin = lazy(() => import('./components/RegulatoryAdmin').then((m) => ({ default: m.RegulatoryAdmin })));
const OrganizationAdmin = lazy(() => import('./components/OrganizationAdmin').then((m) => ({ default: m.OrganizationAdmin })));
const BranchAdmin = lazy(() => import('./components/BranchAdmin').then((m) => ({ default: m.BranchAdmin })));
const WorkflowAdmin = lazy(() => import('./components/WorkflowAdmin').then((m) => ({ default: m.WorkflowAdmin })));
const NumberSeriesAdmin = lazy(() => import('./components/NumberSeriesAdmin').then((m) => ({ default: m.NumberSeriesAdmin })));
const ModuleLandingView = lazy(() => import('./components/ModuleLandingView').then((m) => ({ default: m.ModuleLandingView })));
const BrokerWorkspace = lazy(() => import('./components/BrokerWorkspace').then((m) => ({ default: m.BrokerWorkspace })));
const ProductWorkspace = lazy(() => import('./components/ProductWorkspace').then((m) => ({ default: m.ProductWorkspace })));
const ProviderWorkspace = lazy(() => import('./components/ProviderWorkspace').then((m) => ({ default: m.ProviderWorkspace })));
const TreatyWorkspace = lazy(() => import('./components/TreatyWorkspace').then((m) => ({ default: m.TreatyWorkspace })));
const CustomersList = lazy(() => import('./components/lists/CustomersList').then((m) => ({ default: m.CustomersList })));
const LeadsList = lazy(() => import('./components/lists/LeadsList').then((m) => ({ default: m.LeadsList })));
const QuotesList = lazy(() => import('./components/lists/QuotesList').then((m) => ({ default: m.QuotesList })));
const PoliciesList = lazy(() => import('./components/lists/PoliciesList').then((m) => ({ default: m.PoliciesList })));
const ClaimsList = lazy(() => import('./components/lists/ClaimsList').then((m) => ({ default: m.ClaimsList })));
const IntermediaryList = lazy(() => import('./components/lists/IntermediaryList').then((m) => ({ default: m.IntermediaryList })));
const ProductList = lazy(() => import('./components/lists/ProductList').then((m) => ({ default: m.ProductList })));
const ProviderList = lazy(() => import('./components/lists/ProviderList').then((m) => ({ default: m.ProviderList })));
const TreatyList = lazy(() => import('./components/lists/TreatyList').then((m) => ({ default: m.TreatyList })));
const ActivityLogView = lazy(() => import('./components/lists/ActivityLogView').then((m) => ({ default: m.ActivityLogView })));
const BranchLandingPage = lazy(() => import('./components/BranchLandingPage').then((m) => ({ default: m.BranchLandingPage })));
const MessageLogs = lazy(() => import('./components/MessageLogs').then((m) => ({ default: m.MessageLogs })));

const validScreens: ScreenId[] = [
  'underwriter-dashboard',
  'dashboard',
  'my-work',
  'notifications',
  'customers',
  'organizations',
  'leads',
  'kyc-compliance',
  'intermediaries',
  'providers',
  'customer-workspace',
  'broker-workspace',
  'brokers',
  'agents',
  'product-workspace',
  'products',
  'provider-workspace',
  'treaty-workspace',
  'reinsurance-treaties',
  'quote-workspace',
  'quotations',
  'applications',
  'bancassurance',
  'policy-workspace',
  'policies',
  'endorsements',
  'renewals',
  'cancellations',
  'certificates',
  'claim-workspace',
  'claims',
  'claims-landing',
  'fnol',
  'assessments',
  'reserves',
  'settlements',
  'recoveries',
  'salvage',
  'underwriting-workbench',
  'referrals',
  'risk-assessments',
  'inspections',
  'authority-doa',
  'product-factory-designer',
  'product-factory',
  'product-studio',
  'product-versions',
  'rating',
  'underwriting-rules',
  'product-sandbox',
  'user-permissions-workflows',
  'my-profile',
  'accounting-workbench',
  'finance-landing',
  'billing',
  'receivables',
  'payments',
  'reconciliation',
  'commissions',
  'accounting',
  'period-close',
  'reinsurance-facultative',
  'reinsurance-cessions',
  'reinsurance-recoveries',
  'reinsurance-bordereaux',
  'integration-hub',
  'workflows',
  'background-jobs',
  'failed-transactions',
  'activity-logs',
  'regulatory-admin',
  'admin-organization',
  'admin-branches',
  'admin-users-roles',
  'admin-doa',
  'admin-workflows',
  'admin-documents',
  'admin-number-series',
  'admin-integrations',
  'admin-audit',
  'admin-subscription',
  'reporting-operational',
  'reporting-financial',
  'reporting-claims',
  'reporting-underwriting',
  'reporting-regulatory',
  'reporting-bi',
];

const recordRouteMap: Partial<Record<ScreenId, { screen: ScreenId; basePath: string }>> = {
  customers: { screen: 'customer-workspace', basePath: 'customers' },
  organizations: { screen: 'customer-workspace', basePath: 'customers' },
  leads: { screen: 'customer-workspace', basePath: 'customers' },
  'kyc-compliance': { screen: 'customer-workspace', basePath: 'customers' },
  quotations: { screen: 'quote-workspace', basePath: 'quotations' },
  applications: { screen: 'quote-workspace', basePath: 'quotations' },
  bancassurance: { screen: 'quote-workspace', basePath: 'quotations' },
  policies: { screen: 'policy-workspace', basePath: 'policies' },
  endorsements: { screen: 'policy-workspace', basePath: 'policies' },
  renewals: { screen: 'policy-workspace', basePath: 'policies' },
  cancellations: { screen: 'policy-workspace', basePath: 'policies' },
  certificates: { screen: 'policy-workspace', basePath: 'policies' },
  claims: { screen: 'claim-workspace', basePath: 'claims' },
  intermediaries: { screen: 'broker-workspace', basePath: 'intermediaries' },
  brokers: { screen: 'broker-workspace', basePath: 'intermediaries' },
  agents: { screen: 'broker-workspace', basePath: 'intermediaries' },
  products: { screen: 'product-workspace', basePath: 'products' },
  providers: { screen: 'provider-workspace', basePath: 'providers' },
  'reinsurance-treaties': { screen: 'treaty-workspace', basePath: 'reinsurance-treaties' },
};

const recordScreenPath: Partial<Record<ScreenId, string>> = {
  'customer-workspace': 'customers',
  'quote-workspace': 'quotations',
  'policy-workspace': 'policies',
  'claim-workspace': 'claims',
  'broker-workspace': 'intermediaries',
  'product-workspace': 'products',
  'provider-workspace': 'providers',
  'treaty-workspace': 'reinsurance-treaties',
};

const legacyScreenMap: Record<string, ScreenId> = {
  'customer-360': 'customer-workspace',
  'quote-360': 'quote-workspace',
  'policy-360': 'policy-workspace',
  'claims-360': 'claim-workspace',
  'broker-360': 'broker-workspace',
  'product-360': 'product-workspace',
  'provider-360': 'provider-workspace',
  'reinsurance-treaty-360': 'treaty-workspace',
};

const AUTH_SESSION_KEY = 'commercial-insurance-erp-auth-session';

const readAuthSession = (): AuthSession | null => {
  try {
    const rawSession = window.sessionStorage.getItem(AUTH_SESSION_KEY);
    return rawSession ? (JSON.parse(rawSession) as AuthSession) : null;
  } catch {
    return null;
  }
};

/** The mock demo (`VITE_DATA_SOURCE` unset or `mock`). Backend mode is `backend/BackendApp`. */
export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(readAuthSession);
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('underwriter-dashboard');
  const [transitionType, setTransitionType] = useState<'none' | 'push'>('none');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>(() => readAuthSession()?.role || 'underwriter');
  const [densityMode, setDensityMode] = useState<DensityMode>(readDensity);
  // Phones start with the off-canvas navigation closed; desktops restore the last rail state.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.matchMedia('(max-width: 767px)').matches || readPreference('sidebar') === 'collapsed',
  );

  const changeDensity = (mode: DensityMode) => {
    setDensityMode(mode);
    writePreference('density', mode);
  };

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    // The phone drawer opening and closing is not a preference; only the desktop rail is remembered.
    if (!window.matchMedia('(max-width: 767px)').matches) writePreference('sidebar', next ? 'collapsed' : 'expanded');
  };
  const [currentRecordId, setCurrentRecordId] = useState<string | undefined>();
  const navGroups = useMockNavGroups();

  const handleAuthenticated = (session: AuthSession) => {
    window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    setAuthSession(session);
    setCurrentRole(session.role);
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    setAuthSession(null);
    setCommandPaletteOpen(false);
    usePermissionStore.getState().reset();
  };

  // Re-initialize the permission store whenever the active Role Center changes.
  // Layers the signed-in user's individual overrides on top of their Role Center defaults.
  useEffect(() => {
    if (authSession) {
      const matchedUser = recordsStore.getUserByEmail(authSession.email);
      usePermissionStore.getState().initialize(currentRole, matchedUser?.id ?? null);
    }
  }, [authSession, currentRole]);

  // Route guard: the sidebar only *links* to what a Role Center can see, but a screen reached
  // by hash, a stale bookmark, or a quick-link must be blocked here too, not just hidden in the nav.
  const requiredModuleForScreen = SCREEN_MODULE_MAP[currentScreen];
  const hasRequiredModuleAccess = useCanAccessApplication(requiredModuleForScreen ?? 'customers');
  const isScreenBlocked = !!requiredModuleForScreen && !hasRequiredModuleAccess;

  // Defensive clamp: never leave the active Role Center on something this account isn't assigned
  useEffect(() => {
    if (!authSession) return;
    const assigned = authSession.assignedRoleCenters?.length ? authSession.assignedRoleCenters : [authSession.role];
    if (!assigned.includes(currentRole)) {
      setCurrentRole(assigned[0]);
    }
  }, [authSession, currentRole]);

  // Sync with browser hash if present
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const [rawScreen, ...recordParts] = hash.split('/');
      const requestedScreen = (legacyScreenMap[rawScreen] || rawScreen) as ScreenId;
      const recordId = recordParts.length > 0 ? decodeURIComponent(recordParts.join('/')) : undefined;

      if (recordId && recordRouteMap[requestedScreen]) {
        setCurrentScreen(recordRouteMap[requestedScreen]!.screen);
        setCurrentRecordId(recordId);
        return;
      }

      if (validScreens.includes(requestedScreen)) {
        setCurrentScreen(requestedScreen);
        setCurrentRecordId(recordId);
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

  const handleNavigate = (screen: ScreenId, transition: 'none' | 'push' = 'none', recordId?: string) => {
    setTransitionType(transition);
    const targetScreen = recordId && recordRouteMap[screen] ? recordRouteMap[screen]!.screen : screen;
    setCurrentScreen(targetScreen);
    setCurrentRecordId(recordId);

    const basePath = recordId ? recordRouteMap[screen]?.basePath || recordScreenPath[targetScreen] || targetScreen : screen;
    window.location.hash = recordId ? `${basePath}/${encodeURIComponent(recordId)}` : basePath;
  };

  const renderScreen = () => {
    if (isScreenBlocked && requiredModuleForScreen) {
      return (
        <HorizonPage id="access-restricted-view">
          <HorizonPageTitle title="Access Restricted" subtitle="Permissions" onBack={() => setCurrentScreen('dashboard')} />
          <HorizonPageContent className="p-6">
            <HorizonAlert tone="warning" title={`No access to ${MODULE_LABELS[requiredModuleForScreen]}`}>
              Your current Role Center doesn't have view rights for this area. Ask an administrator to grant access in
              Delegation of Authority, or switch to a Role Center that does.
            </HorizonAlert>
          </HorizonPageContent>
        </HorizonPage>
      );
    }

    switch (currentScreen) {
      case 'underwriter-dashboard':
      case 'dashboard':
        return (
          <RoleAwareDashboard
            onNavigate={handleNavigate}
            currentRole={currentRole}
            onRoleChange={setCurrentRole}
            densityMode={densityMode}
            assignedRoleCenters={authSession?.assignedRoleCenters}
          />
        );
      case 'reporting-operational':
      case 'reporting-financial':
      case 'reporting-claims':
      case 'reporting-underwriting':
      case 'reporting-regulatory':
      case 'reporting-bi':
        return <BranchLandingPage key={currentScreen} screenId={currentScreen} onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'my-work':
      case 'notifications':
        return (
          <UniversalWorkQueue
            onNavigate={handleNavigate}
            densityMode={densityMode}
            currentRole={currentRole}
            sessionUser={authSession}
          />
        );
      case 'customer-workspace':
        return <CustomerWorkspace onNavigate={handleNavigate} densityMode={densityMode} recordId={currentRecordId} />;
      case 'customers':
        return <CustomersList onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'organizations':
        return <CustomersList onNavigate={handleNavigate} densityMode={densityMode} scope="organizations" />;
      case 'kyc-compliance':
        return <CustomersList onNavigate={handleNavigate} densityMode={densityMode} scope="kyc" />;
      case 'leads':
        return <LeadsList onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'broker-workspace':
        return <BrokerWorkspace onNavigate={handleNavigate} densityMode={densityMode} recordId={currentRecordId} />;
      case 'brokers':
      case 'intermediaries':
      case 'agents':
        return <IntermediaryList onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'quote-workspace':
        return <QuoteWorkspace onNavigate={handleNavigate} densityMode={densityMode} recordId={currentRecordId} />;
      case 'quotations':
      case 'applications':
      case 'bancassurance':
        return <QuotesList onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'provider-workspace':
        return <ProviderWorkspace onNavigate={handleNavigate} densityMode={densityMode} recordId={currentRecordId} />;
      case 'providers':
        return <ProviderList onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'policy-workspace':
        return <PolicyWorkspace onNavigate={handleNavigate} densityMode={densityMode} recordId={currentRecordId} />;
      case 'policies':
      case 'endorsements':
      case 'renewals':
      case 'cancellations':
      case 'certificates':
        return <PoliciesList onNavigate={handleNavigate} densityMode={densityMode} />;
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
      case 'claim-workspace':
        return <ClaimWorkspace onNavigate={handleNavigate} densityMode={densityMode} recordId={currentRecordId} />;
      case 'claims':
        return <ClaimsList onNavigate={handleNavigate} densityMode={densityMode} />;
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
      case 'admin-users-roles':
      case 'user-permissions-workflows':
        return <UserPermissionsWorkflows onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'authority-doa':
      case 'admin-doa':
        return <RolePermissionsAdmin onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'product-workspace':
        return <ProductWorkspace onNavigate={handleNavigate} densityMode={densityMode} recordId={currentRecordId} />;
      case 'products':
        return <ProductList onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'product-factory-designer':
      case 'product-factory':
      case 'product-studio':
        return <ProductFactoryDesigner onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'rating':
        return <ProductFactoryDesigner key={currentScreen} onNavigate={handleNavigate} densityMode={densityMode} initialLayer="rating" />;
      case 'product-sandbox':
        return <ProductFactoryDesigner key={currentScreen} onNavigate={handleNavigate} densityMode={densityMode} initialLayer="testlab" />;
      case 'underwriting-rules':
        return <BranchLandingPage key={currentScreen} screenId={currentScreen} onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'product-versions':
        return <ProductList onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'treaty-workspace':
        return <TreatyWorkspace onNavigate={handleNavigate} densityMode={densityMode} recordId={currentRecordId} />;
      case 'reinsurance-treaties':
        return <TreatyList onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'finance-landing':
      case 'billing':
      case 'receivables':
      case 'payments':
      case 'commissions':
      case 'reinsurance-facultative':
      case 'reinsurance-cessions':
      case 'reinsurance-recoveries':
        return <BranchLandingPage key={currentScreen} screenId={currentScreen} onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'accounting':
      case 'accounting-workbench':
      case 'period-close':
        return (
          <AccountingWorkbench
            key={currentScreen}
            onNavigate={handleNavigate}
            densityMode={densityMode}
            initialTab="trial-balance"
            sessionUser={authSession}
            currentRole={currentRole}
          />
        );
      case 'reconciliation':
        return (
          <AccountingWorkbench
            key={currentScreen}
            onNavigate={handleNavigate}
            densityMode={densityMode}
            initialTab="recon"
            sessionUser={authSession}
            currentRole={currentRole}
          />
        );
      case 'reinsurance-bordereaux':
        return (
          <AccountingWorkbench
            key={currentScreen}
            onNavigate={handleNavigate}
            densityMode={densityMode}
            initialTab="reinsurance"
            sessionUser={authSession}
            currentRole={currentRole}
          />
        );
      case 'integration-hub':
        return <IntegrationHub onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'workflows':
      case 'admin-workflows':
        return <WorkflowAdmin onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'background-jobs':
        return <BranchLandingPage key={currentScreen} screenId={currentScreen} onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'failed-transactions':
        return <MessageLogs densityMode={densityMode} />;
      case 'activity-logs':
      case 'admin-audit':
        return <ActivityLogView onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'regulatory-admin':
        return <RegulatoryAdmin onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'admin-documents':
      case 'admin-subscription':
        return <BranchLandingPage key={currentScreen} screenId={currentScreen} onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'admin-number-series':
        return <NumberSeriesAdmin onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'admin-integrations':
        return <IntegrationHub onNavigate={handleNavigate} densityMode={densityMode} mode="admin" />;
      case 'admin-branches':
        return <BranchAdmin onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'admin-organization':
        return <OrganizationAdmin onNavigate={handleNavigate} densityMode={densityMode} />;
      case 'my-profile':
        return <MyProfilePage onNavigate={handleNavigate} sessionUser={authSession} />;
      default:
        return (
          <RoleAwareDashboard
            onNavigate={handleNavigate}
            currentRole={currentRole}
            onRoleChange={setCurrentRole}
            densityMode={densityMode}
            assignedRoleCenters={authSession?.assignedRoleCenters}
          />
        );
    }
  };

  const densityPadding =
    densityMode === 'compact' ? 'px-4 pt-3' : densityMode === 'spacious' ? 'px-6 pt-5' : 'px-5 pt-4';

  if (!authSession) {
    return <LoginPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className={`h-screen bg-[var(--hz-bg-app)] text-[var(--hz-text-primary)] flex flex-col font-sans antialiased overflow-hidden density-${densityMode}`}>
      {/* Global full-width top bar: brand, sidebar toggle, search, notifications, account */}
      <MockTopBar
        onNavigate={handleNavigate}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onToggleSidebar={toggleSidebar}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        densityMode={densityMode}
        onDensityChange={changeDensity}
        sessionUser={authSession}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Persistent Grouped Navigation Sidebar */}
        <Sidebar
          groups={navGroups}
          counters={NAV_COUNTERS}
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
          <ShellBreadcrumb currentScreen={currentScreen} recordId={currentRecordId} onNavigate={handleNavigate} />

          <main className={`flex-1 pb-10 ${densityPadding} w-full`}>
            <Suspense
              fallback={
                <div className="flex min-h-[calc(100vh-var(--hz-topbar-height)-64px)] items-center justify-center">
                  <HorizonLoader tip="Loading screen..." />
                </div>
              }
            >
              <div key={currentScreen} className={transitionType === 'push' ? 'w-full hz-screen-enter' : 'w-full'}>
                {renderScreen()}
              </div>
            </Suspense>
          </main>
        </div>
      </div>

      {/* Global Command Palette (⌘K) */}
      <GlobalCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Globally-mounted modals, triggered from anywhere via useModalWrapper */}
      <GlobalModals />
    </div>
  );
}

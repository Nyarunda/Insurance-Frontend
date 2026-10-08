/**
 * The Horizon shell in backend mode: the same top bar, sidebar and breadcrumb as the demo, fed
 * from `/me` and the branch context instead of mock records.
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { GlobalTopBar } from '../../components/GlobalTopBar';
import { HorizonAlert, HorizonLoader } from '../../components/horizon';
import { ShellBreadcrumb } from '../../components/ShellBreadcrumb';
import { Sidebar } from '../../components/Sidebar';
import { userInitials } from '../../components/GlobalTopBar';
import { readDensity, readPreference, writePreference } from '../../store/preferences';
import type { DensityMode, ScreenId } from '../../types';
import { useBranchStore } from '../../lib/context/branchStore';
import { hasPermission, ME_QUERY_KEY, useMe } from '../../lib/auth/me';
import { TASK_VIEW } from '../permissions';
import { useWorkQueue } from '../workflow/queries';
import { ApprovalReminder } from './ApprovalReminder';
import { signOut } from '../../lib/auth/session';
import { queryClient } from '../../lib/query/queryClient';
import { BACKEND_NAV, pathForScreen, screenForPath, visibleNav } from '../navigation';
import { ApiErrorAlert } from '../components/ApiErrorAlert';

const MOBILE_QUERY = '(max-width: 767px)';

export const BackendShell: React.FC = () => {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const branches = useBranchStore((state) => state.branches);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const branchNotice = useBranchStore((state) => state.notice);

  const [densityMode, setDensityMode] = useState<DensityMode>(readDensity);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.matchMedia(MOBILE_QUERY).matches || readPreference('sidebar') === 'collapsed',
  );

  // `/me` is refetched on focus; keep the branch context in step with what it lists now.
  const meData = me.data;
  useEffect(() => {
    if (meData) useBranchStore.getState().hydrate(meData.user.id, meData.branches);
  }, [meData]);

  // The branch is sent with every request, so screens reload when it changes. `/me` does not depend on it.
  useEffect(
    () =>
      useBranchStore.subscribe((state, previous) => {
        if (state.activeBranchId !== previous.activeBranchId) {
          void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== ME_QUERY_KEY[0] });
        }
      }),
    [],
  );

  const groups = useMemo(() => visibleNav(BACKEND_NAV, meData?.permissions ?? []), [meData]);
  const currentScreen: ScreenId = screenForPath(location.pathname) ?? 'dashboard';

  const onNavigate = (screen: ScreenId) => {
    const path = pathForScreen(screen);
    if (path) navigate(path);
  };

  // An approver's queue (no polling: focus, Refresh and invalidation refresh it) gives the
  // navigation its count and announces tasks that arrived since the last answer.
  const canDecide = hasPermission(me.data, TASK_VIEW);
  // NTF-1: an approver's queue is refreshed every minute while the window is visible.
  const queue = useWorkQueue(canDecide, { poll: true });

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    if (!window.matchMedia(MOBILE_QUERY).matches) writePreference('sidebar', next ? 'collapsed' : 'expanded');
  };

  const changeDensity = (mode: DensityMode) => {
    setDensityMode(mode);
    writePreference('density', mode);
  };

  if (!meData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--hz-bg-app)] px-5">
        {me.isError ? <ApiErrorAlert error={me.error} title="Your account could not be loaded" /> : <HorizonLoader tip="Loading your account..." />}
      </div>
    );
  }

  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const densityPadding = densityMode === 'compact' ? 'px-4 py-4' : densityMode === 'spacious' ? 'px-6 py-8 md:px-8' : 'p-4 md:p-6';

  return (
    <div
      className={`h-screen bg-[var(--hz-bg-app)] text-[var(--hz-text-primary)] flex font-sans antialiased overflow-hidden density-${densityMode}`}
    >
      <Sidebar
        groups={groups}
        currentScreen={currentScreen}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        brand={{ title: 'Insurance Cloud', subtitle: meData.tenant.name }}
        footer={(rail) => <SidebarUser email={meData.user.email} branch={activeBranch?.name} rail={rail} />}
        counters={canDecide && queue.data ? { pending_tasks: queue.data.results.length } : undefined}
      />
      {canDecide && <ApprovalReminder tasks={queue.data?.results} />}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <GlobalTopBar
          onNavigate={onNavigate}
          onToggleSidebar={toggleSidebar}
          showBrand={false}
          tenant={{ name: meData.tenant.name }}
          branch={{
            label: activeBranch?.name ?? (branches.length ? 'All my branches' : 'No branch assigned'),
            heading: 'Branch context',
            options: branches.map((branch) => ({ id: branch.id, name: branch.name, detail: branch.code })),
            activeId: activeBranchId,
            onSelect: (branchId) => useBranchStore.getState().select(branchId),
            allLabel: branches.length > 1 ? 'All my branches' : undefined,
            emptyText: 'No branch is assigned to you.',
          }}
          user={{ name: meData.user.email, email: meData.user.email }}
          densityMode={densityMode}
          onDensityChange={changeDensity}
          onLogout={() => void signOut()}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <main className={`mx-auto w-full max-w-screen-2xl flex-1 pb-10 ${densityPadding}`}>
            <ShellBreadcrumb groups={groups} currentScreen={currentScreen} onNavigate={onNavigate} variant="inline" />
            {branchNotice === 'BRANCH_REJECTED' && (
              <div className="mb-4" role="status">
                <HorizonAlert
                  tone="warning"
                  title="Branch selection cleared"
                  action={
                    <button
                      type="button"
                      className="text-[13px] font-medium text-[var(--hz-primary-700)] underline-offset-4 hover:underline"
                      onClick={() => useBranchStore.getState().dismissNotice()}
                    >
                      Dismiss
                    </button>
                  }
                >
                  The server did not accept the selected branch for your account. Choose a branch again from the top bar.
                </HorizonAlert>
              </div>
            )}
            <Suspense fallback={<HorizonLoader tip="Loading screen..." />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
};

/** The signed-in user at the foot of the sidebar, as in the template. Actions live in the account menu. */
const SidebarUser: React.FC<{ email: string; branch?: string; rail: boolean }> = ({ email, branch, rail }) => (
  <div className={`flex items-center gap-2 rounded-md p-1.5 ${rail ? 'justify-center' : ''}`} title={email}>
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--hz-surface-main)] text-[13px] font-semibold ring-1 ring-[var(--hz-sidebar-border)]" aria-hidden>
      {userInitials(email)}
    </span>
    {!rail && (
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-medium">{email.split('@')[0]}</span>
        <span className="block truncate text-[13px] text-[var(--hz-sidebar-muted)]">{branch ?? email}</span>
      </span>
    )}
  </div>
);

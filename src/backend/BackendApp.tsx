/**
 * Backend mode (`VITE_DATA_SOURCE=backend`, FI1-A): the router, the query cache and the session.
 *
 * Nothing in this tree imports the mock records (`data/mockData`, `data/recordsStore`) or the
 * mock authorization (`store/permissionStore`, `data/roleRights`); `tests/modeIsolation.test.ts`
 * fails the build's tests if it ever does.
 */

import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { queryClient } from '../lib/query/queryClient';
import { restoreSession } from '../lib/auth/session';
import { useSessionStore } from '../lib/auth/sessionStore';
import { SignInPage } from './auth/SignInPage';
import { HomePage, NotFoundPage } from './pages/HomePage';
import { EndorsementCreatePage } from './pages/EndorsementCreatePage';
import { PolicyRefRoute } from './policies/refs';
import { EndorsementPage } from './pages/EndorsementPage';
import { InstancePage } from './pages/InstancePage';
import { PoliciesPage } from './pages/PoliciesPage';
import { PolicyWorkspacePage } from './pages/PolicyWorkspacePage';
import { WorkQueuePage } from './pages/WorkQueuePage';
import { ENDORSEMENT_CREATE, POLICY_VIEW, TASK_VIEW } from './permissions';
import { RequirePermission, RequireSession, SignedOutOnly } from './routing';
import { BackendShell } from './shell/BackendShell';

export const backendRoutes: RouteObject[] = [
  {
    path: '/sign-in',
    element: (
      <SignedOutOnly>
        <SignInPage />
      </SignedOutOnly>
    ),
  },
  {
    path: '/',
    element: (
      <RequireSession>
        <BackendShell />
      </RequireSession>
    ),
    children: [
      { index: true, element: <HomePage /> },
      // Lists live at `/<module>/list`; the module's own address and the old ones lead there.
      { path: 'my-work', element: <ToList to="/my-work/list" /> },
      // A record outside its list (`/my-work/<id>`, an older address) moves under it.
      { path: 'my-work/:record/*', element: <IntoList /> },
      {
        path: 'my-work/list',
        element: (
          <RequirePermission permission={TASK_VIEW}>
            <WorkQueuePage />
          </RequirePermission>
        ),
      },
      {
        path: 'my-work/list/:instanceId',
        element: (
          <RequirePermission permission={TASK_VIEW}>
            <div inert aria-hidden="true">
              <WorkQueuePage />
            </div>
            <InstancePage />
          </RequirePermission>
        ),
      },
      { path: 'policies', element: <ToList to="/policies/list" /> },
      // A record outside its list (`/policies/POL0000001/…`, an older address) moves under it.
      { path: 'policies/:record/*', element: <IntoList /> },
      {
        path: 'policies/list',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <PoliciesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'policies/list/:policyId',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <PolicyRefRoute>
              <PolicyWorkspacePage />
            </PolicyRefRoute>
          </RequirePermission>
        ),
      },
      {
        path: 'policies/list/:policyId/endorsements/new',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <RequirePermission permission={ENDORSEMENT_CREATE}>
              <PolicyRefRoute>
                <div inert aria-hidden="true">
                  <PolicyWorkspacePage tab="endorsements" />
                </div>
                <EndorsementCreatePage />
              </PolicyRefRoute>
            </RequirePermission>
          </RequirePermission>
        ),
      },
      {
        path: 'policies/list/:policyId/endorsements/:endorsementId/edit',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <RequirePermission permission={ENDORSEMENT_CREATE}>
              <PolicyRefRoute>
                <div inert aria-hidden="true">
                  <PolicyWorkspacePage tab="endorsements" />
                </div>
                <EndorsementCreatePage mode="edit" />
              </PolicyRefRoute>
            </RequirePermission>
          </RequirePermission>
        ),
      },
      {
        path: 'policies/list/:policyId/endorsements/:endorsementId',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <PolicyRefRoute>
              <div inert aria-hidden="true">
                <PolicyWorkspacePage tab="endorsements" />
              </div>
              <EndorsementPage />
            </PolicyRefRoute>
          </RequirePermission>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

/** Redirects to a list, keeping the query (filters, page). */
function ToList({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}

/** `/policies/POL0000001/endorsements/…` → `/policies/list/POL0000001/endorsements/…`. */
function IntoList() {
  const { pathname, search } = useLocation();
  // Already under a list and still unmatched: not a page, and never moved again (no redirect loop).
  if (pathname.split('/')[2] === 'list') return <NotFoundPage />;
  return <Navigate to={{ pathname: pathname.replace(/^\/([\w-]+)\//, '/$1/list/'), search }} replace />;
}

const router = createBrowserRouter(backendRoutes);

export const BackendApp: React.FC = () => {
  useEffect(() => {
    if (useSessionStore.getState().status === 'idle') void restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

/**
 * Backend mode (`VITE_DATA_SOURCE=backend`, FI1-A): the router, the query cache and the session.
 *
 * Nothing in this tree imports the mock records (`data/mockData`, `data/recordsStore`) or the
 * mock authorization (`store/permissionStore`, `data/roleRights`); `tests/modeIsolation.test.ts`
 * fails the build's tests if it ever does.
 */

import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { queryClient } from '../lib/query/queryClient';
import { restoreSession } from '../lib/auth/session';
import { useSessionStore } from '../lib/auth/sessionStore';
import { SignInPage } from './auth/SignInPage';
import { HomePage, NotFoundPage } from './pages/HomePage';
import { EndorsementCreatePage } from './pages/EndorsementCreatePage';
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
      {
        path: 'my-work',
        element: (
          <RequirePermission permission={TASK_VIEW}>
            <WorkQueuePage />
          </RequirePermission>
        ),
      },
      {
        path: 'my-work/:instanceId',
        element: (
          <RequirePermission permission={TASK_VIEW}>
            <div inert aria-hidden="true">
              <WorkQueuePage />
            </div>
            <InstancePage />
          </RequirePermission>
        ),
      },
      {
        path: 'policies',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <PoliciesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'policies/:policyId',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <PolicyWorkspacePage />
          </RequirePermission>
        ),
      },
      {
        path: 'policies/:policyId/endorsements/new',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <RequirePermission permission={ENDORSEMENT_CREATE}>
              <div inert aria-hidden="true">
                <PolicyWorkspacePage tab="endorsements" />
              </div>
              <EndorsementCreatePage />
            </RequirePermission>
          </RequirePermission>
        ),
      },
      {
        path: 'policies/:policyId/endorsements/:endorsementId',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <EndorsementPage />
          </RequirePermission>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

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

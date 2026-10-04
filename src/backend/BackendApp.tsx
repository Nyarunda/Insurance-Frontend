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
import { RequireSession, SignedOutOnly } from './routing';
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

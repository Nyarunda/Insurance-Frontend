/**
 * Route protection (FI1-A). Unauthenticated visits go to sign-in and come back afterwards; a
 * route the caller's permissions do not allow shows a permission state. The backend remains the
 * authority on every call.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { HorizonAlert, HorizonLoader, HorizonPage, HorizonPageContent, HorizonPageTitle } from '../components/horizon';
import { hasPermission, useMe } from '../lib/auth/me';
import { restoreSession } from '../lib/auth/session';
import { useSessionStore } from '../lib/auth/sessionStore';
import { ApiErrorAlert } from './components/ApiErrorAlert';

export const FullPageLoader: React.FC<{ tip: string }> = ({ tip }) => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--hz-bg-app)]">
    <HorizonLoader tip={tip} />
  </div>
);

const SessionUnavailable: React.FC = () => {
  const reason = useSessionStore((state) => state.unavailableReason);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--hz-bg-app)] px-5">
      <div className="w-full max-w-[430px] space-y-3">
        <HorizonAlert tone="danger" title="Insurance Cloud is not reachable">
          {reason ?? 'The session could not be restored.'}
        </HorizonAlert>
        <button type="button" className="hz-button hz-button-primary w-full h-10" onClick={() => void restoreSession()}>
          Try again
        </button>
      </div>
    </div>
  );
};

export interface FromState {
  from?: string;
}

/** Only for a signed-in user; anyone else is sent to sign-in and returned here afterwards. */
export const RequireSession: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const status = useSessionStore((state) => state.status);
  const location = useLocation();
  if (status === 'idle' || status === 'restoring') return <FullPageLoader tip="Restoring your session..." />;
  if (status === 'unavailable') return <SessionUnavailable />;
  if (status !== 'signed-in') {
    return <Navigate to="/sign-in" replace state={{ from: `${location.pathname}${location.search}` } satisfies FromState} />;
  }
  return <>{children}</>;
};

/** The sign-in page, unless the user is already signed in. */
export const SignedOutOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const status = useSessionStore((state) => state.status);
  const location = useLocation();
  if (status === 'idle' || status === 'restoring') return <FullPageLoader tip="Restoring your session..." />;
  if (status === 'signed-in') {
    const from = (location.state as FromState | null)?.from;
    return <Navigate to={from && from.startsWith('/') && !from.startsWith('/sign-in') ? from : '/'} replace />;
  }
  return <>{children}</>;
};

export const PermissionState: React.FC<{ permission: string }> = ({ permission }) => (
  <HorizonPage id="permission-state">
    <HorizonPageTitle title="Access restricted" subtitle="Permissions" />
    <HorizonPageContent className="p-6">
      <HorizonAlert tone="warning" title="You do not have access to this screen">
        It needs the permission <span className="font-mono">{permission}</span>. Ask your administrator if you need it.
      </HorizonAlert>
    </HorizonPageContent>
  </HorizonPage>
);

/** Shows the screen only when `/me.permissions` holds the permission. */
export const RequirePermission: React.FC<{ permission: string; children: React.ReactNode }> = ({ permission, children }) => {
  const me = useMe();
  if (me.isPending) return <HorizonLoader tip="Loading..." />;
  if (me.isError) return <ApiErrorAlert error={me.error} title="Your access could not be loaded" />;
  if (!hasPermission(me.data, permission)) return <PermissionState permission={permission} />;
  return <>{children}</>;
};

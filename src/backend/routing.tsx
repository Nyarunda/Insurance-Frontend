/**
 * Route protection (FI1-A). Unauthenticated visits go to sign-in and come back afterwards; a
 * route the caller's permissions do not allow shows a permission state. The backend remains the
 * authority on every call.
 */

import React from 'react';
import { ArrowLeft, CloudOff, House, LockKeyhole, RotateCw } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { CodeChip, HorizonLoader, HorizonPage, HorizonPageTitle, StatusScreen } from '../components/horizon';
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
      <div className="w-full max-w-[460px]">
        <StatusScreen
          icon={CloudOff}
          tone="danger"
          title="Insurance Cloud is not reachable"
          description={reason ?? 'The session could not be restored.'}
          actions={
            <button type="button" className="hz-button hz-button-primary" onClick={() => void restoreSession()}>
              <RotateCw className="h-3.5 w-3.5" />
              Try again
            </button>
          }
        />
      </div>
    </div>
  );
};

export interface FromState {
  from?: string;
}

/**
 * Where to go after signing in: an internal path only. Scheme-relative (`//host`) and backslash
 * forms, which a browser may treat as another origin, and the sign-in page itself fall back to `/`.
 */
export function safeReturnPath(from: unknown): string {
  if (typeof from !== 'string' || !from.startsWith('/')) return '/';
  if (from.startsWith('//') || from.includes('\\')) return '/';
  if (from === '/sign-in' || from.startsWith('/sign-in/') || from.startsWith('/sign-in?')) return '/';
  return from;
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
    return <Navigate to={safeReturnPath((location.state as FromState | null)?.from)} replace />;
  }
  return <>{children}</>;
};

export const PermissionState: React.FC<{ permission: string }> = ({ permission }) => {
  const navigate = useNavigate();
  return (
    <HorizonPage id="permission-state">
      <HorizonPageTitle title="Access restricted" />
      <StatusScreen
        icon={LockKeyhole}
        tone="warning"
        title="You do not have access to this screen"
        description="Your account does not hold the permission this screen needs. Ask your administrator if you need it."
        detail={
          <span className="inline-flex flex-wrap items-center justify-center gap-2 text-[13px] text-[var(--hz-text-muted)]">
            Needs
            <CodeChip>{permission}</CodeChip>
          </span>
        }
        actions={
          <>
            <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Go back
            </button>
            <button type="button" className="hz-button hz-button-primary" onClick={() => navigate('/')}>
              <House className="h-3.5 w-3.5" />
              Go to Home
            </button>
          </>
        }
      />
    </HorizonPage>
  );
};

/** Shows the screen only when `/me.permissions` holds the permission. */
export const RequirePermission: React.FC<{ permission: string; children: React.ReactNode }> = ({ permission, children }) => {
  const me = useMe();
  if (me.isPending) return <HorizonLoader tip="Loading..." />;
  if (me.isError) return <ApiErrorAlert error={me.error} title="Your access could not be loaded" />;
  if (!hasPermission(me.data, permission)) return <PermissionState permission={permission} />;
  return <>{children}</>;
};

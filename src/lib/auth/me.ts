/**
 * `GET /auth/me`: who is signed in, at which tenant, with which permissions and branches. The
 * permissions only shape the interface; every API call is checked again by the backend.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../api/instance';
import type { BranchOption } from '../context/branchStore';
import { useSessionStore } from './sessionStore';

export interface Me {
  user: { id: string; email: string };
  tenant: { id: string; name: string };
  permissions: string[];
  branches: BranchOption[];
}

export const ME_QUERY_KEY = ['auth', 'me'] as const;

export const fetchMe = async (): Promise<Me> => (await api.request<Me>('/auth/me')).data;

/** Refetched when the user returns to the tab after this long, so permission and branch changes show promptly. */
export const ME_STALE_MS = 10_000;

export function useMe() {
  const signedIn = useSessionStore((state) => state.status === 'signed-in');
  return useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, enabled: signedIn, staleTime: ME_STALE_MS });
}

export const hasPermission = (me: Pick<Me, 'permissions'> | undefined, code: string): boolean =>
  !!me && me.permissions.includes(code);

export function usePermission(code: string): boolean {
  return hasPermission(useMe().data, code);
}

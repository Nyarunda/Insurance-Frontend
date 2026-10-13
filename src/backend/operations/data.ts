import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { useMe } from '../../lib/auth/me';
import { useBranchStore } from '../../lib/context/branchStore';

export function useOperationsScope() {
  const me = useMe().data;
  const branch = useBranchStore(s => s.activeBranchId);
  return [me?.tenant.id ?? '', me?.user.id ?? '', branch ?? ''].join(':');
}

export const operationsKey = (scope: string, path: string) => ['operations', scope, path] as const;

export function useOperationsQuery<T>(path: string, enabled = true) {
  const scope = useOperationsScope();
  const me = useMe().data;
  return useQuery({
    queryKey: operationsKey(scope, path),
    queryFn: async ({ signal }) => (await api.request<T>(path, { signal })).data,
    enabled: enabled && !!me,
    staleTime: 10_000,
  });
}

export function useOperationsResultQuery<T>(path: string, enabled = true) {
  const scope = useOperationsScope();
  const me = useMe().data;
  return useQuery({
    queryKey: operationsKey(scope, `result:${path}`),
    queryFn: ({ signal }) => api.request<T>(path, { signal }),
    enabled: enabled && !!me,
    staleTime: 10_000,
  });
}

/** A form owns its command key and in-flight lock; unrelated forms remain usable. */
export function useOperationsCommand() {
  const cache = useQueryClient();
  const scope = useOperationsScope();
  const keys = useRef(new CommandKeyLifecycle());
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function run<T>(path: string, body: object, method: 'POST' | 'PATCH' | 'PUT' = 'POST', ifMatch?: string): Promise<T | undefined> {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await sendCommand<T>(api, keys.current, { type: `${method}:${path}`, resource: path, body }, { path, method, ifMatch });
      keys.current.reset();
      // The commit already succeeded. A slow or failed refetch must not invite a duplicate submission.
      void cache.invalidateQueries({ queryKey: ['operations', scope] });
      void cache.invalidateQueries({ queryKey: ['auth', 'me'] });
      return mounted.current ? result.data : undefined;
    } catch (failure) {
      if (mounted.current) setError(failure);
      return undefined;
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return { run, pending, error };
}

export interface PageResult<T> { results: T[]; count: number; page: number; page_size: number }
export interface Branch { id: string; code: string; name: string }
export interface Member {
  user_id: string; email: string; status: string; profile_status: string; identity_active: boolean;
  member_from: string; member_to: string | null; default_branch: Branch | null;
  roles: { name: string; code: string | null; scope: string; branch_code: string | null }[];
  branch_access: { scope: string; branch_code: string; branch_name: string }[];
}
export interface Permission { id: string; code: string; module: string; description: string; grantable?: boolean; reserved?: boolean }
export interface Role { id: string; name: string; code: string | null; description: string; origin: string; editable: boolean; permissions?: Permission[]; requires_approval?: boolean }
export interface UserOptions { branches: Branch[]; roles: Role[]; permissions: Permission[] }
export interface Assignment { id: string; role_id?: string; branch_id?: string | null; name: string; code: string; scope: string; branch_name?: string; effective_from: string; effective_to: string | null }
export interface Proposal { id: string; name?: string; permission_code?: string; action: string; reason: string; status: string; proposed_by: string; scope?: string; branch_name?: string; workflow?: { instance_id: string; status: string; stage_label: string | null } | null }
export interface UserAccess {
  branches: Assignment[]; roles: Assignment[];
  overrides: { id: string; code: string; effect: string; reason: string; effective_from: string; effective_to: string | null }[];
  proposals: Proposal[];
}
export interface Invitation { id: string; email: string; default_branch: Branch; status: string; expires_at: string; secret?: string }
export interface SubscriptionInfo {
  plan: { code: string; name: string; modules: string[]; max_users: number | null } | null;
  subscription: { status: string; start_date: string; end_date: string | null } | null;
  usage: { active_members: number } | null;
}
export interface BillingAccount { id: string; code: string; name: string; kind: string; currency: string; external_mapping: string; is_active: boolean; row_version: number; etag: string }
export interface Receipt {
  id: string; receipt_no: string; customer_id: string; customer_name: string; amount: string; currency: string;
  payment_method: string; payment_reference: string; payment_date: string; status: string; created_by: string;
  reversal_of_receipt_id: string | null; reversal_reason: string;
  allocations: { id: string; policy_id: string; policy_no: string; amount: string; account_id: string }[];
}
export interface ReceiptPolicy { id: string; policy_no: string; customer_id: string; customer_name: string; branch_id: string; branch_name: string; currency: string }

/**
 * Renewal commands (RENEWALS-SURFACE-1 RS-A), through the FI1-A idempotency lifecycle:
 *
 * - prepare: `POST /policies/{id}/renewals` with the **policy's** ETag (the source is the version seen);
 * - dates:   `PATCH /renewals/{id}` with the renewal's ETag (it returns to DRAFT; price and approval lapse);
 * - amend:   the same PATCH with the type and amendments (RS-B; AMENDED, or back to AS_IS);
 * - price, approve, offer, accept, decline, renew, cancel (withdraw): `POST /renewals/{id}/<action>`
 *   with the renewal's ETag. `/approve` is only offered where the tenant does not govern renewal
 *   approval; where it does, the checker acts on the workflow task in My Work Queue.
 *
 * Each command keeps its own key lifecycle per renewal: the same body keeps its key across a dropped
 * response and across a resubmission after a 412; a changed body gets a new key.
 */

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { CommandKeyLifecycle, LogicalCommand, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { POLICY_KEYS } from '../policies/queries';
import { WORKFLOW_KEYS } from '../workflow/queries';
import { LoadedRenewal, RENEWAL_KEYS } from './queries';
import type { AmendBody, DatesBody, PrepareBody, RenewalDetail } from './types';

export type RenewalOutcome =
  | { ok: true; view: RenewalDetail; replayed: boolean }
  | { ok: false; kind: CommandErrorKind; error: unknown };

export type RenewalAction = 'price' | 'approve' | 'offer' | 'accept' | 'decline' | 'renew' | 'cancel';

export function useRenewalCommands() {
  const queryClient = useQueryClient();
  const keys = useRef(new Map<string, CommandKeyLifecycle>());
  const [pending, setPending] = useState(false);
  const lifecycle = (slot: string) => {
    if (!keys.current.has(slot)) keys.current.set(slot, new CommandKeyLifecycle());
    return keys.current.get(slot)!;
  };

  const run = useCallback(
    async (slot: string, command: LogicalCommand, path: string, ifMatch: string, reload: () => Promise<unknown>,
      method: 'POST' | 'PATCH' = 'POST'): Promise<RenewalOutcome> => {
      setPending(true);
      const keyring = lifecycle(slot);
      try {
        const result = await sendCommand<RenewalDetail>(api, keyring, command, { path, ifMatch, method });
        keyring.reset();
        const loaded: LoadedRenewal = { view: result.data, etag: result.etag };
        queryClient.setQueryData(RENEWAL_KEYS.detail(result.data.id), loaded);
        // Renewing adds a version to the policy; pricing may start a governed approval.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: RENEWAL_KEYS.forPolicy(result.data.policy.id) }),
          queryClient.invalidateQueries({ queryKey: POLICY_KEYS.all }),
          queryClient.invalidateQueries({ queryKey: WORKFLOW_KEYS.all }),
        ]);
        return { ok: true, view: result.data, replayed: result.replayed };
      } catch (error) {
        const kind = classifyCommandError(error);
        // Every refusal but a field error or a client defect brings the screen back in line with the server.
        if (kind !== 'invalid' && kind !== 'defect' && kind !== 'network') await reload();
        return { ok: false, kind, error };
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient],
  );

  const reloadPolicy = (policyId: string) => () =>
    Promise.all([
      queryClient.refetchQueries({ queryKey: POLICY_KEYS.detail(policyId) }),
      queryClient.refetchQueries({ queryKey: RENEWAL_KEYS.forPolicy(policyId) }),
    ]);
  const reloadRenewal = (renewalId: string) => () => queryClient.refetchQueries({ queryKey: RENEWAL_KEYS.detail(renewalId) });

  return {
    pending,
    prepare: (policyId: string, body: PrepareBody, policyEtag: string) =>
      run(`prepare:${policyId}`, { type: 'RENEWAL_CREATE', resource: `policy:${policyId}`, body },
        `/policies/${encodeURIComponent(policyId)}/renewals`, policyEtag, reloadPolicy(policyId)),
    amend: (renewalId: string, body: AmendBody, etag: string) =>
      run(`amend:${renewalId}`, { type: 'RENEWAL_UPDATE', resource: `renewal:${renewalId}`, body },
        `/renewals/${encodeURIComponent(renewalId)}`, etag, reloadRenewal(renewalId), 'PATCH'),
    dates: (renewalId: string, body: DatesBody, etag: string) =>
      run(`dates:${renewalId}`, { type: 'RENEWAL_UPDATE', resource: `renewal:${renewalId}`, body },
        `/renewals/${encodeURIComponent(renewalId)}`, etag, reloadRenewal(renewalId), 'PATCH'),
    act: (renewalId: string, action: RenewalAction, body: Record<string, unknown>, etag: string) =>
      run(`${action}:${renewalId}`, { type: `RENEWAL_${action.toUpperCase()}`, resource: `renewal:${renewalId}`, body },
        `/renewals/${encodeURIComponent(renewalId)}/${action}`, etag, reloadRenewal(renewalId)),
  };
}

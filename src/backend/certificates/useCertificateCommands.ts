/**
 * Certificate commands (CS-A), through the FI1-A idempotency lifecycle. Each command keeps its own
 * key lifecycle per target: the same body keeps its key across a dropped response and a retry after
 * a 412; a changed body gets a new key.
 *
 *   issue    POST /policies/{id}/certificates        If-Match = the policy's ETag (also a replacement)
 *   print    POST /certificates/{id}/print           the user's attestation that it was printed (CS-D4)
 *   cancel   POST /certificates/{id}/cancel          a reason; direct, where the tenant does not govern it
 *   request_cancellation  POST /certificates/{id}/request-cancellation   a reason; where it governs it,
 *            after the server refused the direct cancel and the user chose to request (CS-A-Q1). Its
 *            own command and key lifecycle, never the refused cancel's.
 *   spoil    POST /certificates/{id}/spoil           a reason; an issued certificate not yet printed
 */

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { POLICY_KEYS } from '../policies/queries';
import { WORKFLOW_KEYS } from '../workflow/queries';
import { CERTIFICATE_KEYS } from './queries';
import type { Certificate, IssueBody } from './types';

export type CertificateOutcome =
  | { ok: true; view: Certificate; replayed: boolean }
  | { ok: false; kind: CommandErrorKind; error: unknown };

type Name = 'issue' | 'print' | 'cancel' | 'spoil' | 'request_cancellation';

export function useCertificateCommands(policyId: string) {
  const queryClient = useQueryClient();
  const keys = useRef(new Map<string, CommandKeyLifecycle>());
  const [pending, setPending] = useState(false);
  const lifecycle = (slot: string) => {
    if (!keys.current.has(slot)) keys.current.set(slot, new CommandKeyLifecycle());
    return keys.current.get(slot)!;
  };

  const run = useCallback(
    async (name: Name, body: unknown, path: string, etag: string, resource: string, certificateId?: string): Promise<CertificateOutcome> => {
      setPending(true);
      const keyring = lifecycle(`${name}:${resource}`);
      try {
        const result = await sendCommand<Certificate>(
          api,
          keyring,
          { type: `CERTIFICATE_${name.toUpperCase()}`, resource, body },
          { path, ifMatch: etag, method: 'POST' },
        );
        keyring.reset();
        queryClient.setQueryData(CERTIFICATE_KEYS.detail(result.data.id), { view: result.data, etag: result.etag });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: CERTIFICATE_KEYS.forPolicy(policyId) }),
          queryClient.invalidateQueries({ queryKey: WORKFLOW_KEYS.all }),
          // A replacement also closes the certificate it replaces.
          ...(name === 'issue' ? [queryClient.invalidateQueries({ queryKey: ['certificates', 'detail'] })] : []),
        ]);
        return { ok: true, view: result.data, replayed: result.replayed };
      } catch (error) {
        const kind = classifyCommandError(error);
        if (kind !== 'invalid' && kind !== 'defect' && kind !== 'network') {
          await Promise.all([
            queryClient.refetchQueries({ queryKey: CERTIFICATE_KEYS.forPolicy(policyId) }),
            certificateId
              ? queryClient.refetchQueries({ queryKey: CERTIFICATE_KEYS.detail(certificateId) })
              : queryClient.refetchQueries({ queryKey: POLICY_KEYS.detail(policyId) }),
          ]);
        }
        return { ok: false, kind, error };
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, policyId],
  );

  const at = (id: string, action: string) => `/certificates/${encodeURIComponent(id)}/${action}`;

  return {
    pending,
    issue: (body: IssueBody, policyEtag: string) =>
      run('issue', body, `/policies/${encodeURIComponent(policyId)}/certificates`, policyEtag,
        body.replaces_certificate_id ? `certificate:${body.replaces_certificate_id}/replace` : `policy:${policyId}/certificates`),
    print: (id: string, etag: string) => run('print', {}, at(id, 'print'), etag, `certificate:${id}`, id),
    cancel: (id: string, reason: string, etag: string) => run('cancel', { reason }, at(id, 'cancel'), etag, `certificate:${id}`, id),
    spoil: (id: string, reason: string, etag: string) => run('spoil', { reason }, at(id, 'spoil'), etag, `certificate:${id}`, id),
    requestCancellation: (id: string, reason: string, etag: string) =>
      run('request_cancellation', { reason }, at(id, 'request-cancellation'), etag, `certificate:${id}`, id),
  };
}

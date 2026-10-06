/**
 * Bind (NB1-D): `POST /policies` with `{proposal_id, insurer_policy_no?}`, If-Match = the proposal's
 * ETag, so nobody binds a proposal they have not seen (POLICIES-1, P1-D1..D4). The server re-checks
 * everything READY_TO_BIND promised (bindability, blockers, the inception date) and answers with the
 * new policy. Through the FI1-A idempotency lifecycle: the same body keeps its key across a dropped
 * response and a retry after a 412; a changed insurer policy number is a new key.
 */

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { POLICY_KEYS } from '../policies/queries';
import { PROPOSAL_KEYS } from './queries';

export interface BoundPolicy {
  id: string;
  policy_no: string;
}

export type BindOutcome = { ok: true; policy: BoundPolicy; replayed: boolean } | { ok: false; kind: CommandErrorKind; error: unknown };

export function useBindCommand() {
  const queryClient = useQueryClient();
  const keyring = useRef(new CommandKeyLifecycle());
  const [pending, setPending] = useState(false);

  const bind = useCallback(
    async (proposalId: string, etag: string, insurerPolicyNo: string): Promise<BindOutcome> => {
      setPending(true);
      const body = { proposal_id: proposalId, ...(insurerPolicyNo ? { insurer_policy_no: insurerPolicyNo } : {}) };
      try {
        const result = await sendCommand<BoundPolicy>(
          api,
          keyring.current,
          { type: 'POLICY_BIND', resource: `proposal:${proposalId}`, body },
          { path: '/policies', ifMatch: etag, method: 'POST' },
        );
        keyring.current.reset();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: PROPOSAL_KEYS.all }),
          queryClient.invalidateQueries({ queryKey: POLICY_KEYS.all }),
        ]);
        return { ok: true, policy: result.data, replayed: result.replayed };
      } catch (error) {
        const kind = classifyCommandError(error);
        if (kind !== 'invalid' && kind !== 'defect' && kind !== 'network') {
          await queryClient.refetchQueries({ queryKey: PROPOSAL_KEYS.detail(proposalId) });
        }
        return { ok: false, kind, error };
      } finally {
        setPending(false);
      }
    },
    [queryClient],
  );

  return { bind, pending };
}

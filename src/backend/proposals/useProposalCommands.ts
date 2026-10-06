/**
 * Proposal commands (NB1-C), through the FI1-A idempotency lifecycle. Every command on an existing
 * proposal sends its ETag as If-Match; creating one has none. Each command keeps its own key
 * lifecycle: the same body keeps its key across a dropped response and across a retry after a 412;
 * a changed body gets a new key.
 *
 *   create      POST  /underwriting/proposals                     (from an accepted quotation)
 *   update      PATCH /underwriting/proposals/{id}                (terms, while DRAFT)
 *   submit      POST  …/submit                                    (settles: READY_TO_BIND, UNDER_REVIEW or REFERRED)
 *   evaluate    POST  …/evaluate                                  (settles again, e.g. after KYC is verified)
 *   satisfy     POST  …/requirements/{code}/satisfy               (an evidence reference, NB-D7)
 *   refer       POST  …/refer                                     (an underwriter's referral; needs a reason)
 *   approve     POST  …/exceptions/{id}/approve                   (lightweight path; never by a contributor)
 *   reopen      POST  …/reopen                                    (back to DRAFT; approvals lapse)
 *   decline     POST  …/decline, cancel POST …/cancel             (need a reason)
 */

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { WORKFLOW_KEYS } from '../workflow/queries';
import { PROPOSAL_KEYS } from './queries';
import type { ProposalDetail } from './types';

export type ProposalOutcome =
  | { ok: true; view: ProposalDetail; replayed: boolean }
  | { ok: false; kind: CommandErrorKind; error: unknown };

type Name = 'create' | 'update' | 'submit' | 'evaluate' | 'satisfy' | 'refer' | 'approve' | 'reopen' | 'decline' | 'cancel';

export function useProposalCommands() {
  const queryClient = useQueryClient();
  // One key lifecycle per command and target: two requirements given the same evidence text are
  // two commands, never one replayed.
  const keys = useRef(new Map<string, CommandKeyLifecycle>());
  const [pending, setPending] = useState(false);
  const lifecycle = (slot: string) => {
    if (!keys.current.has(slot)) keys.current.set(slot, new CommandKeyLifecycle());
    return keys.current.get(slot)!;
  };

  const run = useCallback(
    async (
      name: Name,
      body: unknown,
      path: string,
      options: { ifMatch?: string; method?: 'POST' | 'PATCH'; proposalId?: string; target?: string } = {},
    ): Promise<ProposalOutcome> => {
      setPending(true);
      const keyring = lifecycle(options.target ? `${name}:${options.target}` : name);
      const resource = options.proposalId ? `proposal:${options.proposalId}${options.target ? `/${options.target}` : ''}` : 'proposals';
      try {
        const result = await sendCommand<ProposalDetail>(
          api,
          keyring,
          { type: `PROPOSAL_${name.toUpperCase()}`, resource, body },
          { path, ifMatch: options.ifMatch, method: options.method ?? 'POST' },
        );
        keyring.reset();
        queryClient.setQueryData(PROPOSAL_KEYS.detail(result.data.id), { view: result.data, etag: result.etag });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['proposals', 'list'] }),
          queryClient.invalidateQueries({ queryKey: WORKFLOW_KEYS.all }),
        ]);
        return { ok: true, view: result.data, replayed: result.replayed };
      } catch (error) {
        const kind = classifyCommandError(error);
        if (options.proposalId && kind !== 'invalid' && kind !== 'defect' && kind !== 'network') {
          await queryClient.refetchQueries({ queryKey: PROPOSAL_KEYS.detail(options.proposalId) });
        }
        return { ok: false, kind, error };
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient],
  );

  const at = (id: string, action = '') => `/underwriting/proposals/${encodeURIComponent(id)}${action ? `/${action}` : ''}`;
  const on = (id: string, etag: string, method: 'POST' | 'PATCH' = 'POST', target?: string) => ({ ifMatch: etag, method, proposalId: id, target });

  return {
    pending,
    create: (body: Record<string, unknown>) => run('create', body, '/underwriting/proposals'),
    update: (id: string, body: Record<string, unknown>, etag: string) => run('update', body, at(id), on(id, etag, 'PATCH')),
    submit: (id: string, etag: string) => run('submit', {}, at(id, 'submit'), on(id, etag)),
    evaluate: (id: string, etag: string) => run('evaluate', {}, at(id, 'evaluate'), on(id, etag)),
    satisfy: (id: string, code: string, evidenceReference: string, etag: string) =>
      run('satisfy', { evidence_reference: evidenceReference }, at(id, `requirements/${encodeURIComponent(code)}/satisfy`), on(id, etag, 'POST', `requirement:${code}`)),
    refer: (id: string, reason: string, etag: string) => run('refer', { reason }, at(id, 'refer'), on(id, etag)),
    approve: (id: string, exceptionId: string, note: string, etag: string) =>
      run('approve', { note }, at(id, `exceptions/${encodeURIComponent(exceptionId)}/approve`), on(id, etag, 'POST', `exception:${exceptionId}`)),
    reopen: (id: string, etag: string) => run('reopen', {}, at(id, 'reopen'), on(id, etag)),
    decline: (id: string, reason: string, etag: string) => run('decline', { reason }, at(id, 'decline'), on(id, etag)),
    cancel: (id: string, reason: string, etag: string) => run('cancel', { reason }, at(id, 'cancel'), on(id, etag)),
  };
}

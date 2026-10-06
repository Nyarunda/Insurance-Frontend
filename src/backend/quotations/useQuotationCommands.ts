/**
 * Quotation commands (NB1-B), through the FI1-A idempotency lifecycle. Every command on an existing
 * quotation sends its ETag as If-Match (so nobody prices, issues or accepts a version they have not
 * seen); creating one has none. Each command keeps its own key lifecycle: the same body keeps its
 * key across a dropped response and across a retry after a 412; a changed body (an acknowledged
 * duplicate, say) gets a new key.
 *
 *   create          POST  /quotations
 *   update          PATCH /quotations/{id}            (validity, references)
 *   risk            PUT   /quotations/{id}/risk       (clears any pricing)
 *   price           POST  /quotations/{id}/price
 *   issue           POST  /quotations/{id}/issue      (acknowledge_duplicates + reason when the risk is on other quotations)
 *   accept/decline  POST  /quotations/{id}/accept|decline   (decline needs a reason)
 *   revise          POST  /quotations/{id}/revise
 *   submitRevision  POST  /quotations/{id}/submit-revision  (a revision of an expired offer, for a checker)
 *   approveRevision POST  /quotations/{id}/approve-revision (lightweight check, when not governed)
 *   cancel          POST  /quotations/{id}/cancel     (needs a reason)
 */

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { CUSTOMER_KEYS } from '../customers/queries';
import { WORKFLOW_KEYS } from '../workflow/queries';
import { QUOTATION_KEYS } from './queries';
import type { QuotationDetail, Risk } from './types';

export type QuotationOutcome =
  | { ok: true; view: QuotationDetail; replayed: boolean }
  | { ok: false; kind: CommandErrorKind; error: unknown };

type Name =
  | 'create'
  | 'update'
  | 'risk'
  | 'price'
  | 'issue'
  | 'accept'
  | 'decline'
  | 'revise'
  | 'submit-revision'
  | 'approve-revision'
  | 'cancel';

export function useQuotationCommands() {
  const queryClient = useQueryClient();
  const keys = useRef(new Map<Name, CommandKeyLifecycle>());
  const [pending, setPending] = useState(false);
  const lifecycle = (name: Name) => {
    if (!keys.current.has(name)) keys.current.set(name, new CommandKeyLifecycle());
    return keys.current.get(name)!;
  };

  const run = useCallback(
    async (
      name: Name,
      body: unknown,
      path: string,
      options: { ifMatch?: string; method?: 'POST' | 'PUT' | 'PATCH'; quotationId?: string } = {},
    ): Promise<QuotationOutcome> => {
      setPending(true);
      const keyring = lifecycle(name);
      try {
        const result = await sendCommand<QuotationDetail>(
          api,
          keyring,
          { type: `QUOTATION_${name.toUpperCase().replace('-', '_')}`, resource: options.quotationId ? `quotation:${options.quotationId}` : 'quotations', body },
          { path, ifMatch: options.ifMatch, method: options.method ?? 'POST' },
        );
        keyring.reset();
        queryClient.setQueryData(QUOTATION_KEYS.detail(result.data.id), { view: result.data, etag: result.etag });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['quotations', 'list'] }),
          queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all }),
          queryClient.invalidateQueries({ queryKey: WORKFLOW_KEYS.all }),
        ]);
        return { ok: true, view: result.data, replayed: result.replayed };
      } catch (error) {
        const kind = classifyCommandError(error);
        if (options.quotationId && kind !== 'invalid' && kind !== 'defect' && kind !== 'network') {
          await queryClient.refetchQueries({ queryKey: QUOTATION_KEYS.detail(options.quotationId) });
        }
        return { ok: false, kind, error };
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient],
  );

  const at = (id: string, action = '') => `/quotations/${encodeURIComponent(id)}${action ? `/${action}` : ''}`;
  const on = (id: string, etag: string, method: 'POST' | 'PUT' | 'PATCH' = 'POST') => ({ ifMatch: etag, method, quotationId: id });

  return {
    pending,
    create: (body: Record<string, unknown>) => run('create', body, '/quotations'),
    update: (id: string, body: Record<string, unknown>, etag: string) => run('update', body, at(id), on(id, etag, 'PATCH')),
    risk: (id: string, risk: Risk, etag: string) => run('risk', risk, at(id, 'risk'), on(id, etag, 'PUT')),
    price: (id: string, etag: string) => run('price', {}, at(id, 'price'), on(id, etag)),
    issue: (id: string, etag: string, acknowledge?: { reason: string }) =>
      run('issue', acknowledge ? { acknowledge_duplicates: true, reason: acknowledge.reason } : {}, at(id, 'issue'), on(id, etag)),
    accept: (id: string, etag: string) => run('accept', {}, at(id, 'accept'), on(id, etag)),
    decline: (id: string, reason: string, etag: string) => run('decline', { reason }, at(id, 'decline'), on(id, etag)),
    revise: (id: string, etag: string) => run('revise', {}, at(id, 'revise'), on(id, etag)),
    submitRevision: (id: string, etag: string) => run('submit-revision', {}, at(id, 'submit-revision'), on(id, etag)),
    approveRevision: (id: string, etag: string) => run('approve-revision', {}, at(id, 'approve-revision'), on(id, etag)),
    cancel: (id: string, reason: string, etag: string) => run('cancel', { reason }, at(id, 'cancel'), on(id, etag)),
  };
}

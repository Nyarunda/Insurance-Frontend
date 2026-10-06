/**
 * Customer commands (NB1-A), through the FI1-A idempotency lifecycle:
 *
 * - create: `POST /clients` (no If-Match: there is no record yet);
 * - update: `PATCH /clients/{id}` with the customer's ETag (profile fields, KYC moves);
 * - addContact / addAddress / addIdentifier: `POST /clients/{id}/<child>`;
 * - reviewIdentifier: `PATCH /clients/{id}/identifiers/{child}` (verify or reject; clients.kyc.verify).
 *
 * Each command keeps its own key lifecycle: the same body keeps its key across a dropped response
 * and across a resubmission after a 412; a changed body (an acknowledged duplicate, say) gets a new
 * key. Every child change moves the customer's ETag (C1-D25), so the record is reloaded after each.
 */

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { CommandKeyLifecycle, LogicalCommand, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { CUSTOMER_KEYS } from './queries';
import type { CustomerCreateBody, CustomerDetail } from './types';

export type CustomerOutcome<T> =
  | { ok: true; data: T; replayed: boolean }
  | { ok: false; kind: CommandErrorKind; error: unknown };

export function useCustomerCommands() {
  const queryClient = useQueryClient();
  const keys = useRef({
    create: new CommandKeyLifecycle(),
    update: new CommandKeyLifecycle(),
    contact: new CommandKeyLifecycle(),
    address: new CommandKeyLifecycle(),
    identifier: new CommandKeyLifecycle(),
    review: new CommandKeyLifecycle(),
  });
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T,>(
      lifecycle: CommandKeyLifecycle,
      command: LogicalCommand,
      path: string,
      options: { ifMatch?: string; method?: 'POST' | 'PATCH'; customerId?: string } = {},
    ): Promise<CustomerOutcome<T>> => {
      setPending(true);
      try {
        const result = await sendCommand<T>(api, lifecycle, command, {
          path,
          ifMatch: options.ifMatch,
          method: options.method ?? 'POST',
        });
        lifecycle.reset();
        await queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
        return { ok: true, data: result.data, replayed: result.replayed };
      } catch (error) {
        const kind = classifyCommandError(error);
        if (options.customerId && kind !== 'invalid' && kind !== 'defect' && kind !== 'network') {
          await queryClient.refetchQueries({ queryKey: CUSTOMER_KEYS.detail(options.customerId) });
        }
        return { ok: false, kind, error };
      } finally {
        setPending(false);
      }
    },
    [queryClient],
  );

  const base = (customerId: string) => `/clients/${encodeURIComponent(customerId)}`;

  const create = (body: CustomerCreateBody) =>
    run<CustomerDetail>(keys.current.create, { type: 'CLIENT_CREATE', resource: 'customers', body }, '/clients');

  const update = (customerId: string, body: Record<string, unknown>, etag: string) =>
    run<CustomerDetail>(
      keys.current.update,
      { type: 'CLIENT_UPDATE', resource: `customer:${customerId}`, body },
      base(customerId),
      { ifMatch: etag, method: 'PATCH', customerId },
    );

  const addContact = (customerId: string, body: { type: string; value: string; is_primary: boolean }) =>
    run(keys.current.contact, { type: 'CLIENT_CONTACT_ADD', resource: `customer:${customerId}`, body }, `${base(customerId)}/contacts`, {
      customerId,
    });

  const addAddress = (customerId: string, body: Record<string, unknown>) =>
    run(keys.current.address, { type: 'CLIENT_ADDRESS_ADD', resource: `customer:${customerId}`, body }, `${base(customerId)}/addresses`, {
      customerId,
    });

  const addIdentifier = (customerId: string, body: Record<string, unknown>) =>
    run(
      keys.current.identifier,
      { type: 'CLIENT_IDENTIFIER_ADD', resource: `customer:${customerId}`, body },
      `${base(customerId)}/identifiers`,
      { customerId },
    );

  const reviewIdentifier = (customerId: string, identifierId: string, body: { verification_status: 'VERIFIED' | 'REJECTED'; verification_source: string }) =>
    run(
      keys.current.review,
      { type: 'CLIENT_IDENTIFIER_UPDATE', resource: `identifier:${identifierId}`, body },
      `${base(customerId)}/identifiers/${encodeURIComponent(identifierId)}`,
      { method: 'PATCH', customerId },
    );

  return { create, update, addContact, addAddress, addIdentifier, reviewIdentifier, pending };
}

/**
 * Certificate stock (CERTIFICATES-SURFACE-1 CS-C, CS-D8), for `certificates.stock.manage`.
 *
 *   types     GET /certificate-types, POST /certificate-types              (list and create only, R2 CS5)
 *   batches   GET /certificate-batches, POST /certificate-batches          (receive a numbered range)
 *   stock     GET /certificate-stock                                       (grouped counts and ranges)
 *   allocate  POST /certificate-stock/allocate                             (to a branch only, R1 CS2)
 *   lookups   GET /insurers, GET /insurance-classes; branches from /me
 *
 * Creating commands carry no If-Match; each keeps its own idempotency lifecycle per body, so a
 * dropped response is retried with the same key and a changed form gets a new one.
 */

import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { CERTIFICATE_KEYS } from './queries';
import type { CertificateCategory, CertificateType } from './types';

export interface Batch {
  id: string;
  batch_no: string;
  insurer: { id: string; code: string };
  certificate_type: { id: string; code: string };
  prefix: string;
  first_number: number;
  last_number: number;
  number_width: number;
  first_serial: string;
  last_serial: string;
  quantity: number;
  branch_id: string;
  delivery_reference: string;
  received_at: string;
}

export interface StockRow {
  insurer_id: string;
  certificate_type_id: string;
  certificate_type: string;
  branch_id: string;
  /** Set when the stock is held by a named user; the UI never shows the ID (no user directory). */
  holder_user_id: string | null;
  available: number;
  lowest_serial: string;
  highest_serial: string;
}

export interface Allocation {
  batch_no: string;
  first_serial: string;
  last_serial: string;
  quantity: number;
  to_branch_id: string;
}

export interface Insurer {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface InsuranceClass {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export const STOCK_KEYS = {
  batches: ['certificates', 'batches'] as const,
  stock: ['certificates', 'stock'] as const,
  insurers: ['certificates', 'insurers'] as const,
  classes: ['certificates', 'insurance-classes'] as const,
};

export function useBatches() {
  return useQuery({
    queryKey: STOCK_KEYS.batches,
    queryFn: async () => (await api.request<{ results: Batch[] }>('/certificate-batches')).data.results,
  });
}

export function useStock() {
  return useQuery({
    queryKey: STOCK_KEYS.stock,
    queryFn: async () => (await api.request<{ results: StockRow[] }>('/certificate-stock')).data.results,
  });
}

export function useInsurers() {
  return useQuery({
    queryKey: STOCK_KEYS.insurers,
    queryFn: async () => (await api.request<{ results: Insurer[] }>('/insurers')).data.results,
    staleTime: 5 * 60_000,
  });
}

export function useInsuranceClasses(enabled: boolean) {
  return useQuery({
    queryKey: STOCK_KEYS.classes,
    queryFn: async () => (await api.request<{ results: InsuranceClass[] }>('/insurance-classes')).data.results,
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * The serial a number takes in a batch, for the preview before receiving: the prefix, then the
 * number padded to the width. The server makes the serials; a clash is its refusal, not the preview's.
 */
export const previewSerial = (prefix: string, number: number, width: number) => {
  const text = String(number);
  return prefix + (text.length >= width ? text : text.padStart(width, '0'));
};

export type StockOutcome<T> = { ok: true; data: T; replayed: boolean } | { ok: false; kind: CommandErrorKind; error: unknown };

export interface TypeBody {
  code: string;
  name: string;
  category: CertificateCategory;
  insurance_class_id: string;
}

export interface BatchBody {
  insurer_id: string;
  certificate_type_id: string;
  branch_id: string;
  prefix: string;
  first_number: number;
  last_number: number;
  number_width: number;
  delivery_reference: string;
}

export interface AllocateBody {
  batch_id: string;
  first_number: number;
  last_number: number;
  branch_id: string;
}

type Name = 'type_create' | 'batch_receive' | 'stock_allocate';

export function useStockCommands() {
  const queryClient = useQueryClient();
  const keys = useRef(new Map<Name, CommandKeyLifecycle>());
  const [pending, setPending] = useState(false);
  const lifecycle = (name: Name) => {
    if (!keys.current.has(name)) keys.current.set(name, new CommandKeyLifecycle());
    return keys.current.get(name)!;
  };

  const run = useCallback(
    async <T,>(name: Name, body: object, path: string, resource: string, refresh: readonly (readonly string[])[]): Promise<StockOutcome<T>> => {
      setPending(true);
      const keyring = lifecycle(name);
      try {
        const result = await sendCommand<T>(api, keyring, { type: `CERTIFICATE_${name.toUpperCase()}`, resource, body }, { path, method: 'POST' });
        keyring.reset();
        await Promise.all(refresh.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
        return { ok: true, data: result.data, replayed: result.replayed };
      } catch (error) {
        return { ok: false, kind: classifyCommandError(error), error };
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient],
  );

  return {
    pending,
    createType: (body: TypeBody) => run<CertificateType>('type_create', body, '/certificate-types', 'certificate-types', [CERTIFICATE_KEYS.types]),
    receive: (body: BatchBody) =>
      run<Batch>('batch_receive', body, '/certificate-batches', 'certificate-batches', [STOCK_KEYS.batches, STOCK_KEYS.stock]),
    allocate: (body: AllocateBody) =>
      run<Allocation>('stock_allocate', body, '/certificate-stock/allocate', `certificate-batch:${body.batch_id}`, [STOCK_KEYS.stock]),
  };
}

/** The stock refusals in words; anything else is the server's own message. */
export const STOCK_REFUSALS: Record<string, (error: ApiError) => string> = {
  CERTIFICATE_TYPE_EXISTS: () => 'A certificate type with this code already exists. Choose another code.',
  CERTIFICATE_SERIAL_EXISTS: (error) =>
    `Serial ${typeof error.details.serial_no === 'string' ? error.details.serial_no : 'in this range'} already exists, and a serial is never reused. Check the prefix and the numbers.`,
  CERTIFICATE_STOCK_UNAVAILABLE: (error) => {
    const serials = Array.isArray(error.details.serials) ? (error.details.serials as string[]) : [];
    return `Only available stock is allocated${serials.length ? `; already used: ${serials.join(', ')}` : ''}. Choose a range of available certificates.`;
  },
  CERTIFICATE_RANGE_SPLIT: () => 'The range is held by more than one holder. Allocate each part separately.',
  CERTIFICATE_TYPE_UNKNOWN: () => 'That certificate type is not active any more. Choose another.',
  INSURER_UNKNOWN: () => 'That insurer is not known. Choose another.',
  INSURANCE_CLASS_UNKNOWN: () => 'That insurance class is not known. Choose another.',
  CERTIFICATE_BATCH_NOT_FOUND: () => 'That batch is not available to you any more. It has been reloaded.',
};

export const stockRefusal = (error: unknown): string | null =>
  error instanceof ApiError && STOCK_REFUSALS[error.code] ? STOCK_REFUSALS[error.code](error) : null;

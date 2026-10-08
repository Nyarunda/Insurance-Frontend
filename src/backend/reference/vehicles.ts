/**
 * The tenant's vehicle makes and models (SETUP-DRIVEN-1 SD-C over SD-A and SD-B).
 *
 *   list      GET   /vehicle-makes[?active=true]              makes with their models
 *   make      GET   /vehicle-makes/{id}                        with its ETag
 *             POST  /vehicle-makes                             {code, name}
 *             PATCH /vehicle-makes/{id}                        {name?, is_active?}, If-Match
 *   model     GET   /vehicle-makes/{id}/models/{model}         with its ETag
 *             POST  /vehicle-makes/{id}/models                 {code, name}
 *             PATCH /vehicle-makes/{id}/models/{model}         {name?, is_active?}, If-Match
 *
 * Codes never change and nothing is deleted (SD-D1): renaming, deactivating and reactivating are the
 * only edits. An edit uses the ETag the server returned for that record, read just before; it is never
 * built here. Each command keeps its own idempotency lifecycle per target and body, so a dropped
 * response or a 412 retry reuses the key and a changed form gets a new one.
 */

import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';

export interface VehicleModel {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  row_version: number;
}

export interface VehicleMake extends VehicleModel {
  models: VehicleModel[];
}

/** A risk detail a product version takes from a list (SD-B), from the version's `reference_fields`. */
export interface ReferenceField {
  code: string;
  name: string;
  reference: 'VEHICLE_MAKE' | 'VEHICLE_MODEL';
  is_required: boolean;
}

/** What the server stores for a reference field on a risk: the code and the name at the time. */
export interface ReferenceSnapshot {
  code: string;
  name: string;
}

export const isSnapshot = (value: unknown): value is ReferenceSnapshot =>
  !!value && typeof value === 'object' && typeof (value as ReferenceSnapshot).code === 'string' && typeof (value as ReferenceSnapshot).name === 'string';

export const VEHICLE_KEYS = {
  all: ['vehicle-makes'] as const,
  list: (activeOnly: boolean) => ['vehicle-makes', 'list', activeOnly ? 'active' : 'all'] as const,
};

export function useVehicleMakes(activeOnly: boolean, enabled = true) {
  return useQuery({
    queryKey: VEHICLE_KEYS.list(activeOnly),
    queryFn: async () => (await api.request<{ results: VehicleMake[] }>(`/vehicle-makes${activeOnly ? '?active=true' : ''}`)).data.results,
    enabled,
  });
}

export type ReferenceOutcome = { ok: true } | { ok: false; kind: CommandErrorKind; error: unknown };

export interface ReferenceBody {
  code: string;
  name: string;
}

export interface ReferenceChange {
  name?: string;
  is_active?: boolean;
}

/** Where a make or a model lives; `makeId` alone is the make. */
export interface ReferenceTarget {
  makeId: string;
  modelId?: string;
}

const pathOf = (target: ReferenceTarget) =>
  `/vehicle-makes/${encodeURIComponent(target.makeId)}${target.modelId ? `/models/${encodeURIComponent(target.modelId)}` : ''}`;

export function useReferenceCommands() {
  const queryClient = useQueryClient();
  const keys = useRef(new Map<string, CommandKeyLifecycle>());
  const [pending, setPending] = useState(false);
  const lifecycle = (slot: string) => {
    if (!keys.current.has(slot)) keys.current.set(slot, new CommandKeyLifecycle());
    return keys.current.get(slot)!;
  };

  const run = useCallback(
    async (slot: string, type: string, path: string, body: object, method: 'POST' | 'PATCH', ifMatch?: string): Promise<ReferenceOutcome> => {
      setPending(true);
      const keyring = lifecycle(slot);
      try {
        await sendCommand(api, keyring, { type, resource: path, body }, { path, method, ifMatch });
        keyring.reset();
        await queryClient.invalidateQueries({ queryKey: VEHICLE_KEYS.all });
        return { ok: true };
      } catch (error) {
        return { ok: false, kind: classifyCommandError(error), error };
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient],
  );

  /** The record's current ETag, as the server returns it, read just before an edit. */
  const etagOf = async (target: ReferenceTarget) => (await api.request(pathOf(target))).etag;

  return {
    pending,
    etagOf,
    createMake: (body: ReferenceBody) => run('make:new', 'VEHICLE_MAKE_CREATE', '/vehicle-makes', body, 'POST'),
    createModel: (makeId: string, body: ReferenceBody) =>
      run(`model:new:${makeId}`, 'VEHICLE_MODEL_CREATE', `${pathOf({ makeId })}/models`, body, 'POST'),
    change: (target: ReferenceTarget, body: ReferenceChange, etag: string) =>
      run(`change:${pathOf(target)}`, target.modelId ? 'VEHICLE_MODEL_UPDATE' : 'VEHICLE_MAKE_UPDATE', pathOf(target), body, 'PATCH', etag),
  };
}

/** The list's refusals in words; anything else is the server's own message. */
export const REFERENCE_REFUSALS: Record<string, () => string> = {
  VEHICLE_MAKE_CODE_EXISTS: () => 'A make with this code already exists. Codes never change, so choose another code.',
  VEHICLE_MODEL_CODE_EXISTS: () => 'This make already has a model with this code. Choose another code.',
  VEHICLE_MAKE_NOT_FOUND: () => 'That make is not available any more. Close this and refresh the list.',
  VEHICLE_MODEL_NOT_FOUND: () => 'That model is not available any more. Close this and refresh the list.',
  PERMISSION_DENIED: () => 'Only a tenant-wide reference data manager can change the list.',
};

export const referenceRefusal = (error: unknown): string | null =>
  error instanceof ApiError && REFERENCE_REFUSALS[error.code] ? REFERENCE_REFUSALS[error.code]() : null;

/** A code as the server keeps it: trimmed and upper case; 1 to 40 letters, digits, '-' or '_'. */
export const normalCode = (text: string) => text.trim().toUpperCase();
export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,39}$/;

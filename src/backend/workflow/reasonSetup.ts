/**
 * The tenant's approval reasons (WRC-1): the reason codes a checker chooses from when approving or
 * rejecting in My Work Queue, managed in the application by `admin.workflow.manage` (tenant-wide).
 *
 *   list    GET   /workflows/reason-code-setup                every code, active or not
 *   one     GET   /workflows/reason-code-setup/{code}         with its ETag
 *           POST  /workflows/reason-code-setup                {code, label, applicable_actions, requires_text}
 *           PATCH /workflows/reason-code-setup/{code}         {label?, applicable_actions?, requires_text?, is_active?}
 *
 * The code never changes and nothing is deleted. An edit reads the code's ETag from the server just
 * before; it is never built here. Each command keeps its own idempotency lifecycle per target and body.
 */

import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { WORKFLOW_KEYS } from './queries';

export type ReasonAction = 'APPROVE' | 'REJECT';

export interface ReasonCodeSetup {
  code: string;
  label: string;
  applicable_actions: ReasonAction[];
  requires_text: boolean;
  is_active: boolean;
  /** System-owned (UNDERLYING_RECORD_INVALID): shown, never edited. */
  system: boolean;
}

export const REASON_SETUP_KEYS = { all: ['workflow', 'reason-setup'] as const };

export function useReasonSetup() {
  return useQuery({
    queryKey: REASON_SETUP_KEYS.all,
    queryFn: async () => (await api.request<{ results: ReasonCodeSetup[] }>('/workflows/reason-code-setup')).data.results,
  });
}

export interface NewReason {
  code: string;
  label: string;
  applicable_actions: ReasonAction[];
  requires_text: boolean;
}

export type ReasonChange = Partial<Pick<ReasonCodeSetup, 'label' | 'applicable_actions' | 'requires_text' | 'is_active'>>;
export type ReasonOutcome = { ok: true } | { ok: false; kind: CommandErrorKind; error: unknown };

const pathOf = (code: string) => `/workflows/reason-code-setup/${encodeURIComponent(code)}`;

export function useReasonCommands() {
  const queryClient = useQueryClient();
  const keys = useRef(new Map<string, CommandKeyLifecycle>());
  const [pending, setPending] = useState(false);
  const lifecycle = (slot: string) => {
    if (!keys.current.has(slot)) keys.current.set(slot, new CommandKeyLifecycle());
    return keys.current.get(slot)!;
  };

  const run = useCallback(
    async (slot: string, type: string, path: string, body: object, method: 'POST' | 'PATCH', ifMatch?: string): Promise<ReasonOutcome> => {
      setPending(true);
      const keyring = lifecycle(slot);
      try {
        await sendCommand(api, keyring, { type, resource: path, body }, { path, method, ifMatch });
        keyring.reset();
        // The setup list, and the checker's list of active reasons.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: REASON_SETUP_KEYS.all }),
          queryClient.invalidateQueries({ queryKey: WORKFLOW_KEYS.all }),
        ]);
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

  return {
    pending,
    /** The code's current ETag, as the server returns it, read just before an edit. */
    etagOf: async (code: string) => (await api.request(pathOf(code))).etag,
    create: (body: NewReason) => run('new', 'WORKFLOW_REASON_CODE_CREATE', '/workflows/reason-code-setup', body, 'POST'),
    change: (code: string, body: ReasonChange, etag: string) => run(`change:${code}`, 'WORKFLOW_REASON_CODE_UPDATE', pathOf(code), body, 'PATCH', etag),
  };
}

export const REASON_REFUSALS: Record<string, string> = {
  REASON_CODE_EXISTS: 'A reason with this code already exists. Codes never change, so choose another code.',
  REASON_CODE_PROTECTED: 'This reason belongs to the system and is not changed here.',
  REASON_CODE_NOT_FOUND: 'That reason is not available any more. Close this and refresh the list.',
  PERMISSION_DENIED: 'Only a tenant-wide workflow administrator can change the reasons.',
};

export const reasonRefusal = (error: unknown): string | null =>
  error instanceof ApiError && REASON_REFUSALS[error.code] ? REASON_REFUSALS[error.code] : null;

/** As the server keeps it: capitals, digits and _, 2 to 64, starting with a letter. */
export const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

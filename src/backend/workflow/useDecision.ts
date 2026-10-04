/**
 * APPROVE / REJECT on a workflow instance (FI1-B), through the FI1-A idempotency lifecycle:
 * `If-Match` is the instance's current ETag; the key belongs to the logical command (instance,
 * action, step, slot, reason), so a resubmission after a 412 keeps it and a changed decision does
 * not. After every answer the screen is brought back in line with the server (§4).
 */

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { WORKFLOW_KEYS } from './queries';
import type { ActionBody, InstanceView } from './types';

export type DecisionOutcome =
  | { ok: true; view: InstanceView; replayed: boolean }
  | { ok: false; kind: CommandErrorKind; error: unknown };

export function useDecision(instanceId: string) {
  const queryClient = useQueryClient();
  const lifecycle = useRef(new CommandKeyLifecycle());
  const [pending, setPending] = useState(false);

  const submit = useCallback(
    async (body: ActionBody, etag: string): Promise<DecisionOutcome> => {
      setPending(true);
      try {
        const result = await sendCommand<InstanceView>(
          api,
          lifecycle.current,
          { type: `WORKFLOW_${body.action}`, resource: `workflow-instance:${instanceId}`, body },
          { path: `/workflows/instances/${encodeURIComponent(instanceId)}/actions`, ifMatch: etag },
        );
        lifecycle.current.reset();
        queryClient.setQueryData(WORKFLOW_KEYS.instance(instanceId), {
          view: result.data,
          etag: result.etag ?? result.data.etag,
        });
        await queryClient.invalidateQueries({ queryKey: WORKFLOW_KEYS.queue });
        return { ok: true, view: result.data, replayed: result.replayed };
      } catch (error) {
        const kind = classifyCommandError(error);
        if (kind === 'stale') {
          // Reload so the next attempt carries the current ETag; the key stays with the command.
          await queryClient.refetchQueries({ queryKey: WORKFLOW_KEYS.instance(instanceId) });
        } else if (kind !== 'invalid' && kind !== 'defect' && kind !== 'network') {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: WORKFLOW_KEYS.instance(instanceId) }),
            queryClient.invalidateQueries({ queryKey: WORKFLOW_KEYS.queue }),
          ]);
        }
        return { ok: false, kind, error };
      } finally {
        setPending(false);
      }
    },
    [instanceId, queryClient],
  );

  // Closing the dialog does not reset the key: confirming the same decision again (for example
  // after a dropped response) is the same command; a different one gets a new key by its fingerprint.
  return { submit, pending };
}

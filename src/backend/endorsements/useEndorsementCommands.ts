/**
 * Endorsement commands (FI1-D), through the FI1-A idempotency lifecycle:
 *
 * - create: `POST /policies/{id}/endorsements` with the **policy's** ETag as `If-Match`;
 * - update: `PATCH /endorsements/{id}` (a draft's date, reason and change) with the endorsement's ETag;
 * - submit: `POST /endorsements/{id}/submit` with the endorsement's ETag;
 * - withdraw: `POST /endorsements/{id}/cancel` with the endorsement's ETag and a reason.
 *
 * Each command keeps its own key lifecycle: the same body keeps its key across a dropped response
 * and across a resubmission after a 412; a changed body gets a new key. The lightweight
 * `/approve` and `/decline` are never called: approvals happen only through workflow instances.
 */

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { CommandKeyLifecycle, LogicalCommand, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { POLICY_KEYS } from '../policies/queries';
import { WORKFLOW_KEYS } from '../workflow/queries';
import { ENDORSEMENT_KEYS, LoadedEndorsement } from './queries';
import type { EndorsementBody, EndorsementDetail, EndorsementPatchBody } from './types';

export type CommandOutcome =
  | { ok: true; view: EndorsementDetail; replayed: boolean }
  | { ok: false; kind: CommandErrorKind; error: unknown };

/** Refused before it was sent: there is no ETag to send as If-Match. */
export const NO_ETAG_TEXT = 'This record could not be checked for changes. Reload it and try again.';

export function useEndorsementCommands() {
  const queryClient = useQueryClient();
  const createKeys = useRef(new CommandKeyLifecycle());
  const updateKeys = useRef(new CommandKeyLifecycle());
  const submitKeys = useRef(new CommandKeyLifecycle());
  const withdrawKeys = useRef(new CommandKeyLifecycle());
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (
      lifecycle: CommandKeyLifecycle,
      command: LogicalCommand,
      path: string,
      ifMatch: string,
      reload: () => Promise<unknown>,
      method: 'POST' | 'PATCH' = 'POST',
    ): Promise<CommandOutcome> => {
      setPending(true);
      try {
        const result = await sendCommand<EndorsementDetail>(api, lifecycle, command, { path, ifMatch, method });
        lifecycle.reset();
        const loaded: LoadedEndorsement = { view: result.data, etag: result.etag };
        queryClient.setQueryData(ENDORSEMENT_KEYS.detail(result.data.id), loaded);
        // A submission may take effect at once (a new policy version) or start an approval.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ENDORSEMENT_KEYS.forPolicy(result.data.policy.id) }),
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
    [queryClient],
  );

  const reloadPolicy = (policyId: string) => () =>
    Promise.all([
      queryClient.refetchQueries({ queryKey: POLICY_KEYS.detail(policyId) }),
      queryClient.refetchQueries({ queryKey: POLICY_KEYS.versions(policyId) }),
    ]);
  const reloadEndorsement = (endorsementId: string) => () =>
    queryClient.refetchQueries({ queryKey: ENDORSEMENT_KEYS.detail(endorsementId) });

  const create = (policyId: string, body: EndorsementBody, policyEtag: string) =>
    run(
      createKeys.current,
      { type: 'ENDORSEMENT_CREATE', resource: `policy:${policyId}`, body },
      `/policies/${encodeURIComponent(policyId)}/endorsements`,
      policyEtag,
      reloadPolicy(policyId),
    );

  const update = (endorsementId: string, body: EndorsementPatchBody, etag: string) =>
    run(
      updateKeys.current,
      { type: 'ENDORSEMENT_UPDATE', resource: `endorsement:${endorsementId}`, body },
      `/endorsements/${encodeURIComponent(endorsementId)}`,
      etag,
      reloadEndorsement(endorsementId),
      'PATCH',
    );

  const submit = (endorsementId: string, etag: string) =>
    run(
      submitKeys.current,
      { type: 'ENDORSEMENT_SUBMIT', resource: `endorsement:${endorsementId}`, body: {} },
      `/endorsements/${encodeURIComponent(endorsementId)}/submit`,
      etag,
      reloadEndorsement(endorsementId),
    );

  const withdraw = (endorsementId: string, reason: string, etag: string) =>
    run(
      withdrawKeys.current,
      { type: 'ENDORSEMENT_CANCEL', resource: `endorsement:${endorsementId}`, body: { reason } },
      `/endorsements/${encodeURIComponent(endorsementId)}/cancel`,
      etag,
      reloadEndorsement(endorsementId),
    );

  return { create, update, submit, withdraw, pending };
}

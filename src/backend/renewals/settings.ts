/**
 * The tenant's renewal settings (SETUP-DRIVEN-1 SD-E): the renewal window either side of expiry and
 * the offer's validity, effective-dated and published by someone other than their maker (IS1-D14).
 *
 *   list     GET  /renewal-settings                 the values in force today and every period, newest first
 *   draft    POST /renewal-settings                 {effective_from, early_window_days, late_window_days,
 *                                                    offer_validity_days, offer_max_validity_days}
 *   publish  POST /renewal-settings/{id}/publish    by someone else; from tomorrow when a period is open
 *
 * A published period never changes and nothing is deleted; a new period replaces it from its date. Each
 * command keeps its own idempotency lifecycle per target, so a dropped response reuses the key.
 */

import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';

export interface RenewalSettingValues {
  early_window_days: number;
  late_window_days: number;
  offer_validity_days: number;
  offer_max_validity_days: number;
}

export interface RenewalSettingsPeriod extends RenewalSettingValues {
  id: string;
  status: 'DRAFT' | 'PUBLISHED';
  effective_from: string;
  effective_to: string | null;
  created_by: string;
  published_by: string | null;
  published_at: string | null;
}

export interface RenewalSettingsList {
  /** The values of the published period covering the tenant's business date `on`. */
  in_force: RenewalSettingValues & { on: string };
  results: RenewalSettingsPeriod[];
}

export interface RenewalSettingsBody extends RenewalSettingValues {
  effective_from: string;
}

export const RENEWAL_SETTINGS_KEY = ['renewal-settings'] as const;

export function useRenewalSettings(enabled = true) {
  return useQuery({
    queryKey: RENEWAL_SETTINGS_KEY,
    queryFn: async () => (await api.request<RenewalSettingsList>('/renewal-settings')).data,
    enabled,
  });
}

export type SettingsOutcome = { ok: true; data: RenewalSettingsPeriod } | { ok: false; kind: CommandErrorKind; error: unknown };

export function useRenewalSettingsCommands() {
  const queryClient = useQueryClient();
  const keys = useRef(new Map<string, CommandKeyLifecycle>());
  const [pending, setPending] = useState(false);
  const lifecycle = (slot: string) => {
    if (!keys.current.has(slot)) keys.current.set(slot, new CommandKeyLifecycle());
    return keys.current.get(slot)!;
  };

  const run = useCallback(
    async (slot: string, type: string, path: string, body: object): Promise<SettingsOutcome> => {
      setPending(true);
      const keyring = lifecycle(slot);
      try {
        const result = await sendCommand<RenewalSettingsPeriod>(api, keyring, { type, resource: path, body }, { path, method: 'POST' });
        keyring.reset();
        await queryClient.invalidateQueries({ queryKey: RENEWAL_SETTINGS_KEY });
        return { ok: true, data: result.data };
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
    draft: (body: RenewalSettingsBody) => run('draft', 'RENEWAL_SETTINGS_DRAFT', '/renewal-settings', body),
    publish: (id: string) =>
      run(`publish:${id}`, 'RENEWAL_SETTINGS_PUBLISH', `/renewal-settings/${encodeURIComponent(id)}/publish`, {}),
  };
}

/** The refusals in words; anything else is the server's own message. */
export const SETTINGS_REFUSALS: Record<string, () => string> = {
  SETUP_SELF_PUBLISH: () => 'You prepared these settings, so someone else must publish them.',
  EFFECTIVE_DATE_TOO_SOON: () =>
    'Today is already decided by the settings in force. Draft a new period from tomorrow or later, and publish that.',
  EFFECTIVE_DATE_CONFLICT: () => 'A published period already starts on that date. Draft a period from another date.',
  EFFECTIVE_DATE_IN_PAST: () => 'This period starts in the past. Draft a new period from today or later.',
  RATE_NOT_DRAFT: () => 'These settings are already published. Refresh the list.',
  RENEWAL_SETTINGS_NOT_FOUND: () => 'These settings are not available any more. Refresh the list.',
  PERMISSION_DENIED: () => 'Drafting needs a tenant-wide renewal settings manager; publishing needs a tenant-wide configuration publisher.',
};

export const settingsRefusal = (error: unknown): string | null =>
  error instanceof ApiError && SETTINGS_REFUSALS[error.code] ? SETTINGS_REFUSALS[error.code]() : null;

export const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

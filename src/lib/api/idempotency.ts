/**
 * The idempotency-key lifecycle (FI1-A, after PTH1-D2).
 *
 * A key belongs to one logical command: its type, its resource and its request body (for a
 * workflow action the body includes `step_id`). The backend fingerprints exactly those, and
 * ignores preconditions such as `If-Match`. So:
 *
 * - the same command keeps its key: across an uncertain network retry, and across a resubmission
 *   after a 412 forced an ETag refresh (a FAILED reservation is reclaimed and re-evaluated);
 * - a changed command (another decision, reason, text or value, or a new `step_id` after a
 *   reload) gets a new key, because reusing it would be refused as `IDEMPOTENCY_KEY_REUSED`;
 * - a 412 never creates a key by itself;
 * - once the command has succeeded, the next one starts a new lifecycle (`reset`).
 */

import { ApiClient, ApiResult } from './client';
import { ApiError } from './errors';

export interface LogicalCommand {
  /** For example `WORKFLOW_ACTION` or `ENDORSEMENT_CREATE`. */
  type: string;
  /** The resource the command acts on, for example `workflow-instance:<id>`. */
  resource: string;
  body: unknown;
}

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
};

/** Same command, same fingerprint: key order and undefined fields do not matter (JSON drops them). */
export const commandFingerprint = (command: LogicalCommand): string =>
  JSON.stringify(canonical({ type: command.type, resource: command.resource, body: command.body ?? null }));

/**
 * A random UUIDv4. `crypto.randomUUID` exists only in secure contexts, and development runs on
 * plain HTTP at the tenant's host name, so the key is built from `getRandomValues`, which is
 * available everywhere.
 */
export const newIdempotencyKey = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** Holds the key of the command currently being attempted; one per form or dialog. */
export class CommandKeyLifecycle {
  private fingerprint: string | null = null;
  private key: string | null = null;

  constructor(private readonly generate: () => string = newIdempotencyKey) {}

  /** The key for this command: the current one if the command is unchanged, otherwise a new one. */
  keyFor(command: LogicalCommand): string {
    const fingerprint = commandFingerprint(command);
    if (this.key === null || fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint;
      this.key = this.generate();
    }
    return this.key;
  }

  /** The command completed (or the user abandoned it); the next command starts a new lifecycle. */
  reset(): void {
    this.fingerprint = null;
    this.key = null;
  }

  get currentKey(): string | null {
    return this.key;
  }
}

export interface CommandRequest {
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  ifMatch?: string;
}

export interface SendCommandOptions {
  /** Attempts after the first when no response arrived at all. */
  networkRetries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a command with the lifecycle's key. When no response arrives, the outcome is unknown, so it
 * is retried with the same key and the same body: the backend either completes it once or replays
 * the stored result (`replayed`). Every other failure is returned to the caller unchanged; the
 * lifecycle keeps the key, so resubmitting the same command (for example with a refreshed ETag
 * after a 412) is a re-evaluation of the same command.
 */
export async function sendCommand<T>(
  client: ApiClient,
  lifecycle: CommandKeyLifecycle,
  command: LogicalCommand,
  request: CommandRequest,
  options: SendCommandOptions = {},
): Promise<ApiResult<T>> {
  const key = lifecycle.keyFor(command);
  const retries = options.networkRetries ?? 2;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.request<T>(request.path, {
        method: request.method ?? 'POST',
        body: command.body,
        ifMatch: request.ifMatch,
        idempotencyKey: key,
        signal: options.signal,
      });
    } catch (error) {
      const uncertain = error instanceof ApiError && error.isNetwork;
      if (!uncertain || attempt >= retries) throw error;
      await pause((options.retryDelayMs ?? 500) * (attempt + 1));
    }
  }
}

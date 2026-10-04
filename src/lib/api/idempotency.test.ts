import { describe, expect, it, vi } from 'vitest';
import { envelope, fakeFetch, json } from '../../test/fetchFake';
import { createApiClient } from './client';
import { ApiError } from './errors';
import { CommandKeyLifecycle, commandFingerprint, LogicalCommand, newIdempotencyKey, sendCommand } from './idempotency';

const approve = (stepId = 'step-1'): LogicalCommand => ({
  type: 'WORKFLOW_ACTION',
  resource: 'workflow-instance:wf-1',
  body: { action: 'APPROVE', step_id: stepId },
});

const counterKeys = () => {
  let n = 0;
  return () => `key-${++n}`;
};

describe('the key lifecycle', () => {
  it('keeps one key for an unchanged command', () => {
    const lifecycle = new CommandKeyLifecycle(counterKeys());
    expect(lifecycle.keyFor(approve())).toBe('key-1');
    expect(lifecycle.keyFor(approve())).toBe('key-1');
  });

  it('ignores key order and undefined fields, as JSON does', () => {
    const lifecycle = new CommandKeyLifecycle(counterKeys());
    lifecycle.keyFor({ type: 'T', resource: 'r', body: { a: 1, b: 2, c: undefined } });
    expect(lifecycle.keyFor({ type: 'T', resource: 'r', body: { b: 2, a: 1 } })).toBe('key-1');
  });

  it('uses a new key when the decision, reason or text changes', () => {
    const lifecycle = new CommandKeyLifecycle(counterKeys());
    const reject = { type: 'WORKFLOW_ACTION', resource: 'workflow-instance:wf-1', body: { action: 'REJECT', step_id: 'step-1', reason_code: 'A' } };
    expect(lifecycle.keyFor(reject)).toBe('key-1');
    expect(lifecycle.keyFor({ ...reject, body: { ...reject.body, reason_code: 'B' } })).toBe('key-2');
    expect(lifecycle.keyFor({ ...reject, body: { ...reject.body, reason_code: 'B', reason_text: 'x' } })).toBe('key-3');
    expect(lifecycle.keyFor(approve())).toBe('key-4');
  });

  it('uses a new key when a reload moves the command to another step', () => {
    const lifecycle = new CommandKeyLifecycle(counterKeys());
    lifecycle.keyFor(approve('step-1'));
    expect(lifecycle.keyFor(approve('step-2'))).toBe('key-2');
  });

  it('uses a new key for the same body on another resource', () => {
    const lifecycle = new CommandKeyLifecycle(counterKeys());
    lifecycle.keyFor(approve());
    expect(lifecycle.keyFor({ ...approve(), resource: 'workflow-instance:wf-2' })).toBe('key-2');
  });

  it('starts a new lifecycle after reset', () => {
    const lifecycle = new CommandKeyLifecycle(counterKeys());
    lifecycle.keyFor(approve());
    lifecycle.reset();
    expect(lifecycle.currentKey).toBeNull();
    expect(lifecycle.keyFor(approve())).toBe('key-2');
  });

  it('fingerprints exactly type, resource and body', () => {
    expect(commandFingerprint(approve())).toBe(
      '{"body":{"action":"APPROVE","step_id":"step-1"},"resource":"workflow-instance:wf-1","type":"WORKFLOW_ACTION"}',
    );
  });

  it('generates RFC 4122 version-4 keys without crypto.randomUUID', () => {
    const keys = new Set(Array.from({ length: 50 }, newIdempotencyKey));
    expect(keys.size).toBe(50);
    for (const key of keys) expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

function clientFor(handler: Parameters<typeof fakeFetch>[0]) {
  const network = fakeFetch(handler);
  const client = createApiClient({
    fetch: network.fn,
    baseUrl: '/api/v1',
    getAccessToken: () => 't',
    refreshAccessToken: async () => true,
    getBranchId: () => null,
    onSessionEnded: vi.fn(),
    onBranchRejected: vi.fn(),
  });
  return { client, calls: network.calls };
}

const PATH = { path: '/workflows/instances/wf-1/actions' };

describe('sendCommand', () => {
  it('retries a command whose response never arrived with the same key and body, and accepts a replay', async () => {
    let attempt = 0;
    const { client, calls } = clientFor(() => {
      attempt += 1;
      if (attempt === 1) return Promise.reject(new TypeError('connection reset'));
      return json(200, { status: 'APPROVED' }, { 'Idempotency-Replayed': 'true' });
    });
    const lifecycle = new CommandKeyLifecycle(counterKeys());
    const result = await sendCommand(client, lifecycle, approve(), { ...PATH, ifMatch: '"wf1"' }, { retryDelayMs: 0 });
    expect(result.replayed).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.headers['x-idempotency-key'])).toEqual(['key-1', 'key-1']);
    expect(calls[1].body).toEqual(calls[0].body);
  });

  it('gives up after the allowed network retries, still with one key', async () => {
    const { client, calls } = clientFor(() => Promise.reject(new TypeError('offline')));
    const lifecycle = new CommandKeyLifecycle(counterKeys());
    await expect(sendCommand(client, lifecycle, approve(), PATH, { retryDelayMs: 0, networkRetries: 2 })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    expect(new Set(calls.map((call) => call.headers['x-idempotency-key']))).toEqual(new Set(['key-1']));
    expect(calls).toHaveLength(3);
  });

  it('does not retry an answered refusal', async () => {
    const { client, calls } = clientFor(() => envelope(409, 'WORKFLOW_STEP_NOT_CURRENT', 'the step is not current'));
    await expect(sendCommand(client, new CommandKeyLifecycle(), approve(), PATH)).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(1);
  });

  it('after a 412, resubmits the unchanged command with the new ETag and the same key', async () => {
    const { client, calls } = clientFor((call) =>
      call.headers['if-match'] === '"wf2"'
        ? json(200, { status: 'APPROVED' })
        : envelope(412, 'CONCURRENCY_CONFLICT', 'the record changed', { current_etag: '"wf2"' }),
    );
    const lifecycle = new CommandKeyLifecycle(counterKeys());

    const conflict = await sendCommand(client, lifecycle, approve(), { ...PATH, ifMatch: '"wf1"' }).catch((error) => error as ApiError);
    expect(conflict.status).toBe(412);
    expect(lifecycle.currentKey).toBe('key-1'); // a 412 never creates a key

    await sendCommand(client, lifecycle, approve(), { ...PATH, ifMatch: '"wf2"' });
    expect(calls.map((call) => [call.headers['if-match'], call.headers['x-idempotency-key']])).toEqual([
      ['"wf1"', 'key-1'],
      ['"wf2"', 'key-1'],
    ]);
  });

  it('after a 412 and a reload that moved the step, the changed command gets a new key', async () => {
    const { client, calls } = clientFor((call) =>
      call.headers['if-match'] === '"wf2"' ? json(200, {}) : envelope(412, 'CONCURRENCY_CONFLICT', 'the record changed'),
    );
    const lifecycle = new CommandKeyLifecycle(counterKeys());
    await sendCommand(client, lifecycle, approve('step-1'), { ...PATH, ifMatch: '"wf1"' }).catch(() => undefined);
    await sendCommand(client, lifecycle, approve('step-2'), { ...PATH, ifMatch: '"wf2"' });
    expect(calls.map((call) => call.headers['x-idempotency-key'])).toEqual(['key-1', 'key-2']);
  });
});

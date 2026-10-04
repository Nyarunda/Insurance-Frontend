import { vi } from 'vitest';

export interface FakeCall {
  url: string;
  method: string;
  /** Header names lower-cased, as `Headers` stores them. */
  headers: Record<string, string>;
  body: unknown;
}

export type FakeHandler = (call: FakeCall) => Response | Promise<Response>;

/** A `fetch` that records each call and answers through `handler`. */
export function fakeFetch(handler: FakeHandler) {
  const calls: FakeCall[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const call: FakeCall = {
      url: String(input),
      method: init.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init.headers).entries()),
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    return handler(call);
  });
  return { fn: fn as unknown as typeof fetch, calls, mock: fn };
}

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

export const envelope = (status: number, code: string, message: string, extra: Record<string, unknown> = {}, correlationId = 'corr-1') =>
  json(status, { error: { code, message, correlation_id: correlationId }, ...extra }, { 'X-Correlation-ID': correlationId });

export const signedIn = (token: string) =>
  json(200, { status: 'SIGNED_IN', access_token: token, token_type: 'Bearer', expires_in: 600 });

/** Resolves after pending promise callbacks have run. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

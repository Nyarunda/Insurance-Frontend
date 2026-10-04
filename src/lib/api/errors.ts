/**
 * One error shape for every backend failure (FI1-A).
 *
 * The backend envelope is `{"error": {"code", "message", "correlation_id"}, ...details}`, with
 * `X-Correlation-ID` on every response. Anything else (a proxy page, an empty body, a dropped
 * connection) is normalised to the same shape so screens never parse responses themselves.
 */

export interface ApiErrorShape {
  /** HTTP status; 0 when no response arrived. */
  status: number;
  code: string;
  message: string;
  correlationId: string | null;
  /** Everything the envelope carried next to `error` (for example `fields`, `required_action`). */
  details: Record<string, unknown>;
}

export class ApiError extends Error implements ApiErrorShape {
  readonly status: number;
  readonly code: string;
  readonly correlationId: string | null;
  readonly details: Record<string, unknown>;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'ApiError';
    this.status = shape.status;
    this.code = shape.code;
    this.correlationId = shape.correlationId;
    this.details = shape.details;
  }

  /** No response arrived, so the outcome of a command is unknown and may be retried with its key. */
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError;

const GENERIC_MESSAGES: Record<number, string> = {
  401: 'Sign in to continue.',
  403: 'You do not have access to this.',
  404: 'Not found or not available to you.',
  409: 'This item changed. Reload to see its current state.',
  412: 'This record changed since you opened it.',
  429: 'Too many attempts. Try again later.',
};

export const networkError = (timedOut = false): ApiError =>
  new ApiError({
    status: 0,
    code: timedOut ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR',
    message: timedOut ? 'The server did not answer in time.' : 'The server could not be reached.',
    correlationId: null,
    details: {},
  });

/** Turns a non-2xx response into an ApiError; reads the body once. */
export async function errorFromResponse(response: Response): Promise<ApiError> {
  const headerCorrelation = response.headers.get('X-Correlation-ID');
  let body: unknown = null;
  try {
    const text = await response.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  const envelope = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  const error = envelope?.error && typeof envelope.error === 'object' ? (envelope.error as Record<string, unknown>) : null;
  if (envelope && error && typeof error.code === 'string') {
    const { error: _error, ...details } = envelope;
    return new ApiError({
      status: response.status,
      code: error.code,
      message: typeof error.message === 'string' && error.message ? error.message : GENERIC_MESSAGES[response.status] ?? 'The request failed.',
      correlationId: (typeof error.correlation_id === 'string' && error.correlation_id) || headerCorrelation,
      details,
    });
  }

  return new ApiError({
    status: response.status,
    code: `HTTP_${response.status}`,
    message: GENERIC_MESSAGES[response.status] ?? 'The server returned an unexpected response.',
    correlationId: headerCorrelation,
    details: {},
  });
}

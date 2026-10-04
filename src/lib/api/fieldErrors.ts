/**
 * Field errors from a 422 (§4: "errors on the fields"). The backend reports them two ways:
 * - a domain refusal names one field: `{"error": {...}, "field": "effective_date"}`;
 * - `VALIDATION_FAILED` lists them: `{"error": {...}, "fields": {"reason": ["..."], "changes": {...}}}`.
 * Nested entries are flattened to their leaf names (`changes.limit_amount` → `limit_amount`).
 */

import { describeError } from './errorText';
import { ApiError } from './errors';

const firstMessage = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }
  return null;
};

function collect(fields: Record<string, unknown>, into: Record<string, string>): void {
  for (const [name, value] of Object.entries(fields)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collect(value as Record<string, unknown>, into);
      continue;
    }
    const message = firstMessage(value);
    if (message && !into[name]) into[name] = message;
  }
}

export function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.status !== 422) return {};
  const result: Record<string, string> = {};
  if (typeof error.details.field === 'string') result[error.details.field] = describeError(error).message;
  if (error.details.fields && typeof error.details.fields === 'object') {
    collect(error.details.fields as Record<string, unknown>, result);
  }
  return result;
}

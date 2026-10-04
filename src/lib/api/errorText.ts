/**
 * What an error says to the user. The backend's message is used unless a code has wording of its
 * own here; the correlation ID is kept separately so every error view can show it as a reference.
 */

import { ApiError } from './errors';

export interface ErrorText {
  message: string;
  /** The backend's correlation ID, for support; never a record identifier. */
  reference: string | null;
}

const WORDING: Record<string, string> = {
  INVALID_CREDENTIALS: 'The email or password is not correct.',
  LOGIN_THROTTLED: 'Too many failed sign-ins. Try again later.',
  TENANT_NOT_FOUND: 'No tenant is served at this address.',
  TENANT_SUSPENDED: 'This tenant is suspended.',
  OTP_INVALID: 'The code is not correct.',
  OTP_EXPIRED: 'The code expired. Request a new one.',
  OTP_RESEND_TOO_SOON: 'Wait a moment before requesting another code.',
  OTP_RESEND_LIMIT: 'No more codes can be sent. Start again.',
  OTP_DELIVERY_UNAVAILABLE: 'Codes cannot be delivered right now. Try again later.',
  CHALLENGE_INVALID: 'This sign-in attempt is no longer valid. Start again.',
  AUTHENTICATION_REQUIRED: 'Your session ended. Sign in again to continue.',
  BRANCH_SCOPE_DENIED: 'The selected branch is not one you can use.',
  NETWORK_ERROR: 'The server could not be reached. Check your connection and try again.',
  NETWORK_TIMEOUT: 'The server did not answer in time. Try again.',
};

const sentence = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return 'The request failed.';
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
};

export function describeError(error: unknown): ErrorText {
  if (error instanceof ApiError) {
    return { message: WORDING[error.code] ?? sentence(error.message), reference: error.correlationId };
  }
  return { message: 'Something went wrong.', reference: null };
}

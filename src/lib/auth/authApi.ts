/**
 * The sign-in endpoints (backend CLIENTS-1 C1-D6). They take no bearer token, resolve the tenant
 * from the page's host, and never trigger a refresh.
 *
 * login -> OTP_REQUIRED (challenge) -> otp/verify -> SIGNED_IN, or PASSWORD_CHANGE_REQUIRED ->
 * password/forced-change -> SIGNED_IN. The refresh token arrives only as an httpOnly cookie.
 */

import { api } from '../api/instance';
import type { SignedInBody } from './refresh';

export type { SignedInBody };

export interface OtpChallenge {
  status: 'OTP_REQUIRED';
  challenge_id: string;
  otp_expires_in: number;
  resend_after: number;
  delivery: { channel: string; destination: string };
  /** Present only when the backend runs its sandbox sender (development and staging). */
  sandbox_code?: string;
}

export interface PasswordChangeRequired {
  status: 'PASSWORD_CHANGE_REQUIRED';
  challenge_id: string;
}

const post = async <T>(path: string, body: unknown): Promise<T> =>
  (await api.request<T>(path, { method: 'POST', body, authenticated: false })).data;

export const login = (email: string, password: string) => post<OtpChallenge>('/auth/login', { email, password });

export const verifyOtp = (challengeId: string, code: string) =>
  post<SignedInBody | PasswordChangeRequired>('/auth/otp/verify', { challenge_id: challengeId, code });

export const resendOtp = (challengeId: string) => post<OtpChallenge>('/auth/otp/resend', { challenge_id: challengeId });

export const forcedPasswordChange = (challengeId: string, newPassword: string) =>
  post<SignedInBody>('/auth/password/forced-change', { challenge_id: challengeId, new_password: newPassword });

export const logoutRequest = () => post<null>('/auth/logout', {});

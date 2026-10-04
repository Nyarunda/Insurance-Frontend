/**
 * Backend-mode sign-in (FI1-A): login -> OTP -> (forced password change) -> signed in.
 *
 * - The tenant is whoever serves this address; the page only shows the host.
 * - No code is generated here. A code is shown only when the backend returns `sandbox_code`
 *   (its development sender).
 * - The password rules are checked before sending, and the backend's answer is final.
 * - There is no role picker and no captcha: access comes from the user's roles, and sign-in
 *   attempts are throttled by the backend.
 */

import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { HorizonAlert, isPasswordStrong } from '../../components/horizon';
import {
  EmailField,
  NewPasswordFields,
  OtpCodeField,
  OtpResendRow,
  PasswordField,
  SignInFrame,
  SignInPanel,
  SubmitButton,
} from '../../components/auth/SignInLayout';
import { ApiError } from '../../lib/api/errors';
import { describeError } from '../../lib/api/errorText';
import { forcedPasswordChange, login, OtpChallenge, resendOtp, verifyOtp } from '../../lib/auth/authApi';
import { completeSignIn } from '../../lib/auth/session';
import { SESSION_NOTICE_TEXT, useSessionStore } from '../../lib/auth/sessionStore';
import { ApiErrorAlert } from '../components/ApiErrorAlert';

type Step = 'credentials' | 'otp' | 'password';

/** Errors that mean the challenge is spent: the user must start again from the email. */
const RESTART_CODES = new Set(['CHALLENGE_INVALID', 'OTP_RESEND_LIMIT']);

const useCountdown = (initial: number) => {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds] as const;
};

export const SignInPage: React.FC = () => {
  const notice = useSessionStore((state) => state.notice);
  const host = window.location.hostname;

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [passwordChallengeId, setPasswordChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useCountdown(0);

  const startOver = (reason: unknown = null) => {
    setStep('credentials');
    setChallenge(null);
    setPasswordChallengeId(null);
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setFieldError(undefined);
    setError(reason);
  };

  const fail = (caught: unknown) => {
    if (caught instanceof ApiError && RESTART_CODES.has(caught.code)) startOver(caught);
    else setError(caught);
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (caught) {
      fail(caught);
    } finally {
      setBusy(false);
    }
  };

  const enterChallenge = (next: OtpChallenge) => {
    setChallenge(next);
    setCode('');
    setResendIn(next.resend_after);
  };

  const submitCredentials = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError(undefined);
    if (!/\S+@\S+\.\S+/.test(email.trim())) return setFieldError('Enter a valid work email address.');
    if (!password) return setFieldError('Enter your password.');
    void run(async () => {
      const next = await login(email.trim(), password);
      setPassword('');
      enterChallenge(next);
      setStep('otp');
    });
  };

  const submitCode = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError(undefined);
    if (!challenge) return;
    if (!/^\d{6}$/.test(code)) return setFieldError('Enter the 6-digit verification code.');
    void run(async () => {
      try {
        const result = await verifyOtp(challenge.challenge_id, code);
        if (result.status === 'PASSWORD_CHANGE_REQUIRED') {
          setPasswordChallengeId(result.challenge_id);
          setStep('password');
          return;
        }
        await completeSignIn(result);
      } catch (caught) {
        if (caught instanceof ApiError && caught.code === 'OTP_INVALID') {
          const left = caught.details.attempts_remaining;
          setCode('');
          setFieldError(
            typeof left === 'number' ? `The code is not correct. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.` : 'The code is not correct.',
          );
          if (left === 0) startOver(caught);
          return;
        }
        throw caught;
      }
    });
  };

  const requestNewCode = () => {
    if (!challenge) return;
    setFieldError(undefined);
    void run(async () => enterChallenge(await resendOtp(challenge.challenge_id)));
  };

  const passwordErrors: { newPassword?: string; confirm?: string } = {};
  if (newPassword && !isPasswordStrong(newPassword)) passwordErrors.newPassword = 'The new password does not meet all the requirements below.';
  if (confirmPassword && confirmPassword !== newPassword) passwordErrors.confirm = 'The passwords do not match.';

  const submitNewPassword = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError(undefined);
    if (!passwordChallengeId) return;
    if (!isPasswordStrong(newPassword)) return setFieldError('The new password does not meet all the requirements below.');
    if (newPassword !== confirmPassword) return setFieldError('The passwords do not match.');
    void run(async () => {
      try {
        await completeSignIn(await forcedPasswordChange(passwordChallengeId, newPassword));
      } catch (caught) {
        if (caught instanceof ApiError && caught.code === 'PASSWORD_POLICY_VIOLATION') {
          const requirements = caught.details.requirements;
          setFieldError(
            Array.isArray(requirements) && requirements.length
              ? `The new password needs ${requirements.join(', ')}.`
              : describeError(caught).message,
          );
          return;
        }
        throw caught;
      }
    });
  };

  return (
    <SignInFrame>
      {step === 'credentials' && (
        <SignInPanel title="Sign in" subtitle="Insurance Cloud">
          <form onSubmit={submitCredentials} className="p-7 space-y-4" noValidate>
            {notice && !error && (
              <HorizonAlert tone="warning" title={notice === 'SIGN_OUT_UNCONFIRMED' ? 'Sign-out not confirmed' : 'Signed out'}>
                {SESSION_NOTICE_TEXT[notice]}
              </HorizonAlert>
            )}
            {error ? <ApiErrorAlert error={error} /> : null}
            <EmailField value={email} onChange={setEmail} />
            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Enter password"
              autoComplete="current-password"
              error={fieldError}
            />
            <div className="block">
              <span className="text-[13px] font-bold text-[var(--hz-text-secondary)]">Tenant</span>
              <span className="hz-field mt-1.5 flex items-center gap-2 px-3 bg-[var(--hz-surface-subtle)] cursor-not-allowed">
                <Building2 className="w-4 h-4 text-[var(--hz-text-subtle)] shrink-0" />
                <span className="w-full text-sm text-[var(--hz-text-primary)] truncate" data-testid="sign-in-host">
                  {host}
                </span>
              </span>
              <p className="mt-1 text-[13px] text-[var(--hz-text-subtle)]">You sign in to the tenant served at this address.</p>
            </div>
            <SubmitButton busy={busy} busyLabel="Signing in...">
              Sign In
            </SubmitButton>
          </form>
        </SignInPanel>
      )}

      {step === 'otp' && challenge && (
        <SignInPanel title="Verify your identity" subtitle="Two-factor authentication" onBack={() => startOver()}>
          <form onSubmit={submitCode} className="p-7 space-y-4" noValidate>
            {error ? <ApiErrorAlert error={error} /> : null}
            <HorizonAlert tone="info" title="Verification code sent">
              A 6-digit code was sent to <strong>{challenge.delivery.destination}</strong>.
              {challenge.sandbox_code && (
                <span className="font-mono" data-testid="sandbox-code">
                  {' '}
                  (Sandbox code: {challenge.sandbox_code})
                </span>
              )}
            </HorizonAlert>
            <OtpCodeField value={code} onChange={setCode} error={fieldError} />
            <OtpResendRow secondsRemaining={resendIn} onResend={requestNewCode} disabled={busy} />
            <SubmitButton busy={busy} busyLabel="Verifying...">
              Verify & Continue
            </SubmitButton>
          </form>
        </SignInPanel>
      )}

      {step === 'password' && (
        <SignInPanel title="Update your password" subtitle="Your temporary password must be changed">
          <form onSubmit={submitNewPassword} className="p-7 space-y-4" noValidate>
            <HorizonAlert tone="warning">You signed in with a temporary password. Set a new one to continue.</HorizonAlert>
            {error ? <ApiErrorAlert error={error} /> : null}
            <NewPasswordFields
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              onNewPassword={setNewPassword}
              onConfirmPassword={setConfirmPassword}
              newPasswordError={passwordErrors.newPassword ?? fieldError}
              confirmError={passwordErrors.confirm}
            />
            <SubmitButton busy={busy} busyLabel="Updating...">
              Set Password & Continue
            </SubmitButton>
          </form>
        </SignInPanel>
      )}
    </SignInFrame>
  );
};

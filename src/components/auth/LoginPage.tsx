import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Headphones, RefreshCw } from 'lucide-react';
import { AuthSession, UserRole } from '../../types';
import { recordsStore } from '../../data/recordsStore';
import { ROLE_LABELS } from '../../data/roleRights';
import { HorizonAlert, HorizonToast, isPasswordStrong } from '../horizon';
import {
  EmailField,
  NewPasswordFields,
  OtpCodeField,
  OtpResendRow,
  PasswordField,
  SignInFrame,
  SignInPanel,
  SubmitButton,
} from './SignInLayout';

/**
 * The mock demo's sign-in (`VITE_DATA_SOURCE` unset or `mock`): it invents its own code and checks
 * a fixed temporary password. Backend mode uses `backend/auth/SignInPage` instead.
 */

const OTP_RESEND_SECONDS = 30;
const TEMPORARY_PASSWORD = 'Horizon2026';
const DEFAULT_ROLE_CENTER: UserRole = 'underwriter';

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

interface LoginPageProps {
  onAuthenticated: (session: AuthSession) => void;
}

const captchaAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const createCaptcha = () =>
  Array.from({ length: 5 }, () => captchaAlphabet[Math.floor(Math.random() * captchaAlphabet.length)]).join('');

const readableNameFromEmail = (email: string) => {
  const localPart = email.split('@')[0] || 'User';
  return localPart
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthenticated }) => {
  const [email, setEmail] = useState('marcus.vance@apex.co.ke');
  const [password, setPassword] = useState('Horizon2026');
  const [captcha, setCaptcha] = useState(createCaptcha);
  const [captchaValue, setCaptchaValue] = useState('');
  const [error, setError] = useState('');

  const [step, setStep] = useState<'login' | 'otp' | 'force-password'>('login');
  const [pendingSession, setPendingSession] = useState<AuthSession | null>(null);
  const [passwordUsedAtLogin, setPasswordUsedAtLogin] = useState('');

  const [otpCode, setOtpCode] = useState(generateOtp);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSecondsRemaining, setOtpSecondsRemaining] = useState(OTP_RESEND_SECONDS);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmittingNewPassword, setIsSubmittingNewPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);

  const matchedUser = recordsStore.getUserByEmail(email);
  const availableRoleCenters: UserRole[] = matchedUser?.assignedRoleCenters.length
    ? matchedUser.assignedRoleCenters
    : [DEFAULT_ROLE_CENTER];
  const role: UserRole = availableRoleCenters[0];

  const matchedTenant = emailValid ? recordsStore.getTenantByEmailDomain(email) : undefined;
  const fallbackTenant = recordsStore.getTenants()[0];
  const tenant = (matchedTenant ?? fallbackTenant).name;

  useEffect(() => {
    if (step !== 'force-password') return;
    setPasswordNotice('You signed in with a temporary password. Set a new one to continue.');
    const timer = window.setTimeout(() => setPasswordNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== 'otp' || otpSecondsRemaining <= 0) return;
    const timer = window.setTimeout(() => setOtpSecondsRemaining((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, otpSecondsRemaining]);

  const showError = (message: string) => {
    setError(message);
    window.setTimeout(() => setError(''), 3200);
  };

  const refreshCaptcha = (clearError = true) => {
    setCaptcha(createCaptcha());
    setCaptchaValue('');
    if (clearError) {
      setError('');
    }
  };

  const listenCaptcha = () => {
    if (!('speechSynthesis' in window)) {
      showError('Audio captcha is unavailable in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const phrase = captcha.split('').join(' ');
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(phrase));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!emailValid) {
      showError('Enter a valid work email address.');
      return;
    }

    if (password.trim().length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }

    if (captchaValue.trim().toUpperCase() !== captcha) {
      showError('Captcha does not match. Please try again.');
      refreshCaptcha(false);
      return;
    }

    setPendingSession({
      email,
      name: matchedUser?.name || readableNameFromEmail(email),
      tenant,
      role,
      assignedRoleCenters: availableRoleCenters,
      authenticatedAt: new Date().toISOString(),
    });
    setPasswordUsedAtLogin(password);
    setOtpCode(generateOtp());
    setOtpValue('');
    setOtpError('');
    setOtpSecondsRemaining(OTP_RESEND_SECONDS);
    setStep('otp');
  };

  const resendOtp = () => {
    setOtpCode(generateOtp());
    setOtpValue('');
    setOtpError('');
    setOtpSecondsRemaining(OTP_RESEND_SECONDS);
  };

  const backToLogin = () => {
    setStep('login');
    setPendingSession(null);
    setOtpValue('');
    setOtpError('');
  };

  const verifyOtp = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otpValue.trim())) {
      setOtpError('Enter the 6-digit verification code.');
      return;
    }

    if (otpValue.trim() !== otpCode) {
      setOtpError('Incorrect verification code. Please try again.');
      return;
    }

    setOtpError('');
    setIsVerifyingOtp(true);
    window.setTimeout(() => {
      setIsVerifyingOtp(false);
      if (passwordUsedAtLogin === TEMPORARY_PASSWORD) {
        setStep('force-password');
      } else if (pendingSession) {
        onAuthenticated(pendingSession);
      }
    }, 500);
  };

  const forcePasswordErrors: Record<string, string> = {};
  if (!isPasswordStrong(newPassword)) {
    forcePasswordErrors.newPassword = 'New password does not meet all requirements below.';
  } else if (newPassword === passwordUsedAtLogin) {
    forcePasswordErrors.newPassword = 'New password must be different from your temporary password.';
  }
  if (confirmNewPassword !== newPassword) forcePasswordErrors.confirmNewPassword = 'Passwords do not match.';
  const hasForcePasswordErrors = Object.keys(forcePasswordErrors).length > 0;

  const submitNewPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (hasForcePasswordErrors) {
      showError(Object.values(forcePasswordErrors)[0]);
      return;
    }

    setIsSubmittingNewPassword(true);
    window.setTimeout(() => {
      setIsSubmittingNewPassword(false);
      if (pendingSession) onAuthenticated(pendingSession);
    }, 500);
  };

  return (
    <SignInFrame
      footer={
        <>
          <HorizonToast message={error || null} tone="danger" />
          <HorizonToast message={passwordNotice} tone="warning" />
        </>
      }
    >
      {step === 'login' && (
        <SignInPanel title="Sign in" subtitle="Insurance Cloud">
          <form onSubmit={submit} className="p-7 space-y-4">
            <EmailField value={email} onChange={setEmail} />
            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Enter password"
              autoComplete="current-password"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="block">
                <span className="text-xs font-bold text-[var(--hz-text-secondary)]">Tenant</span>
                <span className="hz-field mt-1.5 flex items-center gap-2 px-3 bg-[var(--hz-surface-subtle)] cursor-not-allowed">
                  <Building2 className="w-4 h-4 text-[var(--hz-text-subtle)] shrink-0" />
                  <span className="w-full text-sm text-[var(--hz-text-primary)] truncate">{tenant}</span>
                </span>
                <p className="mt-1 text-xs text-[var(--hz-text-subtle)]">
                  {matchedTenant
                    ? 'Determined from your email domain.'
                    : 'No tenant matches this email domain — defaulting to primary tenant.'}
                </p>
              </div>

              <div className="block">
                <span className="text-xs font-bold text-[var(--hz-text-secondary)]">Role Center</span>
                <span className="hz-field mt-1.5 flex items-center gap-2 px-3 bg-[var(--hz-surface-subtle)] cursor-not-allowed">
                  <span className="w-full text-sm text-[var(--hz-text-primary)] truncate">{ROLE_LABELS[role]}</span>
                </span>
                <p className="mt-1 text-xs text-[var(--hz-text-subtle)]">
                  {matchedUser
                    ? 'Assigned in Users & Roles.'
                    : `No account found — defaulting to ${ROLE_LABELS[DEFAULT_ROLE_CENTER]} access.`}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--hz-text-secondary)]">Captcha</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => refreshCaptcha()}
                    className="hz-icon-button !w-7 !h-7"
                    title="Refresh captcha"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={listenCaptcha}
                    className="hz-icon-button !w-7 !h-7"
                    title="Listen to captcha"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-1.5 grid grid-cols-[132px_1fr] gap-2">
                <div className="h-10 rounded-[var(--hz-radius-md)] border border-[var(--hz-border)] bg-[var(--hz-info-bg)] flex items-center justify-center font-mono text-lg font-bold tracking-[0.22em] text-[var(--hz-primary)] select-none">
                  {captcha}
                </div>
                <input
                  value={captchaValue}
                  onChange={(event) => setCaptchaValue(event.target.value.toUpperCase())}
                  className="hz-field px-3 outline-none text-sm font-semibold tracking-wide placeholder:text-[var(--hz-text-disabled)]"
                  placeholder="Enter code"
                  maxLength={5}
                />
              </div>
            </div>

            <SubmitButton>Sign In</SubmitButton>
          </form>
        </SignInPanel>
      )}

      {step === 'otp' && (
        <SignInPanel title="Verify your identity" subtitle="Two-factor authentication" onBack={backToLogin}>
          <form onSubmit={verifyOtp} className="p-7 space-y-4">
            <HorizonAlert tone="info" title="Verification code sent">
              A 6-digit code was sent to <strong>{email}</strong>.{' '}
              <span className="font-mono">(Sandbox code: {otpCode})</span>
            </HorizonAlert>
            <OtpCodeField value={otpValue} onChange={setOtpValue} error={otpError} />
            <OtpResendRow secondsRemaining={otpSecondsRemaining} onResend={resendOtp} />
            <SubmitButton busy={isVerifyingOtp} busyLabel="Verifying...">
              Verify & Continue
            </SubmitButton>
          </form>
        </SignInPanel>
      )}

      {step === 'force-password' && (
        <SignInPanel title="Update your password" subtitle="Your temporary password must be changed">
          <form onSubmit={submitNewPassword} className="p-7 space-y-4">
            <NewPasswordFields
              newPassword={newPassword}
              confirmPassword={confirmNewPassword}
              onNewPassword={setNewPassword}
              onConfirmPassword={setConfirmNewPassword}
            />
            <SubmitButton busy={isSubmittingNewPassword} busyLabel="Updating...">
              Set Password & Continue
            </SubmitButton>
          </form>
        </SignInPanel>
      )}
    </SignInFrame>
  );
};

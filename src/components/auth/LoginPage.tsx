import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Headphones,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { AuthSession, UserRole } from '../../types';
import { recordsStore } from '../../data/recordsStore';
import { ROLE_LABELS } from '../../data/roleRights';
import {
  FieldError,
  HorizonAlert,
  HorizonToast,
  isPasswordStrong,
  PasswordStrengthMeter,
} from '../horizon';

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
    <main className="min-h-screen bg-[var(--hz-app-bg)] text-[var(--hz-text-primary)] font-sans antialiased flex">
      <section className="hidden lg:flex w-[43%] min-h-screen bg-[var(--hz-nav)] text-[var(--hz-text-inverse)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(90deg,transparent_31px,white_32px),linear-gradient(transparent_31px,white_32px)] bg-[length:32px_32px]" />
        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-12">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[var(--hz-radius-md)] bg-white text-[var(--hz-nav)] flex items-center justify-center font-black text-lg">
                IC
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-wide uppercase">INSURANCE CLOUD</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Operations Portal</div>
              </div>
            </div>
          </div>

          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-[var(--hz-radius-md)] bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-semibold text-blue-50 mb-5">
              <ShieldCheck className="w-4 h-4" />
              Secure insurance operations workspace
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-normal">
              Welcome to your commercial insurance operating console
            </h1>
            <p className="mt-4 text-sm leading-6 text-blue-50/90 max-w-md">
              Underwriting, policy administration, claims, billing, reinsurance, and regulator-ready controls in one workspace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              ['12', 'Active modules'],
              ['24/7', 'Ops access'],
              ['KES', 'Local finance'],
            ].map(([value, label]) => (
              <div key={label} className="border border-white/20 bg-white/10 rounded-[var(--hz-radius-md)] p-3">
                <div className="text-xl font-extrabold">{value}</div>
                <div className="text-blue-100 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex-1 min-h-screen flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-[430px]">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[var(--hz-radius-md)] bg-[var(--hz-nav)] text-white flex items-center justify-center font-black">
              IC
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-wide uppercase">INSURANCE CLOUD</div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--hz-primary)]">Operations Portal</div>
            </div>
          </div>

          {step === 'login' && (
          <div className="hz-panel shadow-sm">
            <div className="px-7 pt-7 pb-5 border-b border-[var(--hz-divider)]">
              <h2 className="text-xl font-extrabold text-[var(--hz-text-primary)]">Sign in</h2>
              <p className="text-xs text-[var(--hz-text-subtle)] mt-1">Insurance Cloud</p>
            </div>

            <form onSubmit={submit} className="p-7 space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-[var(--hz-text-secondary)]">Email address</span>
                <span className="hz-field mt-1.5 flex items-center gap-2 px-3">
                  <Mail className="w-4 h-4 text-[var(--hz-text-subtle)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full outline-none text-sm text-[var(--hz-text-primary)] placeholder:text-[var(--hz-text-disabled)] bg-transparent"
                    placeholder="name@company.co.ke"
                    autoComplete="email"
                  />
                </span>
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[var(--hz-text-secondary)]">Password</span>
                <span className="hz-field mt-1.5 flex items-center gap-2 px-3">
                  <LockKeyhole className="w-4 h-4 text-[var(--hz-text-subtle)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full outline-none text-sm text-[var(--hz-text-primary)] placeholder:text-[var(--hz-text-disabled)] bg-transparent"
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="block">
                  <span className="text-xs font-bold text-[var(--hz-text-secondary)]">Tenant</span>
                  <span className="hz-field mt-1.5 flex items-center gap-2 px-3 bg-[var(--hz-surface-subtle)] cursor-not-allowed">
                    <Building2 className="w-4 h-4 text-[var(--hz-text-subtle)] shrink-0" />
                    <span className="w-full text-sm text-[var(--hz-text-primary)] truncate">{tenant}</span>
                  </span>
                  <p className="mt-1 text-[11px] text-[var(--hz-text-subtle)]">
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
                  <p className="mt-1 text-[11px] text-[var(--hz-text-subtle)]">
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
                      onClick={refreshCaptcha}
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

              <button
                type="submit"
                className="hz-button hz-button-primary w-full h-10"
              >
                Sign In
              </button>
            </form>
          </div>
          )}

          {step === 'otp' && (
            <div className="hz-panel shadow-sm">
              <div className="px-7 pt-7 pb-5 border-b border-[var(--hz-divider)]">
                <button
                  type="button"
                  onClick={backToLogin}
                  className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hz-text-subtle)] hover:text-[var(--hz-text-primary)]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </button>
                <h2 className="text-xl font-extrabold text-[var(--hz-text-primary)]">Verify your identity</h2>
                <p className="text-xs text-[var(--hz-text-subtle)] mt-1">Two-factor authentication</p>
              </div>

              <form onSubmit={verifyOtp} className="p-7 space-y-4">
                <HorizonAlert tone="info" title="Verification code sent">
                  A 6-digit code was sent to <strong>{email}</strong>.{' '}
                  <span className="font-mono">(Sandbox code: {otpCode})</span>
                </HorizonAlert>

                <label className="block">
                  <span className="text-xs font-bold text-[var(--hz-text-secondary)]">Verification code</span>
                  <span className="hz-field mt-1.5 flex items-center gap-2 px-3">
                    <KeyRound className="w-4 h-4 text-[var(--hz-text-subtle)]" />
                    <input
                      value={otpValue}
                      onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full outline-none text-lg font-mono font-bold tracking-[0.3em] text-[var(--hz-text-primary)] placeholder:text-[var(--hz-text-disabled)] bg-transparent"
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </span>
                  <FieldError message={otpError} />
                </label>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--hz-text-subtle)]">
                    {otpSecondsRemaining > 0 ? `Resend available in 0:${String(otpSecondsRemaining).padStart(2, '0')}` : 'Didn’t get a code?'}
                  </span>
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={otpSecondsRemaining > 0}
                    className="font-semibold text-[var(--hz-primary)] hover:underline disabled:text-[var(--hz-text-disabled)] disabled:no-underline disabled:cursor-not-allowed"
                  >
                    Resend code
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="hz-button hz-button-primary w-full h-10 disabled:opacity-60"
                >
                  {isVerifyingOtp ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </form>
            </div>
          )}

          {step === 'force-password' && (
            <div className="hz-panel shadow-sm">
              <div className="px-7 pt-7 pb-5 border-b border-[var(--hz-divider)]">
                <h2 className="text-xl font-extrabold text-[var(--hz-text-primary)]">Update your password</h2>
                <p className="text-xs text-[var(--hz-text-subtle)] mt-1">Your temporary password must be changed</p>
              </div>

              <form onSubmit={submitNewPassword} className="p-7 space-y-4">

                <label className="block">
                  <span className="text-xs font-bold text-[var(--hz-text-secondary)]">New password</span>
                  <span className="hz-field mt-1.5 flex items-center gap-2 px-3">
                    <LockKeyhole className="w-4 h-4 text-[var(--hz-text-subtle)]" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full outline-none text-sm text-[var(--hz-text-primary)] placeholder:text-[var(--hz-text-disabled)] bg-transparent"
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />
                  </span>
                </label>

                <PasswordStrengthMeter password={newPassword} />

                <label className="block">
                  <span className="text-xs font-bold text-[var(--hz-text-secondary)]">Confirm new password</span>
                  <span className="hz-field mt-1.5 flex items-center gap-2 px-3">
                    <LockKeyhole className="w-4 h-4 text-[var(--hz-text-subtle)]" />
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(event) => setConfirmNewPassword(event.target.value)}
                      className="w-full outline-none text-sm text-[var(--hz-text-primary)] placeholder:text-[var(--hz-text-disabled)] bg-transparent"
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmittingNewPassword}
                  className="hz-button hz-button-primary w-full h-10 disabled:opacity-60"
                >
                  {isSubmittingNewPassword ? 'Updating...' : 'Set Password & Continue'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      <HorizonToast message={error || null} tone="danger" />
      <HorizonToast message={passwordNotice} tone="warning" />
    </main>
  );
};

import React from 'react';
import { ArrowLeft, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { FieldError, PasswordStrengthMeter } from '../horizon';

/**
 * The sign-in screens' presentation, shared by the mock demo (`LoginPage`) and backend mode
 * (`backend/auth/SignInPage`). Nothing here holds data or decides anything.
 */

export const SignInFrame: React.FC<{ children: React.ReactNode; footer?: React.ReactNode }> = ({ children, footer }) => (
  <main className="min-h-screen bg-[var(--hz-bg-app)] text-[var(--hz-text-primary)] font-sans antialiased flex">
    <section className="flex-1 min-h-screen flex flex-col px-5 py-6 md:px-10">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--hz-primary-700)] text-[var(--hz-text-inverse)]">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <span className="text-[15px] font-semibold">Insurance Cloud</span>
      </div>
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </section>

    <section className="hidden lg:flex w-[46%] min-h-screen bg-[var(--hz-primary-800)] text-[var(--hz-text-inverse)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(90deg,transparent_47px,white_48px),linear-gradient(transparent_47px,white_48px)] bg-[length:48px_48px]" />
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      {/* Centred on the same line as the form: the form column's 24px padding and 32px logo row sit above it. */}
      <div className="relative z-10 flex w-full flex-col justify-center px-10 pt-14 pb-6 xl:px-14">
        <div className="max-w-lg">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[13px] text-white/80">
            <ShieldCheck className="h-4 w-4" />
            Secure insurance operations workspace
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Policies, endorsements and approvals in one place.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-white/70">
            Every change is prepared by one person and decided by another, with the facts that matter shown at the point of decision.
          </p>
          <ul className="mt-8 space-y-3 text-[14px] text-white/80">
            {['Maker and checker on every change', 'Branch access decided by the server', 'A full history of who did what'].map((line) => (
              <li key={line} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
    {footer}
  </main>
);

export const SignInPanel: React.FC<{
  title: string;
  subtitle: string;
  onBack?: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, onBack, children }) => (
  <div>
    <div className="pb-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--hz-text-muted)] hover:text-[var(--hz-text-primary)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </button>
      )}
      <h2 className="text-2xl font-semibold tracking-tight text-[var(--hz-text-primary)]">{title}</h2>
      <p className="mt-1.5 text-sm text-[var(--hz-text-muted)]">{subtitle}</p>
    </div>
    {children}
  </div>
);

const fieldInput =
  'w-full outline-none text-sm text-[var(--hz-text-primary)] placeholder:text-[var(--hz-text-disabled)] bg-transparent';

export const EmailField: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => (
  <label className="block">
    <span className="text-sm font-medium text-[var(--hz-text-primary)]">Email address</span>
    <span className="hz-field mt-2 flex h-10 items-center gap-2 px-3">
      <Mail className="w-4 h-4 text-[var(--hz-text-muted)]" />
      <input
        type="email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldInput}
        placeholder="name@company.co.ke"
        autoComplete="email"
      />
    </span>
  </label>
);

export const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: 'current-password' | 'new-password';
  error?: string;
}> = ({ label, value, onChange, placeholder, autoComplete, error }) => (
  <label className="block">
    <span className="text-sm font-medium text-[var(--hz-text-primary)]">{label}</span>
    <span className="hz-field mt-2 flex h-10 items-center gap-2 px-3">
      <LockKeyhole className="w-4 h-4 text-[var(--hz-text-muted)]" />
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldInput}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </span>
    <FieldError message={error} />
  </label>
);

export const SubmitButton: React.FC<{ busy?: boolean; busyLabel?: string; children: React.ReactNode }> = ({
  busy,
  busyLabel,
  children,
}) => (
  <button type="submit" disabled={busy} className="hz-button hz-button-primary w-full h-10">
    {busy && busyLabel ? busyLabel : children}
  </button>
);

export const OtpCodeField: React.FC<{ value: string; onChange: (value: string) => void; error?: string }> = ({
  value,
  onChange,
  error,
}) => (
  <label className="block">
    <span className="text-sm font-medium text-[var(--hz-text-primary)]">Verification code</span>
    <span className="hz-field mt-2 flex h-10 items-center gap-2 px-3">
      <KeyRound className="w-4 h-4 text-[var(--hz-text-muted)]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        className="w-full outline-none text-lg font-mono font-bold tracking-[0.3em] text-[var(--hz-text-primary)] placeholder:text-[var(--hz-text-disabled)] bg-transparent"
        placeholder="000000"
        inputMode="numeric"
        autoComplete="one-time-code"
      />
    </span>
    <FieldError message={error} />
  </label>
);

export const OtpResendRow: React.FC<{ secondsRemaining: number; onResend: () => void; disabled?: boolean }> = ({
  secondsRemaining,
  onResend,
  disabled,
}) => (
  <div className="flex items-center justify-between text-[13px]">
    <span className="text-[var(--hz-text-subtle)]">
      {secondsRemaining > 0
        ? `Resend available in ${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`
        : 'Didn’t get a code?'}
    </span>
    <button
      type="button"
      onClick={onResend}
      disabled={secondsRemaining > 0 || disabled}
      className="font-medium text-[var(--hz-primary)] underline-offset-4 hover:underline disabled:text-[var(--hz-text-disabled)] disabled:no-underline disabled:cursor-not-allowed"
    >
      Resend code
    </button>
  </div>
);

export const NewPasswordFields: React.FC<{
  newPassword: string;
  confirmPassword: string;
  onNewPassword: (value: string) => void;
  onConfirmPassword: (value: string) => void;
  newPasswordError?: string;
  confirmError?: string;
}> = ({ newPassword, confirmPassword, onNewPassword, onConfirmPassword, newPasswordError, confirmError }) => (
  <>
    <PasswordField
      label="New password"
      value={newPassword}
      onChange={onNewPassword}
      placeholder="Enter new password"
      autoComplete="new-password"
      error={newPasswordError}
    />
    <PasswordStrengthMeter password={newPassword} />
    <PasswordField
      label="Confirm new password"
      value={confirmPassword}
      onChange={onConfirmPassword}
      placeholder="Re-enter new password"
      autoComplete="new-password"
      error={confirmError}
    />
  </>
);

import React from 'react';
import { ArrowLeft, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { FieldError, PasswordStrengthMeter } from '../horizon';

/**
 * The sign-in screens' presentation, shared by the mock demo (`LoginPage`) and backend mode
 * (`backend/auth/SignInPage`). Nothing here holds data or decides anything.
 */

export const SignInFrame: React.FC<{ children: React.ReactNode; footer?: React.ReactNode }> = ({ children, footer }) => (
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
              <div className="text-[13px] uppercase tracking-[0.18em] text-blue-100">Operations Portal</div>
            </div>
          </div>
        </div>

        <div className="max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-[var(--hz-radius-md)] bg-white/10 border border-white/20 px-3 py-1.5 text-[13px] font-semibold text-blue-50 mb-5">
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

        <div className="grid grid-cols-3 gap-3 text-[13px]">
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
            <div className="text-[13px] uppercase tracking-[0.16em] text-[var(--hz-primary)]">Operations Portal</div>
          </div>
        </div>
        {children}
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
  <div className="hz-panel shadow-sm">
    <div className="px-7 pt-7 pb-5 border-b border-[var(--hz-divider)]">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--hz-text-subtle)] hover:text-[var(--hz-text-primary)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </button>
      )}
      <h2 className="text-xl font-extrabold text-[var(--hz-text-primary)]">{title}</h2>
      <p className="text-[13px] text-[var(--hz-text-subtle)] mt-1">{subtitle}</p>
    </div>
    {children}
  </div>
);

const fieldInput =
  'w-full outline-none text-sm text-[var(--hz-text-primary)] placeholder:text-[var(--hz-text-disabled)] bg-transparent';

export const EmailField: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => (
  <label className="block">
    <span className="text-[13px] font-bold text-[var(--hz-text-secondary)]">Email address</span>
    <span className="hz-field mt-1.5 flex items-center gap-2 px-3">
      <Mail className="w-4 h-4 text-[var(--hz-text-subtle)]" />
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
    <span className="text-[13px] font-bold text-[var(--hz-text-secondary)]">{label}</span>
    <span className="hz-field mt-1.5 flex items-center gap-2 px-3">
      <LockKeyhole className="w-4 h-4 text-[var(--hz-text-subtle)]" />
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
  <button type="submit" disabled={busy} className="hz-button hz-button-primary w-full h-10 disabled:opacity-60">
    {busy && busyLabel ? busyLabel : children}
  </button>
);

export const OtpCodeField: React.FC<{ value: string; onChange: (value: string) => void; error?: string }> = ({
  value,
  onChange,
  error,
}) => (
  <label className="block">
    <span className="text-[13px] font-bold text-[var(--hz-text-secondary)]">Verification code</span>
    <span className="hz-field mt-1.5 flex items-center gap-2 px-3">
      <KeyRound className="w-4 h-4 text-[var(--hz-text-subtle)]" />
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
      className="font-semibold text-[var(--hz-primary)] hover:underline disabled:text-[var(--hz-text-disabled)] disabled:no-underline disabled:cursor-not-allowed"
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

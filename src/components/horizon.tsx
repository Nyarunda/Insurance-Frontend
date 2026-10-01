import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, Info, Loader2, ShieldCheck, XCircle } from 'lucide-react';

type FeedbackToneForSound = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const TOAST_TONE_FREQUENCIES: Record<FeedbackToneForSound, number> = {
  success: 587.33,
  info: 523.25,
  warning: 392.0,
  danger: 261.63,
  neutral: 440.0,
};

function playToastSound(tone: FeedbackToneForSound) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = TOAST_TONE_FREQUENCIES[tone];
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.35);
    oscillator.onended = () => ctx.close();
  } catch {
    // Audio unavailable or blocked by the browser — fail silently.
  }
}

type FeedbackTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const feedbackToneClass: Record<FeedbackTone, string> = {
  success: 'border-[var(--hz-success-border)] bg-[var(--hz-success-bg)] text-[var(--hz-success-text)]',
  danger: 'border-[var(--hz-danger-border)] bg-[var(--hz-danger-bg)] text-[var(--hz-danger-text)]',
  warning: 'border-[var(--hz-warning-border)] bg-[var(--hz-warning-bg)] text-[var(--hz-warning-text)]',
  info: 'border-[var(--hz-info-border)] bg-[var(--hz-info-bg)] text-[var(--hz-info-text)]',
  neutral: 'border-[var(--hz-neutral-border)] bg-[var(--hz-neutral-bg)] text-[var(--hz-neutral-text)]',
};

const feedbackIcons: Record<FeedbackTone, React.ElementType> = {
  success: CheckCircle2,
  danger: XCircle,
  warning: AlertTriangle,
  info: Info,
  neutral: AlertCircle,
};

export function Section({
  title,
  eyebrow,
  action,
  children,
  className = '',
}: {
  title?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t border-[var(--hz-divider)] pt-4 ${className}`}>
      {(title || eyebrow || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--hz-text-subtle)]">
                {eyebrow}
              </div>
            )}
            {title && <h2 className="text-[13px] font-semibold uppercase tracking-[0.03em] text-[var(--hz-text-primary)]">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusMeta {
  tone: StatusTone;
  icon?: React.ElementType;
}

const statusBadgeToneClass: Record<StatusTone, string> = {
  success: 'border-[var(--hz-success-border)] bg-[var(--hz-success-bg)] text-[var(--hz-success-text)]',
  warning: 'border-[var(--hz-warning-border)] bg-[var(--hz-warning-bg)] text-[var(--hz-warning-text)]',
  danger: 'border-[var(--hz-danger-border)] bg-[var(--hz-danger-bg)] text-[var(--hz-danger-text)]',
  info: 'border-[var(--hz-info-border)] bg-[var(--hz-info-bg)] text-[var(--hz-info-text)]',
  neutral: 'border-[var(--hz-neutral-border)] bg-[var(--hz-neutral-bg)] text-[var(--hz-neutral-text)]',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  icon: Icon,
}: {
  label: React.ReactNode;
  tone?: StatusTone;
  icon?: React.ElementType;
}) {
  return (
    <span
      className={`inline-flex h-5 items-center gap-1 rounded-[3px] border px-1.5 text-[11px] font-semibold uppercase tracking-[0.02em] whitespace-nowrap ${statusBadgeToneClass[tone]}`}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />}
      {label}
    </span>
  );
}

const liveDotToneClass: Record<StatusTone, string> = {
  success: 'bg-[var(--hz-success)]',
  warning: 'bg-[var(--hz-warning)]',
  danger: 'bg-[var(--hz-danger)]',
  info: 'bg-[var(--hz-info)]',
  neutral: 'bg-[var(--hz-text-subtle)]',
};

/** A small pulsing dot for "live" / real-time indicators (system health, active SLA clocks, sync status). */
export function LiveDot({ tone = 'success', size = 'sm', className = '' }: { tone?: StatusTone; size?: 'sm' | 'md'; className?: string }) {
  const sizeClass = size === 'md' ? 'h-2.5 w-2.5' : 'h-1.5 w-1.5';
  return <span className={`inline-block shrink-0 rounded-full animate-pulse ${sizeClass} ${liveDotToneClass[tone]} ${className}`} />;
}

export function Status({ tone = 'neutral', children }: { tone?: 'success' | 'warning' | 'danger' | 'neutral'; children: React.ReactNode }) {
  const toneClass = {
    success: 'text-[var(--hz-success-text)] bg-[var(--hz-success-bg)] border-[var(--hz-success-border)]',
    warning: 'text-[var(--hz-warning-text)] bg-[var(--hz-warning-bg)] border-[var(--hz-warning-border)]',
    danger: 'text-[var(--hz-danger-text)] bg-[var(--hz-danger-bg)] border-[var(--hz-danger-border)]',
    neutral: 'text-[var(--hz-neutral-text)] bg-[var(--hz-neutral-bg)] border-[var(--hz-neutral-border)]',
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-[3px] border px-1.5 py-0.5 text-[11px] font-semibold uppercase ${toneClass}`}>
      {children}
    </span>
  );
}

export function HorizonAlert({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: FeedbackTone;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const Icon = feedbackIcons[tone];

  return (
    <div className={`rounded-[3px] border px-3 py-2 text-[12px] ${feedbackToneClass[tone]}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          {title && <div className="font-bold text-[var(--hz-text-primary)]">{title}</div>}
          <div className={title ? 'mt-0.5' : ''}>{children}</div>
        </div>
        {action}
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] font-semibold text-[var(--hz-danger)]">{message}</p>;
}

export function CharacterCounter({ current, max }: { current: number; max: number }) {
  const remaining = max - current;
  const tone =
    remaining < 0
      ? 'text-[var(--hz-danger)]'
      : remaining <= Math.max(20, max * 0.1)
      ? 'text-[var(--hz-warning)]'
      : 'text-[var(--hz-text-subtle)]';

  return (
    <div className={`mt-1 text-right text-[10px] font-mono ${tone}`}>
      {current}/{max} characters
    </div>
  );
}

export function ValidationSummary({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <HorizonAlert tone="danger" title={`${errors.length} field${errors.length > 1 ? 's need' : ' needs'} attention`}>
      <ul className="list-disc space-y-0.5 pl-4">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </HorizonAlert>
  );
}

export interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 12 characters', test: (pw) => pw.length >= 12 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'One symbol', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password));
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const passedCount = PASSWORD_REQUIREMENTS.filter((requirement) => requirement.test(password)).length;
  const strengthPct = Math.round((passedCount / PASSWORD_REQUIREMENTS.length) * 100);
  const tone = strengthPct === 100 ? 'success' : strengthPct >= 60 ? 'warning' : 'danger';
  const barColorClass =
    tone === 'success' ? 'bg-[var(--hz-success)]' : tone === 'warning' ? 'bg-[var(--hz-warning)]' : 'bg-[var(--hz-danger)]';

  return (
    <div className="space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--hz-surface-muted)]">
        <div
          className={`h-1.5 rounded-full transition-all ${barColorClass}`}
          style={{ width: `${password ? Math.max(strengthPct, 8) : 0}%` }}
        />
      </div>
      <ul className="grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const passed = requirement.test(password);
          return (
            <li
              key={requirement.label}
              className={`flex items-center gap-1.5 ${passed ? 'text-[var(--hz-success)]' : 'text-[var(--hz-text-subtle)]'}`}
            >
              <ShieldCheck className="h-3 w-3 shrink-0" />
              <span>{requirement.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HorizonToast({
  message,
  tone = 'success',
}: {
  message: string | null;
  tone?: FeedbackTone;
}) {
  useEffect(() => {
    if (message) {
      playToastSound(tone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!message) return null;

  const Icon = feedbackIcons[tone];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex max-w-md items-center gap-3 rounded-[6px] border border-[var(--hz-border-default)] bg-[var(--hz-surface-main)] px-4 py-3 text-[13px] text-[var(--hz-text-primary)] shadow-lg">
      <Icon className={`h-5 w-5 shrink-0 ${tone === 'success' ? 'text-[var(--hz-success)]' : tone === 'danger' ? 'text-[var(--hz-danger)]' : tone === 'warning' ? 'text-[var(--hz-warning)]' : 'text-[var(--hz-info)]'}`} />
      <span>{message}</span>
    </div>
  );
}

export function HorizonLoader({ tip = 'Loading...' }: { tip?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-[var(--hz-primary)]">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-xs font-semibold text-[var(--hz-text-secondary)]">{tip}</span>
    </div>
  );
}

const progressBarToneClass: Record<'success' | 'warning' | 'danger' | 'info', string> = {
  success: 'bg-[var(--hz-success)]',
  warning: 'bg-[var(--hz-warning)]',
  danger: 'bg-[var(--hz-danger)]',
  info: 'bg-[var(--hz-info)]',
};

export function WorkflowProgress({ value, tone = 'warning' }: { value: number; tone?: 'success' | 'warning' | 'danger' | 'info' }) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="h-2 flex-1 rounded-full bg-[var(--hz-surface-muted)] overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ease-out ${progressBarToneClass[tone]}`}
          style={{ width: `${normalized}%` }}
        />
      </div>
      <span className="w-9 text-right font-mono font-semibold text-[var(--hz-text-secondary)]">{normalized}%</span>
    </div>
  );
}

export function HorizonPage({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`space-y-3 pb-8 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function HorizonPageTitle({
  title,
  subtitle,
  backLabel,
  onBack,
  actions,
}: {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} className="hz-icon-button" title={backLabel || 'Back'}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-semibold leading-6 text-[var(--hz-text-primary)]">{title}</h1>
          {subtitle && <div className="truncate text-[12px] text-[var(--hz-text-secondary)]">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function HorizonPageContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`hz-panel overflow-hidden ${className}`}>{children}</div>;
}

const formatXml = (value: string) => {
  const compact = value.replace(/>\s+</g, '><').trim();
  let depth = 0;

  return compact
    .replace(/(>)(<)(\/*)/g, '$1\n$2$3')
    .split('\n')
    .map((line) => {
      if (/^<\//.test(line)) depth = Math.max(depth - 1, 0);
      const padded = `${'  '.repeat(depth)}${line}`;
      if (/^<[^!?/][^>]*[^/]>\s*$/.test(line)) depth += 1;
      return padded;
    })
    .join('\n');
};

export function HorizonContentViewer({
  content,
  contentType = 'TEXT',
}: {
  content: string;
  contentType?: 'XML' | 'JSON' | 'TEXT';
}) {
  const formatted =
    contentType === 'JSON'
      ? JSON.stringify(JSON.parse(content), null, 2)
      : contentType === 'XML'
      ? formatXml(content)
      : content;

  return (
    <pre className="max-h-[420px] overflow-auto bg-[var(--hz-surface-subtle)] p-3 text-[11px] leading-5 text-[var(--hz-text-primary)] font-[ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]">
      {formatted}
    </pre>
  );
}

export function KeyValueGrid({
  items,
  columns = 'md:grid-cols-2',
}: {
  items: Array<{ label: string; value: React.ReactNode; valueClassName?: string }>;
  columns?: string;
}) {
  return (
    <dl className={`grid grid-cols-1 ${columns} gap-x-6 gap-y-2 text-xs`}>
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(8rem,0.9fr)_minmax(0,1.1fr)] items-baseline gap-3 border-b border-[var(--hz-divider)] py-1.5">
          <dt className="text-[var(--hz-text-subtle)]">{item.label}</dt>
          <dd className={`text-right font-medium text-[var(--hz-text-primary)] ${item.valueClassName || ''}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Metric({ label, value, note, tone = 'neutral' }: { label: string; value: React.ReactNode; note?: string; tone?: 'success' | 'warning' | 'neutral' }) {
  const toneClass = tone === 'success' ? 'text-[var(--hz-success)]' : tone === 'warning' ? 'text-[var(--hz-warning)]' : 'text-[var(--hz-text-primary)]';

  return (
    <div className="border-b border-[var(--hz-divider)] pb-3">
      <div className="text-[11px] font-medium text-[var(--hz-text-subtle)]">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold ${toneClass}`}>{value}</div>
      {note && <div className="mt-0.5 text-[10px] text-[var(--hz-text-subtle)]">{note}</div>}
    </div>
  );
}

export function Money({
  amount,
  currency = 'KES',
  compact = false,
  negative = false,
  className = '',
}: {
  amount: number;
  currency?: string;
  compact?: boolean;
  negative?: boolean;
  className?: string;
}) {
  const absolute = Math.abs(amount);
  const prefix = currency ? `${currency} ` : '';
  const formatted = compact && absolute >= 1000000
    ? `${prefix}${(absolute / 1000000).toFixed(absolute >= 10000000 ? 0 : 1)}M`
    : `${prefix}${absolute.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const display = negative || amount < 0 ? `(${formatted})` : formatted;

  return <span className={`font-mono tabular-nums ${className}`}>{display}</span>;
}

/**
 * Line tabs with WAI-ARIA tab semantics: one tab stop (the active tab), arrow keys move
 * between tabs and select them, Home/End jump to the ends. Wide tab sets scroll sideways.
 */
export function WorkspaceTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  label = 'Workspace sections',
}: {
  tabs: readonly { id: T; label: string; count?: number }[];
  activeTab: T;
  onChange: (tab: T) => void;
  label?: string;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === activeTab);
    const next = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined || index < 0) return;
    event.preventDefault();
    onChange(tabs[next].id);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div className="sticky top-0 z-10 border-b border-[var(--hz-border-grid)] bg-[var(--hz-bg-app)]">
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="flex items-center gap-5 overflow-x-auto overscroll-x-contain text-[13px] font-medium"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`-mb-px border-b-2 px-0.5 py-2 whitespace-nowrap transition-colors ${
                active ? 'border-[var(--hz-primary-700)] font-semibold text-[var(--hz-primary-700)]' : 'border-transparent text-[var(--hz-text-secondary)] hover:text-[var(--hz-text-primary)]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="ml-1 font-mono text-[10px] text-[var(--hz-text-subtle)]">{tab.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Approval / workflow status panel
   Server-computed workflow state rendered per the approval template:
   APPROVED green · PENDING blue · REFERRED amber · REJECTED red ·
   WAITING grey · SLA breach red.
   ------------------------------------------------------------------ */

export type ApprovalStageState = 'APPROVED' | 'PENDING' | 'REFERRED' | 'REJECTED' | 'WAITING';

export interface ApprovalStage {
  label: string;
  state: ApprovalStageState;
  actor?: string;
  assignee?: string;
  timestamp?: string;
  dueAt?: string;
  slaRemaining?: string;
  slaBreached?: boolean;
}

const approvalStageTone: Record<ApprovalStageState, StatusTone> = {
  APPROVED: 'success',
  PENDING: 'info',
  REFERRED: 'warning',
  REJECTED: 'danger',
  WAITING: 'neutral',
};

export function ApprovalStatusPanel({
  title = 'Approval Status',
  maker,
  submittedAt,
  stages,
  canApprove,
  canReject,
  canRefer,
  denialReason,
  onApprove,
  onReject,
  onRefer,
}: {
  title?: string;
  maker: string;
  submittedAt: string;
  stages: ApprovalStage[];
  canApprove?: boolean;
  canReject?: boolean;
  canRefer?: boolean;
  denialReason?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onRefer?: () => void;
}) {
  const currentIndex = stages.findIndex((stage) => stage.state === 'PENDING' || stage.state === 'REFERRED');
  const current = currentIndex >= 0 ? stages[currentIndex] : undefined;

  return (
    <section className="hz-panel">
      <div className="border-b border-[var(--hz-border-grid)] px-3 py-2">
        <div className="hz-section-label">{title}</div>
        {current && (
          <div className="mt-0.5 text-[13px] font-semibold text-[var(--hz-text-primary)]">
            Stage {currentIndex + 1} of {stages.length} — {current.label}
          </div>
        )}
      </div>

      <ol className="divide-y divide-[var(--hz-border-grid)] text-[13px]">
        <li className="px-3 py-2">
          <div className="hz-section-label">Maker</div>
          <div className="font-medium text-[var(--hz-text-primary)]">{maker}</div>
          <div className="text-[12px] text-[var(--hz-text-muted)]">Submitted {submittedAt}</div>
        </li>
        {stages.map((stage, index) => (
          <li key={stage.label} className={`px-3 py-2 ${stage.state === 'PENDING' ? 'bg-[var(--hz-surface-selected)]' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="hz-section-label">Stage {index + 1}</div>
                <div className="font-medium text-[var(--hz-text-primary)]">{stage.label}</div>
              </div>
              <StatusBadge label={stage.state} tone={approvalStageTone[stage.state]} />
            </div>
            {stage.actor && <div className="mt-0.5 text-[12px] text-[var(--hz-text-secondary)]">{stage.actor}</div>}
            {stage.assignee && <div className="mt-0.5 text-[12px] text-[var(--hz-text-secondary)]">Assigned: {stage.assignee}</div>}
            {stage.timestamp && <div className="text-[12px] text-[var(--hz-text-muted)]">{stage.timestamp}</div>}
            {stage.dueAt && <div className="text-[12px] text-[var(--hz-text-muted)]">Due: {stage.dueAt}</div>}
            {stage.slaRemaining && (
              <div
                className={`mt-0.5 text-[12px] font-semibold tabular-nums ${
                  stage.slaBreached ? 'text-[var(--hz-danger-text)]' : 'text-[var(--hz-text-primary)]'
                }`}
              >
                {stage.slaBreached ? 'SLA BREACHED' : `SLA remaining: ${stage.slaRemaining}`}
              </div>
            )}
          </li>
        ))}
      </ol>

      {(onApprove || onReject || onRefer) && (
        <div className="border-t border-[var(--hz-border-grid)] px-3 py-2">
          {denialReason && <div className="mb-2 text-[12px] text-[var(--hz-text-secondary)]">{denialReason}</div>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {onRefer && (
                <button type="button" onClick={onRefer} disabled={!canRefer} className="hz-button hz-button-secondary">
                  Refer for Information
                </button>
              )}
              {onReject && (
                <button type="button" onClick={onReject} disabled={!canReject} className="hz-button hz-button-danger">
                  Reject
                </button>
              )}
            </div>
            {onApprove && (
              <button
                type="button"
                onClick={onApprove}
                disabled={!canApprove}
                title={!canApprove ? denialReason : undefined}
                className="hz-button hz-button-primary"
              >
                Approve
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

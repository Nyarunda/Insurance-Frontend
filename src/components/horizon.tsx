import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Info, Loader2, Search, ShieldCheck, XCircle } from 'lucide-react';

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
    <section className={`pt-2 ${className}`}>
      {(title || eyebrow || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <div className="text-xs font-medium text-[var(--hz-text-subtle)]">
                {eyebrow}
              </div>
            )}
            {title && <h2 className="text-base font-semibold text-[var(--hz-text-primary)]">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** The one card: a 6px panel whose padding follows density (`.hz-card`). `flush` drops padding for tables. */
export function Card({
  flush = false,
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { flush?: boolean }) {
  return (
    <div className={`${flush ? 'hz-panel overflow-hidden' : 'hz-card'} ${className}`} {...props}>
      {children}
    </div>
  );
}

/** The template's metric grid: one column, four equal columns on wide screens, 16px gaps. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">{children}</div>;
}

/** A metric card, as the template's (16px padding and gaps, a 28px icon tile, a 30px value). */
export function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  badge,
  testId,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  caption: React.ReactNode;
  badge?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="hz-template-card hz-stat-card flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-1 px-4">
        <span className="flex size-7 items-center justify-center rounded-lg border border-[var(--hz-border-grid)] bg-[var(--hz-surface-muted)] text-[var(--hz-text-muted)]">
          <Icon className="size-4" />
        </span>
        <span className="text-sm text-[var(--hz-text-muted)]">{label}</span>
      </div>
      <div className="flex flex-col gap-1 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-3xl font-medium leading-none tracking-tight tabular-nums text-[var(--hz-text-primary)]" data-testid={testId}>
            {value}
          </span>
          {badge}
        </div>
        <span className="truncate text-sm text-[var(--hz-text-muted)]">{caption}</span>
      </div>
    </div>
  );
}

/** Title and description on the left, an optional action on the right; 12px body floor. */
export function CardHeader({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-tight text-[var(--hz-text-primary)]">{title}</h3>
        {description && <p className="mt-1 text-[13px] text-[var(--hz-text-muted)]">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
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
  square = false,
}: {
  label: React.ReactNode;
  tone?: StatusTone;
  icon?: React.ElementType;
  square?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1 border px-2 text-xs font-medium whitespace-nowrap ${square ? 'rounded-sm' : 'rounded-full'} ${statusBadgeToneClass[tone]}`}
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
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${toneClass}`}>
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
    <div data-slot="alert" className={`rounded-lg border px-4 py-3 text-[13px] ${feedbackToneClass[tone]}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          {title && <div className="font-medium text-[var(--hz-text-primary)]">{title}</div>}
          <div className={title ? 'mt-0.5' : ''}>{children}</div>
        </div>
        {action}
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[13px] font-semibold text-[var(--hz-danger)]">{message}</p>;
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
    <div className={`mt-1 text-right text-[13px] font-mono ${tone}`}>
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
      <ul className="grid grid-cols-1 gap-1 text-[13px] sm:grid-cols-2">
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex max-w-md items-center gap-3 rounded-lg border border-[var(--hz-border-default)] bg-[var(--hz-surface-main)] px-4 py-3 text-[13px] text-[var(--hz-text-primary)] shadow-lg">
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
    <div className={`hz-screen-enter flex flex-col gap-4 pb-8 md:gap-6 ${className}`} {...props}>
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
          <h1 className="truncate text-2xl font-semibold leading-8 tracking-tight text-[var(--hz-text-primary)]">{title}</h1>
          {subtitle && <div className="truncate text-sm text-[var(--hz-text-muted)]">{subtitle}</div>}
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
    <dl className={`grid grid-cols-1 ${columns} gap-x-6 gap-y-2 text-[13px]`}>
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(8rem,0.9fr)_minmax(0,1.1fr)] items-baseline gap-3 border-b border-[var(--hz-divider)] py-2 last:border-b-0">
          <dt className="text-[var(--hz-text-muted)]">{item.label}</dt>
          <dd className={`text-right font-medium text-[var(--hz-text-primary)] ${item.valueClassName || ''}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A record's header (Studio Admin profile): a mark in a progress ring, the title, a subtitle,
 * badges below, and actions on the right. `progress` (0-100) fills the ring; `progressLabel` reads it out.
 */
export function RecordHeader({
  icon: Icon,
  title,
  subtitle,
  badges,
  actions,
  progress,
  progressLabel,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  progress?: number;
  progressLabel?: string;
}) {
  const filled = progress === undefined ? 0 : Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid size-[72px] shrink-0 place-items-center sm:size-[92px]">
          {progressLabel && <span className="sr-only">{progressLabel}</span>}
          <svg aria-hidden="true" className="col-start-1 row-start-1 size-full -rotate-90" viewBox="0 0 100 100">
            <circle className="fill-none stroke-[var(--hz-divider)]" cx="50" cy="50" r="46" strokeWidth="2.5" />
            {filled > 0 && (
              <circle
                className="fill-none stroke-[var(--hz-success)]"
                cx="50"
                cy="50"
                pathLength="100"
                r="46"
                strokeDasharray={`${filled} 100`}
                strokeLinecap="round"
                strokeWidth="2.5"
              />
            )}
          </svg>
          <span className="col-start-1 row-start-1 grid size-16 place-items-center rounded-full bg-[var(--hz-surface-muted)] text-[var(--hz-text-primary)] sm:size-20">
            <Icon aria-hidden="true" className="size-7 sm:size-8" strokeWidth={1.5} />
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h1 className="truncate text-xl font-semibold leading-6 tracking-tight text-[var(--hz-text-primary)] sm:text-2xl sm:leading-7">{title}</h1>
            {subtitle && <p className="truncate text-sm leading-5 text-[var(--hz-text-muted)]">{subtitle}</p>}
          </div>
          {badges && <div className="flex flex-wrap gap-2">{badges}</div>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** An outline tag for plain facts in a record header (branch, insurer, currency). */
export function OutlineTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[22px] items-center rounded-sm border border-[var(--hz-border)] px-2 text-[13px] font-medium whitespace-nowrap text-[var(--hz-text-primary)]">
      {children}
    </span>
  );
}

/** A titled block of a record; blocks are separated by `DetailDivider`. */
export function DetailGroup({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-medium leading-tight text-[var(--hz-text-primary)]">{title}</h2>
          {description && <p className="text-sm text-[var(--hz-text-muted)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DetailDivider({ vertical = false }: { vertical?: boolean }) {
  return vertical ? (
    <div role="separator" aria-orientation="vertical" className="hidden w-px bg-[var(--hz-divider)] lg:block" />
  ) : (
    <hr className="my-4 border-0 border-t border-[var(--hz-divider)]" />
  );
}

/** Label over value, in up to three columns of stacked facts (the template's `dl`). */
export function DetailGrid({ items, columns = 3 }: { items: Array<{ label: string; value: React.ReactNode }>; columns?: 1 | 2 | 3 }) {
  const per = Math.ceil(items.length / columns) || 1;
  const stacks = Array.from({ length: columns }, (_, index) => items.slice(index * per, (index + 1) * per)).filter((stack) => stack.length);
  return (
    <dl className={`grid gap-8 ${columns > 1 ? 'sm:grid-cols-2' : ''} ${columns > 2 ? 'xl:grid-cols-3 xl:gap-12' : ''}`}>
      {stacks.map((stack, index) => (
        <div key={index} className="flex flex-col gap-5">
          {stack.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <dt className="text-[13px] text-[var(--hz-text-muted)]">{item.label}</dt>
              <dd className="text-sm text-[var(--hz-text-primary)]">{item.value}</dd>
            </div>
          ))}
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------
   DESIGN-1 list and record building blocks (Studio Admin): every list
   page is a ListCard of rows, every record a set of DetailGroups with a
   SummaryList column. Pages compose these instead of styling their own.
   ------------------------------------------------------------------ */

/**
 * A list in one card, as the template's table card: title and hint with `actions` on the right, a
 * `toolbar` row (search, filters), the rows in their own bordered box, and a `footer` (count, paging).
 * `bare` drops the box, for a card whose body is not a table.
 */
export function ListCard({
  title,
  description,
  actions,
  toolbar,
  footer,
  children,
  bare = false,
  className = '',
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  bare?: boolean;
  className?: string;
}) {
  return (
    <section className={`hz-template-card flex flex-col gap-4 py-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-medium leading-none text-[var(--hz-text-primary)]">{title}</h2>
          {description && <p className="text-sm text-[var(--hz-text-muted)]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="flex flex-col gap-4 px-4">
        {toolbar && <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">{toolbar}</div>}
        {bare ? children : <div className="hz-table-box">{children}</div>}
        {footer && <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--hz-text-muted)]">{footer}</div>}
      </div>
    </section>
  );
}

/** The first cell of a list row: an icon tile, the record in bold, and one line under it. */
export function RecordCell({
  icon: Icon,
  title,
  detail,
  mono = false,
}: {
  icon: React.ElementType;
  title: React.ReactNode;
  detail?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--hz-border-grid)] bg-[var(--hz-surface-subtle)] text-[var(--hz-text-secondary)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <span className={`block font-medium text-[var(--hz-text-primary)] ${mono ? 'font-mono' : ''}`}>{title}</span>
        {detail && <span className="block text-[13px] text-[var(--hz-text-secondary)]">{detail}</span>}
      </div>
    </div>
  );
}

/** A value with a muted line under it, for list cells (a customer and their number, a time and its date). */
export function StackedCell({ value, detail }: { value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <>
      <span className="block text-[var(--hz-text-primary)]">{value}</span>
      {detail && <span className="block text-[13px] text-[var(--hz-text-muted)]">{detail}</span>}
    </>
  );
}

/** The last cell of an openable row. */
export function RowChevron() {
  return (
    <td className="w-8 text-right">
      <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 text-[var(--hz-text-muted)] transition-transform group-hover:translate-x-0.5" />
    </td>
  );
}

/** Props that make a table row open something, by click or Enter. */
export function openableRow(open: () => void) {
  return {
    tabIndex: 0,
    className: 'group cursor-pointer',
    onClick: open,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') open();
    },
  };
}

const dotToneClass: Record<StatusTone, string> = {
  success: 'bg-[var(--hz-success)]',
  warning: 'bg-[var(--hz-warning)]',
  danger: 'bg-[var(--hz-danger)]',
  info: 'bg-[var(--hz-info)]',
  neutral: 'bg-[var(--hz-text-subtle)]',
};

/** An outline tag led by a coloured dot: a stage, a step. */
export function DotTag({ label, tone = 'warning' }: { label: React.ReactNode; tone?: StatusTone }) {
  return (
    <span className="inline-flex h-[22px] items-center gap-1.5 rounded-sm border border-[var(--hz-border)] px-2 text-[13px] font-medium whitespace-nowrap text-[var(--hz-text-primary)]">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotToneClass[tone]}`} />
      {label}
    </span>
  );
}

/** Nothing to list: an icon, a line, and a hint. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  role = 'status',
}: {
  icon: React.ElementType;
  title: React.ReactNode;
  hint?: React.ReactNode;
  role?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center" role={role}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--hz-surface-muted)] text-[var(--hz-text-muted)]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-[var(--hz-text-primary)]">{title}</p>
      {hint && <p className="max-w-md text-[13px] text-[var(--hz-text-muted)]">{hint}</p>}
    </div>
  );
}

/** A search box with its icon. The label is for screen readers unless `showLabel`. */
export function SearchField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  className = 'w-full sm:w-72',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--hz-text-muted)]" />
      <input
        id={id}
        type="search"
        className="hz-field h-8 w-full pl-8 text-[13px]"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

/** A segmented choice of filters (pressed buttons), the look of the segmented tabs. */
export function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-[var(--hz-surface-muted)] p-[3px] text-[13px] font-medium">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id || 'all'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={`h-7 rounded-md px-3 whitespace-nowrap transition-all ${
              active ? 'bg-[var(--hz-surface-main)] text-[var(--hz-text-primary)] shadow-sm' : 'text-[var(--hz-text-muted)] hover:text-[var(--hz-text-primary)]'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A record's side column section: a small heading over its content. */
export function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-[var(--hz-text-primary)]">{title}</h2>
      {children}
    </section>
  );
}

/** Label left, value right, in a narrow column; `strong` closes the list with a total. */
export function SummaryList({ items }: { items: Array<{ label: string; value: React.ReactNode; strong?: boolean }> }) {
  return (
    <dl className="flex flex-col">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-baseline justify-between gap-3 py-1.5 text-sm ${
            item.strong ? 'mt-1 border-t border-[var(--hz-divider)] pt-2.5 font-semibold' : ''
          }`}
        >
          <dt className={item.strong ? 'text-[var(--hz-text-primary)]' : 'text-[13px] text-[var(--hz-text-muted)]'}>{item.label}</dt>
          <dd className="text-right tabular-nums text-[var(--hz-text-primary)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The change being asked for, set apart: a small label and the change in large type. */
export function ChangeCallout({
  label,
  change,
  children,
  ...props
}: {
  label: string;
  change?: React.ReactNode;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className="rounded-lg border border-[var(--hz-border-grid)] bg-[var(--hz-surface-subtle)] p-4" {...props}>
      <p className="text-[13px] text-[var(--hz-text-muted)]">{label}</p>
      {change && <div className="mt-1 text-lg font-semibold tracking-tight text-[var(--hz-text-primary)]">{change}</div>}
      {children && <div className={change ? 'mt-3' : 'mt-1'}>{children}</div>}
    </section>
  );
}

/** A record's body: the main column, a rule, and a narrow side column (stacked on small screens). */
export function RecordColumns({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_auto_17rem]">
      <div className="hz-record-body pb-4 lg:pb-0 lg:pr-6">{main}</div>
      <DetailDivider vertical />
      <div className="flex flex-col gap-4 border-t border-[var(--hz-divider)] pt-4 lg:border-t-0 lg:pt-0 lg:pl-6 [&>section+section]:border-t [&>section+section]:border-[var(--hz-divider)] [&>section+section]:pt-4">{side}</div>
    </div>
  );
}

export function Metric({ label, value, note, tone = 'neutral' }: { label: string; value: React.ReactNode; note?: string; tone?: 'success' | 'warning' | 'neutral' }) {
  const toneClass = tone === 'success' ? 'text-[var(--hz-success)]' : tone === 'warning' ? 'text-[var(--hz-warning)]' : 'text-[var(--hz-text-primary)]';

  return (
    <div className="border-b border-[var(--hz-divider)] pb-3">
      <div className="text-[13px] text-[var(--hz-text-muted)]">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold tracking-tight ${toneClass}`}>{value}</div>
      {note && <div className="mt-0.5 text-[12px] text-[var(--hz-text-subtle)]">{note}</div>}
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
  variant = 'segmented',
}: {
  tabs: readonly { id: T; label: string; count?: number }[];
  activeTab: T;
  onChange: (tab: T) => void;
  label?: string;
  variant?: 'segmented' | 'line';
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

  if (variant === 'line') {
    return (
      <div className="sticky top-0 z-10 overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-[var(--hz-divider)] bg-[var(--hz-bg-app)]">
        <div
          ref={listRef}
          role="tablist"
          aria-label={label}
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className="flex w-max min-w-full items-center gap-6 text-sm font-medium shadow-[inset_0_-1px_0_var(--hz-divider)]"
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
                className={`relative h-10 whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 ${
                  active
                    ? 'text-[var(--hz-text-primary)] after:bg-[var(--hz-text-primary)]'
                    : 'text-[var(--hz-text-muted)] hover:text-[var(--hz-text-primary)]'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && <span className="ml-1.5 font-mono text-[13px] text-[var(--hz-text-muted)]">{tab.count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 bg-[var(--hz-bg-app)] py-1">
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-lg bg-[var(--hz-surface-muted)] p-[3px] text-[13px] font-medium"
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
              className={`h-8 rounded-md px-3 whitespace-nowrap transition-all ${
                active ? 'bg-[var(--hz-surface-main)] text-[var(--hz-text-primary)] shadow-sm' : 'text-[var(--hz-text-muted)] hover:text-[var(--hz-text-primary)]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="ml-1.5 font-mono text-xs text-[var(--hz-text-muted)]">{tab.count}</span>}
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
          <li key={`${index}-${stage.label}`} className={`px-3 py-2 ${stage.state === 'PENDING' ? 'bg-[var(--hz-surface-selected)]' : ''}`}>
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

/**
 * Full-width approval strip for the top of a workspace: where the request is, who holds it,
 * and the decision buttons. The buttons only signal intent; the caller opens the decision
 * modal (see ApprovalDecisionModal) so every decision carries a comment.
 */
export function ApprovalBar({
  title = 'Approval',
  maker,
  submittedAt,
  stages,
  canApprove,
  canReject,
  canDelegate,
  denialReason,
  onApprove,
  onReject,
  onDelegate,
}: {
  title?: string;
  maker: string;
  submittedAt: string;
  stages: ApprovalStage[];
  canApprove?: boolean;
  canReject?: boolean;
  canDelegate?: boolean;
  denialReason?: string;
  onApprove: () => void;
  onReject: () => void;
  onDelegate: () => void;
}) {
  const currentIndex = stages.findIndex((stage) => stage.state === 'PENDING' || stage.state === 'REFERRED');
  const current = currentIndex >= 0 ? stages[currentIndex] : undefined;
  const rejected = stages.some((stage) => stage.state === 'REJECTED');
  const allApproved = stages.length > 0 && stages.every((stage) => stage.state === 'APPROVED');
  const tone: StatusTone = rejected ? 'danger' : allApproved ? 'success' : 'info';
  const heading = rejected
    ? 'Rejected'
    : allApproved
    ? 'Fully approved'
    : current
    ? `Stage ${currentIndex + 1} of ${stages.length} — ${current.label}`
    : 'No pending stage';
  const slaBreached = current?.slaBreached;

  return (
    <section
      aria-label={title}
      className={`hz-card ${rejected ? 'border-[var(--hz-danger-border)]' : allApproved ? 'border-[var(--hz-success-border)]' : 'border-[var(--hz-primary-500)]'}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="hz-section-label">{title}</span>
            <StatusBadge label={rejected ? 'REJECTED' : allApproved ? 'APPROVED' : 'AWAITING DECISION'} tone={tone} />
          </div>
          <div className="text-[15px] font-semibold text-[var(--hz-text-primary)]">{heading}</div>
          <div className="text-xs text-[var(--hz-text-secondary)]">
            Submitted by {maker} · {submittedAt}
            {current?.assignee && <> · Assigned to {current.assignee}</>}
            {current?.slaRemaining && (
              <span className={`ml-2 font-semibold tabular-nums ${slaBreached ? 'text-[var(--hz-danger-text)]' : 'text-[var(--hz-text-primary)]'}`}>
                {slaBreached ? 'SLA BREACHED' : `SLA ${current.slaRemaining} left`}
              </span>
            )}
          </div>
        </div>

        <ol className="flex flex-wrap items-center gap-2 text-xs" aria-label="Approval stages">
          {stages.map((stage, index) => (
            <li
              key={`${index}-${stage.label}`}
              title={[stage.actor, stage.assignee && `Assigned: ${stage.assignee}`, stage.timestamp, stage.dueAt && `Due: ${stage.dueAt}`]
                .filter(Boolean)
                .join(' · ') || undefined}
              className="flex items-center gap-1.5"
            >
              <span className="text-[var(--hz-text-muted)]">{index + 1}.</span>
              <span className="font-medium text-[var(--hz-text-primary)]">{stage.label}</span>
              <StatusBadge label={stage.state} tone={approvalStageTone[stage.state]} />
            </li>
          ))}
        </ol>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" onClick={onDelegate} disabled={!canDelegate} className="hz-button hz-button-secondary">
            Delegate
          </button>
          <button type="button" onClick={onReject} disabled={!canReject} className="hz-button hz-button-danger">
            Reject
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={!canApprove}
            title={!canApprove ? denialReason : undefined}
            className="hz-button hz-button-primary"
          >
            Approve
          </button>
        </div>
      </div>
      {denialReason && !canApprove && <div className="mt-3 text-xs text-[var(--hz-text-secondary)]">{denialReason}</div>}
    </section>
  );
}

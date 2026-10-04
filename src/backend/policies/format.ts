/** Display rules for policies (FI1-C). Identifiers are never shown (FI1-Q6); codes read as words. */

import type { StatusTone } from '../../components/horizon';
import type { CoverageStatus, LifecycleStatus } from './types';

export const COVERAGE_TONE: Record<CoverageStatus, StatusTone> = {
  ACTIVE: 'success',
  PENDING_INCEPTION: 'info',
  EXPIRED: 'neutral',
  CANCELLED: 'danger',
};

export const LIFECYCLE_TONE: Record<LifecycleStatus, StatusTone> = {
  BOUND: 'success',
  CANCELLED: 'danger',
};

/** A calendar date (`YYYY-MM-DD`), read as a date and never shifted by the viewer's time zone. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** A levy's rate as the backend states it: a percentage, or a fixed amount. */
export function levyRate(basis: string, rate: string, currency: string): string {
  return basis === 'PERCENT' ? `${Number(rate)}%` : `Fixed ${currency} ${rate}`;
}

/**
 * The duplicate evidence (C1-D16), shown wherever an identifier can collide: creating a customer
 * (`POST /clients`) and adding an identifier (`POST /clients/{id}/identifiers`). Both answer 409
 * `CUSTOMER_DUPLICATE_CANDIDATE` with the matches the user may see (number and matched identifier
 * types) and a count of the rest. The user sees exactly that before acknowledging; continuing needs
 * a ticked acknowledgement and a reason, sent in a changed body (so under a new idempotency key).
 */

import React from 'react';
import { FieldError, HorizonAlert } from '../../components/horizon';
import { ApiError } from '../../lib/api/errors';
import { identifierLabel } from './format';
import type { DuplicateDetails } from './types';

export const duplicatesOf = (error: unknown): DuplicateDetails | null =>
  error instanceof ApiError && error.code === 'CUSTOMER_DUPLICATE_CANDIDATE'
    ? {
        candidates: Array.isArray(error.details.candidates) ? (error.details.candidates as DuplicateDetails['candidates']) : [],
        hidden_candidates: typeof error.details.hidden_candidates === 'number' ? error.details.hidden_candidates : 0,
      }
    : null;

export const DuplicateNotice: React.FC<{ duplicates: DuplicateDetails }> = ({ duplicates }) => (
  <div role="alert">
    <HorizonAlert tone="warning" title="This identifier already belongs to another customer">
      {duplicates.candidates.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {duplicates.candidates.map((candidate) => (
            <li key={candidate.customer_no}>
              <span className="font-mono">{candidate.customer_no}</span>
              {candidate.matched?.length > 0 && ` · matches on ${candidate.matched.map(identifierLabel).join(', ')}`}
            </li>
          ))}
        </ul>
      )}
      {duplicates.hidden_candidates > 0 && (
        <p className="mt-1">
          {duplicates.hidden_candidates === 1
            ? '1 more match is outside the branches you can see.'
            : `${duplicates.hidden_candidates} more matches are outside the branches you can see.`}
        </p>
      )}
      <p className="mt-1">Check it is not the same customer. Records are never merged.</p>
    </HorizonAlert>
  </div>
);

/** The acknowledgement: a tick, then a required reason. */
export const DuplicateAcknowledgement: React.FC<{
  idPrefix: string;
  acknowledged: boolean;
  onAcknowledged: (value: boolean) => void;
  reason: string;
  onReason: (value: string) => void;
  error?: string;
}> = ({ idPrefix, acknowledged, onAcknowledged, reason, onReason, error }) => (
  <fieldset className="flex flex-col gap-3">
    <legend className="mb-1 text-base font-medium text-[var(--hz-text-primary)]">Continue with a duplicate</legend>
    <label className="flex items-start gap-2 text-sm text-[var(--hz-text-primary)]">
      <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledged(event.target.checked)} className="mt-0.5" />
      I have checked the matching customers and this is a different customer.
    </label>
    {acknowledged && (
      <div>
        <label htmlFor={`${idPrefix}-duplicate-reason`} className="mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]">
          Reason <span className="text-[var(--hz-danger)]">*</span>
        </label>
        <textarea
          id={`${idPrefix}-duplicate-reason`}
          value={reason}
          onChange={(event) => onReason(event.target.value)}
          maxLength={500}
          rows={2}
          aria-invalid={!!error}
          className={`hz-field w-full px-3 py-2 text-sm ${error ? 'hz-field-invalid' : ''}`}
        />
        <FieldError message={error} />
      </div>
    )}
  </fieldset>
);

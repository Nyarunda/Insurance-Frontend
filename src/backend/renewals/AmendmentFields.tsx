/**
 * The controlled amendments of an AMENDED renewal (RENEWALS-SURFACE-1 RS-B; R1-D4), read from the
 * product version in force when the new period starts, which is the one the server validates against:
 *
 * - **sum insured** (when the product rates on it);
 * - the other **rating factors**, as the product declares them (number, choice, yes/no);
 * - **optional benefits**, ticked to keep or add, unticked to remove;
 * - **limits** on the benefits the renewed cover holds;
 * - the **geographical limit**.
 *
 * The fields start from the policy's terms in force (and, when the renewal already has amendments,
 * from those). Only what differs from the terms in force is sent. Risk items are never offered (the
 * server cannot price them at renewal). Whether a change needs a checker is the server's rule; its
 * reasons show on the renewal once priced. The premium always comes from the tariff, never typed.
 */

import React from 'react';
import { FieldError, HorizonLoader } from '../../components/horizon';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import type { PolicyDetail } from '../policies/types';
import { parseFactorDecimal } from '../quotations/decimal';
import { useProductDetail, useProductVersion, versionInForce } from '../quotations/queries';
import type { RatingFactor } from '../quotations/types';
import type { RenewalChanges } from './types';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;
const SUM_INSURED = 'sum_insured';

export interface AmendmentState {
  sumInsured: string;
  factors: Record<string, string>;
  /** Optional benefit code -> included in the renewed cover. */
  optional: Record<string, boolean>;
  limits: Record<string, string>;
  geo: string;
}

const text = (value: unknown) => (value === undefined || value === null ? '' : typeof value === 'boolean' ? String(value) : String(value));

/** The fields as the terms in force stand, with any amendments already asked applied over them. */
export function initialAmendment(policy: PolicyDetail, asked: RenewalChanges = {}): AmendmentState {
  const version = policy.current_version;
  const optional: Record<string, boolean> = {};
  for (const benefit of version.cover.benefits) if (benefit.is_optional) optional[benefit.code] = true;
  for (const code of asked.add_benefits ?? []) optional[code] = true;
  for (const code of asked.remove_benefits ?? []) optional[code] = false;
  const factors: Record<string, string> = {};
  for (const [code, value] of Object.entries(version.risk.factors ?? {})) if (code !== SUM_INSURED) factors[code] = text(value);
  for (const [code, value] of Object.entries(asked.factors ?? {})) factors[code] = text(value);
  const limits: Record<string, string> = {};
  for (const benefit of version.cover.benefits) if (benefit.limit_amount !== null) limits[benefit.code] = benefit.limit_amount;
  for (const [code, value] of Object.entries(asked.limits ?? {})) limits[code] = value;
  return {
    sumInsured: asked.sum_insured ?? version.sum_insured ?? text(version.risk.factors?.[SUM_INSURED]),
    factors,
    optional,
    limits,
    geo: asked.geographical_limit ?? text(version.terms.geographical_limit),
  };
}

const sameNumber = (a: string, b: string | null | undefined) => {
  const x = parseFactorDecimal(a).value;
  return x !== null && b !== null && b !== undefined && Number(x) === Number(b);
};

/** What differs from the terms in force, in the server's shape; empty when nothing changed. */
export function changesOf(state: AmendmentState, policy: PolicyDetail, factorsDeclared: RatingFactor[]): RenewalChanges {
  const version = policy.current_version;
  const changes: RenewalChanges = {};
  const current = version.sum_insured ?? text(version.risk.factors?.[SUM_INSURED]);
  if (state.sumInsured.trim() && !sameNumber(state.sumInsured, current)) {
    changes.sum_insured = parseFactorDecimal(state.sumInsured).value ?? state.sumInsured.trim();
  }
  const factors: Record<string, string | boolean> = {};
  for (const factor of factorsDeclared) {
    if (factor.code === SUM_INSURED) continue;
    const raw = (state.factors[factor.code] ?? '').trim();
    if (!raw || raw === text(version.risk.factors?.[factor.code])) continue;
    if (factor.data_type === 'DECIMAL' && sameNumber(raw, text(version.risk.factors?.[factor.code]))) continue;
    factors[factor.code] = factor.data_type === 'BOOLEAN' ? raw === 'true' : factor.data_type === 'DECIMAL' ? parseFactorDecimal(raw).value ?? raw : raw;
  }
  if (Object.keys(factors).length) changes.factors = factors;
  const held = new Set(version.cover.benefits.map((benefit) => benefit.code));
  const add = Object.entries(state.optional).filter(([code, on]) => on && !held.has(code)).map(([code]) => code);
  const remove = Object.entries(state.optional).filter(([code, on]) => !on && held.has(code)).map(([code]) => code);
  if (add.length) changes.add_benefits = add.sort();
  if (remove.length) changes.remove_benefits = remove.sort();
  const limits: Record<string, string> = {};
  for (const benefit of version.cover.benefits) {
    const raw = (state.limits[benefit.code] ?? '').trim();
    if (raw && !remove.includes(benefit.code) && !sameNumber(raw, benefit.limit_amount)) limits[benefit.code] = parseFactorDecimal(raw).value ?? raw;
  }
  if (Object.keys(limits).length) changes.limits = limits;
  if (state.geo.trim() && state.geo.trim() !== text(version.terms.geographical_limit)) changes.geographical_limit = state.geo.trim();
  return changes;
}

/** Problems the form can see before sending (numbers that are not numbers); the server checks the rest. */
export function amendmentErrors(state: AmendmentState, factorsDeclared: RatingFactor[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const bad = (raw: string) => raw.trim() !== '' && (parseFactorDecimal(raw).error || parseFactorDecimal(raw).value === null);
  if (bad(state.sumInsured)) errors.sum_insured = parseFactorDecimal(state.sumInsured).error ?? 'Enter a number.';
  for (const factor of factorsDeclared) {
    if (factor.data_type === 'DECIMAL' && factor.code !== SUM_INSURED && bad(state.factors[factor.code] ?? '')) {
      errors[`factor:${factor.code}`] = parseFactorDecimal(state.factors[factor.code]).error ?? 'Enter a number.';
    }
  }
  for (const [code, raw] of Object.entries(state.limits)) if (bad(raw)) errors[`limit:${code}`] = parseFactorDecimal(raw).error ?? 'Enter a number.';
  return errors;
}

/** The product version in force on `day`, with its rating factors and benefits (the server's guide). */
export function useRenewalTariff(productId: string, day: string) {
  const product = useProductDetail(productId);
  const version = product.data ? versionInForce(product.data.versions, day) : null;
  const document = useProductVersion(productId, version?.id ?? null);
  return { product, version, document };
}

export const AmendmentFields: React.FC<{
  policy: PolicyDetail;
  day: string;
  state: AmendmentState;
  onChange: (next: AmendmentState) => void;
  attempted: boolean;
  /** Field errors from the server (RENEWAL_CHANGE_INVALID), by the server's field name. */
  serverFields: Record<string, string>;
}> = ({ policy, day, state, onChange, attempted, serverFields }) => {
  const { product, version, document } = useRenewalTariff(policy.product.id, day);
  if (product.isPending || (version && document.isPending)) return <HorizonLoader tip="Loading the renewal tariff..." />;
  if (product.isError || document.isError) return <ApiErrorAlert error={product.error ?? document.error} title="The product could not be loaded" />;
  if (!version || !document.data) {
    return <p className="text-sm text-[var(--hz-text-muted)]">No product version is in force on that start date, so the renewal cannot be amended or priced for it.</p>;
  }
  const declared = document.data.content.rating_factors;
  const optionalBenefits = (document.data.content.benefits ?? []).filter((benefit) => benefit.is_optional);
  const local = attempted ? amendmentErrors(state, declared) : {};
  const ratesSumInsured = declared.some((factor) => factor.code === SUM_INSURED);
  const keptBenefits = policy.current_version.cover.benefits.filter((benefit) => !(benefit.is_optional && state.optional[benefit.code] === false));
  const set = (patch: Partial<AmendmentState>) => onChange({ ...state, ...patch });

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-[var(--hz-text-muted)]">
        Against product version {version.version_no}, the tariff in force on that start date. Only what differs from the policy's terms is sent. The premium
        comes from the tariff; an increase in cover or value needs a checker.
      </p>

      {ratesSumInsured && (
        <div>
          <label htmlFor="amend-sum-insured" className={label}>Sum insured</label>
          <input id="amend-sum-insured" inputMode="decimal" value={state.sumInsured} onChange={(event) => set({ sumInsured: event.target.value })}
            aria-invalid={!!(local.sum_insured ?? serverFields.sum_insured)} className={field(!!(local.sum_insured ?? serverFields.sum_insured))} />
          <FieldError message={local.sum_insured ?? serverFields.sum_insured} />
        </div>
      )}

      {declared.some((factor) => factor.code !== SUM_INSURED) && (
        <fieldset className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <legend className={label}>Rating details</legend>
          {declared.filter((factor) => factor.code !== SUM_INSURED).map((factor) => {
            const id = `amend-factor-${factor.code}`;
            const value = state.factors[factor.code] ?? '';
            const error = local[`factor:${factor.code}`];
            const onValue = (next: string) => set({ factors: { ...state.factors, [factor.code]: next } });
            return (
              <div key={factor.code}>
                <label htmlFor={id} className={label}>{factor.name}{factor.unit ? ` (${factor.unit})` : ''}</label>
                {factor.data_type === 'CHOICE' ? (
                  <select id={id} value={value} onChange={(event) => onValue(event.target.value)} className={field(false)}>
                    <option value="">Select…</option>
                    {factor.choices.map((choice) => <option key={choice} value={choice}>{choice.charAt(0) + choice.slice(1).toLowerCase().replace(/_/g, ' ')}</option>)}
                  </select>
                ) : factor.data_type === 'BOOLEAN' ? (
                  <select id={id} value={value} onChange={(event) => onValue(event.target.value)} className={field(false)}>
                    <option value="">Not stated</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input id={id} inputMode="decimal" value={value} onChange={(event) => onValue(event.target.value)} aria-invalid={!!error} className={field(!!error)} />
                )}
                <FieldError message={error} />
              </div>
            );
          })}
          <FieldError message={serverFields.factors} />
        </fieldset>
      )}

      {optionalBenefits.length > 0 && (
        <fieldset>
          <legend className={label}>Optional cover</legend>
          <div className="flex flex-col gap-2 text-sm">
            {optionalBenefits.map((benefit) => (
              <label key={benefit.code} className="flex items-center gap-2">
                <input type="checkbox" checked={!!state.optional[benefit.code]}
                  onChange={(event) => set({ optional: { ...state.optional, [benefit.code]: event.target.checked } })} />
                {benefit.name}
              </label>
            ))}
          </div>
          <FieldError message={serverFields.add_benefits ?? serverFields.remove_benefits} />
        </fieldset>
      )}

      {keptBenefits.some((benefit) => benefit.limit_amount !== null) && (
        <fieldset className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <legend className={label}>Limits</legend>
          {keptBenefits.filter((benefit) => benefit.limit_amount !== null).map((benefit) => {
            const id = `amend-limit-${benefit.code}`;
            const error = local[`limit:${benefit.code}`];
            return (
              <div key={benefit.code}>
                <label htmlFor={id} className={label}>{benefit.name}</label>
                <input id={id} inputMode="decimal" value={state.limits[benefit.code] ?? ''} onChange={(event) => set({ limits: { ...state.limits, [benefit.code]: event.target.value } })}
                  aria-invalid={!!error} className={field(!!error)} />
                <FieldError message={error} />
              </div>
            );
          })}
          <FieldError message={serverFields.limits} />
        </fieldset>
      )}

      <div>
        <label htmlFor="amend-geo" className={label}>Geographical limit</label>
        <input id="amend-geo" value={state.geo} maxLength={255} onChange={(event) => set({ geo: event.target.value })}
          aria-invalid={!!serverFields.geographical_limit} className={field(!!serverFields.geographical_limit)} />
        <FieldError message={serverFields.geographical_limit} />
      </div>
    </div>
  );
};

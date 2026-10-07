/**
 * The policy workspace (FI1-C): `GET /policies/{id}` and, on its tab, `GET /policies/{id}/versions`.
 *
 * Only sections the backend provides are shown. Claims, billing, documents, accounting and the
 * audit timeline have no backend yet and are left out in backend mode, never filled from mock
 * data. The Endorsements tab (FI1-D) lists `GET /policies/{id}/endorsements`. The policy's ETag
 * (from the header) is kept with the query for endorsement creation and certificate issue.
 * The Certificates tab (CERTIFICATES-SURFACE-1 CS-A) shows to users who may view or issue
 * certificates; "Issue certificate" in the header (also where a bind lands) opens its issue form.
 *
 * Laid out as the Studio Admin record (profile) page: a header with the policy period as a ring,
 * line tabs, label-over-value groups split by rules, and on Overview a status column.
 */

import React from 'react';
import { ArrowLeft, CalendarDays, CircleCheck, CircleX, Clock3, FileBadge, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useRouteRefs } from '../policies/refs';
import {
  DetailDivider,
  DetailGrid,
  DetailGroup,
  HorizonAlert,
  HorizonLoader,
  HorizonPage,
  HorizonPageContent,
  HorizonPageTitle,
  OutlineTag,
  RecordHeader,
  StatusBadge,
  WorkspaceTabs,
} from '../../components/horizon';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { usePermission } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { issuable, PolicyCertificatesTab } from '../certificates/PolicyCertificatesTab';
import { CERT_ISSUE, CERT_VIEW } from '../permissions';
import { COVERAGE_TONE, formatDate, LIFECYCLE_TONE, levyRate } from '../policies/format';
import { usePolicy, usePolicyVersions } from '../policies/queries';
import { PolicyEndorsementsTab } from '../endorsements/PolicyEndorsementsTab';
import { directoryFrom } from '../policies/returnTo';
import type { PolicyDetail, PolicyVersion } from '../policies/types';
import { displayFacts, formatDateTime, formatMoney, humanize } from '../workflow/format';

export const POLICY_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'risk', label: 'Risk Schedule' },
  { id: 'coverage', label: 'Coverage' },
  { id: 'premium', label: 'Premium & Levies' },
  { id: 'versions', label: 'Versions' },
  { id: 'endorsements', label: 'Endorsements' },
  { id: 'certificates', label: 'Certificates' },
] as const;

type TabId = (typeof POLICY_TABS)[number]['id'];

const isTab = (value: string | null): value is TabId => POLICY_TABS.some((tab) => tab.id === value);

const muted = 'text-[13px] text-[var(--hz-text-secondary)]';

const DAY = 86_400_000;
const dayOf = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : NaN;
};
const today = () => {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
};

/** How far through its period the policy is (0-100), and the days to expiry; null without usable dates. */
export function periodProgress(inception: string, expiry: string, on = today()) {
  const start = dayOf(inception);
  const end = dayOf(expiry);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  const percent = Math.max(0, Math.min(100, ((on - start) / (end - start)) * 100));
  return { percent: Math.round(percent), daysLeft: Math.max(0, Math.round((end - on) / DAY)) };
}

const daysText = (days: number) => (days === 1 ? '1 day' : `${days} days`);

/** `tab` fixes the tab shown, for when the page sits behind a dialog (the new endorsement form). */
export const PolicyWorkspacePage: React.FC<{ tab?: TabId }> = ({ tab: fixedTab }) => {
  const { policyId } = useRouteRefs();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab: TabId = fixedTab ?? (isTab(params.get('tab')) ? (params.get('tab') as TabId) : 'overview');
  const policy = usePolicy(policyId);
  const versions = usePolicyVersions(policyId, tab === 'versions' && policy.isSuccess);
  const canIssueCertificates = usePermission(CERT_ISSUE);
  const canSeeCertificates = usePermission(CERT_VIEW) || canIssueCertificates;
  const tabs = POLICY_TABS.filter((item) => item.id !== 'certificates' || canSeeCertificates);
  const showTab = (next: TabId, extra?: Record<string, string>) => {
    const changed = new URLSearchParams(params);
    for (const name of ['certificate', 'issue']) changed.delete(name);
    if (next === 'overview') changed.delete('tab');
    else changed.set('tab', next);
    for (const [name, value] of Object.entries(extra ?? {})) changed.set(name, value);
    // Keep the router state, so Back still knows the originating list after a tab change.
    setParams(changed, { replace: true, state: location.state });
  };

  // Back to the list this policy was opened from, with its filters and page (FI1-C-R1).
  const back = () => navigate(directoryFrom(location.state));

  if (policy.isPending) return <HorizonLoader tip="Loading the policy..." />;
  if (policy.isError) {
    const missing = policy.error instanceof ApiError && policy.error.status === 404;
    return (
      <HorizonPage id="policy-workspace">
        <HorizonPageTitle title="Policy" onBack={back} backLabel="Back to Policy Directory" />
        <HorizonPageContent className="p-4">
          {missing ? (
            <HorizonAlert tone="warning" title={NOT_FOUND_TEXT}>
              It does not exist, or it is outside the branches you can see.
              <ErrorReference reference={referenceOf(policy.error)} />
            </HorizonAlert>
          ) : (
            <ApiErrorAlert error={policy.error} title="The policy could not be loaded" />
          )}
        </HorizonPageContent>
      </HorizonPage>
    );
  }

  const { view, etag } = policy.data;
  const current = view.current_version;

  const cancelled = view.lifecycle_status === 'CANCELLED' || !!view.cancellation;
  const period = cancelled ? null : periodProgress(current.inception_date, current.expiry_date);

  return (
    <HorizonPage id="policy-workspace" className="flex flex-col gap-4 !space-y-0">
      <RecordHeader
        icon={ShieldCheck}
        title={view.policy_no}
        subtitle={`${view.customer.display_name} · ${view.product.name}`}
        progress={period?.percent}
        progressLabel={period ? `Policy period ${period.percent}% elapsed` : undefined}
        badges={
          <>
            <StatusBadge square label={humanize(view.lifecycle_status)} tone={LIFECYCLE_TONE[view.lifecycle_status] ?? 'neutral'} />
            <StatusBadge square label={humanize(view.coverage_status)} tone={COVERAGE_TONE[view.coverage_status] ?? 'neutral'} />
            <OutlineTag>{view.insurer.name}</OutlineTag>
            <OutlineTag>{view.branch.name}</OutlineTag>
            <OutlineTag>{view.currency}</OutlineTag>
          </>
        }
        actions={
          <>
            {canIssueCertificates && issuable(view) && tab !== 'certificates' && (
              <button type="button" className="hz-button hz-button-primary" onClick={() => showTab('certificates', { issue: '1' })}>
                <FileBadge className="h-3.5 w-3.5" />
                Issue certificate
              </button>
            )}
            <button type="button" className="hz-button hz-button-secondary" onClick={back} title="Back to Policy Directory" aria-label="Back to Policy Directory">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </>
        }
      />
      <div>
        <WorkspaceTabs tabs={tabs} activeTab={tab} label="Policy sections" variant="line" onChange={(next) => showTab(next)} />
        <div role="tabpanel" aria-label={POLICY_TABS.find((t) => t.id === tab)?.label} className="hz-record-body">
          {tab === 'overview' ? (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_auto_18rem]">
              <div className="py-4 lg:pr-6">
                <Overview view={view} />
              </div>
              <DetailDivider vertical />
              <div className="border-t border-[var(--hz-divider)] py-4 lg:border-t-0 lg:pl-6">
                <StatusColumn view={view} period={period} />
              </div>
            </div>
          ) : (
            <div className="py-4">
              {tab === 'risk' && <RiskSchedule version={current} />}
              {tab === 'coverage' && <Coverage version={current} currency={view.currency} />}
              {tab === 'premium' && <Premium version={current} />}
              {tab === 'versions' &&
                (versions.isPending ? (
                  <HorizonLoader tip="Loading the versions..." />
                ) : versions.isError ? (
                  <ApiErrorAlert error={versions.error} title="The versions could not be loaded" />
                ) : (
                  <Versions versions={versions.data.results} inForce={current.version_no} currency={view.currency} />
                ))}
              {tab === 'endorsements' && <PolicyEndorsementsTab policy={view} />}
              {tab === 'certificates' && canSeeCertificates && <PolicyCertificatesTab policy={view} policyEtag={etag} />}
            </div>
          )}
        </div>
      </div>
    </HorizonPage>
  );
};

/** The Overview's side column: where the record stands, and the dates ahead. */
const StatusColumn: React.FC<{ view: PolicyDetail; period: ReturnType<typeof periodProgress> }> = ({ view, period }) => {
  const current = view.current_version;
  const Mark = view.cancellation ? CircleX : CircleCheck;
  return (
    <aside aria-label="Record status">
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-[var(--hz-text-primary)]">Record status</h2>
        <div className="flex items-start gap-2">
          <Mark aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--hz-text-muted)]" />
          <div>
            <p className="text-sm font-medium text-[var(--hz-text-primary)]">{humanize(view.lifecycle_status)} policy</p>
            <p className="text-[13px] text-[var(--hz-text-muted)]">Cover {humanize(view.coverage_status).toLowerCase()}</p>
          </div>
        </div>
        <p className="text-[13px] text-[var(--hz-text-muted)]">Bound {formatDateTime(view.bound_at)}</p>
      </div>

      <DetailDivider />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--hz-text-primary)]">Key dates</h2>
        <div className="flex flex-col">
          <div className="flex gap-3 py-2.5">
            <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--hz-text-muted)]" />
            <div>
              <p className="text-sm font-medium text-[var(--hz-text-primary)]">{view.cancellation ? 'Cancelled from' : 'Expiry'}</p>
              <p className="text-[13px] text-[var(--hz-text-muted)]">
                {view.cancellation
                  ? formatDate(view.cancellation.date)
                  : `${formatDate(current.expiry_date)}${period ? ` · ${daysText(period.daysLeft)} left` : ''}`}
              </p>
            </div>
          </div>
          <hr className="border-0 border-t border-[var(--hz-divider)]" />
          <div className="flex gap-3 py-2.5">
            <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--hz-text-muted)]" />
            <div>
              <p className="text-sm font-medium text-[var(--hz-text-primary)]">Version {current.version_no} in force</p>
              <p className="text-[13px] text-[var(--hz-text-muted)]">From {formatDate(current.effective_from)}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Overview: React.FC<{ view: PolicyDetail }> = ({ view }) => {
  const current = view.current_version;
  const details = displayFacts(current.underwriting_details);
  const terms = displayFacts(current.terms);
  return (
    <>
      <DetailGroup title="Policy">
        <DetailGrid
          items={[
            { label: 'Customer', value: `${view.customer.display_name} (${view.customer.customer_no})` },
            { label: 'Product', value: view.product.name },
            { label: 'Insurer', value: view.insurer.name },
            { label: 'Insurer policy number', value: view.insurer_policy_no || 'Not recorded yet' },
            { label: 'Branch', value: view.branch.name },
            { label: 'Agreement', value: `${humanize(view.agreement.agreement_type)} ${view.agreement.reference_no}`.trim() },
          ]}
        />
      </DetailGroup>

      <DetailDivider />

      <DetailGroup title="Period and cover">
        <DetailGrid
          items={[
            { label: 'Period', value: `${formatDate(current.inception_date)} – ${formatDate(current.expiry_date)}` },
            { label: 'Version in force', value: `Version ${current.version_no}, from ${formatDate(current.effective_from)}` },
            { label: 'Latest version', value: `Version ${view.version_no}` },
            { label: 'Sum insured', value: formatMoney(current.sum_insured, view.currency) },
            { label: 'Annual premium', value: formatMoney(current.annual_premium.total_premium, current.annual_premium.currency) },
          ]}
        />
      </DetailGroup>

      <DetailDivider />

      <DetailGroup title="Origin">
        <DetailGrid
          items={[
            { label: 'Quotation', value: view.source.quotation.quotation_no },
            { label: 'Proposal', value: view.source.proposal.proposal_no },
            { label: 'Bound', value: formatDateTime(view.bound_at) },
          ]}
        />
      </DetailGroup>

      {view.cancellation && (
        <>
          <DetailDivider />
          <DetailGroup title="Cancellation">
            <DetailGrid
              items={[
                { label: 'Cancelled from', value: formatDate(view.cancellation.date) },
                { label: 'Reason', value: view.cancellation.reason || '—' },
                { label: 'Recorded', value: formatDateTime(view.cancellation.cancelled_at) },
              ]}
            />
          </DetailGroup>
        </>
      )}
      {terms.length > 0 && (
        <>
          <DetailDivider />
          <DetailGroup title="Terms">
            <DetailGrid items={terms} />
          </DetailGroup>
        </>
      )}
      {details.length > 0 && (
        <>
          <DetailDivider />
          <DetailGroup title="Underwriting details">
            <DetailGrid items={details} />
          </DetailGroup>
        </>
      )}
    </>
  );
};

const RiskSchedule: React.FC<{ version: PolicyVersion }> = ({ version }) => {
  const factors = displayFacts(version.risk.factors);
  const details = displayFacts(version.risk.details);
  const identifiers = version.risk.identifiers ?? [];
  const items = version.risk.items ?? [];
  const empty = !factors.length && !details.length && !identifiers.length && !items.length;
  return (
    <div className="hz-detail-stack">
      <p className={muted}>As in version {version.version_no}, the version in force.</p>
      {empty && <p className={muted}>No risk details are recorded.</p>}
      {factors.length > 0 && (
        <DetailGroup title="Rated factors">
          <DetailGrid items={factors} />
        </DetailGroup>
      )}
      {details.length > 0 && (
        <DetailGroup title="Risk details">
          <DetailGrid items={details} />
        </DetailGroup>
      )}
      {identifiers.length > 0 && (
        <DetailGroup title="Identifiers">
          <DetailGrid
            items={identifiers.map((identifier, index) => ({
              label: identifiers.length > 1 ? `${humanize(identifier.identifier_type)} ${index + 1}` : humanize(identifier.identifier_type),
              value: identifier.value,
            }))}
          />
        </DetailGroup>
      )}
      {items.length > 0 && (
        <DetailGroup title="Risk items">
          <table className="hz-grid w-full" aria-label="Risk items">
            <thead>
              <tr>
                <th>Item</th>
                <th>Identifier</th>
                <th className="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.code}>
                  <td>{item.description}</td>
                  <td>{item.identifier || '—'}</td>
                  <td className="text-right tabular-nums">{item.value ? formatMoney(item.value, null) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DetailGroup>
      )}
    </div>
  );
};

const Coverage: React.FC<{ version: PolicyVersion; currency: string }> = ({ version, currency }) => {
  const { cover_sections: sections = [], benefits = [], exclusions = [] } = version.cover ?? {};
  const sectionName = (code: string | null) => sections.find((section) => section.code === code)?.name ?? '—';
  return (
    <div className="hz-detail-stack">
      <p className={muted}>As in version {version.version_no}, the version in force.</p>
      <DetailGroup title="Benefits and limits">
        {benefits.length === 0 ? (
          <p className={muted}>No benefits are recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="hz-grid w-full" aria-label="Benefits and limits">
              <thead>
                <tr>
                  <th>Benefit</th>
                  <th>Section</th>
                  <th className="text-right">Limit</th>
                  <th>Cover</th>
                </tr>
              </thead>
              <tbody>
                {benefits.map((benefit) => (
                  <tr key={benefit.code}>
                    <td>
                      {benefit.name}
                      {benefit.description && <span className="block text-[13px] text-[var(--hz-text-secondary)]">{benefit.description}</span>}
                    </td>
                    <td>{sectionName(benefit.section)}</td>
                    <td className="text-right tabular-nums">
                      {benefit.limit_amount !== null ? formatMoney(benefit.limit_amount, currency) : 'No limit stated'}
                      {benefit.limit_description && (
                        <span className="block text-[13px] text-[var(--hz-text-secondary)]">{benefit.limit_description}</span>
                      )}
                    </td>
                    <td>{benefit.is_optional ? 'Optional, held' : 'Included'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailGroup>
      {sections.length > 0 && (
        <DetailGroup title="Cover sections">
          <DetailGrid
            items={sections.map((section) => ({
              label: section.name,
              value: section.is_mandatory ? 'Mandatory' : 'Optional',
            }))}
          />
        </DetailGroup>
      )}
      {exclusions.length > 0 && (
        <DetailGroup title="Exclusions">
          <ul className="list-disc space-y-1 pl-5 text-[13px]">
            {exclusions.map((exclusion) => (
              <li key={exclusion.code}>{exclusion.text}</li>
            ))}
          </ul>
        </DetailGroup>
      )}
    </div>
  );
};

const Premium: React.FC<{ version: PolicyVersion }> = ({ version }) => {
  const premium = version.annual_premium;
  return (
    <div className="hz-detail-stack">
      <p className={muted}>
        Annual premium of version {version.version_no}, rated on {formatDate(premium.rating_date)}.
      </p>
      <DetailGroup title="Annual premium">
        <DetailGrid
          items={[
            { label: 'Basic premium', value: formatMoney(premium.basic_premium, premium.currency) },
            { label: 'Levies', value: formatMoney(premium.levies_total, premium.currency) },
            { label: 'Total premium', value: formatMoney(premium.total_premium, premium.currency) },
            ...(premium.commission !== undefined
              ? [{ label: 'Commission', value: formatMoney(premium.commission, premium.currency) }]
              : []),
          ]}
        />
      </DetailGroup>
      {premium.levies.length > 0 && (
        <DetailGroup title="Levies">
          <table className="hz-grid w-full" aria-label="Levies">
            <thead>
              <tr>
                <th>Levy</th>
                <th>Rate</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {premium.levies.map((levy) => (
                <tr key={levy.code}>
                  <td>{levy.name}</td>
                  <td>{levyRate(levy.basis, levy.rate, premium.currency)}</td>
                  <td className="text-right tabular-nums">{formatMoney(levy.amount, premium.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DetailGroup>
      )}
    </div>
  );
};

const SOURCE_LABEL: Record<PolicyVersion['source_type'], string> = {
  BIND: 'Bound',
  ENDORSEMENT: 'Endorsement',
  RENEWAL: 'Renewal',
};

const Versions: React.FC<{ versions: PolicyVersion[]; inForce: number; currency: string }> = ({
  versions,
  inForce,
  currency,
}) => (
  <div className="overflow-x-auto">
    <table className="hz-grid w-full" aria-label="Policy versions">
      <thead>
        <tr>
          <th>Version</th>
          <th>Source</th>
          <th>Effective from</th>
          <th>Effective to</th>
          <th>Expiry</th>
          <th className="text-right">Sum insured</th>
          <th className="text-right">Annual premium</th>
        </tr>
      </thead>
      <tbody>
        {versions.map((version) => (
          <tr key={version.version_no}>
            <td>
              Version {version.version_no}
              {version.version_no === inForce && (
                <span className="ml-2">
                  <StatusBadge square label="In force" tone="success" />
                </span>
              )}
              {version.terminated && (
                <span className="ml-2">
                  <StatusBadge square label="Terminated" tone="danger" />
                </span>
              )}
            </td>
            <td>{SOURCE_LABEL[version.source_type] ?? humanize(version.source_type)}</td>
            <td>{formatDate(version.effective_from)}</td>
            <td>{formatDate(version.effective_to)}</td>
            <td>{formatDate(version.expiry_date)}</td>
            <td className="text-right tabular-nums">{formatMoney(version.sum_insured, currency)}</td>
            <td className="text-right tabular-nums">
              {formatMoney(version.annual_premium.total_premium, version.annual_premium.currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

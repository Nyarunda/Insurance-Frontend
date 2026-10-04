/**
 * The policy workspace (FI1-C): `GET /policies/{id}` and, on its tab, `GET /policies/{id}/versions`.
 *
 * Only sections the backend provides are shown. Claims, billing, documents, accounting and the
 * audit timeline have no backend yet and are left out in backend mode, never filled from mock
 * data. Endorsements arrive with FI1-D. The policy's ETag (from the header) is kept with the query
 * for FI1-D's endorsement creation.
 */

import React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  HorizonAlert,
  HorizonLoader,
  HorizonPage,
  HorizonPageContent,
  HorizonPageTitle,
  KeyValueGrid,
  Section,
  StatusBadge,
  WorkspaceTabs,
} from '../../components/horizon';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { COVERAGE_TONE, formatDate, LIFECYCLE_TONE, levyRate } from '../policies/format';
import { usePolicy, usePolicyVersions } from '../policies/queries';
import { directoryFrom } from '../policies/returnTo';
import type { PolicyDetail, PolicyVersion } from '../policies/types';
import { displayFacts, formatDateTime, formatMoney, humanize } from '../workflow/format';

export const POLICY_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'risk', label: 'Risk Schedule' },
  { id: 'coverage', label: 'Coverage' },
  { id: 'premium', label: 'Premium & Levies' },
  { id: 'versions', label: 'Versions' },
] as const;

type TabId = (typeof POLICY_TABS)[number]['id'];

const isTab = (value: string | null): value is TabId => POLICY_TABS.some((tab) => tab.id === value);

const muted = 'text-[13px] text-[var(--hz-text-secondary)]';

export const PolicyWorkspacePage: React.FC = () => {
  const { policyId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab: TabId = isTab(params.get('tab')) ? (params.get('tab') as TabId) : 'overview';
  const policy = usePolicy(policyId);
  const versions = usePolicyVersions(policyId, tab === 'versions' && policy.isSuccess);

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

  const { view } = policy.data;
  const current = view.current_version;

  return (
    <HorizonPage id="policy-workspace">
      <HorizonPageTitle
        title={view.policy_no}
        subtitle={`${view.product.name} · ${view.customer.display_name}`}
        onBack={back}
        backLabel="Back to Policy Directory"
        actions={
          <>
            <StatusBadge label={humanize(view.lifecycle_status)} tone={LIFECYCLE_TONE[view.lifecycle_status] ?? 'neutral'} />
            <StatusBadge label={humanize(view.coverage_status)} tone={COVERAGE_TONE[view.coverage_status] ?? 'neutral'} />
          </>
        }
      />
      <WorkspaceTabs
        tabs={POLICY_TABS}
        activeTab={tab}
        label="Policy sections"
        onChange={(next) => {
          const changed = new URLSearchParams(params);
          if (next === 'overview') changed.delete('tab');
          else changed.set('tab', next);
          // Keep the router state, so Back still knows the originating list after a tab change.
          setParams(changed, { replace: true, state: location.state });
        }}
      />
      <div role="tabpanel" aria-label={POLICY_TABS.find((t) => t.id === tab)?.label}>
      <HorizonPageContent className="p-5 space-y-2">
        {tab === 'overview' && <Overview view={view} />}
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
      </HorizonPageContent>
      </div>
    </HorizonPage>
  );
};

const Overview: React.FC<{ view: PolicyDetail }> = ({ view }) => {
  const current = view.current_version;
  const details = displayFacts(current.underwriting_details);
  const terms = displayFacts(current.terms);
  return (
    <>
      <KeyValueGrid
        items={[
          { label: 'Customer', value: `${view.customer.display_name} (${view.customer.customer_no})` },
          { label: 'Product', value: view.product.name },
          { label: 'Insurer', value: view.insurer.name },
          { label: 'Insurer policy number', value: view.insurer_policy_no || 'Not recorded yet' },
          { label: 'Branch', value: view.branch.name },
          { label: 'Period', value: `${formatDate(current.inception_date)} – ${formatDate(current.expiry_date)}` },
          {
            label: 'Version in force',
            value: `Version ${current.version_no}, from ${formatDate(current.effective_from)}`,
          },
          { label: 'Latest version', value: `Version ${view.version_no}` },
          { label: 'Sum insured', value: formatMoney(current.sum_insured, view.currency) },
          { label: 'Annual premium', value: formatMoney(current.annual_premium.total_premium, current.annual_premium.currency) },
          { label: 'Quotation', value: view.source.quotation.quotation_no },
          { label: 'Proposal', value: view.source.proposal.proposal_no },
          { label: 'Agreement', value: `${humanize(view.agreement.agreement_type)} ${view.agreement.reference_no}`.trim() },
          { label: 'Bound', value: formatDateTime(view.bound_at) },
        ]}
      />
      {view.cancellation && (
        <Section title="Cancellation">
          <KeyValueGrid
            items={[
              { label: 'Cancelled from', value: formatDate(view.cancellation.date) },
              { label: 'Reason', value: view.cancellation.reason || '—' },
              { label: 'Recorded', value: formatDateTime(view.cancellation.cancelled_at) },
            ]}
          />
        </Section>
      )}
      {terms.length > 0 && (
        <Section title="Terms">
          <KeyValueGrid items={terms} />
        </Section>
      )}
      {details.length > 0 && (
        <Section title="Underwriting details">
          <KeyValueGrid items={details} />
        </Section>
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
    <>
      <p className={muted}>As in version {version.version_no}, the version in force.</p>
      {empty && <p className={muted}>No risk details are recorded.</p>}
      {factors.length > 0 && (
        <Section title="Rated factors">
          <KeyValueGrid items={factors} />
        </Section>
      )}
      {details.length > 0 && (
        <Section title="Risk details">
          <KeyValueGrid items={details} />
        </Section>
      )}
      {identifiers.length > 0 && (
        <Section title="Identifiers">
          <KeyValueGrid
            items={identifiers.map((identifier, index) => ({
              label: identifiers.length > 1 ? `${humanize(identifier.identifier_type)} ${index + 1}` : humanize(identifier.identifier_type),
              value: identifier.value,
            }))}
          />
        </Section>
      )}
      {items.length > 0 && (
        <Section title="Risk items">
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
        </Section>
      )}
    </>
  );
};

const Coverage: React.FC<{ version: PolicyVersion; currency: string }> = ({ version, currency }) => {
  const { cover_sections: sections = [], benefits = [], exclusions = [] } = version.cover ?? {};
  const sectionName = (code: string | null) => sections.find((section) => section.code === code)?.name ?? '—';
  return (
    <>
      <p className={muted}>As in version {version.version_no}, the version in force.</p>
      <Section title="Benefits and limits">
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
                      {benefit.description && <span className="block text-[12px] text-[var(--hz-text-secondary)]">{benefit.description}</span>}
                    </td>
                    <td>{sectionName(benefit.section)}</td>
                    <td className="text-right tabular-nums">
                      {benefit.limit_amount !== null ? formatMoney(benefit.limit_amount, currency) : 'No limit stated'}
                      {benefit.limit_description && (
                        <span className="block text-[12px] text-[var(--hz-text-secondary)]">{benefit.limit_description}</span>
                      )}
                    </td>
                    <td>{benefit.is_optional ? 'Optional, held' : 'Included'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {sections.length > 0 && (
        <Section title="Cover sections">
          <KeyValueGrid
            items={sections.map((section) => ({
              label: section.name,
              value: section.is_mandatory ? 'Mandatory' : 'Optional',
            }))}
          />
        </Section>
      )}
      {exclusions.length > 0 && (
        <Section title="Exclusions">
          <ul className="list-disc space-y-1 pl-5 text-[13px]">
            {exclusions.map((exclusion) => (
              <li key={exclusion.code}>{exclusion.text}</li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
};

const Premium: React.FC<{ version: PolicyVersion }> = ({ version }) => {
  const premium = version.annual_premium;
  return (
    <>
      <p className={muted}>
        Annual premium of version {version.version_no}, rated on {formatDate(premium.rating_date)}.
      </p>
      <KeyValueGrid
        items={[
          { label: 'Basic premium', value: formatMoney(premium.basic_premium, premium.currency) },
          { label: 'Levies', value: formatMoney(premium.levies_total, premium.currency) },
          { label: 'Total premium', value: formatMoney(premium.total_premium, premium.currency) },
          ...(premium.commission !== undefined
            ? [{ label: 'Commission', value: formatMoney(premium.commission, premium.currency) }]
            : []),
        ]}
      />
      {premium.levies.length > 0 && (
        <Section title="Levies">
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
        </Section>
      )}
    </>
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
                  <StatusBadge label="In force" tone="success" />
                </span>
              )}
              {version.terminated && (
                <span className="ml-2">
                  <StatusBadge label="Terminated" tone="danger" />
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

import { ScreenId } from '../types';
import { StatusTone } from '../components/horizon';
import { recordsStore } from './recordsStore';

export interface BranchKpi {
  label: string;
  value: string;
  note?: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
}

export interface BranchRow {
  id: string;
  cells: string[];
  statusLabel: string;
  statusTone: StatusTone;
}

export interface BranchLandingConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  kpis: BranchKpi[];
  columns: string[];
  rows: BranchRow[];
  footnote: string;
  /** Label for a lightweight "add a row" action, e.g. "+ New Template". Omit for
   *  screens that are read-only rollups of other real entities (Billing, Receivables). */
  addLabel?: string;
}

const reportRow = (id: string, name: string, owner: string, refreshed: string, statusLabel: string, statusTone: StatusTone): BranchRow => ({
  id,
  cells: [name, owner, refreshed],
  statusLabel,
  statusTone,
});

export const BRANCH_LANDING_CONFIG: Partial<Record<ScreenId, BranchLandingConfig>> = {
  // ---------------------------------------------------------------- REPORTING
  'reporting-operational': {
    eyebrow: 'Reporting',
    title: 'Operational Reporting',
    subtitle: 'Cycle times, SLA adherence, and throughput across underwriting, claims, and policy servicing.',
    kpis: [
      { label: 'Avg Quote Turnaround', value: '4.2 hrs', tone: 'success' },
      { label: 'SLA Breach Rate', value: '3.1%', tone: 'warning' },
      { label: 'Straight-Through Rate', value: '61%', tone: 'neutral' },
    ],
    columns: ['Report', 'Owner', 'Last Refreshed'],
    rows: [
      reportRow('r1', 'Quote Cycle Time Report', 'Underwriting Ops', '2026-09-03 06:00', 'Up to date', 'success'),
      reportRow('r2', 'Claims SLA Compliance', 'Claims Ops', '2026-09-03 06:00', 'Up to date', 'success'),
      reportRow('r3', 'Policy Issuance Turnaround', 'Policy Admin', '2026-09-02 22:00', 'Refreshing', 'info'),
      reportRow('r4', 'Task Queue Aging', 'Operations', '2026-09-03 05:30', 'Up to date', 'success'),
      reportRow('r5', 'Branch Productivity Scorecard', 'Regional Ops', '2026-09-01 06:00', 'Stale', 'warning'),
    ],
    footnote: 'Operational reports refresh nightly from workflow telemetry. Export to CSV/PDF from any report row.',
  },
  'reporting-financial': {
    eyebrow: 'Reporting',
    title: 'Financial Reporting',
    subtitle: 'Premium, loss ratio, and solvency reporting for finance and the board.',
    kpis: [
      { label: 'GWP YTD', value: 'KES 412.6M', tone: 'success' },
      { label: 'Loss Ratio', value: '48.3%', tone: 'neutral' },
      { label: 'Combined Ratio', value: '91.7%', tone: 'success' },
    ],
    columns: ['Report', 'Owner', 'Last Refreshed'],
    rows: [
      reportRow('f1', 'Premium Bordereau', 'Finance', '2026-09-03 06:00', 'Up to date', 'success'),
      reportRow('f2', 'Loss Ratio by Line of Business', 'Actuarial', '2026-09-03 06:00', 'Up to date', 'success'),
      reportRow('f3', 'IFRS 17 CSM Roll-Forward', 'Actuarial', '2026-08-31 23:00', 'Stale', 'warning'),
      reportRow('f4', 'Trial Balance Extract', 'Finance', '2026-09-03 05:00', 'Up to date', 'success'),
      reportRow('f5', 'Reinsurance Ceded Summary', 'Reinsurance', '2026-09-02 18:00', 'Refreshing', 'info'),
    ],
    footnote: 'Financial reports reconcile against the General Journal in Accounting & Financial Operations.',
  },
  'reporting-claims': {
    eyebrow: 'Reporting',
    title: 'Claims Reporting',
    subtitle: 'Reserve adequacy, settlement velocity, and fraud indicators across the claims book.',
    kpis: [
      { label: 'Open Claims', value: '312', tone: 'neutral' },
      { label: 'Avg Settlement Days', value: '18.4', tone: 'success' },
      { label: 'Reserve Adequacy', value: '96.2%', tone: 'success' },
    ],
    columns: ['Report', 'Owner', 'Last Refreshed'],
    rows: [
      reportRow('c1', 'Claims Triangle (Loss Development)', 'Actuarial', '2026-09-01 06:00', 'Up to date', 'success'),
      reportRow('c2', 'Large Loss Register', 'Claims Ops', '2026-09-03 06:00', 'Up to date', 'success'),
      reportRow('c3', 'Fraud Referral Summary', 'SIU', '2026-09-02 09:00', 'Up to date', 'success'),
      reportRow('c4', 'Assessor Turnaround Report', 'Claims Ops', '2026-09-03 06:00', 'Up to date', 'success'),
      reportRow('c5', 'Recovery & Salvage Performance', 'Claims Finance', '2026-08-30 06:00', 'Stale', 'warning'),
    ],
    footnote: 'Claims reports draw from FNOL through settlement — see the Claims Register for underlying records.',
  },
  'reporting-underwriting': {
    eyebrow: 'Reporting',
    title: 'Underwriting Reporting',
    subtitle: 'Risk acceptance quality, referral patterns, and rate adequacy.',
    kpis: [
      { label: 'Hit Ratio', value: '38%', tone: 'neutral' },
      { label: 'Referral Rate', value: '14.6%', tone: 'warning' },
      { label: 'Avg Risk Score', value: '46 / 100', tone: 'success' },
    ],
    columns: ['Report', 'Owner', 'Last Refreshed'],
    rows: [
      reportRow('u1', 'New Business Bordereau', 'Underwriting', '2026-09-03 06:00', 'Up to date', 'success'),
      reportRow('u2', 'Referral Reason Analysis', 'Underwriting', '2026-09-02 06:00', 'Up to date', 'success'),
      reportRow('u3', 'Rate Adequacy Review', 'Pricing', '2026-08-28 06:00', 'Stale', 'warning'),
      reportRow('u4', 'Renewal Retention Report', 'Underwriting', '2026-09-03 06:00', 'Up to date', 'success'),
      reportRow('u5', 'DOA Exception Log', 'Compliance', '2026-09-03 06:00', 'Up to date', 'success'),
    ],
    footnote: 'Cross-check exceptions against Delegation of Authority under Administration.',
  },
  'reporting-regulatory': {
    eyebrow: 'Reporting',
    title: 'Regulatory Reporting',
    subtitle: 'IRA statutory returns, solvency filings, and compliance attestations.',
    kpis: [
      { label: 'Filings Due (30d)', value: '3', tone: 'warning' },
      { label: 'Filings Overdue', value: '0', tone: 'success' },
      { label: 'Solvency Margin', value: '218%', tone: 'success' },
    ],
    columns: ['Report', 'Regulator', 'Last Refreshed'],
    rows: [
      reportRow('g1', 'IRA Quarterly Return', 'IRA (Kenya)', '2026-09-01 06:00', 'Up to date', 'success'),
      reportRow('g2', 'Solvency & Capital Adequacy', 'IRA (Kenya)', '2026-09-01 06:00', 'Up to date', 'success'),
      reportRow('g3', 'AML / CFT Compliance Attestation', 'FRC / IRA', '2026-08-15 06:00', 'Due Soon', 'warning'),
      reportRow('g4', 'Market Conduct Return', 'IRA (Kenya)', '2026-07-31 06:00', 'Filed', 'success'),
      reportRow('g5', 'Reinsurance Placement Disclosure', 'IRA (Kenya)', '2026-09-02 06:00', 'Up to date', 'success'),
    ],
    footnote: 'Statutory return schedules and pack templates live under Admin & Regulatory.',
  },
  'reporting-bi': {
    eyebrow: 'Reporting',
    title: 'Business Intelligence',
    subtitle: 'Executive dashboards and self-service analytics across the portfolio.',
    kpis: [
      { label: 'Active Dashboards', value: '11', tone: 'neutral' },
      { label: 'Data Refresh', value: 'Hourly', tone: 'success' },
      { label: 'Adoption (30d)', value: '87%', tone: 'success' },
    ],
    columns: ['Dashboard', 'Audience', 'Last Refreshed'],
    rows: [
      reportRow('b1', 'Executive Portfolio Overview', 'CEO / Executive', '2026-09-03 07:00', 'Up to date', 'success'),
      reportRow('b2', 'Broker Production Leaderboard', 'Distribution', '2026-09-03 07:00', 'Up to date', 'success'),
      reportRow('b3', 'Customer Lifetime Value Model', 'Marketing', '2026-09-02 07:00', 'Up to date', 'success'),
      reportRow('b4', 'Churn & Retention Model', 'Marketing', '2026-09-01 07:00', 'Refreshing', 'info'),
      reportRow('b5', 'Channel Profitability', 'Finance', '2026-09-03 07:00', 'Up to date', 'success'),
    ],
    footnote: 'BI dashboards are read-only extracts — raw records remain the source of truth in their own modules.',
  },

  // ---------------------------------------------------------------- FINANCE & REINSURANCE
  // finance-landing, billing, receivables, payments, commissions, reinsurance-facultative,
  // and reinsurance-cessions are computed live from recordsStore — see buildDynamicBranchConfig below.
  'reinsurance-recoveries': {
    eyebrow: 'Reinsurance',
    title: 'Reinsurance Recoveries',
    subtitle: 'Claim recoveries due from treaty and facultative reinsurers.',
    kpis: [
      { label: 'Recoveries Outstanding', value: 'KES 14.2M', tone: 'warning' },
      { label: 'Recovered (YTD)', value: 'KES 38.7M', tone: 'success' },
      { label: 'Avg Recovery Time', value: '46 days', tone: 'neutral' },
    ],
    columns: ['Claim Ref', 'Reinsurer', 'Recovery Amount'],
    rows: [
      { id: 'rec1', cells: ['CLM/FIR/2026/0419', 'Africa Re', 'KES 6.2M'], statusLabel: 'Outstanding', statusTone: 'warning' },
      { id: 'rec2', cells: ['CLM/MTR/2026/8291', 'Kenya Re', 'KES 3.1M'], statusLabel: 'Outstanding', statusTone: 'warning' },
      { id: 'rec3', cells: ['CLM/MAR/2026/0102', 'Continental Re', 'KES 4.9M'], statusLabel: 'Recovered', statusTone: 'success' },
    ],
    footnote: 'Recoveries are matched against Claims once the reinsurer confirms its share.',
  },

  // ---------------------------------------------------------------- OPERATIONS
  // workflows / admin-workflows are now a real screen — see WorkflowAdmin.tsx.
  'background-jobs': {
    eyebrow: 'Operations',
    title: 'Background Jobs',
    subtitle: 'Scheduled batch jobs: nightly reports, reconciliations, and data syncs.',
    kpis: [
      { label: 'Jobs Scheduled', value: '18', tone: 'neutral' },
      { label: 'Succeeded (Last Run)', value: '17', tone: 'success' },
      { label: 'Failed (Last Run)', value: '1', tone: 'danger' },
    ],
    columns: ['Job', 'Schedule', 'Last Run'],
    rows: [
      { id: 'jb1', cells: ['Nightly Reporting Refresh', 'Daily 02:00', '2026-09-03 02:00'], statusLabel: 'Succeeded', statusTone: 'success' },
      { id: 'jb2', cells: ['M-Pesa Reconciliation Sweep', 'Hourly', '2026-09-03 07:00'], statusLabel: 'Succeeded', statusTone: 'success' },
      { id: 'jb3', cells: ['Regulatory Pack Generation', 'Monthly', '2026-09-01 03:00'], statusLabel: 'Succeeded', statusTone: 'success' },
      { id: 'jb4', cells: ['Broker Commission Accrual', 'Daily 01:00', '2026-09-03 01:00'], statusLabel: 'Failed', statusTone: 'danger' },
    ],
    footnote: 'A failed job automatically raises an entry in Failed Transactions with retry controls.',
    addLabel: '+ Schedule Job',
  },
  // ---------------------------------------------------------------- ADMINISTRATION
  // admin-branches is computed live from recordsStore — see buildDynamicBranchConfig below.
  'admin-documents': {
    eyebrow: 'Administration',
    title: 'Document Templates',
    subtitle: 'Policy schedules, certificates, and correspondence templates.',
    kpis: [
      { label: 'Templates', value: '31', tone: 'neutral' },
      { label: 'Updated (30d)', value: '4', tone: 'neutral' },
      { label: 'Awaiting Approval', value: '1', tone: 'warning' },
    ],
    columns: ['Template', 'Category', 'Last Updated'],
    rows: [
      { id: 'dc1', cells: ['Motor Policy Schedule', 'Policy Documents', '2026-08-20'], statusLabel: 'Published', statusTone: 'success' },
      { id: 'dc2', cells: ['Certificate of Insurance', 'Policy Documents', '2026-08-14'], statusLabel: 'Published', statusTone: 'success' },
      { id: 'dc3', cells: ['Claim Repudiation Letter', 'Correspondence', '2026-07-30'], statusLabel: 'Published', statusTone: 'success' },
      { id: 'dc4', cells: ['Renewal Notice (Bancassurance)', 'Correspondence', '2026-09-01'], statusLabel: 'Awaiting Approval', statusTone: 'warning' },
    ],
    footnote: 'Certificates issued from Policies always use the currently published template version.',
    addLabel: '+ New Template',
  },
  // admin-number-series is now a real screen — see NumberSeriesAdmin.tsx.
  'admin-integrations': {
    eyebrow: 'Administration',
    title: 'Admin Integrations',
    subtitle: 'System-to-system connections managed by platform administrators.',
    kpis: [
      { label: 'Connected Systems', value: '6', tone: 'success' },
      { label: 'Degraded', value: '1', tone: 'warning' },
      { label: 'Last Health Check', value: '2 min ago', tone: 'neutral' },
    ],
    columns: ['Integration', 'Direction', 'Health'],
    rows: [
      { id: 'ai1', cells: ['M-Pesa Daraja API', 'Inbound / Outbound', 'Nominal'], statusLabel: 'Connected', statusTone: 'success' },
      { id: 'ai2', cells: ['IRA Regulatory Gateway', 'Outbound', 'Nominal'], statusLabel: 'Connected', statusTone: 'success' },
      { id: 'ai3', cells: ['Core Banking (Bancassurance)', 'Inbound', 'Elevated Latency'], statusLabel: 'Degraded', statusTone: 'warning' },
      { id: 'ai4', cells: ['SMS Gateway', 'Outbound', 'Nominal'], statusLabel: 'Connected', statusTone: 'success' },
    ],
    footnote: 'Full integration monitoring and message logs live in the Integration Hub.',
    addLabel: '+ New Integration',
  },
  'admin-subscription': {
    eyebrow: 'Administration',
    title: 'Subscription & Licensing',
    subtitle: 'Platform plan, seat allocation, and billing for this tenant.',
    kpis: [
      { label: 'Plan', value: 'Enterprise', tone: 'success' },
      { label: 'Seats Used', value: '146 / 200', tone: 'neutral' },
      { label: 'Renews', value: '2027-01-15', tone: 'neutral' },
    ],
    columns: ['Item', 'Detail', 'Value'],
    rows: [
      { id: 'sub1', cells: ['Plan Tier', 'Enterprise — multi-tenant', 'Active'], statusLabel: 'Active', statusTone: 'success' },
      { id: 'sub2', cells: ['Seats', 'Named users across all Role Centers', '146 / 200'], statusLabel: 'Healthy', statusTone: 'success' },
      { id: 'sub3', cells: ['Add-on: Reinsurance Module', 'Facultative + Treaty', 'Active'], statusLabel: 'Active', statusTone: 'success' },
      { id: 'sub4', cells: ['Next Invoice', 'Annual billing', 'KES 4.2M on 2027-01-15'], statusLabel: 'Scheduled', statusTone: 'info' },
    ],
    footnote: 'Contact your account manager to change plan tier or seat allocation.',
  },

  // ---------------------------------------------------------------- PRODUCTS
  'underwriting-rules': {
    eyebrow: 'Products',
    title: 'Underwriting Rules',
    subtitle: 'Automated risk-acceptance criteria, referral triggers, and exclusion rules per product.',
    kpis: [
      { label: 'Active Rule Sets', value: '19', tone: 'success' },
      { label: 'Auto-Referral Triggers', value: '34', tone: 'neutral' },
      { label: 'Last Reviewed', value: '2026-08-22', tone: 'neutral' },
    ],
    columns: ['Rule Set', 'Product Line', 'Trigger'],
    rows: [
      { id: 'ur1', cells: ['High Sum-Insured Referral', 'Commercial Motor Fleet', 'Sum Insured > KES 15M'], statusLabel: 'Active', statusTone: 'success' },
      { id: 'ur2', cells: ['Flood Zone Exclusion', 'Property & Fire', 'Location in Zone A'], statusLabel: 'Active', statusTone: 'success' },
      { id: 'ur3', cells: ['Prior Loss Auto-Decline', 'Private Motor Comprehensive', '3+ claims in 12 months', ], statusLabel: 'Active', statusTone: 'success' },
      { id: 'ur4', cells: ['Cargo Value Referral', 'Marine & Transit', 'Cargo Value > KES 8M'], statusLabel: 'Under Review', statusTone: 'warning' },
    ],
    footnote: 'Rules feed the Rating Engine Formula layer in Product Studio at quote time.',
    addLabel: '+ New Rule',
  },
};

const money = (amount: number) => `KES ${Math.round(amount).toLocaleString()}`;
const pct = (value: number) => `${value.toFixed(1)}%`;
const avg = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const daysBetween = (start: string, end: string) => {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;
  return Math.max(0, Math.round((endMs - startMs) / 86_400_000));
};

/**
 * Screens where recordsStore already holds the real underlying entity — computed live
 * instead of hand-authored, so counts and totals always match Brokers/Treaties/Policies.
 * Everything else falls back to the static BRANCH_LANDING_CONFIG above, since there's no
 * backing record for a "background job" or "subscription plan" in this data model.
 */
function buildDynamicBranchConfig(screenId: ScreenId): BranchLandingConfig | undefined {
  switch (screenId) {
    case 'reporting-operational': {
      const quotes = recordsStore.getQuotes();
      const policies = recordsStore.getPolicies();
      const claims = recordsStore.getClaims();
      const activities = recordsStore.getActivities();
      const openClaims = claims.filter((c) => c.status !== 'CLOSED');
      const breachedClaims = openClaims.filter((c) => c.slaRemainingHours < 0);
      const boundQuotes = quotes.filter((q) => q.status === 'BOUND');
      return {
        eyebrow: 'Reporting',
        title: 'Operational Reporting',
        subtitle: 'Operational throughput computed from quotes, policies, claims, and recorded activity.',
        kpis: [
          { label: 'Quote Bind Rate', value: pct((boundQuotes.length / (quotes.length || 1)) * 100), tone: 'success' },
          { label: 'Open Claims', value: String(openClaims.length), tone: openClaims.length ? 'warning' : 'success' },
          { label: 'Recorded Events', value: String(activities.length), tone: 'neutral' },
        ],
        columns: ['Area', 'Volume', 'Operational Signal'],
        rows: [
          { id: 'op-quotes', cells: ['Quotations', `${quotes.length} quotes`, `${boundQuotes.length} bound`], statusLabel: 'Live', statusTone: 'success' },
          { id: 'op-policies', cells: ['Policy Administration', `${policies.length} policies`, `${policies.filter((p) => p.status === 'PENDING RENEWAL').length} pending renewal`], statusLabel: 'Live', statusTone: 'success' },
          { id: 'op-claims', cells: ['Claims Operations', `${claims.length} claims`, `${breachedClaims.length} SLA breaches`], statusLabel: breachedClaims.length ? 'Watch' : 'Clear', statusTone: breachedClaims.length ? 'warning' : 'success' },
          { id: 'op-activity', cells: ['Activity Trail', `${activities.length} events`, 'Latest user and system changes'], statusLabel: 'Live', statusTone: 'success' },
        ],
        footnote: 'Computed live from operational registers and the activity log, not a static report catalogue.',
      };
    }

    case 'reporting-financial': {
      const policies = recordsStore.getPolicies();
      const claims = recordsStore.getClaims();
      const treaties = recordsStore.getTreaties();
      const products = recordsStore.getProducts();
      const premium = policies.reduce((sum, p) => sum + p.annualPremiumKes, 0);
      const paid = policies.reduce((sum, p) => sum + p.paidToDateKes, 0);
      const incurred = claims.reduce((sum, c) => sum + c.totalIncurredKes, 0);
      const ceded = treaties.reduce((sum, t) => sum + t.quarterlySettlementKes, 0);
      return {
        eyebrow: 'Reporting',
        title: 'Financial Reporting',
        subtitle: 'Premium, claims, and reinsurance figures calculated from the current book.',
        kpis: [
          { label: 'Annual Premium', value: money(premium), tone: 'success' },
          { label: 'Paid To Date', value: money(paid), tone: 'success' },
          { label: 'Loss Ratio', value: pct((incurred / (premium || 1)) * 100), tone: incurred > premium * 0.65 ? 'warning' : 'neutral' },
        ],
        columns: ['Financial View', 'Amount / Ratio', 'Source'],
        rows: [
          { id: 'fin-premium', cells: ['Gross Written Premium', money(premium), `${policies.length} policies`], statusLabel: 'Live', statusTone: 'success' },
          { id: 'fin-claims', cells: ['Claims Incurred', money(incurred), `${claims.length} claims`], statusLabel: incurred > premium * 0.65 ? 'Watch' : 'Within Range', statusTone: incurred > premium * 0.65 ? 'warning' : 'success' },
          { id: 'fin-ceded', cells: ['Reinsurance Settlement', money(ceded), `${treaties.length} treaties`], statusLabel: 'Live', statusTone: 'success' },
          { id: 'fin-combined', cells: ['Average Combined Ratio', pct(avg(products.map((p) => p.combinedRatioPct))), `${products.length} products`], statusLabel: 'Live', statusTone: 'success' },
        ],
        footnote: 'Computed live from policies, claims, product performance, and reinsurance treaty records.',
      };
    }

    case 'reporting-claims': {
      const claims = recordsStore.getClaims();
      const openClaims = claims.filter((c) => c.status !== 'CLOSED');
      const reserve = claims.reduce((sum, c) => sum + c.outstandingReserveKes, 0);
      const incurred = claims.reduce((sum, c) => sum + c.totalIncurredKes, 0);
      const paid = claims.reduce((sum, c) => sum + c.amountPaidKes, 0);
      const highFraud = claims.filter((c) => c.siuFraudScore >= 70);
      const avgClaimAgeDays = avg(claims.map((c) => daysBetween(c.reportDate, new Date().toISOString())));
      return {
        eyebrow: 'Reporting',
        title: 'Claims Reporting',
        subtitle: 'Claims severity, reserve position, settlement payments, and fraud indicators.',
        kpis: [
          { label: 'Open Claims', value: String(openClaims.length), tone: openClaims.length ? 'warning' : 'success' },
          { label: 'Outstanding Reserve', value: money(reserve), tone: 'neutral' },
          { label: 'Avg Claim Age', value: `${avgClaimAgeDays.toFixed(0)} days`, tone: avgClaimAgeDays > 30 ? 'warning' : 'success' },
        ],
        columns: ['Claim', 'Customer', 'Incurred / Paid'],
        rows: [...claims]
          .sort((a, b) => b.totalIncurredKes - a.totalIncurredKes)
          .slice(0, 8)
          .map((c) => ({
            id: c.id,
            cells: [c.claimNumber, c.customerName, `${money(c.totalIncurredKes)} / ${money(c.amountPaidKes)}`],
            statusLabel: c.status,
            statusTone: c.status === 'CLOSED' ? 'success' : c.siuFraudScore >= 70 ? 'warning' : 'info',
          })),
        footnote: `Computed live from ${claims.length} claims. Paid total: ${money(paid)}.`,
      };
    }

    case 'reporting-underwriting': {
      const quotes = recordsStore.getQuotes();
      const referrals = quotes.filter((q) => q.status === 'REFERRAL');
      const declined = quotes.filter((q) => q.status === 'DECLINED');
      const bound = quotes.filter((q) => q.status === 'BOUND');
      return {
        eyebrow: 'Reporting',
        title: 'Underwriting Reporting',
        subtitle: 'Risk quality, referral pressure, and quote conversion from the live quote book.',
        kpis: [
          { label: 'Average Risk Score', value: `${avg(quotes.map((q) => q.riskScore)).toFixed(0)} / 100`, tone: 'neutral' },
          { label: 'Referral Rate', value: pct((referrals.length / (quotes.length || 1)) * 100), tone: referrals.length ? 'warning' : 'success' },
          { label: 'Bind Rate', value: pct((bound.length / (quotes.length || 1)) * 100), tone: 'success' },
        ],
        columns: ['Quote', 'Line of Business', 'Risk / Premium'],
        rows: [...quotes]
          .sort((a, b) => b.riskScore - a.riskScore)
          .map((q) => ({
            id: q.id,
            cells: [q.quoteNumber, q.lineOfBusiness, `${q.riskScore}/100 - ${money(q.premiumKes)}`],
            statusLabel: q.status,
            statusTone: q.status === 'REFERRAL' ? 'warning' : q.status === 'DECLINED' ? 'danger' : q.status === 'BOUND' ? 'success' : 'neutral',
          })),
        footnote: `Computed live from ${quotes.length} quotes. Declined quotes: ${declined.length}.`,
      };
    }

    case 'reporting-regulatory': {
      const tenants = recordsStore.getTenants();
      const products = recordsStore.getProducts();
      const treaties = recordsStore.getTreaties();
      const customers = recordsStore.getCustomers();
      const kycReviews = customers.filter((c) => c.status === 'KYC REVIEW');
      const draftProducts = products.filter((p) => p.status === 'DRAFT' || p.status === 'REVISED');
      const expiringTreaties = treaties.filter((t) => t.status === 'IN RENEWAL' || t.status === 'EXPIRED');
      return {
        eyebrow: 'Reporting',
        title: 'Regulatory Reporting',
        subtitle: 'Compliance workload drawn from KYC, product filing, treaty, and tenant registers.',
        kpis: [
          { label: 'KYC Reviews', value: String(kycReviews.length), tone: kycReviews.length ? 'warning' : 'success' },
          { label: 'Products Pending Filing', value: String(draftProducts.length), tone: draftProducts.length ? 'warning' : 'success' },
          { label: 'Regulated Tenants', value: String(tenants.length), tone: 'neutral' },
        ],
        columns: ['Compliance Area', 'Count', 'Source'],
        rows: [
          { id: 'reg-kyc', cells: ['KYC Review Queue', String(kycReviews.length), 'Customers'], statusLabel: kycReviews.length ? 'Action Needed' : 'Clear', statusTone: kycReviews.length ? 'warning' : 'success' },
          { id: 'reg-products', cells: ['Product Filing Review', String(draftProducts.length), 'Product Studio'], statusLabel: draftProducts.length ? 'Review' : 'Filed', statusTone: draftProducts.length ? 'warning' : 'success' },
          { id: 'reg-treaties', cells: ['Treaty Renewal / Expiry', String(expiringTreaties.length), 'Reinsurance'], statusLabel: expiringTreaties.length ? 'Watch' : 'Current', statusTone: expiringTreaties.length ? 'warning' : 'success' },
          { id: 'reg-tenants', cells: ['Tenant Regulators', tenants.map((t) => t.regulator).join(', '), 'Organization'], statusLabel: 'Live', statusTone: 'success' },
        ],
        footnote: 'Computed live from customer KYC status, product filing states, treaties, and tenant regulators.',
      };
    }

    case 'reporting-bi': {
      const customers = recordsStore.getCustomers();
      const policies = recordsStore.getPolicies();
      const products = recordsStore.getProducts();
      const brokers = recordsStore.getBrokers();
      const customerValue = customers.reduce((sum, c) => sum + c.relationshipValueKes, 0);
      const premium = policies.reduce((sum, p) => sum + p.annualPremiumKes, 0);
      const topProducts = [...products].sort((a, b) => b.annualGwpKes - a.annualGwpKes).slice(0, 4);
      const productRows: BranchRow[] = topProducts.map((p) => ({
        id: p.id,
        cells: [p.name, money(p.annualGwpKes), `Combined ratio ${pct(p.combinedRatioPct)}`],
        statusLabel: p.status,
        statusTone: p.status === 'ACTIVE' ? 'success' : p.status === 'DRAFT' ? 'warning' : 'neutral',
      }));
      return {
        eyebrow: 'Reporting',
        title: 'Business Intelligence',
        subtitle: 'Portfolio indicators assembled from customers, policies, products, and intermediaries.',
        kpis: [
          { label: 'Relationship Value', value: money(customerValue), tone: 'success' },
          { label: 'Policy Premium', value: money(premium), tone: 'success' },
          { label: 'Distribution Partners', value: String(brokers.length), tone: 'neutral' },
        ],
        columns: ['Insight', 'Measure', 'Signal'],
        rows: [
          ...productRows,
          {
            id: 'bi-loss',
            cells: ['Customer Loss Ratio', pct(avg(customers.map((c) => c.lossRatioPct))), `${customers.length} customers`],
            statusLabel: 'Live',
            statusTone: 'success',
          },
        ],
        footnote: 'Computed live from the same records used by the operational workspaces.',
      };
    }

    case 'commissions': {
      const brokers = recordsStore.getBrokers();
      const total = brokers.reduce((sum, b) => sum + b.commissionEarnedKes, 0);
      const top = [...brokers].sort((a, b) => b.commissionEarnedKes - a.commissionEarnedKes).slice(0, 6);
      return {
        eyebrow: 'Finance',
        title: 'Commissions',
        subtitle: 'Commission earned per accredited broker, agent, and bancassurance partner.',
        kpis: [
          { label: 'Total Commission Earned', value: money(total), tone: 'success' },
          { label: 'Accredited Partners', value: String(brokers.length), tone: 'neutral' },
          {
            label: 'Avg Loss Ratio',
            value: `${(brokers.reduce((sum, b) => sum + b.lossRatioPct, 0) / (brokers.length || 1)).toFixed(1)}%`,
            tone: 'neutral',
          },
        ],
        columns: ['Broker / Partner', 'Type', 'Commission Earned'],
        rows: top.map((b) => ({
          id: b.id,
          cells: [b.name, b.type, money(b.commissionEarnedKes)],
          statusLabel: b.complianceStatus,
          statusTone: b.complianceStatus === 'ACCREDITED' ? 'success' : b.complianceStatus === 'PROVISIONAL' ? 'warning' : 'danger',
        })),
        footnote: 'Computed live from the Intermediaries register — see Intermediaries for full detail per partner.',
      };
    }

    case 'billing': {
      const policies = recordsStore.getPolicies();
      const invoiced = policies.reduce((sum, p) => sum + p.annualPremiumKes, 0);
      const inForce = policies.filter((p) => p.status === 'IN FORCE');
      const topByPremium = [...policies].sort((a, b) => b.annualPremiumKes - a.annualPremiumKes).slice(0, 6);
      return {
        eyebrow: 'Finance',
        title: 'Billing',
        subtitle: 'Premium invoicing across the in-force policy book.',
        kpis: [
          { label: 'Total Annual Premium', value: money(invoiced), tone: 'success' },
          { label: 'In-Force Policies', value: String(inForce.length), tone: 'neutral' },
          { label: 'Total Policies', value: String(policies.length), tone: 'neutral' },
        ],
        columns: ['Policy', 'Customer', 'Annual Premium'],
        rows: topByPremium.map((p) => ({
          id: p.id,
          cells: [p.policyNumber, p.customerName, money(p.annualPremiumKes)],
          statusLabel: p.status,
          statusTone: p.status === 'IN FORCE' ? 'success' : p.status === 'PENDING RENEWAL' ? 'warning' : p.status === 'LAPSED' ? 'danger' : 'neutral',
        })),
        footnote: 'Computed live from the Policies register, ranked by annual premium.',
      };
    }

    case 'receivables': {
      const policies = recordsStore.getPolicies();
      const outstanding = policies
        .map((p) => ({ policy: p, balance: p.annualPremiumKes - p.paidToDateKes }))
        .filter((row) => row.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      const totalOutstanding = outstanding.reduce((sum, row) => sum + row.balance, 0);
      return {
        eyebrow: 'Finance',
        title: 'Receivables',
        subtitle: 'Outstanding premium balances across the policy book.',
        kpis: [
          { label: 'Total Outstanding', value: money(totalOutstanding), tone: totalOutstanding > 0 ? 'warning' : 'success' },
          { label: 'Policies with a Balance', value: String(outstanding.length), tone: 'neutral' },
          { label: 'Fully Paid Policies', value: String(policies.length - outstanding.length), tone: 'success' },
        ],
        columns: ['Policy', 'Customer', 'Outstanding Balance'],
        rows: outstanding.slice(0, 8).map((row) => ({
          id: row.policy.id,
          cells: [row.policy.policyNumber, row.policy.customerName, money(row.balance)],
          statusLabel: row.balance > row.policy.annualPremiumKes * 0.5 ? 'Overdue' : 'Watch',
          statusTone: row.balance > row.policy.annualPremiumKes * 0.5 ? 'danger' : 'warning',
        })),
        footnote: 'Computed live as annual premium less amount paid to date, per policy.',
      };
    }

    case 'payments': {
      const policies = recordsStore.getPolicies();
      const claims = recordsStore.getClaims();
      const collected = policies.reduce((sum, p) => sum + p.paidToDateKes, 0);
      const disbursed = claims.reduce((sum, c) => sum + c.amountPaidKes, 0);
      const recentClaimPayouts = [...claims]
        .filter((c) => c.amountPaidKes > 0)
        .sort((a, b) => b.amountPaidKes - a.amountPaidKes)
        .slice(0, 6);
      return {
        eyebrow: 'Finance',
        title: 'Payments',
        subtitle: 'Inbound premium collections and outbound claim disbursements.',
        kpis: [
          { label: 'Premium Collected', value: money(collected), tone: 'success' },
          { label: 'Claims Disbursed', value: money(disbursed), tone: 'neutral' },
          { label: 'Net Cash Movement', value: money(collected - disbursed), tone: collected >= disbursed ? 'success' : 'warning' },
        ],
        columns: ['Claim', 'Customer', 'Amount Paid'],
        rows: recentClaimPayouts.map((c) => ({
          id: c.id,
          cells: [c.claimNumber, c.customerName, money(c.amountPaidKes)],
          statusLabel: c.status,
          statusTone: c.status === 'CLOSED' ? 'success' : c.status === 'SETTLEMENT' ? 'info' : 'neutral',
        })),
        footnote: 'Computed live from paid-to-date premiums and disbursed claim amounts.',
      };
    }

    case 'finance-landing': {
      const policies = recordsStore.getPolicies();
      const claims = recordsStore.getClaims();
      const brokers = recordsStore.getBrokers();
      const invoiced = policies.reduce((sum, p) => sum + p.annualPremiumKes, 0);
      const collected = policies.reduce((sum, p) => sum + p.paidToDateKes, 0);
      const outstanding = invoiced - collected;
      const disbursed = claims.reduce((sum, c) => sum + c.amountPaidKes, 0);
      const commissions = brokers.reduce((sum, b) => sum + b.commissionEarnedKes, 0);
      return {
        eyebrow: 'Finance',
        title: 'Finance & Treasury Overview',
        subtitle: 'Landing view for billing, receivables, payments, and commission operations.',
        kpis: [
          { label: 'Total Annual Premium', value: money(invoiced), tone: 'success' },
          { label: 'Outstanding Receivables', value: money(outstanding), tone: outstanding > 0 ? 'warning' : 'success' },
          { label: 'Commissions Earned', value: money(commissions), tone: 'neutral' },
        ],
        columns: ['Area', 'Amount', 'Detail'],
        rows: [
          { id: 'fl-billing', cells: ['Billing', money(invoiced), `${policies.length} policies`], statusLabel: 'Live', statusTone: 'success' },
          { id: 'fl-receivables', cells: ['Receivables', money(outstanding), 'Annual premium less paid-to-date'], statusLabel: outstanding > 0 ? 'Watch' : 'Clear', statusTone: outstanding > 0 ? 'warning' : 'success' },
          { id: 'fl-payments', cells: ['Claim Disbursements', money(disbursed), `${claims.filter((c) => c.amountPaidKes > 0).length} claims paid`], statusLabel: 'Live', statusTone: 'success' },
          { id: 'fl-commissions', cells: ['Commissions', money(commissions), `${brokers.length} partners`], statusLabel: 'Live', statusTone: 'success' },
        ],
        footnote: 'Ledger-level detail (journal, trial balance, reconciliation) lives in Accounting & Financial Operations.',
      };
    }

    case 'reinsurance-facultative': {
      const treaties = recordsStore.getTreaties().filter((t) => t.type === 'Facultative');
      const totalCeded = treaties.reduce((sum, t) => sum + t.quarterlySettlementKes, 0);
      return {
        eyebrow: 'Reinsurance',
        title: 'Facultative Reinsurance',
        subtitle: 'Risk-by-risk facultative placements ceded outside standing treaty capacity.',
        kpis: [
          { label: 'Active Placements', value: String(treaties.length), tone: 'neutral' },
          { label: 'Quarterly Settlement', value: money(totalCeded), tone: 'success' },
          { label: 'In Renewal', value: String(treaties.filter((t) => t.status === 'IN RENEWAL').length), tone: 'warning' },
        ],
        columns: ['Placement', 'Line of Business', 'Quarterly Settlement'],
        rows: treaties.map((t) => ({
          id: t.id,
          cells: [t.title, t.lineOfBusiness, money(t.quarterlySettlementKes)],
          statusLabel: t.status,
          statusTone: t.status === 'ACTIVE' ? 'success' : t.status === 'IN RENEWAL' ? 'warning' : 'danger',
        })),
        footnote: 'Computed live from the Treaties register, filtered to Facultative placements.',
      };
    }

    case 'reinsurance-cessions': {
      const treaties = recordsStore.getTreaties().filter((t) => t.type !== 'Facultative');
      const totalCeded = treaties.reduce((sum, t) => sum + t.quarterlySettlementKes, 0);
      return {
        eyebrow: 'Reinsurance',
        title: 'Reinsurance Cessions',
        subtitle: 'Automatic treaty cessions by line of business, this quarter.',
        kpis: [
          { label: 'Ceded This Quarter', value: money(totalCeded), tone: 'neutral' },
          { label: 'Standing Treaties', value: String(treaties.length), tone: 'success' },
          { label: 'Avg Cession Rate', value: `${(treaties.reduce((sum, t) => sum + t.treatyCessionPct, 0) / (treaties.length || 1)).toFixed(0)}%`, tone: 'neutral' },
        ],
        columns: ['Treaty', 'Line of Business', 'Quarterly Cession'],
        rows: treaties.map((t) => ({
          id: t.id,
          cells: [t.title, t.lineOfBusiness, money(t.quarterlySettlementKes)],
          statusLabel: t.status,
          statusTone: t.status === 'ACTIVE' ? 'success' : t.status === 'IN RENEWAL' ? 'warning' : 'danger',
        })),
        footnote: 'Computed live from the Treaties register — Facultative placements are tracked separately.',
      };
    }

    default:
      return undefined;
  }
}

export function getBranchLandingConfig(screenId: ScreenId): BranchLandingConfig | undefined {
  return buildDynamicBranchConfig(screenId) ?? BRANCH_LANDING_CONFIG[screenId];
}

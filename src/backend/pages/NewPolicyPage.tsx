/**
 * New policy (NB1-D, NB-D2): the steps from a customer to a bound policy, in order, at `/new-policy`.
 * The guide holds no state of its own. Every step is the record's own screen and the server's own
 * status: it only says what comes next, links to the screens this person's permissions open, and
 * lists what the server says is waiting at the last two steps (accepted quotations, and proposals
 * ready to bind). The hand-overs themselves live on the records: New quotation on a customer,
 * Create proposal on an accepted quotation, Bind on a ready proposal.
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, ClipboardList, FileCheck2, FileText, UsersRound } from 'lucide-react';
import { HorizonPage, HorizonPageTitle, ListCard, openableRow, RecordCell, RowChevron, StackedCell } from '../../components/horizon';
import { usePermission } from '../../lib/auth/me';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import {
  CUSTOMER_CREATE,
  CUSTOMER_VIEW,
  POLICY_BIND,
  PROPOSAL_CREATE,
  PROPOSAL_VIEW,
  QUOTATION_CREATE,
  QUOTATION_VIEW,
} from '../permissions';
import { formatDate } from '../policies/format';
import { useProposals } from '../proposals/queries';
import { proposalHref } from '../proposals/refs';
import { useQuotations } from '../quotations/queries';
import { quotationHref } from '../quotations/refs';
import { formatMoney } from '../workflow/format';

interface Step {
  no: number;
  icon: React.ElementType;
  title: string;
  text: string;
  actions: { label: string; to: string; primary?: boolean }[];
  /** Said when none of the step's screens are open to this person. */
  closed: string;
}

export const NewPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const canSeeCustomers = usePermission(CUSTOMER_VIEW);
  const canAddCustomer = usePermission(CUSTOMER_CREATE);
  const canSeeQuotations = usePermission(QUOTATION_VIEW);
  const canQuote = usePermission(QUOTATION_CREATE);
  const canSeeProposals = usePermission(PROPOSAL_VIEW);
  const canPropose = usePermission(PROPOSAL_CREATE);
  const canBind = usePermission(POLICY_BIND);
  const accepted = useQuotations({ status: 'ACCEPTED', page: 1 }, canSeeQuotations && canPropose);
  const ready = useProposals({ status: 'READY_TO_BIND', page: 1 }, canSeeProposals && canBind);

  const steps: Step[] = [
    {
      no: 1,
      icon: UsersRound,
      title: 'Customer',
      text: 'Find the customer or add them. Their KYC must be verified by a checker before the policy can be bound.',
      actions: [
        ...(canAddCustomer ? [{ label: 'Add a customer', to: '/customers/list/new', primary: true }] : []),
        ...(canSeeCustomers ? [{ label: 'Find a customer', to: '/customers/list' }] : []),
      ],
      closed: 'Customers are not among your screens.',
    },
    {
      no: 2,
      icon: FileText,
      title: 'Quotation',
      text: "On the customer's record, New quotation. Enter the risk, price it, issue the offer and record the customer's answer.",
      actions: [
        ...(canQuote ? [{ label: 'New quotation', to: '/quotations/list/new', primary: true }] : []),
        ...(canSeeQuotations ? [{ label: 'Quotations', to: '/quotations/list' }] : []),
      ],
      closed: 'Quotations are not among your screens.',
    },
    {
      no: 3,
      icon: ClipboardList,
      title: 'Proposal',
      text: 'On an accepted quotation, Create proposal. Complete the terms, record the evidence and submit; a referral waits for a checker.',
      actions: [
        ...(canPropose && canSeeProposals ? [{ label: 'New proposal', to: '/proposals/list/new', primary: true }] : []),
        ...(canSeeProposals ? [{ label: 'Proposals', to: '/proposals/list' }] : []),
      ],
      closed: 'Proposals are not among your screens.',
    },
    {
      no: 4,
      icon: FileCheck2,
      title: 'Bind',
      text: 'On a proposal that is ready to bind, Bind. The new policy opens in the Policy Directory.',
      actions: canSeeProposals ? [{ label: 'Ready to bind', to: '/proposals/list?status=READY_TO_BIND', primary: canBind }] : [],
      closed: 'Binding is not among your permissions.',
    },
  ];

  return (
    <HorizonPage id="new-policy">
      <HorizonPageTitle title="New policy" subtitle="Customer, quotation, proposal, bind: each step is done on its own record." />

      <ol aria-label="Steps" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.no} aria-label={`Step ${step.no}: ${step.title}`} className="hz-template-card flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg border border-[var(--hz-border-grid)] bg-[var(--hz-surface-muted)] text-[var(--hz-text-muted)]">
                  <Icon className="size-4" />
                </span>
                <span className="text-[13px] text-[var(--hz-text-muted)]">Step {step.no}</span>
              </div>
              <h2 className="text-base font-medium text-[var(--hz-text-primary)]">{step.title}</h2>
              <p className="flex-1 text-sm text-[var(--hz-text-secondary)]">{step.text}</p>
              {step.actions.length ? (
                <div className="flex flex-wrap gap-2">
                  {step.actions.map((action) => (
                    <button key={action.label} type="button" className={`hz-button ${action.primary ? 'hz-button-primary' : 'hz-button-secondary'}`} onClick={() => navigate(action.to)}>
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-[var(--hz-text-muted)]">{step.closed}</p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {canSeeQuotations && canPropose && (
          <ListCard
            title="Accepted quotations"
            description="The customer said yes. Open one and Create proposal; the server refuses a second proposal for the same offer."
            actions={
              <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate('/quotations/list?status=ACCEPTED')}>
                All accepted
                <ArrowRight className="h-4 w-4" />
              </button>
            }
          >
            {accepted.isError && (
              <div className="p-4">
                <ApiErrorAlert error={accepted.error} title="Accepted quotations could not be loaded" />
              </div>
            )}
            {accepted.data && accepted.data.results.length === 0 && <p className="p-4 text-sm text-[var(--hz-text-muted)]">None at the moment.</p>}
            {accepted.data && accepted.data.results.length > 0 && (
              <table className="hz-grid w-full" aria-label="Accepted quotations">
                <tbody>
                  {accepted.data.results.slice(0, 5).map((item) => (
                    <tr key={item.id} {...openableRow(() => navigate(quotationHref(item.quotation_no)))}>
                      <td>
                        <RecordCell icon={FileText} mono title={item.quotation_no} detail={item.customer.display_name} />
                      </td>
                      <td>
                        <StackedCell value={item.product.name} detail={item.branch.name} />
                      </td>
                      <RowChevron />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ListCard>
        )}
        {canSeeProposals && canBind && (
          <ListCard
            title="Ready to bind"
            description="Nothing outstanding on these proposals. Open one and Bind."
            actions={
              <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate('/proposals/list?status=READY_TO_BIND')}>
                All ready
                <ArrowRight className="h-4 w-4" />
              </button>
            }
          >
            {ready.isError && (
              <div className="p-4">
                <ApiErrorAlert error={ready.error} title="Proposals could not be loaded" />
              </div>
            )}
            {ready.data && ready.data.results.length === 0 && <p className="p-4 text-sm text-[var(--hz-text-muted)]">None at the moment.</p>}
            {ready.data && ready.data.results.length > 0 && (
              <table className="hz-grid w-full" aria-label="Ready to bind">
                <tbody>
                  {ready.data.results.slice(0, 5).map((item) => (
                    <tr key={item.id} {...openableRow(() => navigate(proposalHref(item.proposal_no)))}>
                      <td>
                        <RecordCell icon={ClipboardList} mono title={item.proposal_no} detail={item.customer.display_name} />
                      </td>
                      <td>
                        <StackedCell value={formatMoney(item.total_premium, item.currency)} detail={item.proposed_inception_date ? `From ${formatDate(item.proposed_inception_date)}` : undefined} />
                      </td>
                      <RowChevron />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ListCard>
        )}
      </div>
    </HorizonPage>
  );
};

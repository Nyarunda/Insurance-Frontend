/**
 * Backend mode (`VITE_DATA_SOURCE=backend`, FI1-A): the router, the query cache and the session.
 *
 * Nothing in this tree imports the mock records (`data/mockData`, `data/recordsStore`) or the
 * mock authorization (`store/permissionStore`, `data/roleRights`); `tests/modeIsolation.test.ts`
 * fails the build's tests if it ever does.
 */

import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { queryClient } from '../lib/query/queryClient';
import { restoreSession } from '../lib/auth/session';
import { useSessionStore } from '../lib/auth/sessionStore';
import { SignInPage } from './auth/SignInPage';
import { HomePage, NotFoundPage } from './pages/HomePage';
import { EndorsementCreatePage } from './pages/EndorsementCreatePage';
import { PolicyRefRoute } from './policies/refs';
import { EndorsementPage } from './pages/EndorsementPage';
import { RenewalPage } from './pages/RenewalPage';
import { RenewalPreparePage } from './pages/RenewalPreparePage';
import { RenewalByNumberRoute, RenewalsPage } from './pages/RenewalsPage';
import { InstancePage } from './pages/InstancePage';
import { PoliciesPage } from './pages/PoliciesPage';
import { CertificatePage } from './pages/CertificatePage';
import { CertificatesPage } from './pages/CertificatesPage';
import { CertificateStockPage } from './pages/CertificateStockPage';
import { VehicleMakesPage } from './pages/VehicleMakesPage';
import { ApprovalReasonsPage } from './pages/ApprovalReasonsPage';
import { RenewalSettingsPage } from './pages/RenewalSettingsPage';
import { PolicyWorkspacePage } from './pages/PolicyWorkspacePage';
import { WorkQueuePage } from './pages/WorkQueuePage';
import {
  CUSTOMER_CREATE,
  CUSTOMER_VIEW,
  ENDORSEMENT_CREATE,
  POLICY_VIEW,
  PROPOSAL_CREATE,
  PROPOSAL_VIEW,
  QUOTATION_CREATE,
  QUOTATION_VIEW,
  TASK_VIEW,
  CERT_STOCK,
  REFERENCE_MANAGE,
  WORKFLOW_MANAGE,
  RENEWAL_APPROVE,
  RENEWAL_CREATE,
  RENEWAL_SETTINGS_MANAGE,
  CONFIG_PUBLISH,
  CERT_VIEW,
} from './permissions';
import { ProposalRefRoute } from './proposals/refs';
import { ProposalCreatePage } from './pages/ProposalCreatePage';
import { ProposalPage } from './pages/ProposalPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { NewPolicyPage } from './pages/NewPolicyPage';
import { QuotationRefRoute } from './quotations/refs';
import { QuotationCreatePage } from './pages/QuotationCreatePage';
import { QuotationPage } from './pages/QuotationPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { CustomerRefRoute } from './customers/refs';
import { CustomerCreatePage } from './pages/CustomerCreatePage';
import { CustomerPage } from './pages/CustomerPage';
import { CustomersPage } from './pages/CustomersPage';
import { RequirePermission, RequireSession, SignedOutOnly } from './routing';
import { BackendShell } from './shell/BackendShell';

export const backendRoutes: RouteObject[] = [
  {
    path: '/sign-in',
    element: (
      <SignedOutOnly>
        <SignInPage />
      </SignedOutOnly>
    ),
  },
  {
    path: '/',
    element: (
      <RequireSession>
        <BackendShell />
      </RequireSession>
    ),
    children: [
      { index: true, element: <HomePage /> },
      // Lists live at `/<module>/list`; the module's own address and the old ones lead there.
      { path: 'my-work', element: <ToList to="/my-work/list" /> },
      // A record outside its list (`/my-work/<id>`, an older address) moves under it.
      { path: 'my-work/:record/*', element: <IntoList /> },
      // WFH-1 R1: every signed-in user has History; the page shows the queue only with workflow.task.view, and
      // the server decides which approvals a user may open (404 otherwise).
      { path: 'my-work/list', element: <WorkQueuePage /> },
      {
        path: 'my-work/list/:instanceId',
        element: (
          <>
            <div inert aria-hidden="true">
              <WorkQueuePage />
            </div>
            <InstancePage />
          </>
        ),
      },
      // NB1-A: customers, as policies: the list, the new-customer dialog over it, and the record by number.
      { path: 'customers', element: <ToList to="/customers/list" /> },
      { path: 'customers/:record/*', element: <IntoList /> },
      {
        path: 'customers/list',
        element: (
          <RequirePermission permission={CUSTOMER_VIEW}>
            <CustomersPage />
          </RequirePermission>
        ),
      },
      {
        path: 'customers/list/new',
        element: (
          <RequirePermission permission={CUSTOMER_VIEW}>
            <RequirePermission permission={CUSTOMER_CREATE}>
              <div inert aria-hidden="true">
                <CustomersPage />
              </div>
              <CustomerCreatePage />
            </RequirePermission>
          </RequirePermission>
        ),
      },
      {
        path: 'customers/list/:customerId',
        element: (
          <RequirePermission permission={CUSTOMER_VIEW}>
            <CustomerRefRoute>
              <CustomerPage />
            </CustomerRefRoute>
          </RequirePermission>
        ),
      },
      // NB1-B: quotations, as customers: the list, the new-quotation dialog over it, the record by number.
      { path: 'quotations', element: <ToList to="/quotations/list" /> },
      { path: 'quotations/:record/*', element: <IntoList /> },
      {
        path: 'quotations/list',
        element: (
          <RequirePermission permission={QUOTATION_VIEW}>
            <QuotationsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'quotations/list/new',
        element: (
          <RequirePermission permission={QUOTATION_VIEW}>
            <RequirePermission permission={QUOTATION_CREATE}>
              <div inert aria-hidden="true">
                <QuotationsPage />
              </div>
              <QuotationCreatePage />
            </RequirePermission>
          </RequirePermission>
        ),
      },
      {
        path: 'quotations/list/:quotationId',
        element: (
          <RequirePermission permission={QUOTATION_VIEW}>
            <QuotationRefRoute>
              <QuotationPage />
            </QuotationRefRoute>
          </RequirePermission>
        ),
      },
      // NB1-D: the New policy guide (NB-D2); it holds no state, each step is the record's own screen.
      {
        path: 'new-policy',
        element: (
          <RequirePermission permission={QUOTATION_CREATE}>
            <NewPolicyPage />
          </RequirePermission>
        ),
      },
      // NB1-C: underwriting proposals, as quotations: the list, the new-proposal dialog over it, the record by number.
      { path: 'proposals', element: <ToList to="/proposals/list" /> },
      { path: 'proposals/:record/*', element: <IntoList /> },
      {
        path: 'proposals/list',
        element: (
          <RequirePermission permission={PROPOSAL_VIEW}>
            <ProposalsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'proposals/list/new',
        element: (
          <RequirePermission permission={PROPOSAL_VIEW}>
            <RequirePermission permission={PROPOSAL_CREATE}>
              <div inert aria-hidden="true">
                <ProposalsPage />
              </div>
              <ProposalCreatePage />
            </RequirePermission>
          </RequirePermission>
        ),
      },
      {
        path: 'proposals/list/:proposalId',
        element: (
          <RequirePermission permission={PROPOSAL_VIEW}>
            <ProposalRefRoute>
              <ProposalPage />
            </ProposalRefRoute>
          </RequirePermission>
        ),
      },
      { path: 'policies', element: <ToList to="/policies/list" /> },
      // A record outside its list (`/policies/POL0000001/…`, an older address) moves under it.
      { path: 'policies/:record/*', element: <IntoList /> },
      {
        path: 'policies/list',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <PoliciesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'policies/list/:policyId',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <PolicyRefRoute>
              <PolicyWorkspacePage />
            </PolicyRefRoute>
          </RequirePermission>
        ),
      },
      {
        path: 'policies/list/:policyId/endorsements/new',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <RequirePermission permission={ENDORSEMENT_CREATE}>
              <PolicyRefRoute>
                <div inert aria-hidden="true">
                  <PolicyWorkspacePage tab="endorsements" />
                </div>
                <EndorsementCreatePage />
              </PolicyRefRoute>
            </RequirePermission>
          </RequirePermission>
        ),
      },
      {
        path: 'policies/list/:policyId/endorsements/:endorsementId/edit',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <RequirePermission permission={ENDORSEMENT_CREATE}>
              <PolicyRefRoute>
                <div inert aria-hidden="true">
                  <PolicyWorkspacePage tab="endorsements" />
                </div>
                <EndorsementCreatePage mode="edit" />
              </PolicyRefRoute>
            </RequirePermission>
          </RequirePermission>
        ),
      },
      {
        path: 'policies/list/:policyId/endorsements/:endorsementId',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <PolicyRefRoute>
              <div inert aria-hidden="true">
                <PolicyWorkspacePage tab="endorsements" />
              </div>
              <EndorsementPage />
            </PolicyRefRoute>
          </RequirePermission>
        ),
      },
      // RS-C: the renewal worklists, and a renewal by its number alone (opens its RS-A record).
      {
        path: 'renewals/list',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <RenewalsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'renewals/list/:renewalNo',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <RenewalByNumberRoute />
          </RequirePermission>
        ),
      },
      // RS-A: prepare a renewal, and a renewal's record, as dialogs over the policy's Renewals tab.
      {
        path: 'policies/list/:policyId/renewals/new',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <RequirePermission permission={RENEWAL_CREATE}>
              <PolicyRefRoute>
                <div inert aria-hidden="true">
                  <PolicyWorkspacePage tab="renewals" />
                </div>
                <RenewalPreparePage />
              </PolicyRefRoute>
            </RequirePermission>
          </RequirePermission>
        ),
      },
      {
        path: 'policies/list/:policyId/renewals/:renewalId',
        element: (
          <RequirePermission permission={POLICY_VIEW}>
            <PolicyRefRoute>
              <div inert aria-hidden="true">
                <PolicyWorkspacePage tab="renewals" />
              </div>
              <RenewalPage />
            </PolicyRefRoute>
          </RequirePermission>
        ),
      },
      // CS-B: find a certificate (issued only) by vehicle or serial, and the record by serial.
      { path: 'certificates', element: <ToList to="/certificates/list" /> },
      { path: 'certificates/:record/*', element: <IntoList /> },
      // CS-C: stock management (types, batches, available stock, allocation to a branch).
      {
        path: 'certificates/stock',
        element: (
          <RequirePermission permission={CERT_STOCK}>
            <CertificateStockPage />
          </RequirePermission>
        ),
      },
      // SD-C: the tenant's vehicle makes and models.
      {
        path: 'vehicle-makes/list',
        element: (
          <RequirePermission permission={REFERENCE_MANAGE}>
            <VehicleMakesPage />
          </RequirePermission>
        ),
      },
      // WRC-1: the tenant's approval reasons.
      {
        path: 'approval-reasons/list',
        element: (
          <RequirePermission permission={WORKFLOW_MANAGE}>
            <ApprovalReasonsPage />
          </RequirePermission>
        ),
      },
      // SD-E: the renewal settings; readable by those who prepare or approve renewals too (as the backend).
      {
        path: 'renewal-settings/list',
        element: (
          <RequirePermission permission={[RENEWAL_SETTINGS_MANAGE, CONFIG_PUBLISH, RENEWAL_CREATE, RENEWAL_APPROVE]}>
            <RenewalSettingsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'certificates/list',
        element: (
          <RequirePermission permission={CERT_VIEW}>
            <CertificatesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'certificates/list/:serial',
        element: (
          <RequirePermission permission={CERT_VIEW}>
            <CertificatePage />
          </RequirePermission>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

/** Redirects to a list, keeping the query (filters, page). */
function ToList({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}

/** `/policies/POL0000001/endorsements/…` → `/policies/list/POL0000001/endorsements/…`. */
function IntoList() {
  const { pathname, search } = useLocation();
  // Already under a list and still unmatched: not a page, and never moved again (no redirect loop).
  if (pathname.split('/')[2] === 'list') return <NotFoundPage />;
  return <Navigate to={{ pathname: pathname.replace(/^\/([\w-]+)\//, '/$1/list/'), search }} replace />;
}

const router = createBrowserRouter(backendRoutes);

export const BackendApp: React.FC = () => {
  useEffect(() => {
    if (useSessionStore.getState().status === 'idle') void restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

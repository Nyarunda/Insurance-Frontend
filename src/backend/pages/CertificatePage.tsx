/**
 * A certificate record by its serial (CERTIFICATES-SURFACE-1 CS-B): `/certificates/list/<serial>`.
 * The serial is resolved through `GET /certificates?serial_no=` (an exact match, within the
 * policies the user may see); one the user cannot see is "not found", exactly as an ID would be.
 * The record and its derived cover come from `GET /certificates/{id}`: only its 404 is "not found";
 * any other failure (403, 5xx, network, timeout) is shown as the error it is, with its reference.
 *
 * The record is read here. Issuing, printing, replacing, cancelling and spoiling stay on the policy's
 * Certificates tab (CS-A), which "Open on the policy" opens at this certificate.
 */

import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, FileBadge, SearchX } from 'lucide-react';
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
  StatusScreen,
} from '../../components/horizon';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { usePermission } from '../../lib/auth/me';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { CERTIFICATE_STATUS_LABEL, CERTIFICATE_TONE, isLive, periodText } from '../certificates/format';
import { useCertificate, useCertificateSearch } from '../certificates/queries';
import { POLICY_VIEW } from '../permissions';
import { formatDate } from '../policies/format';
import { policyHref } from '../policies/refs';
import { OPEN_WORKFLOW } from '../proposals/format';
import { formatDateTime, humanize } from '../workflow/format';
import { certificateHref, certificatesFrom } from './CertificatesPage';

export const CertificatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { serial: ref = '' } = useParams();
  const serial = ref.trim().toUpperCase();
  const found = useCertificateSearch({ serial });
  const match = found.data?.find((c) => c.serial_no.toUpperCase() === serial) ?? null;
  const loaded = useCertificate(match?.id ?? null);
  const canSeePolicy = usePermission(POLICY_VIEW);
  const back = () => navigate(certificatesFrom(location.state));

  if (found.isPending || (match && loaded.isPending)) return <HorizonLoader tip="Loading the certificate..." />;
  const detailMissing = loaded.isError && loaded.error instanceof ApiError && loaded.error.status === 404;
  const failure = found.isError ? found.error : loaded.isError && !detailMissing ? loaded.error : null;
  if (failure) {
    return (
      <HorizonPage id="certificate">
        <HorizonPageTitle title="Certificate" onBack={back} backLabel="Back to Certificates" />
        <HorizonPageContent className="p-4">
          <ApiErrorAlert error={failure} title="The certificate could not be loaded" />
        </HorizonPageContent>
      </HorizonPage>
    );
  }
  if (!match || detailMissing) {
    return (
      <HorizonPage id="not-found">
        <HorizonPageTitle title="Certificate" />
        <StatusScreen
          icon={SearchX}
          title={NOT_FOUND_TEXT}
          description="The certificate does not exist, or it is on a policy outside the branches you can see."
          actions={
            <button type="button" className="hz-button hz-button-secondary" onClick={back}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Certificates
            </button>
          }
        />
      </HorizonPage>
    );
  }

  const c = loaded.data?.view ?? match;
  const requested = !!c.workflow && OPEN_WORKFLOW.includes(c.workflow.status);
  const uncovered = isLive(c) && c.cover && !c.cover.fully_covered;
  const subject = c.marine_details
    ? [
        { label: 'Shipment reference', value: c.marine_details.shipment_reference },
        { label: 'Conveyance', value: c.marine_details.conveyance },
        { label: 'Voyage', value: `${c.marine_details.voyage_from} to ${c.marine_details.voyage_to}` },
        { label: 'Goods', value: c.marine_details.goods_description },
      ]
    : c.vehicle
      ? [
          { label: 'Registration', value: c.vehicle.registration || '—' },
          { label: 'Chassis number', value: c.vehicle.chassis_number || '—' },
          { label: 'Engine number', value: c.vehicle.engine_number || '—' },
        ]
      : [];
  const link = (serialNo: string) => (
    <button type="button" className="font-mono text-[var(--hz-primary)] hover:underline" onClick={() => navigate(certificateHref(serialNo), { state: location.state })}>
      {serialNo}
    </button>
  );

  return (
    <HorizonPage id="certificate" className="flex flex-col gap-4 !space-y-0">
      <RecordHeader
        icon={FileBadge}
        title={c.serial_no}
        subtitle={`${c.insured_name || '—'}${c.policy ? ` · ${c.policy.policy_no}` : ''}`}
        badges={
          <>
            <StatusBadge square label={CERTIFICATE_STATUS_LABEL[c.status] ?? humanize(c.status)} tone={CERTIFICATE_TONE[c.status] ?? 'neutral'} />
            <OutlineTag>{c.certificate_type.code}</OutlineTag>
            <OutlineTag>{humanize(c.certificate_type.category)}</OutlineTag>
            <OutlineTag>{c.insurer.code}</OutlineTag>
          </>
        }
        actions={
          <>
            {canSeePolicy && c.policy && (
              <button
                type="button"
                className="hz-button hz-button-primary"
                onClick={() => navigate(`${policyHref(c.policy!.policy_no)}?tab=certificates&certificate=${encodeURIComponent(c.serial_no)}`)}
              >
                Open on the policy
              </button>
            )}
            <button type="button" className="hz-button hz-button-secondary" onClick={back}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </>
        }
      />
      <div className="hz-record-body flex flex-col gap-4 py-4">
        {uncovered && (
          <HorizonAlert tone="warning" title="The policy no longer covers this certificate's whole validity">
            Covered through {formatDate(c.cover?.covered_through ?? null)}. It cannot be printed; cancel it or replace it on the policy.
          </HorizonAlert>
        )}
        {requested && c.workflow && (
          <HorizonAlert tone="info" title="Cancellation requested">
            {c.cancellation_request?.reason ? `“${c.cancellation_request.reason}”. ` : ''}
            {c.workflow.waiting_on?.length ? `Waiting for: ${c.workflow.waiting_on.join(', ')}.` : 'Waiting for an approver.'}
          </HorizonAlert>
        )}
        <DetailGroup title="Certificate">
          <DetailGrid
            items={[
              { label: 'Policy', value: c.policy?.policy_no ?? '—' },
              { label: 'Policy version', value: c.version_no ? `Version ${c.version_no}` : '—' },
              { label: 'Valid', value: periodText(c) },
              { label: 'Insured', value: c.insured_name || '—' },
              { label: 'Type', value: `${c.certificate_type.code} · ${humanize(c.certificate_type.category)}` },
              { label: 'Batch', value: c.batch_no },
            ]}
          />
        </DetailGroup>
        {subject.length > 0 && (
          <>
            <DetailDivider />
            <DetailGroup title={c.marine_details ? 'Shipment' : 'Vehicle'}>
              <DetailGrid items={subject} />
            </DetailGroup>
          </>
        )}
        <DetailDivider />
        <DetailGroup title="History">
          <DetailGrid
            items={[
              { label: 'Issued', value: formatDateTime(c.issued_at) },
              { label: 'Marked as printed', value: c.printed_at ? formatDateTime(c.printed_at) : 'Not yet' },
              ...(c.replaces ? [{ label: 'Replaces', value: link(c.replaces.serial_no) }] : []),
              ...(c.replaced_by ? [{ label: 'Replaced by', value: link(c.replaced_by.serial_no) }] : []),
              ...(c.closed_at
                ? [
                    { label: c.status === 'SPOILT' ? 'Spoilt' : 'Cancelled', value: formatDateTime(c.closed_at) },
                    { label: 'Reason', value: c.closed_reason || '—' },
                  ]
                : []),
            ]}
          />
        </DetailGroup>
      </div>
    </HorizonPage>
  );
};

/**
 * Find a certificate (CERTIFICATES-SURFACE-1 CS-B): `GET /certificates?vehicle=` (a registration or
 * chassis number) or `?serial_no=`. Issued certificates only, never blank stock, within the
 * policies the user may see; the server matches and normalises. The search lives in the URL
 * (`?vehicle=` or `?serial=`), and a result opens at `/certificates/list/<serial>`.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { FileBadge, Search } from 'lucide-react';
import {
  EmptyState,
  FilterGroup,
  HorizonLoader,
  HorizonPage,
  HorizonPageTitle,
  ListCard,
  openableRow,
  RecordCell,
  RowChevron,
  SearchField,
  StackedCell,
  StatusBadge,
} from '../../components/horizon';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { CERTIFICATE_STATUS_LABEL, CERTIFICATE_TONE, periodText, subjectText } from '../certificates/format';
import { useCertificateSearch } from '../certificates/queries';
import { humanize } from '../workflow/format';

export const CERTIFICATES_PATH = '/certificates/list';
export const certificateHref = (serial: string) => `${CERTIFICATES_PATH}/${encodeURIComponent(serial)}`;
export const SEARCH_FIRST_TEXT = 'Search for a certificate';
export const NO_MATCH_TEXT = 'No certificate matches this search';

type By = 'vehicle' | 'serial';
const BY: { id: By; label: string }[] = [
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'serial', label: 'Serial number' },
];

const LIST_LOCATION = /^\/certificates\/list(?:\?[^#\\]*)?$/;
/** Back to the search this certificate was opened from, if it was. */
export const certificatesFrom = (state: unknown): string => {
  const from = (state as { certificates?: unknown } | null)?.certificates;
  return typeof from === 'string' && LIST_LOCATION.test(from) ? from : CERTIFICATES_PATH;
};

export const CertificatesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const vehicle = params.get('vehicle')?.trim() ?? '';
  const serial = params.get('serial')?.trim() ?? '';
  const [by, setBy] = useState<By>(serial && !vehicle ? 'serial' : 'vehicle');
  const [term, setTerm] = useState(vehicle || serial);
  const results = useCertificateSearch(vehicle ? { vehicle } : serial ? { serial } : {});
  const searched = !!(vehicle || serial);
  const listState = { certificates: `${location.pathname}${location.search}` };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = term.trim();
    setParams(value ? { [by]: value } : {});
  };

  return (
    <HorizonPage id="certificates">
      <HorizonPageTitle
        title="Certificates"
        subtitle={results.data && searched ? `${results.data.length} ${results.data.length === 1 ? 'certificate' : 'certificates'} found` : 'Find an issued certificate by vehicle or serial number'}
      />
      <ListCard
        title="Find a certificate"
        toolbar={
          <form role="search" className="flex flex-wrap items-center gap-2" onSubmit={submit}>
            <FilterGroup<By> label="Search by" options={BY} value={by} onChange={(next) => setBy(next)} />
            <SearchField
              id="certificate-search"
              label={by === 'vehicle' ? 'Registration or chassis number' : 'Serial number'}
              value={term}
              onChange={setTerm}
              placeholder={by === 'vehicle' ? 'Registration or chassis number' : 'Exact serial number'}
              className="w-full sm:w-72"
            />
            <button type="submit" className="hz-button hz-button-secondary">
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
          </form>
        }
      >
        {!searched && (
          <EmptyState icon={FileBadge} title={SEARCH_FIRST_TEXT} hint="Enter a vehicle's registration or chassis number, or a certificate's serial number." />
        )}
        {searched && results.isPending && (
          <div className="p-6">
            <HorizonLoader tip="Searching..." />
          </div>
        )}
        {results.isError && (
          <div className="p-4">
            <ApiErrorAlert error={results.error} title="Certificates could not be searched" />
          </div>
        )}
        {searched && results.data && results.data.length === 0 && (
          <EmptyState icon={FileBadge} title={NO_MATCH_TEXT} hint="Only issued certificates on policies you can see are found." />
        )}
        {searched && results.data && results.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="hz-grid w-full" aria-label="Certificates">
              <thead>
                <tr>
                  <th>Certificate</th>
                  <th>Certifies</th>
                  <th>Insured</th>
                  <th>Valid</th>
                  <th>Status</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {results.data.map((c) => (
                  <tr key={c.id} {...openableRow(() => navigate(certificateHref(c.serial_no), { state: listState }))}>
                    <td>
                      <RecordCell icon={FileBadge} mono title={c.serial_no} detail={c.certificate_type.code} />
                    </td>
                    <td>{subjectText(c)}</td>
                    <td>
                      <StackedCell value={c.insured_name || '—'} detail={c.policy?.policy_no} />
                    </td>
                    <td className="whitespace-nowrap">{periodText(c)}</td>
                    <td>
                      <StatusBadge square label={CERTIFICATE_STATUS_LABEL[c.status] ?? humanize(c.status)} tone={CERTIFICATE_TONE[c.status] ?? 'neutral'} />
                    </td>
                    <RowChevron />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListCard>
    </HorizonPage>
  );
};

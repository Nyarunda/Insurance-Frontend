import React from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { DialogFrame } from '../../components/modals/DialogFrame';

export function PrintDocument({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return createPortal(<div className="ops-print-host">
    <DialogFrame titleId="print-document-title" title={title} size="xl" onClose={close}
      footer={<><button className="hz-button hz-button-secondary" onClick={close}>Close</button>
        <button className="hz-button hz-button-primary" title="Print or save as PDF" data-testid="document-print" onClick={() => window.print()}><Printer size={15} />Print</button></>}>
      <article className="ops ops-print-document" data-testid="print-document">{children}</article>
    </DialogFrame>
  </div>, document.body);
}

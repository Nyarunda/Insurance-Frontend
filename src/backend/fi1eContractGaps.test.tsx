/**
 * FI1-E: the PR #1 contract gaps the scope leaves to this slice (§3 FI1-E). The decision rules,
 * backdrop handling and reason codes were applied in FI1-B and are proven by its tests; the VOID
 * heading is tested with the instance page. Here: the dialog focus trap, readable reasons, the
 * stage keys, and no text below 13 px in backend mode.
 */

import React, { useState } from 'react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DialogFrame } from '../components/modals/DialogFrame';
import { ApprovalBar, ApprovalStatusPanel } from '../components/horizon';
import { readableReason } from './workflow/format';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <button type="button">Outside</button>
      {open && (
        <DialogFrame
          titleId="t"
          title="Withdraw endorsement"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setOpen(false)}>
                Keep it
              </button>
              <button type="button">Confirm</button>
            </>
          }
        >
          <label htmlFor="r">Reason</label>
          <textarea id="r" />
        </DialogFrame>
      )}
    </>
  );
}

describe('the dialog focus trap', () => {
  it('moves focus into the dialog, keeps Tab and Shift+Tab inside, and gives it back on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);

    // The first field, not the close button: the user can type at once.
    expect(screen.getByLabelText('Reason')).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
    await user.tab(); // past the last: back to the first focusable (the close button)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab({ shift: true }); // before the first: the last
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Outside' })).not.toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes on Escape and returns focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });
});

describe('readable reasons', () => {
  it('reads a CODE: detail reason with the code in words and the detail kept', () => {
    expect(readableReason('ENDORSEMENT_BASE_STALE: V1 superseded by V2')).toBe('Endorsement base stale: V1 superseded by V2');
    expect(readableReason('ENDORSEMENT_WITHDRAWN')).toBe('Endorsement withdrawn');
    expect(readableReason('Customer changed their mind')).toBe('Customer changed their mind');
    expect(readableReason('END0000001 was withdrawn')).toBe('END0000001 was withdrawn');
  });
});

describe('the PR #1 stage keys', () => {
  it('render two stages with the same label without a key collision', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const noop = () => {};
    const stages = [
      { label: 'Checker', state: 'APPROVED' as const },
      { label: 'Checker', state: 'PENDING' as const },
    ];
    render(
      <>
        <ApprovalStatusPanel stages={stages} maker="A maker" submittedAt="today" />
        <ApprovalBar stages={stages} maker="A maker" submittedAt="today" onApprove={noop} onReject={noop} onDelegate={noop} />
      </>,
    );
    const duplicateKeys = errors.mock.calls.filter((call) => String(call[0]).includes('same key'));
    errors.mockRestore();
    expect(duplicateKeys).toEqual([]);
    expect(screen.getAllByText('Checker').length).toBeGreaterThanOrEqual(4);
  });
});

describe('no text below 13 px in backend mode', () => {
  const SMALL = /text-\[(?:[0-9]|1[0-2])px\]|\btext-xs\b/;
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return files(path);
      return name.endsWith('.tsx') && !name.includes('.test.') ? [path] : [];
    });

  it('holds for every backend-mode screen and both dialogs', () => {
    const src = resolve(__dirname, '..');
    const checked = [...files(join(src, 'backend')), join(src, 'components', 'modals', 'DialogFrame.tsx')];
    expect(checked.length).toBeGreaterThan(15);
    const offenders = checked.filter((file) => SMALL.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('holds for the shared primitives that render their messages', () => {
    const horizon = readFileSync(resolve(__dirname, '..', 'components', 'horizon.tsx'), 'utf8');
    const body = (name: string) => {
      const start = horizon.indexOf(`export function ${name}(`);
      return horizon.slice(start, horizon.indexOf('\nexport ', start + 1));
    };
    for (const name of ['HorizonAlert', 'FieldError', 'CharacterCounter']) {
      expect(body(name), name).not.toMatch(SMALL);
    }
  });
});

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../lib/api/instance';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { ApiError } from '../../lib/api/errors';
import '../operations/operations.css';

export function InvitationAcceptPage() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)));
  const [existing, setExisting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const busy = useRef(false);
  useEffect(() => { window.history.replaceState(window.history.state, '', window.location.pathname); }, []);
  const valid = !!token.get('id') && !!token.get('secret');
  async function accept(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !valid || (!existing && password !== confirm)) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await api.request(`/auth/invitations/${encodeURIComponent(token.get('id')!)}/accept`, {
        method: 'POST', authenticated: false,
        body: { secret: token.get('secret'), ...(existing ? { email, password } : { new_password: password }) },
      });
      setPassword('');
      setConfirm('');
      token.delete('secret');
      setAccepted(true);
    } catch (failure) {
      setError(failure);
      if (failure instanceof ApiError && failure.code === 'INVITATION_SIGN_IN_REQUIRED') {
        setExisting(true);
        setPassword('');
        setConfirm('');
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <main className="min-h-screen flex items-center justify-center bg-[var(--hz-bg-app)] p-5">
    <section className="w-full max-w-md ops" data-testid="invitation-workspace">
      <h1 className="font-semibold mb-5">{accepted ? 'Invitation accepted' : 'Join this organisation'}</h1>
      {error != null && <ApiErrorAlert error={error} />}
      {accepted ? <Link className="hz-button hz-button-primary" to="/sign-in">Sign in</Link>
        : !valid ? <p>This invitation link is incomplete. Open the original private invitation.</p>
          : <form className="ops-form" onSubmit={event => void accept(event)}>
            <label className="mb-4"><span>
              <input type="checkbox" checked={existing} disabled={pending} onChange={event => {
                setExisting(event.target.checked); setPassword(''); setConfirm('');
              }} /> I already have an account
            </span></label>
            <div className="flex flex-col gap-4">
              {existing && <label>Email<input type="email" autoComplete="username" className="hz-field" required disabled={pending} value={email} onChange={event => setEmail(event.target.value)} /></label>}
              <label>{existing ? 'Password' : 'New password'}
                <input className="hz-field" type="password" required disabled={pending} autoComplete={existing ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} />
              </label>
              {!existing && <label>Confirm password
                <input className="hz-field" type="password" required disabled={pending} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} />
              </label>}
              <button data-testid="invitation-accept" className="hz-button hz-button-primary" disabled={pending || (!existing && password !== confirm)}>
                {pending ? 'Accepting...' : 'Accept invitation'}
              </button>
            </div>
          </form>}
    </section>
  </main>;
}

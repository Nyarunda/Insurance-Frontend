/**
 * Session events shared between the tabs of one origin (BroadcastChannel). Two distinct events:
 *
 * - `signed-out`: the user signed out in another tab;
 * - `session-ended`: the shared session became unrecoverable in another tab (expiry, revocation).
 *
 * A tab never rebroadcasts what it received, so there are no loops. Messages carry no tokens.
 */

export type AuthMessage = { type: 'signed-out' } | { type: 'session-ended' };

export const AUTH_CHANNEL_NAME = 'insurance-cloud:auth';

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(AUTH_CHANNEL_NAME);

let receiver: ((message: AuthMessage) => void) | null = null;

channel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
  if (event.data && typeof event.data.type === 'string') receiver?.(event.data);
});

export const authChannel = {
  post(message: AuthMessage): void {
    channel?.postMessage(message);
  },
  /** One receiver per tab: the session lifecycle. */
  listen(handler: (message: AuthMessage) => void): void {
    receiver = handler;
  },
};

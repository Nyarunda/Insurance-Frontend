/**
 * The access token lives in this module's memory only: never in sessionStorage, localStorage or a
 * cookie the page can read. A reload loses it, and the session is restored through the httpOnly
 * refresh cookie.
 */

let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

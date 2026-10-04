/**
 * The Policy Directory location a policy was opened from (FI1-C-R1). It travels in router state, so
 * the workspace's Back returns to the same filters and page. A policy opened directly or from a
 * bookmark has no such state, and Back goes to the plain directory.
 */

export const DIRECTORY_PATH = '/policies';

export interface DirectoryReturnState {
  directory: string;
}

/** Only the directory itself, with an optional query: never another path or origin. */
const DIRECTORY_LOCATION = /^\/policies(?:\?[^#\\]*)?$/;

export const directoryReturnState = (pathname: string, search: string): DirectoryReturnState => ({
  directory: `${pathname}${search}`,
});

export function directoryFrom(state: unknown): string {
  const directory = (state as Partial<DirectoryReturnState> | null)?.directory;
  return typeof directory === 'string' && DIRECTORY_LOCATION.test(directory) ? directory : DIRECTORY_PATH;
}

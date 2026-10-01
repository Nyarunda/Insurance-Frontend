/**
 * Per-browser shell preferences: sidebar state and row density.
 *
 * Every stored value is checked against an allowed list and falls back to the default, so a
 * stale or tampered entry can never put the shell into an unknown state. Values are read
 * synchronously when state is created, so the first paint already uses them (no layout jump).
 * Storage may be unavailable (private mode, blocked site data); every access is guarded.
 * These are conveniences only: nothing security-relevant is ever kept here.
 */

import type { DensityMode } from '../types';

const REGISTRY = {
  sidebar: { key: 'ic.pref.sidebar', values: ['expanded', 'collapsed'] as const, fallback: 'expanded' as const },
  density: {
    key: 'ic.pref.density',
    values: ['compact', 'comfortable', 'spacious'] as const,
    fallback: 'compact' as const,
  },
};

type Registry = typeof REGISTRY;
type PreferenceName = keyof Registry;
type PreferenceValue<N extends PreferenceName> = Registry[N]['values'][number];

export function readPreference<N extends PreferenceName>(name: N): PreferenceValue<N> {
  const { key, values, fallback } = REGISTRY[name];
  try {
    const stored = window.localStorage.getItem(key);
    return (values as readonly string[]).includes(stored ?? '') ? (stored as PreferenceValue<N>) : fallback;
  } catch {
    return fallback;
  }
}

export function writePreference<N extends PreferenceName>(name: N, value: PreferenceValue<N>): void {
  try {
    window.localStorage.setItem(REGISTRY[name].key, value);
  } catch {
    // Storage unavailable: the preference simply lasts for this page view.
  }
}

export const readDensity = (): DensityMode => readPreference('density');

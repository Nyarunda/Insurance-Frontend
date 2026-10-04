// @vitest-environment node
/**
 * FI1-Q2 / gate item 4: no mock fallback. Backend mode's module graph must never reach the mock
 * records or the mock authorization. The walk follows every runtime import (static, dynamic and
 * re-exports) from the backend entry; `import type` is erased at build time and is skipped.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..');

const FORBIDDEN = ['data/mockData.ts', 'data/recordsStore.ts', 'store/permissionStore.ts', 'data/roleRights.ts'];

const IMPORT_RE =
  /(?:^|[;\n])\s*(import|export)\s+(type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveModule(from: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null; // packages are not application code
  const base = resolve(dirname(from), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(candidate) && /\.(ts|tsx)$/.test(candidate)) return candidate;
  }
  throw new Error(`cannot resolve ${specifier} from ${relative(SRC, from)}`);
}

export function runtimeGraph(entry: string): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (graph.has(file)) continue;
    const source = readFileSync(file, 'utf8');
    const edges: string[] = [];
    for (const match of source.matchAll(IMPORT_RE)) {
      if (match[2]) continue; // import type / export type
      const target = resolveModule(file, match[3] ?? match[4]);
      if (target) edges.push(target);
    }
    graph.set(file, edges);
    queue.push(...edges);
  }
  return graph;
}

function pathTo(graph: Map<string, string[]>, entry: string, target: string): string[] | null {
  const previous = new Map<string, string>();
  const queue = [entry];
  const seen = new Set([entry]);
  while (queue.length) {
    const file = queue.shift()!;
    if (file === target) {
      const chain = [file];
      while (previous.has(chain[0])) chain.unshift(previous.get(chain[0])!);
      return chain.map((step) => relative(SRC, step));
    }
    for (const next of graph.get(file) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        previous.set(next, file);
        queue.push(next);
      }
    }
  }
  return null;
}

describe('backend mode isolation', () => {
  const entry = join(SRC, 'backend', 'BackendApp.tsx');
  const graph = runtimeGraph(entry);

  it.each(FORBIDDEN)('never reaches %s', (forbidden) => {
    expect(pathTo(graph, entry, join(SRC, forbidden))).toBeNull();
  });

  it('walks the real graph (sanity: the shell and the API client are in it)', () => {
    const files = [...graph.keys()].map((file) => relative(SRC, file).replace(/\\/g, '/'));
    expect(files).toEqual(expect.arrayContaining(['components/GlobalTopBar.tsx', 'lib/api/client.ts', 'backend/auth/SignInPage.tsx']));
  });

  it('the mock demo still reaches its own data (the walk would notice a mock import)', () => {
    const mockEntry = join(SRC, 'App.tsx');
    expect(pathTo(runtimeGraph(mockEntry), mockEntry, join(SRC, 'data/recordsStore.ts'))).not.toBeNull();
  });

  it('only main.tsx chooses between the two trees', () => {
    const main = readFileSync(join(SRC, 'main.tsx'), 'utf8');
    expect(main).toContain("import.meta.env.VITE_DATA_SOURCE === 'backend'");
    expect(main).toContain("import('./backend/BackendApp')");
    expect(main).toContain("import('./App')");
  });
});

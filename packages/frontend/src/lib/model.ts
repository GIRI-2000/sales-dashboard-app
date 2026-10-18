import { useMemo } from 'react';

import { useSemanticModelQuery } from '@/hooks/use-semantic-model-query';

export type ModelRow = Record<string, unknown>;

/**
 * DAX returns columns such as `Calender[Year]` or `[Sales]`. Strip the table
 * prefix and brackets so components can read `row.Year` / `row.Sales`.
 */
export function cleanColumnName(name: string): string {
  const m = /\[([^\]]+)\]\s*$/.exec(name);
  return (m ? m[1] : name).trim();
}

interface LooseTable {
  columns?: ReadonlyArray<{ name?: string } | string>;
  rows?: ReadonlyArray<unknown>;
}

export function tableToRows(table: unknown): ModelRow[] {
  const t = (table ?? {}) as LooseTable;
  const cols = (t.columns ?? []).map((c) =>
    cleanColumnName(typeof c === 'string' ? c : (c.name ?? ''))
  );
  return (t.rows ?? []).map((r) => {
    if (Array.isArray(r)) {
      const o: ModelRow = {};
      cols.forEach((c, i) => (o[c] = r[i]));
      return o;
    }
    const o: ModelRow = {};
    for (const [k, v] of Object.entries((r ?? {}) as ModelRow)) o[cleanColumnName(k)] = v;
    return o;
  });
}

export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export interface ModelResult {
  rows: ModelRow[];
  isLoading: boolean;
  error: string | undefined;
  refetch: () => Promise<void>;
}

/** Run one DAX query through the `salesModel` connector and return plain rows. */
export function useModelRows(spec: { connection: string; query: string }): ModelResult {
  const { data, isLoading, error, refetch } = useSemanticModelQuery(spec);
  const rows = useMemo(
    () => (data?.status === 'success' ? tableToRows(data.table) : []),
    [data]
  );
  const message = error
    ? error.message
    : data?.status === 'error'
      ? `${data.error.category}: ${data.error.message}`
      : undefined;
  return { rows, isLoading, error: message, refetch };
}

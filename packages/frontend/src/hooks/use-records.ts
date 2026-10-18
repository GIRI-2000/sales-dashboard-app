import { useCallback, useEffect, useRef, useState } from 'react';

/** Load a list of app-owned records, with explicit loading / error state and refresh. */
export function useRecords<T>(load: () => Promise<T[]>, deps: readonly unknown[]) {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await loadRef.current();
      if (!alive.current) return;
      setItems(next);
      setStatus('ready');
      setError(null);
    } catch (e) {
      if (!alive.current) return;
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { items, status, error, refresh, setItems };
}

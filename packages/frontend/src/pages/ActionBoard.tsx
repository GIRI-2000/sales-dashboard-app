import type { ActionItemRecord } from '@rayfin-app/shared';
import { ArrowLeft, ArrowRight, Frown, PackageX, Plus, Trash2, TrendingDown } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { Badge, Button, Card, Empty, ErrorNote, Field, inputClass, Loading } from '@/components/ui';
import { useRecords } from '@/hooks/use-records';
import { createAction, currentUser, deleteAction, listActions, updateAction } from '@/lib/app-data';
import { fmtDate, fmtMoney, fmtSignedPct, safeDiv } from '@/lib/format';
import { num, str, useModelRows, type ModelResult } from '@/lib/model';
import { cn } from '@/lib/utils';
import { countrySignals, productSignals, unhappyCustomers } from '@/queries';

const columns = ['Open', 'In progress', 'Done'] as const;

interface Signal {
  type: string;
  dimension: string;
  title: string;
  detail: string;
  impact: number;
  priority: 'High' | 'Medium' | 'Low';
}

export function ActionBoard({ year }: { year: number }) {
  const countries = useModelRows(countrySignals(year));
  const products = useModelRows(productSignals(year));
  const unhappy = useModelRows(unhappyCustomers(year));
  const actions = useRecords(() => listActions(), []);
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);

  useEffect(() => {
    currentUser().then(setMe, () => setMe(null));
  }, []);

  const signals: Record<string, Signal[]> = {
    'Market decline': countries.rows.map((r): Signal => {
      const drop = num(r.Sales) - num(r.SalesLY);
      return {
        type: 'Market decline',
        dimension: str(r.Country),
        title: `Recover sales in ${str(r.Country)}`,
        detail: `${fmtMoney(num(r.Sales))} vs ${fmtMoney(num(r.SalesLY))} last year (${fmtSignedPct(safeDiv(drop, num(r.SalesLY)))})`,
        impact: drop,
        priority: safeDiv(drop, num(r.SalesLY)) < -0.15 ? 'High' : 'Medium',
      };
    }),
    'Loss-making product': products.rows.map((r): Signal => ({
      type: 'Loss-making product',
      dimension: str(r['Product Name']),
      title: `Fix margin on ${str(r['Product Name'])}`,
      detail: `${str(r['Products Category'])} · profit ${fmtMoney(num(r.Profit))} on ${fmtMoney(num(r.Sales))} sales`,
      impact: num(r.Profit),
      priority: 'High',
    })),
    'Unhappy customer': unhappy.rows.map((r): Signal => ({
      type: 'Unhappy customer',
      dimension: `Order ${str(r.SalesId)}`,
      title: `Follow up order ${str(r.SalesId)} (${num(r.Rating)}★)`,
      detail: `${fmtDate(r.SalesDate)} · ${str(r.Product)} · ${str(r.Country)} · ${str(r.Reason) || 'no reason given'} · ${fmtMoney(num(r.Amount))}`,
      impact: num(r.Amount),
      priority: num(r.Rating) <= 1 ? 'High' : 'Medium',
    })),
  };

  const tracked = new Set(actions.items.map((a) => `${a.signalType}|${a.dimensionValue}`));

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await actions.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const raise = (s: Signal) =>
    run(async () => {
      if (!me) throw new Error('Not signed in.');
      const now = new Date();
      const due = new Date(now.getTime() + (s.priority === 'High' ? 7 : 14) * 86400000);
      await createAction({
        title: s.title,
        signalType: s.type,
        dimensionValue: s.dimension,
        impact: Math.round(s.impact * 100) / 100,
        priority: s.priority,
        status: 'Open',
        assignee: me.email,
        dueDate: due,
        notes: s.detail,
        owner_id: me.id,
        ownerEmail: me.email,
        createdAt: now,
        updatedAt: now,
      } as Omit<ActionItemRecord, 'id'>);
    });

  const visible = actions.items.filter((a) => !mineOnly || a.owner_id === me?.id);

  return (
    <div className="grid grid-cols-1 gap-400 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex flex-col gap-400">
        <SignalList icon={<TrendingDown className="icon-size-300 text-destructive" />} title={`Markets below ${year - 1}`} result={countries} items={signals['Market decline']} tracked={tracked} onRaise={raise} busy={busy} />
        <SignalList icon={<PackageX className="icon-size-300 text-warning" />} title={`Loss-making products ${year}`} result={products} items={signals['Loss-making product']} tracked={tracked} onRaise={raise} busy={busy} />
        <SignalList icon={<Frown className="icon-size-300 text-chart-3" />} title={`Largest 1–2★ orders ${year}`} result={unhappy} items={signals['Unhappy customer']} tracked={tracked} onRaise={raise} busy={busy} />
      </div>

      <Card
        title="Action board"
        subtitle="Owned, dated follow-ups stored in the app database and shared with the team"
        actions={
          <>
            <label className="flex items-center gap-200 text-200 text-muted-foreground">
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> Only mine
            </label>
            <ManualAction disabled={busy || !me} onCreate={(title) => raise({ type: 'Manual', dimension: 'General', title, detail: '', impact: 0, priority: 'Medium' })} />
          </>
        }
      >
        {err && <div className="mb-300"><ErrorNote message={err} /></div>}
        {actions.status === 'loading' ? (
          <Loading label="Loading actions…" />
        ) : actions.status === 'error' ? (
          <ErrorNote message={actions.error ?? 'Could not load actions'} onRetry={() => void actions.refresh()} />
        ) : (
          <div className="grid gap-300 md:grid-cols-3">
            {columns.map((col) => {
              const items = visible.filter((a) => a.status === col);
              return (
                <div key={col} className="flex min-h-[200px] flex-col gap-200 rounded-xl bg-muted/60 p-300">
                  <div className="flex items-center justify-between text-200 font-semibold uppercase tracking-wide text-muted-foreground">
                    {col} <span>{items.length}</span>
                  </div>
                  {items.length === 0 && <div className="py-400 text-center text-200 text-muted-foreground">Nothing here</div>}
                  {items.map((a) => (
                    <ActionCard key={a.id} a={a} mine={a.owner_id === me?.id} busy={busy}
                      onMove={(status) => run(() => updateAction(a.id, { status, updatedAt: new Date() }))}
                      onSave={(patch) => run(() => updateAction(a.id, { ...patch, updatedAt: new Date() }))}
                      onDelete={() => run(() => deleteAction(a.id))}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function SignalList({ icon, title, result, items, tracked, onRaise, busy }: {
  icon: ReactNode; title: string; result: ModelResult; items: Signal[]; tracked: Set<string>; onRaise: (s: Signal) => void; busy: boolean;
}) {
  return (
    <Card title={<span className="inline-flex items-center gap-200">{icon}{title}</span>} subtitle="Detected live from the semantic model">
      {result.error ? (
        <ErrorNote message={result.error} onRetry={() => void result.refetch()} />
      ) : result.isLoading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty title="No signals" hint="Nothing needs attention here for this year." />
      ) : (
        <ul className="flex max-h-[320px] flex-col divide-y divide-border overflow-y-auto">
          {items.map((s) => {
            const done = tracked.has(`${s.type}|${s.dimension}`);
            return (
              <li key={s.dimension} className="flex items-center gap-300 py-200">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-300 font-medium">{s.dimension}</div>
                  <div className="truncate text-200 text-muted-foreground" title={s.detail}>{s.detail}</div>
                </div>
                {done ? (
                  <Badge tone="good">Tracked</Badge>
                ) : (
                  <Button onClick={() => onRaise(s)} disabled={busy} aria-label={`Create action for ${s.dimension}`}><Plus className="icon-size-200" /> Action</Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ManualAction({ onCreate, disabled }: { onCreate: (title: string) => void; disabled: boolean }) {
  const [title, setTitle] = useState('');
  return (
    <form className="flex gap-200" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onCreate(title.trim()); setTitle(''); } }}>
      <label htmlFor="manual-action" className="sr-only">New action</label>
      <input id="manual-action" className={cn(inputClass, 'w-48')} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="New action…" />
      <Button type="submit" variant="primary" disabled={disabled || !title.trim()}><Plus className="icon-size-200" /></Button>
    </form>
  );
}

function ActionCard({ a, mine, busy, onMove, onSave, onDelete }: {
  a: ActionItemRecord; mine: boolean; busy: boolean;
  onMove: (s: string) => void; onSave: (p: Partial<ActionItemRecord>) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [assignee, setAssignee] = useState(a.assignee ?? '');
  const [due, setDue] = useState(a.dueDate ? new Date(String(a.dueDate)).toISOString().slice(0, 10) : '');
  const [notes, setNotes] = useState(a.notes ?? '');
  const idx = columns.indexOf(a.status as (typeof columns)[number]);
  const overdue = a.status !== 'Done' && a.dueDate && new Date(String(a.dueDate)) < new Date();

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-300 shadow-sm [overflow-wrap:anywhere]">
      <div className="flex items-start justify-between gap-200">
        <div className="min-w-0 flex-1 text-300 font-semibold leading-300">{a.title}</div>
        <Badge tone={a.priority === 'High' ? 'bad' : a.priority === 'Medium' ? 'warn' : 'neutral'}>{a.priority}</Badge>
      </div>
      <div className="mt-100 text-200 text-muted-foreground">{a.signalType}{a.impact ? ` · ${fmtMoney(num(a.impact))}` : ''}</div>
      {!editing ? (
        <>
          {a.notes && <p className="mt-200 text-200">{a.notes}</p>}
          <div className={cn('mt-200 text-200', overdue ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
            {a.assignee || 'Unassigned'}{a.dueDate ? ` · due ${fmtDate(a.dueDate)}` : ''}
          </div>
          <div className="mt-100 text-200 text-muted-foreground">raised by {a.ownerEmail}</div>
        </>
      ) : (
        <div className="mt-200 flex flex-col gap-200">
          <Field label="Assignee"><input className={inputClass} value={assignee} maxLength={200} onChange={(e) => setAssignee(e.target.value)} /></Field>
          <Field label="Due date"><input type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label="Notes"><textarea className={inputClass} rows={3} value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div className="flex gap-200">
            <Button variant="primary" disabled={busy} onClick={() => { onSave({ assignee, dueDate: due ? new Date(due) : null, notes }); setEditing(false); }}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {mine && !editing && (
        <div className="mt-300 flex flex-wrap items-center gap-100">
          <Button variant="ghost" aria-label="Move back" disabled={busy || idx <= 0} onClick={() => onMove(columns[idx - 1])}><ArrowLeft className="icon-size-200" /></Button>
          <Button variant="ghost" aria-label="Move forward" disabled={busy || idx >= columns.length - 1} onClick={() => onMove(columns[idx + 1])}><ArrowRight className="icon-size-200" /></Button>
          <Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="ghost" aria-label="Delete action" disabled={busy} onClick={onDelete}><Trash2 className="icon-size-200" /></Button>
        </div>
      )}
    </article>
  );
}

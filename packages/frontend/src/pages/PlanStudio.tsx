import type { SalesPlanRecord } from '@rayfin-app/shared';
import { CheckCircle2, Save, Send, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, Card, Empty, ErrorNote, inputClass, Loading } from '@/components/ui';
import { useRecords } from '@/hooks/use-records';
import { createPlan, currentUser, listPlans, updatePlan } from '@/lib/app-data';
import { fmtCompactMoney, fmtMoney, fmtSignedPct, safeDiv } from '@/lib/format';
import { num, str, useModelRows } from '@/lib/model';
import { cn } from '@/lib/utils';
import { regionCategory } from '@/queries';

interface Cell {
  key: string;
  region: string;
  category: string;
  baseline: number;
  mine?: SalesPlanRecord;
  team: SalesPlanRecord[];
}

const keyOf = (region: string, category: string) => `${region}|${category}`;

/**
 * Plan Studio: every planner types next year's growth per Region x Category on
 * top of live actuals from the semantic model. Values are saved to the app's
 * own SQL table and the team consensus recalculates for everyone.
 */
export function PlanStudio({ year }: { year: number }) {
  const planYear = year + 1;
  const base = useModelRows(regionCategory(year));
  const plans = useRecords(() => listPlans(planYear), [planYear]);
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);

  useEffect(() => {
    currentUser().then(setMe, () => setMe(null));
  }, []);

  const cells = useMemo<Cell[]>(() => {
    const byKey = new Map<string, SalesPlanRecord[]>();
    for (const p of plans.items) {
      const k = keyOf(p.region, p.category);
      byKey.set(k, [...(byKey.get(k) ?? []), p]);
    }
    return base.rows
      .filter((r) => str(r['Geographic Region']) && str(r['Products Category']))
      .map((r) => {
        const region = str(r['Geographic Region']);
        const category = str(r['Products Category']);
        const k = keyOf(region, category);
        const team = byKey.get(k) ?? [];
        return { key: k, region, category, baseline: num(r.Sales), team, mine: team.find((p) => p.owner_id === me?.id) };
      });
  }, [base.rows, plans.items, me]);

  const regions = useMemo(() => [...new Set(cells.map((c) => c.region))], [cells]);
  const myStatus = cells.find((c) => c.mine)?.mine?.status ?? 'Not started';
  const planners = new Set(plans.items.map((p) => p.ownerEmail)).size;

  const growthFor = (c: Cell): number | null => {
    const d = drafts[c.key];
    if (d !== undefined && d.trim() !== '') return Number(d) / 100;
    if (c.mine) return num(c.mine.growthPct);
    return null;
  };
  const consensus = (c: Cell) =>
    c.team.length ? c.team.reduce((a, p) => a + num(p.plannedSales), 0) / c.team.length : null;

  const dirtyKeys = Object.keys(drafts).filter((k) => drafts[k].trim() !== '' && !Number.isNaN(Number(drafts[k])))
    .concat(Object.keys(notes).filter((k) => drafts[k] === undefined));

  const totals = cells.reduce(
    (acc, c) => {
      const g = growthFor(c);
      acc.base += c.baseline;
      acc.mine += g === null ? 0 : c.baseline * (1 + g);
      acc.team += consensus(c) ?? 0;
      return acc;
    },
    { base: 0, mine: 0, team: 0 }
  );

  async function save(status?: 'Submitted') {
    if (!me) return;
    setSaving(true);
    setMessage(null);
    try {
      const touched = new Set(dirtyKeys);
      if (status) cells.filter((c) => c.mine).forEach((c) => touched.add(c.key));
      for (const c of cells) {
        if (!touched.has(c.key)) continue;
        const g = growthFor(c);
        if (g === null) continue;
        const fields = {
          plannedSales: Math.round(c.baseline * (1 + g) * 100) / 100,
          growthPct: g,
          baselineSales: Math.round(c.baseline * 100) / 100,
          note: notes[c.key] ?? c.mine?.note ?? undefined,
          status: status ?? c.mine?.status ?? 'Draft',
          updatedAt: new Date(),
        };
        if (c.mine) await updatePlan(c.mine.id, fields);
        else
          await createPlan({
            ...fields,
            planYear,
            baseYear: year,
            region: c.region,
            category: c.category,
            owner_id: me.id,
            ownerEmail: me.email,
          } as Omit<SalesPlanRecord, 'id'>);
      }
      setDrafts({});
      setNotes({});
      await plans.refresh();
      setMessage({ tone: 'good', text: status ? `Plan submitted for ${planYear}.` : 'Plan saved.' });
    } catch (e) {
      setMessage({ tone: 'bad', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  function applyAll(pct: number) {
    const next: Record<string, string> = {};
    cells.forEach((c) => (next[c.key] = String(pct)));
    setDrafts(next);
  }

  if (base.error) return <ErrorNote message={base.error} onRetry={() => void base.refetch()} />;
  if (base.isLoading || plans.status === 'loading') return <Loading label="Loading actuals and plans…" />;
  if (plans.status === 'error') return <ErrorNote message={plans.error ?? 'Could not load plans'} onRetry={() => void plans.refresh()} />;
  if (!cells.length) return <Empty title={`No sales in ${year}`} hint="Pick another year." />;

  return (
    <div className="flex flex-col gap-400">
      <div className="grid gap-400 md:grid-cols-4">
        <Summary label={`${year} actual (model)`} value={fmtCompactMoney(totals.base)} />
        <Summary label={`My ${planYear} plan`} value={fmtCompactMoney(totals.mine)} sub={totals.mine ? fmtSignedPct(safeDiv(totals.mine - totals.base, totals.base)) : 'not started'} />
        <Summary label="Team consensus" value={totals.team ? fmtCompactMoney(totals.team) : '—'} sub={`${planners} planner${planners === 1 ? '' : 's'}`} />
        <div className="flex flex-col justify-center gap-200 rounded-2xl border border-border bg-card p-400">
          <div className="text-200 text-muted-foreground">My status</div>
          <Badge tone={myStatus === 'Submitted' ? 'good' : myStatus === 'Draft' ? 'warn' : 'neutral'}>{myStatus}</Badge>
        </div>
      </div>

      <Card
        title={`Forecast ${planYear} by region and category`}
        subtitle={`Baseline = ${year} actual sales from the semantic model. Enter growth % per cell; the planned value and team consensus update instantly.`}
        actions={
          <>
            <span className="text-200 text-muted-foreground">Fill all:</span>
            {[0, 5, 10].map((p) => (
              <Button key={p} onClick={() => applyAll(p)} disabled={saving}>{p}%</Button>
            ))}
            <Button onClick={() => void save()} disabled={saving || !me || dirtyKeys.length === 0}>
              <Save className="icon-size-200" /> Save draft
            </Button>
            <Button variant="primary" onClick={() => void save('Submitted')} disabled={saving || !me || (dirtyKeys.length === 0 && !cells.some((c) => c.mine))}>
              <Send className="icon-size-200" /> Submit plan
            </Button>
          </>
        }
      >
        {message && (
          <div className={cn('mb-300 flex items-center gap-200 rounded-lg p-300 text-300', message.tone === 'good' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')} role="status">
            {message.tone === 'good' && <CheckCircle2 className="icon-size-200" />} {message.text}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-300">
            <thead>
              <tr className="border-b border-border text-left text-200 text-muted-foreground">
                <th className="py-200 pr-300 font-medium">Region / Category</th>
                <th className="py-200 pr-300 text-right font-medium">{year} actual</th>
                <th className="py-200 pr-300 text-right font-medium">My growth %</th>
                <th className="py-200 pr-300 text-right font-medium">My {planYear} plan</th>
                <th className="py-200 pr-300 text-right font-medium"><span className="inline-flex items-center gap-100"><Users className="icon-size-100" />Team consensus</span></th>
                <th className="py-200 pr-300 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((region) => {
                const rc = cells.filter((c) => c.region === region);
                const rb = rc.reduce((a, c) => a + c.baseline, 0);
                const rm = rc.reduce((a, c) => { const g = growthFor(c); return a + (g === null ? 0 : c.baseline * (1 + g)); }, 0);
                return [
                  <tr key={region} className="bg-muted/60">
                    <td className="py-200 pl-200 pr-300 font-semibold">{region}</td>
                    <td className="py-200 pr-300 text-right font-numeric font-semibold">{fmtMoney(rb)}</td>
                    <td className="py-200 pr-300 text-right text-200 text-muted-foreground">{rm ? fmtSignedPct(safeDiv(rm - rb, rb)) : ''}</td>
                    <td className="py-200 pr-300 text-right font-numeric font-semibold">{rm ? fmtMoney(rm) : '—'}</td>
                    <td />
                    <td />
                  </tr>,
                  ...rc.map((c) => {
                    const g = growthFor(c);
                    const cons = consensus(c);
                    const dirty = drafts[c.key] !== undefined;
                    return (
                      <tr key={c.key} className="border-b border-border/60">
                        <td className="py-200 pl-500 pr-300">{c.category}</td>
                        <td className="py-200 pr-300 text-right font-numeric">{fmtMoney(c.baseline)}</td>
                        <td className="py-200 pr-300 text-right">
                          <input
                            aria-label={`Growth % for ${c.region} ${c.category}`}
                            type="number"
                            step="0.5"
                            min={-100}
                            max={500}
                            className={cn(inputClass, 'w-24 text-right', dirty && 'border-primary')}
                            value={drafts[c.key] ?? (c.mine ? String(Math.round(num(c.mine.growthPct) * 1000) / 10) : '')}
                            placeholder="—"
                            onChange={(e) => setDrafts((d) => ({ ...d, [c.key]: e.target.value }))}
                          />
                        </td>
                        <td className="py-200 pr-300 text-right font-numeric font-semibold">{g === null ? '—' : fmtMoney(c.baseline * (1 + g))}</td>
                        <td className="py-200 pr-300 text-right font-numeric" title={c.team.map((p) => `${p.ownerEmail}: ${fmtMoney(num(p.plannedSales))} (${p.status})`).join('\n')}>
                          {cons === null ? <span className="text-muted-foreground">—</span> : <>{fmtMoney(cons)} <span className="text-200 text-muted-foreground">({c.team.length})</span></>}
                        </td>
                        <td className="py-200 pr-300">
                          <input
                            aria-label={`Note for ${c.region} ${c.category}`}
                            className={cn(inputClass, 'w-full min-w-[160px]')}
                            maxLength={500}
                            value={notes[c.key] ?? c.mine?.note ?? ''}
                            placeholder="Assumption…"
                            onChange={(e) => setNotes((n) => ({ ...n, [c.key]: e.target.value }))}
                          />
                        </td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Planner activity" subtitle="Every save is stored with who changed it and when">
        {plans.items.length === 0 ? (
          <Empty title="No plans saved yet" hint="Your first save will appear here." />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {[...new Map([...plans.items].reverse().map((p) => [p.ownerEmail, p])).values()].map((p) => {
              const rows = plans.items.filter((x) => x.ownerEmail === p.ownerEmail);
              const total = rows.reduce((a, x) => a + num(x.plannedSales), 0);
              return (
                <li key={p.ownerEmail} className="flex flex-wrap items-center justify-between gap-300 py-300 text-300">
                  <span className="font-medium">{p.ownerEmail || 'Unknown user'}</span>
                  <span className="text-muted-foreground">{rows.length} cells · {fmtCompactMoney(total)}</span>
                  <Badge tone={p.status === 'Submitted' ? 'good' : 'warn'}>{p.status}</Badge>
                  <span className="text-200 text-muted-foreground">updated {new Date(String(p.updatedAt)).toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Summary({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-400">
      <div className="text-200 text-muted-foreground">{label}</div>
      <div className="font-numeric text-hero-700 font-semibold leading-hero-700">{value}</div>
      {sub && <div className="text-200 text-muted-foreground">{sub}</div>}
    </div>
  );
}

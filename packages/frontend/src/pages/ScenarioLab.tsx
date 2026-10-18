import type { ScenarioRecord } from '@rayfin-app/shared';
import { RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { PairedBars } from '@/components/charts';
import { Badge, Button, Card, Empty, ErrorNote, Field, inputClass, Loading } from '@/components/ui';
import { useRecords } from '@/hooks/use-records';
import { createScenario, currentUser, deleteScenario, listScenarios } from '@/lib/app-data';
import { fmtCompactMoney, fmtDate, fmtMoney, fmtPct, fmtSignedPct, safeDiv } from '@/lib/format';
import { num, str, useModelRows } from '@/lib/model';
import { categoryEconomics } from '@/queries';

interface Levers {
  price: number; // % change in list price
  discount: number; // percentage-point change in discount rate
  volume: number; // % change in units
  cost: number; // % change in unit cost
  elasticity: number; // % volume change per +1% price
}

const zero: Levers = { price: 0, discount: 0, volume: 0, cost: 0, elasticity: 0 };

interface CategoryBase {
  category: string;
  sales: number;
  cost: number;
  profit: number;
  qty: number;
  gross: number;
  discount: number;
}

/** Projects one category forward from its real economics in the model. */
function project(b: CategoryBase, l: Levers) {
  const d0 = safeDiv(b.discount, b.gross); // current average discount rate
  const d1 = Math.min(0.95, Math.max(0, d0 + l.discount / 100));
  const volumeFactor = Math.max(0, 1 + l.volume / 100 + (l.elasticity * l.price) / 100);
  const priceFactor = 1 + l.price / 100;
  const sales = b.sales * priceFactor * volumeFactor * safeDiv(1 - d1, 1 - d0 || 1);
  const cost = b.cost * volumeFactor * (1 + l.cost / 100);
  return { sales, cost, profit: sales - cost, qty: b.qty * volumeFactor };
}

export function ScenarioLab({ year }: { year: number }) {
  const econ = useModelRows(categoryEconomics(year));
  const saved = useRecords(() => listScenarios(), []);
  const [levers, setLevers] = useState<Levers>(zero);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    currentUser().then(setMe, () => setMe(null));
  }, []);

  const bases = useMemo<CategoryBase[]>(
    () =>
      econ.rows
        .filter((r) => str(r['Products Category']))
        .map((r) => ({
          category: str(r['Products Category']),
          sales: num(r.Sales),
          cost: num(r.Cost),
          profit: num(r.Profit),
          qty: num(r.Qty),
          gross: num(r.GrossSales),
          discount: num(r.DiscountAmt),
        })),
    [econ.rows]
  );

  const rows = bases.map((b) => ({ b, p: project(b, levers) }));
  const base = rows.reduce((a, r) => ({ sales: a.sales + r.b.sales, profit: a.profit + r.b.profit, cost: a.cost + r.b.cost }), { sales: 0, profit: 0, cost: 0 });
  const proj = rows.reduce((a, r) => ({ sales: a.sales + r.p.sales, profit: a.profit + r.p.profit, cost: a.cost + r.p.cost }), { sales: 0, profit: 0, cost: 0 });

  async function onSave() {
    if (!me || !name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await createScenario({
        name: name.trim(),
        baseYear: year,
        priceChangePct: levers.price,
        discountChangePts: levers.discount,
        volumeChangePct: levers.volume,
        costChangePct: levers.cost,
        elasticity: levers.elasticity,
        baselineSales: Math.round(base.sales),
        baselineProfit: Math.round(base.profit),
        projectedSales: Math.round(proj.sales),
        projectedProfit: Math.round(proj.profit),
        note: note.trim() || undefined,
        owner_id: me.id,
        ownerEmail: me.email,
        createdAt: new Date(),
      } as Omit<ScenarioRecord, 'id'>);
      setName('');
      setNote('');
      await saved.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(s: ScenarioRecord) {
    setErr(null);
    try {
      await deleteScenario(s.id);
      await saved.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  if (econ.error) return <ErrorNote message={econ.error} onRetry={() => void econ.refetch()} />;
  if (econ.isLoading) return <Loading />;
  if (!bases.length) return <Empty title={`No sales in ${year}`} />;

  const slider = (key: keyof Levers, label: string, min: number, max: number, step: number, unit: string, help: string) => (
    <div className="flex flex-col gap-100">
      <div className="flex items-baseline justify-between">
        <label htmlFor={`lever-${key}`} className="text-300 font-medium">{label}</label>
        <span className="font-numeric text-300 font-semibold">{levers[key] > 0 ? '+' : ''}{levers[key]}{unit}</span>
      </div>
      <input id={`lever-${key}`} type="range" min={min} max={max} step={step} value={levers[key]} onChange={(e) => setLevers((l) => ({ ...l, [key]: Number(e.target.value) }))} className="accent-[var(--color-primary)]" />
      <div className="text-200 text-muted-foreground">{help}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-400 lg:grid-cols-5">
      <Card className="lg:col-span-2" title="Levers" subtitle={`Applied to ${year} category economics from the model`} actions={<Button variant="ghost" onClick={() => setLevers(zero)}><RotateCcw className="icon-size-200" /> Reset</Button>}>
        <div className="flex flex-col gap-500">
          {slider('price', 'List price', -20, 20, 0.5, '%', 'Change to unit sale price before discount')}
          {slider('discount', 'Discount rate', -10, 10, 0.5, ' pts', 'Shift in the average discount given')}
          {slider('volume', 'Units sold', -30, 30, 1, '%', 'Independent change in demand')}
          {slider('elasticity', 'Price elasticity', -3, 0, 0.1, '', 'Volume % change per +1% price (0 = no reaction)')}
          {slider('cost', 'Unit cost', -15, 25, 0.5, '%', 'Supplier / landed-cost change')}
        </div>
      </Card>

      <div className="flex flex-col gap-400 lg:col-span-3">
        <div className="grid gap-400 sm:grid-cols-3">
          <Result label="Projected sales" value={fmtCompactMoney(proj.sales)} delta={safeDiv(proj.sales - base.sales, base.sales)} />
          <Result label="Projected profit" value={fmtCompactMoney(proj.profit)} delta={safeDiv(proj.profit - base.profit, Math.abs(base.profit))} />
          <Result label="Margin on cost" value={fmtPct(safeDiv(proj.profit, proj.cost))} sub={`was ${fmtPct(safeDiv(base.profit, base.cost))}`} />
        </div>
        <Card title="Profit by category" subtitle={`${year} actual vs scenario`}>
          <PairedBars aLabel={`${year} actual`} bLabel="Scenario" rows={rows.map((r) => ({ label: r.b.category, a: r.b.profit, b: r.p.profit }))} />
        </Card>
        <Card title="Save this scenario" subtitle="Saved scenarios are shared with your team">
          <div className="grid gap-300 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <Field label="Name"><input className={inputClass} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Price +3%, discounts −2 pts" /></Field>
            <Field label="Note"><input className={inputClass} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Why this scenario?" /></Field>
            <Button variant="primary" onClick={() => void onSave()} disabled={busy || !me || !name.trim()}><Save className="icon-size-200" /> Save</Button>
          </div>
          {err && <div className="mt-300"><ErrorNote message={err} /></div>}
        </Card>
      </div>

      <Card className="lg:col-span-5" title="Scenario library" subtitle="Compare saved scenarios side by side; load one to continue from its levers">
        {saved.status === 'loading' ? (
          <Loading label="Loading scenarios…" />
        ) : saved.status === 'error' ? (
          <ErrorNote message={saved.error ?? 'Could not load scenarios'} onRetry={() => void saved.refresh()} />
        ) : saved.items.length === 0 ? (
          <Empty title="No scenarios saved yet" hint="Move the levers and save your first one." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-300">
              <thead>
                <tr className="border-b border-border text-left text-200 text-muted-foreground">
                  <th className="py-200 pr-300 font-medium">Scenario</th>
                  <th className="py-200 pr-300 font-medium">Levers</th>
                  <th className="py-200 pr-300 text-right font-medium">Sales</th>
                  <th className="py-200 pr-300 text-right font-medium">Profit</th>
                  <th className="py-200 pr-300 text-right font-medium">Δ profit</th>
                  <th className="py-200 pr-300 font-medium">By</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {saved.items.map((s) => {
                  const dp = safeDiv(num(s.projectedProfit) - num(s.baselineProfit), Math.abs(num(s.baselineProfit)));
                  return (
                    <tr key={s.id} className="border-b border-border/60 align-top">
                      <td className="py-200 pr-300"><div className="font-medium">{s.name}</div><div className="text-200 text-muted-foreground">{s.note ? `${s.note} · ` : ''}base {s.baseYear}</div></td>
                      <td className="py-200 pr-300 text-200 text-muted-foreground">price {num(s.priceChangePct)}% · disc {num(s.discountChangePts)} pts · vol {num(s.volumeChangePct)}% · cost {num(s.costChangePct)}% · ε {num(s.elasticity)}</td>
                      <td className="py-200 pr-300 text-right font-numeric">{fmtMoney(num(s.projectedSales))}</td>
                      <td className="py-200 pr-300 text-right font-numeric">{fmtMoney(num(s.projectedProfit))}</td>
                      <td className="py-200 pr-300 text-right"><Badge tone={dp >= 0 ? 'good' : 'bad'}>{fmtSignedPct(dp)}</Badge></td>
                      <td className="py-200 pr-300 text-200 text-muted-foreground">{s.ownerEmail}<br />{fmtDate(s.createdAt)}</td>
                      <td className="py-200 text-right whitespace-nowrap">
                        <Button variant="ghost" aria-label={`Load ${s.name}`} onClick={() => setLevers({ price: num(s.priceChangePct), discount: num(s.discountChangePts), volume: num(s.volumeChangePct), cost: num(s.costChangePct), elasticity: num(s.elasticity) })}><Upload className="icon-size-200" /></Button>
                        {s.owner_id === me?.id && <Button variant="ghost" aria-label={`Delete ${s.name}`} onClick={() => void onDelete(s)}><Trash2 className="icon-size-200" /></Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Result({ label, value, delta, sub }: { label: string; value: string; delta?: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-400">
      <div className="text-200 text-muted-foreground">{label}</div>
      <div className="font-numeric text-hero-700 font-semibold leading-hero-700">{value}</div>
      {delta !== undefined && <div className={delta >= 0 ? 'text-200 font-semibold text-success' : 'text-200 font-semibold text-destructive'}>{fmtSignedPct(delta)} vs actual</div>}
      {sub && <div className="text-200 text-muted-foreground">{sub}</div>}
    </div>
  );
}

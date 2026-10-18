import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

import { LineChart } from '@/components/charts';
import { Badge, Button, Card, ErrorNote, Kpi, Loading } from '@/components/ui';
import { useRecords } from '@/hooks/use-records';
import { listActions, listPlans } from '@/lib/app-data';
import { fmtCompactMoney, fmtInt, fmtMoney, fmtPct, fmtSignedPct, safeDiv } from '@/lib/format';
import { num, str, useModelRows, type ModelRow } from '@/lib/model';
import { monthlyTrend } from '@/queries';

type PageId = 'pulse' | 'plan' | 'scenario' | 'actions';

export function Pulse({
  year,
  yearly,
  onNavigate,
}: {
  year: number;
  yearly: ModelRow[];
  onNavigate: (p: PageId) => void;
}) {
  const cur = yearly.find((r) => num(r.Year) === year);
  const trend = useModelRows(monthlyTrend(year));
  const plans = useRecords(() => listPlans(year + 1), [year]);
  const actions = useRecords(() => listActions(), []);

  const sales = num(cur?.Sales);
  const salesLY = num(cur?.SalesLY);
  const profit = num(cur?.Profit);
  const profitLY = num(cur?.ProfitLY);
  const yoy = safeDiv(sales - salesLY, salesLY);
  const profitYoy = safeDiv(profit - profitLY, profitLY);

  const months = trend.rows.map((r) => str(r.Month).slice(0, 3));
  const hasTarget = trend.rows.some((r) => num(r.Target) !== 0);

  // Team plan = average of each planner's figure per cell, summed.
  const teamPlan = useMemo(() => {
    const cells = new Map<string, number[]>();
    for (const p of plans.items) {
      const k = `${p.region}|${p.category}`;
      cells.set(k, [...(cells.get(k) ?? []), num(p.plannedSales)]);
    }
    let total = 0;
    cells.forEach((v) => (total += v.reduce((a, b) => a + b, 0) / v.length));
    const planners = new Set(plans.items.map((p) => p.owner_id)).size;
    const submitted = new Set(plans.items.filter((p) => p.status === 'Submitted').map((p) => p.owner_id)).size;
    return { total, planners, submitted };
  }, [plans.items]);

  const open = actions.items.filter((a) => a.status !== 'Done');
  const overdue = open.filter((a) => a.dueDate && new Date(String(a.dueDate)) < new Date());

  return (
    <div className="grid grid-cols-1 gap-400 md:grid-cols-6">
      <div className="md:col-span-2">
        <Kpi label={`Total sales ${year}`} value={fmtCompactMoney(sales)} delta={salesLY ? fmtSignedPct(yoy) : undefined} deltaLabel="vs last year" tone={yoy >= 0 ? 'up' : 'down'} hint={fmtMoney(sales)} />
      </div>
      <div className="md:col-span-2">
        <Kpi label="Total profit" value={fmtCompactMoney(profit)} delta={profitLY ? fmtSignedPct(profitYoy) : undefined} deltaLabel="vs last year" tone={profitYoy >= 0 ? 'up' : 'down'} hint={`Margin on cost ${fmtPct(num(cur?.ProfitPct))}`} />
      </div>
      <div className="md:col-span-1">
        <Kpi label="Orders" value={fmtInt(num(cur?.Customers))} hint={`${fmtInt(num(cur?.NewCustomers))} new customers`} />
      </div>
      <div className="md:col-span-1">
        <Kpi label="Open actions" value={actions.status === 'ready' ? fmtInt(open.length) : '…'} hint={overdue.length ? `${overdue.length} overdue` : 'none overdue'} tone="flat" />
      </div>

      <Card className="md:col-span-4" title={`Monthly sales ${year}`} subtitle={hasTarget ? 'Actual vs last year vs model target (live DAX)' : 'Actual vs last year (live DAX)'}>
        {trend.error ? (
          <ErrorNote message={trend.error} onRetry={() => void trend.refetch()} />
        ) : trend.isLoading ? (
          <Loading />
        ) : (
          <LineChart
            labels={months}
            series={[
              { name: `Actual ${year}`, color: 'var(--color-brand)', values: trend.rows.map((r) => (r.Sales == null ? null : num(r.Sales))), area: true },
              { name: `Actual ${year - 1}`, color: 'var(--color-chart-2)', values: trend.rows.map((r) => (r.SalesLY == null ? null : num(r.SalesLY))), dashed: true },
              ...(hasTarget ? [{ name: 'Model target', color: 'var(--color-chart-3)', values: trend.rows.map((r) => (r.Target == null ? null : num(r.Target))), dashed: true }] : []),
            ]}
          />
        )}
      </Card>

      <Card className="md:col-span-2" title={`Team plan ${year + 1}`} subtitle="Forecasts entered in Plan Studio, stored in the app's SQL database">
        {plans.status === 'error' ? (
          <ErrorNote message={plans.error ?? 'Could not load plans'} onRetry={() => void plans.refresh()} />
        ) : plans.status === 'loading' ? (
          <Loading label="Loading plans…" />
        ) : plans.items.length === 0 ? (
          <div className="flex flex-col gap-300">
            <p className="text-300 text-muted-foreground">Nobody has planned {year + 1} yet. Start from this year’s actuals by region and category.</p>
            <Button variant="primary" onClick={() => onNavigate('plan')}>Open Plan Studio <ArrowRight className="icon-size-200" /></Button>
          </div>
        ) : (
          <div className="flex flex-col gap-300">
            <div className="font-numeric text-hero-800 font-semibold leading-hero-800">{fmtCompactMoney(teamPlan.total)}</div>
            <div className="text-300">
              {teamPlan.total >= sales ? 'Implies' : 'Implies a drop of'} <strong>{fmtSignedPct(safeDiv(teamPlan.total - sales, sales))}</strong> vs {year} actual ({fmtCompactMoney(sales)})
            </div>
            <div className="flex flex-wrap gap-200">
              <Badge tone="info">{teamPlan.planners} planner{teamPlan.planners === 1 ? '' : 's'}</Badge>
              <Badge tone={teamPlan.submitted === teamPlan.planners ? 'good' : 'warn'}>{teamPlan.submitted} submitted</Badge>
            </div>
            <Button onClick={() => onNavigate('plan')}>Review plan <ArrowRight className="icon-size-200" /></Button>
          </div>
        )}
      </Card>

      <Card className="md:col-span-6" title="Where to go next">
        <div className="grid gap-300 md:grid-cols-3">
          {[
            { id: 'plan' as const, t: 'Forecast the next year', d: 'Type growth targets per region and category; the team consensus updates for everyone instantly.' },
            { id: 'scenario' as const, t: 'Stress-test pricing', d: 'Move price, discount, volume and cost levers on top of real category economics and save the scenario.' },
            { id: 'actions' as const, t: 'Act on the signals', d: 'Declining markets, loss-making products and 1–2★ orders become owned, dated actions.' },
          ].map((c) => (
            <button key={c.id} type="button" onClick={() => onNavigate(c.id)} className="rounded-xl border border-border p-400 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
              <div className="text-300 font-semibold">{c.t}</div>
              <div className="mt-100 text-200 text-muted-foreground">{c.d}</div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

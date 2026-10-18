import { ClipboardList, FlaskConical, Gauge, Moon, Sun, Target } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ErrorNote, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/auth.context';
import { useTheme } from '@/hooks/theme.context';
import { num, useModelRows } from '@/lib/model';
import { cn } from '@/lib/utils';
import { ActionBoard } from '@/pages/ActionBoard';
import { PlanStudio } from '@/pages/PlanStudio';
import { Pulse } from '@/pages/Pulse';
import { ScenarioLab } from '@/pages/ScenarioLab';
import { yearlyKpis } from '@/queries';

type PageId = 'pulse' | 'plan' | 'scenario' | 'actions';

const pages: { id: PageId; label: string; blurb: string; icon: typeof Gauge }[] = [
  { id: 'pulse', label: 'Pulse', blurb: 'Live performance vs plan', icon: Gauge },
  { id: 'plan', label: 'Plan Studio', blurb: 'Build next year’s forecast', icon: Target },
  { id: 'scenario', label: 'Scenario Lab', blurb: 'What-if pricing & cost', icon: FlaskConical },
  { id: 'actions', label: 'Action Board', blurb: 'Turn insights into actions', icon: ClipboardList },
];

function App() {
  const [page, setPage] = useState<PageId>('pulse');
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const { isDark, toggleTheme } = useTheme();
  const { session } = useAuth();
  const yearly = useModelRows(yearlyKpis());

  const years = useMemo(
    () => yearly.rows.map((r) => num(r.Year)).filter((y) => y > 0).sort((a, b) => a - b),
    [yearly.rows]
  );
  const year = pickedYear ?? (years.length ? years[years.length - 1] : null);

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-border bg-secondary lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-300 px-500 py-500">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-heading text-400 font-bold text-primary-foreground">S</div>
          <div>
            <div className="font-heading text-400 font-semibold leading-400">Sales Dashboard App</div>
            <div className="text-200 text-muted-foreground">Insight → Plan → Action</div>
          </div>
        </div>
        <nav aria-label="Sections" className="flex gap-100 overflow-x-auto px-300 pb-300 lg:flex-col">
          {pages.map((p) => {
            const Icon = p.icon;
            const active = p.id === page;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPage(p.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-max items-center gap-300 rounded-xl px-300 py-300 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                <Icon className="icon-size-300 shrink-0" />
                <span>
                  <span className="block text-300 font-semibold">{p.label}</span>
                  <span className={cn('hidden text-200 lg:block', active ? 'opacity-80' : 'text-muted-foreground')}>{p.blurb}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="hidden px-500 pt-600 text-200 text-muted-foreground lg:block">
          Live source: <span className="font-medium text-foreground">Interactive sales dashboard</span> semantic model · BI Reports<div className="mt-200 opacity-70">Build 1.2</div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-300 border-b border-border bg-background/90 px-500 py-300 backdrop-blur">
          <div>
            <h1 className="font-heading text-500 font-semibold leading-500">{pages.find((p) => p.id === page)?.label}</h1>
            <p className="text-200 text-muted-foreground">{pages.find((p) => p.id === page)?.blurb}</p>
          </div>
          <div className="flex items-center gap-300">
            <label className="flex items-center gap-200 text-200 text-muted-foreground">
              Year
              <select
                className="rounded-lg border border-input bg-background px-300 py-200 text-300 text-foreground"
                value={year ?? ''}
                disabled={!years.length}
                onChange={(e) => setPickedYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <span className="hidden text-200 text-muted-foreground md:inline">{session?.user?.email}</span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-lg border border-border p-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              {isDark ? <Sun className="icon-size-200" /> : <Moon className="icon-size-200" />}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[1280px] p-500">
          {yearly.error ? (
            <ErrorNote message={`Couldn't read the semantic model: ${yearly.error}`} onRetry={() => void yearly.refetch()} />
          ) : yearly.isLoading || year === null ? (
            <div className="grid gap-400 md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
              <Skeleton className="h-72 md:col-span-4" />
            </div>
          ) : page === 'pulse' ? (
            <Pulse year={year} yearly={yearly.rows} onNavigate={setPage} />
          ) : page === 'plan' ? (
            <PlanStudio year={year} />
          ) : page === 'scenario' ? (
            <ScenarioLab year={year} />
          ) : (
            <ActionBoard year={year} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

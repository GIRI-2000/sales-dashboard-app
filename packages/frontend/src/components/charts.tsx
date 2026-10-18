import { useState } from 'react';

import { fmtCompactMoney } from '@/lib/format';

export interface Series {
  name: string;
  /** CSS color, e.g. var(--color-brand) */
  color: string;
  values: (number | null)[];
  dashed?: boolean;
  area?: boolean;
}

/** Lightweight, dependency-free multi-series line chart with hover readout. */
export function LineChart({
  labels,
  series,
  height = 260,
  format = fmtCompactMoney,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  format?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const pad = { l: 56, r: 16, t: 12, b: 28 };
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const max = Math.max(1, ...all) * 1.08;
  const min = Math.min(0, ...all);
  const x = (i: number) => pad.l + (labels.length <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (labels.length - 1));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min));

  return (
    <div className="w-full">
      <div className="mb-200 flex flex-wrap gap-400 text-200 text-muted-foreground">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-100">
            <svg width="18" height="8" aria-hidden>
              <line x1="0" y1="4" x2="18" y2="4" stroke={s.color} strokeWidth="3" strokeDasharray={s.dashed ? '4 3' : undefined} />
            </svg>
            {s.name}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Line chart of ${series.map((s) => s.name).join(', ')}`}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted-foreground)">
              {format(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted-foreground)">
            {l}
          </text>
        ))}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean) as string[];
          if (pts.length === 0) return null;
          return (
            <g key={s.name}>
              {s.area && (
                <polygon
                  points={`${x(0)},${y(Math.max(min, 0))} ${pts.join(' ')} ${x(s.values.length - 1)},${y(Math.max(min, 0))}`}
                  fill={s.color}
                  opacity="0.12"
                />
              )}
              <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? '6 4' : undefined} />
            </g>
          );
        })}
        {labels.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={x(i) - (W - pad.l - pad.r) / Math.max(1, labels.length - 1) / 2}
            y={pad.t}
            width={(W - pad.l - pad.r) / Math.max(1, labels.length - 1)}
            height={H - pad.t - pad.b}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--color-muted-foreground)" strokeDasharray="2 3" />
            {series.map((s) =>
              s.values[hover] === null || s.values[hover] === undefined ? null : (
                <circle key={s.name} cx={x(hover)} cy={y(s.values[hover] as number)} r="4" fill={s.color} />
              )
            )}
          </g>
        )}
      </svg>
      <div className="min-h-[20px] text-200 text-muted-foreground" aria-live="polite">
        {hover !== null &&
          `${labels[hover]} — ` +
            series
              .map((s) => `${s.name}: ${s.values[hover] === null || s.values[hover] === undefined ? '—' : format(s.values[hover] as number)}`)
              .join(' · ')}
      </div>
    </div>
  );
}

/** Horizontal paired bars: baseline vs comparison per category. */
export function PairedBars({
  rows,
  aLabel,
  bLabel,
  format = fmtCompactMoney,
}: {
  rows: { label: string; a: number; b: number }[];
  aLabel: string;
  bLabel: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [Math.abs(r.a), Math.abs(r.b)]));
  return (
    <div className="flex flex-col gap-300">
      <div className="flex gap-400 text-200 text-muted-foreground">
        <span className="inline-flex items-center gap-100"><span className="inline-block h-2 w-4 rounded-sm bg-muted-foreground/40" />{aLabel}</span>
        <span className="inline-flex items-center gap-100"><span className="inline-block h-2 w-4 rounded-sm bg-brand" />{bLabel}</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(90px,140px)_1fr] items-center gap-300">
          <div className="truncate text-200 font-medium" title={r.label}>{r.label}</div>
          <div className="flex flex-col gap-100">
            <div className="flex items-center gap-200">
              <div className="h-2 rounded-sm bg-muted-foreground/40" style={{ width: `${(Math.abs(r.a) / max) * 100}%` }} />
              <span className="text-200 text-muted-foreground">{format(r.a)}</span>
            </div>
            <div className="flex items-center gap-200">
              <div className={r.b < 0 ? 'h-2 rounded-sm bg-destructive' : 'h-2 rounded-sm bg-brand'} style={{ width: `${(Math.abs(r.b) / max) * 100}%` }} />
              <span className="text-200 font-semibold">{format(r.b)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

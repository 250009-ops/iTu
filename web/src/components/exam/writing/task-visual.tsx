"use client";

import type { WritingTask } from "@/lib/exam/types";

type Visual = NonNullable<WritingTask["visual"]>;

const SERIES = [
  { name: "Denmark", color: "#2563eb", points: [22, 30, 38, 47, 55, 63, 70, 78] },
  { name: "Germany", color: "#059669", points: [18, 24, 31, 39, 45, 52, 58, 64] },
  { name: "Japan", color: "#e31837", points: [10, 13, 17, 22, 26, 31, 35, 41] },
];

const YEARS = ["2010", "2012", "2014", "2016", "2018", "2020", "2022", "2024"];

export function TaskVisual({ visual }: { visual: Visual }) {
  return (
    <figure className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      {visual.kind === "line" ? (
        <LineChart />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-400">
          {visual.kind.toUpperCase()} visual
        </div>
      )}
      <figcaption className="mt-3 text-center text-[12px] font-medium text-slate-500">
        {visual.caption}
      </figcaption>
    </figure>
  );
}

function LineChart() {
  const W = 360;
  const H = 200;
  const pad = { l: 32, r: 12, t: 12, b: 28 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const maxY = 90;

  const x = (i: number) => pad.l + (i / (YEARS.length - 1)) * plotW;
  const y = (v: number) => pad.t + plotH - (v / maxY) * plotH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {/* gridlines */}
      {[0, 30, 60, 90].map((g) => (
        <g key={g}>
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={y(g)}
            y2={y(g)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          <text x={pad.l - 6} y={y(g) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">
            {g}
          </text>
        </g>
      ))}
      {/* x labels */}
      {YEARS.map((yr, i) =>
        i % 2 === 0 ? (
          <text
            key={yr}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={9}
            fill="#94a3b8"
          >
            {yr}
          </text>
        ) : null,
      )}
      {/* series */}
      {SERIES.map((s) => (
        <g key={s.name}>
          <polyline
            points={s.points.map((p, i) => `${x(i)},${y(p)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {s.points.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p)} r={2.5} fill={s.color} />
          ))}
        </g>
      ))}
      {/* legend */}
      {SERIES.map((s, i) => (
        <g key={s.name} transform={`translate(${pad.l + i * 92}, ${pad.t})`}>
          <rect width={8} height={8} y={-7} fill={s.color} rx={2} />
          <text x={12} y={1} fontSize={9} fill="#475569">
            {s.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

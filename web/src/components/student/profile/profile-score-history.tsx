"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useStudentProfileData } from "@/contexts/student-profile-context";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-xl">
      <p className="mb-1.5 text-gray-400" style={{ fontSize: "11px" }}>
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="text-gray-500" style={{ fontSize: "11px" }}>
            {p.name}
          </span>
          <span className="font-bold text-gray-900" style={{ fontSize: "11px" }}>
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProfileScoreHistory() {
  const { profile } = useStudentProfileData();
  if (!profile) return null;
  const data = profile.scoreHistory;
  const gain =
    data.length > 1
      ? (data[data.length - 1]!.overall - data[0]!.overall).toFixed(1)
      : null;

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-gray-500" />
          <h3 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
            Score History
          </h3>
        </div>
        <p className="py-8 text-center text-gray-500" style={{ fontSize: "13px" }}>
          Your band progression chart will appear after your first completed mock.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-gray-500" />
          <h3 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
            Score History
          </h3>
        </div>
        {gain != null && Number(gain) > 0 && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600" style={{ fontSize: "11px" }}>
            +{gain}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ left: -28, right: 4, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[4.5, 9]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="overall"
            name="Overall"
            stroke="#1B2A4A"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#1B2A4A" }}
          />
          <Line
            type="monotone"
            dataKey="writing"
            name="Writing"
            stroke="#7C3AED"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <Link
        href="/student/results"
        className="mt-2 inline-block font-semibold text-blue-600 hover:text-blue-700"
        style={{ fontSize: "12px" }}
      >
        Full results breakdown &gt;
      </Link>
    </div>
  );
}

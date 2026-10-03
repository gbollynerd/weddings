"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/pricing";

export function EarningsChart({ data, height = 240 }: { data: { month: string; total: number }[]; height?: number }) {
  if (!data.length) return <div className="grid h-[240px] place-items-center text-sm text-muted">No payouts yet this year.</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barSize={22} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#eef0f6" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#7a80a3", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#7a80a3", fontSize: 12 }} tickFormatter={(v) => `$${Math.round(v / 100) / 10}k`} width={52} />
        <Tooltip cursor={{ fill: "#f5f6fa" }} formatter={(v) => [money(Number(v)), "Paid"]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e8eaf2", boxShadow: "0 12px 40px rgba(27,33,64,.12)", fontSize: 13 }} />
        <Bar dataKey="total" fill="#1b2140" radius={[8, 8, 8, 8]} activeBar={{ fill: "#d99a92" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

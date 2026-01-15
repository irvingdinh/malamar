import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import type { Execution } from "@/hooks/use-executions";

interface ExecutionTrendsChartProps {
  executions: Execution[];
  isLoading?: boolean;
}

interface DailyData {
  date: string;
  total: number;
  completed: number;
  failed: number;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function aggregateByDay(executions: Execution[]): DailyData[] {
  const dailyMap = new Map<string, DailyData>();

  // Get the last 14 days
  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

  // Initialize all days with zero values
  for (let i = 0; i < 14; i++) {
    const dayTimestamp = fourteenDaysAgo + i * 24 * 60 * 60 * 1000;
    const dateStr = formatDate(dayTimestamp);
    dailyMap.set(dateStr, {
      date: dateStr,
      total: 0,
      completed: 0,
      failed: 0,
    });
  }

  // Aggregate executions
  for (const execution of executions) {
    const dateStr = formatDate(execution.createdAt);
    const existing = dailyMap.get(dateStr);
    if (existing) {
      existing.total += 1;
      if (execution.status === "completed") {
        existing.completed += 1;
      } else if (execution.status === "failed") {
        existing.failed += 1;
      }
    }
  }

  return Array.from(dailyMap.values());
}

export function ExecutionTrendsChart({
  executions,
  isLoading,
}: ExecutionTrendsChartProps) {
  const chartData = useMemo(() => aggregateByDay(executions), [executions]);

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          className="fill-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Area
          type="monotone"
          dataKey="total"
          name="Total"
          stroke="hsl(var(--primary))"
          fillOpacity={1}
          fill="url(#colorTotal)"
        />
        <Area
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke="hsl(142, 76%, 36%)"
          fillOpacity={1}
          fill="url(#colorCompleted)"
        />
        <Area
          type="monotone"
          dataKey="failed"
          name="Failed"
          stroke="hsl(0, 84%, 60%)"
          fillOpacity={1}
          fill="url(#colorFailed)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

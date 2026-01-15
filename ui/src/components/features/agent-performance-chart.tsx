import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import type { AgentAnalytics } from "@/hooks/use-executions";

interface AgentPerformanceChartProps {
  analytics: AgentAnalytics[];
  isLoading?: boolean;
}

interface ChartData {
  name: string;
  executions: number;
  successRate: number;
  avgDuration: number;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function getSuccessRateColor(rate: number): string {
  if (rate >= 0.9) return "hsl(142, 76%, 36%)"; // green
  if (rate >= 0.7) return "hsl(48, 96%, 53%)"; // yellow
  return "hsl(0, 84%, 60%)"; // red
}

export function AgentPerformanceChart({
  analytics,
  isLoading,
}: AgentPerformanceChartProps) {
  const chartData = useMemo<ChartData[]>(() => {
    return analytics.map((agent) => ({
      name: agent.agentName,
      executions: agent.totalExecutions,
      successRate: agent.successRate,
      avgDuration: agent.avgDurationMs ?? 0,
    }));
  }, [analytics]);

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No agent data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
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
          formatter={(value, name, props) => {
            if (name === "executions" && typeof value === "number") {
              const item = props.payload as ChartData;
              return [
                `${value} (${(item.successRate * 100).toFixed(0)}% success)`,
                "Executions",
              ];
            }
            return [String(value), String(name)];
          }}
          labelFormatter={(label: string, payload) => {
            if (payload && payload[0]) {
              const item = payload[0].payload as ChartData;
              return `${label} - Avg: ${formatDuration(item.avgDuration)}`;
            }
            return label;
          }}
        />
        <Bar dataKey="executions" name="executions" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getSuccessRateColor(entry.successRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

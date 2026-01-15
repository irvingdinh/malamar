import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import type { Execution } from "@/hooks/use-executions";

interface TaskStatusChartProps {
  executions: Execution[];
  isLoading?: boolean;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "hsl(220, 14%, 60%)" },
  running: { label: "Running", color: "hsl(217, 91%, 60%)" },
  completed: { label: "Completed", color: "hsl(142, 76%, 36%)" },
  failed: { label: "Failed", color: "hsl(0, 84%, 60%)" },
};

export function TaskStatusChart({
  executions,
  isLoading,
}: TaskStatusChartProps) {
  const chartData = useMemo<StatusData[]>(() => {
    const counts: Record<string, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    for (const execution of executions) {
      if (execution.status in counts) {
        counts[execution.status]++;
      }
    }

    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: STATUS_CONFIG[status]?.label ?? status,
        value: count,
        color: STATUS_CONFIG[status]?.color ?? "hsl(220, 14%, 60%)",
      }));
  }, [executions]);

  if (isLoading) {
    return <Skeleton className="mx-auto size-[300px] rounded-full" />;
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No execution data available
      </div>
    );
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value, name) => {
              if (typeof value === "number") {
                return [
                  `${value} (${((value / total) * 100).toFixed(1)}%)`,
                  String(name),
                ];
              }
              return [String(value), String(name)];
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

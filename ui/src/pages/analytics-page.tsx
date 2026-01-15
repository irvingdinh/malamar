import { AlertCircle, BarChart3, TrendingUp, Users } from "lucide-react";

import { ExecutionTrendsChart } from "@/components/features/execution-trends-chart";
import { AppLayout } from "@/components/layout/app-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useExecutionAnalytics, useExecutions } from "@/hooks/use-executions";

export function AnalyticsPage() {
  const { data: analytics, isLoading, isError, error } = useExecutionAnalytics();
  const { data: executionsData, isLoading: isExecutionsLoading } = useExecutions({
    limit: 500, // Get recent executions for trends chart
  });

  // Calculate summary stats from analytics data
  const totalExecutions =
    analytics?.reduce((sum, agent) => sum + agent.totalExecutions, 0) ?? 0;
  const totalAgents = analytics?.length ?? 0;
  const overallSuccessRate =
    analytics && analytics.length > 0
      ? analytics.reduce(
          (sum, agent) => sum + agent.successRate * agent.totalExecutions,
          0,
        ) / totalExecutions
      : 0;

  return (
    <AppLayout breadcrumbs={[{ label: "Analytics" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Analytics</h1>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "Failed to load analytics"}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Executions
              </CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalExecutions}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalAgents}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <BarChart3 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  {(overallSuccessRate * 100).toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Completion Rate
              </CardTitle>
              <BarChart3 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  {analytics && analytics.length > 0
                    ? (
                        (analytics.reduce(
                          (sum, agent) => sum + agent.completedExecutions,
                          0,
                        ) /
                          totalExecutions) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Execution Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ExecutionTrendsChart
                executions={executionsData?.executions ?? []}
                isLoading={isExecutionsLoading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Agent performance chart will be added here
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Task status chart will be added here
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

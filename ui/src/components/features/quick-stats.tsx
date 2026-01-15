import { BarChart3, FolderKanban, Zap } from "lucide-react";
import { Link } from "react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaces } from "@/hooks/use-workspaces";

export function QuickStats() {
  const { data: workspacesData, isLoading: workspacesLoading } = useWorkspaces({
    pageSize: 1,
  });

  const workspaceCount = workspacesData?.total ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Workspaces"
        value={workspacesLoading ? undefined : workspaceCount}
        description="Total workspaces"
        icon={FolderKanban}
        href="/workspaces"
      />
      <StatCard
        title="Active Tasks"
        value={undefined}
        description="Tasks in progress"
        icon={BarChart3}
        href="/workspaces"
      />
      <StatCard
        title="Executions"
        value={undefined}
        description="Running now"
        icon={Zap}
        href="/workspaces"
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | undefined;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

function StatCard({ title, value, description, icon: Icon, href }: StatCardProps) {
  return (
    <Link to={href} className="transition-transform hover:scale-[1.02]">
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {value !== undefined ? (
            <div className="text-2xl font-bold">{value}</div>
          ) : (
            <Skeleton className="h-8 w-12" />
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

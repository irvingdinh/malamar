import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface CliStatus {
  name: string;
  type: string;
  installed: boolean;
  version: string | null;
  path: string | null;
}

interface HealthResponse {
  status: "healthy";
  version: string;
  uptime: number;
  clis: CliStatus[];
}

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`flex size-2 rounded-full  ${
        online ? "bg-blue-500" : "bg-red-500"
      }`}
    />
  );
}

function StatusRow({
  label,
  version,
  online,
}: {
  label: string;
  version?: string | null;
  online: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-xs">
      <StatusDot online={online} />
      <span className="text-sidebar-foreground">{label}</span>
      {version && (
        <span className="ml-auto text-xs text-muted-foreground">
          v{version}
        </span>
      )}
    </div>
  );
}

export function NavSystemStatus() {
  const { data, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 10000,
    retry: 1,
    staleTime: 5000,
  });

  // Server is offline if the request failed
  const serverOnline = !isError && !!data;

  // Design decision: Only show installed CLIs to reduce clutter.
  // When server is offline, we hide CLI rows entirely rather than showing
  // "unknown" status, since we can't determine their state anyway.
  const availableCLIs = serverOnline
    ? (data?.clis.filter((cli) => cli.installed) ?? [])
    : [];

  // Show error if no CLIs available (but the server is online)
  const noCLIsAvailable = serverOnline && availableCLIs.length === 0;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>System Status</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0">
          {noCLIsAvailable && (
            <SidebarMenuItem className="pb-1">
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>
                  <a
                    href="https://docs.malamar.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    CLI is not available.
                  </a>
                </AlertDescription>
              </Alert>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <StatusRow
              label="Server"
              version={data?.version}
              online={serverOnline}
            />
          </SidebarMenuItem>

          {availableCLIs.map((cli) => (
            <SidebarMenuItem key={cli.type}>
              <StatusRow label={cli.name} version={cli.version} online={true} />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

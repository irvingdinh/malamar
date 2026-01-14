import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

interface CliHealthResult {
  installed: boolean;
  version: string | null;
  path: string | null;
  checkedAt: number;
}

async function fetchCliHealth(): Promise<CliHealthResult> {
  const response = await fetch("/api/settings/cli/health");
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted rounded-md p-2 text-xs overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

export function NavStatus() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["cli-health"],
    queryFn: fetchCliHealth,
    refetchInterval: 10000,
    retry: false,
  });

  return (
    <SidebarGroup>
      <SidebarGroupLabel>System</SidebarGroupLabel>
      <SidebarGroupContent>
        {isLoading && (
          <CodeBlock>
            {JSON.stringify({ status: "checking..." }, null, 2)}
          </CodeBlock>
        )}
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Server Unreachable</AlertTitle>
            <AlertDescription>
              <CodeBlock>
                {JSON.stringify(
                  {
                    error:
                      error instanceof Error ? error.message : "Unknown error",
                  },
                  null,
                  2,
                )}
              </CodeBlock>
            </AlertDescription>
          </Alert>
        )}
        {data && <CodeBlock>{JSON.stringify(data, null, 2)}</CodeBlock>}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

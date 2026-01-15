import { AlertCircle, Plus } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type Agent, useAgents } from "@/hooks/use-agents";

import { AgentCard } from "./agent-card";
import { AgentFormDialog } from "./agent-form-dialog";

interface AgentsListProps {
  workspaceId: string;
}

export function AgentsList({ workspaceId }: AgentsListProps) {
  const { data: agents, isLoading, isError, error } = useAgents(workspaceId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load agents"}
        </AlertDescription>
      </Alert>
    );
  }

  const sortedAgents = [...(agents || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Agents</h3>
          <p className="text-sm text-muted-foreground">
            Configure agents that process tasks in this workspace.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="size-4" />
          Add Agent
        </Button>
      </div>

      {sortedAgents.length === 0 ? (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>No agents</AlertTitle>
          <AlertDescription>
            No agents have been configured for this workspace yet. Agents
            process tasks by executing Claude Code CLI with their instructions.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {sortedAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => setEditingAgent(agent)}
            />
          ))}
        </div>
      )}

      <AgentFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        workspaceId={workspaceId}
        mode="create"
      />

      {editingAgent && (
        <AgentFormDialog
          key={editingAgent.id}
          open={!!editingAgent}
          onOpenChange={(open) => !open && setEditingAgent(null)}
          workspaceId={workspaceId}
          mode="edit"
          agent={editingAgent}
        />
      )}
    </div>
  );
}

import { Clock, GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { type Agent, useDeleteAgent } from "@/hooks/use-agents";
import { toast } from "@/lib/toast";

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function AgentCard({ agent, onClick, dragHandleProps }: AgentCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteMutation = useDeleteAgent();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(
      { workspaceId: agent.workspaceId, agentId: agent.id },
      {
        onSuccess: () => {
          toast.success(`Agent "${agent.name}" deleted`);
          setIsDeleteOpen(false);
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to delete agent",
          );
        },
      },
    );
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="flex cursor-pointer items-center rounded-md border bg-card transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="flex h-full cursor-grab items-center px-2 text-muted-foreground hover:text-foreground active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{agent.name}</span>
            <div className="flex items-center gap-2">
              {agent.timeoutMinutes && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {agent.timeoutMinutes}m
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={handleDeleteClick}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Delete agent</span>
              </Button>
            </div>
          </div>
          {agent.roleInstruction && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {agent.roleInstruction}
            </p>
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        resourceType="Agent"
        resourceName={agent.name}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

import { Clock, GripVertical } from "lucide-react";

import type { Agent } from "@/hooks/use-agents";

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function AgentCard({ agent, onClick, dragHandleProps }: AgentCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
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
          {agent.timeoutMinutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {agent.timeoutMinutes}m
            </span>
          )}
        </div>
        {agent.roleInstruction && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {agent.roleInstruction}
          </p>
        )}
      </div>
    </div>
  );
}

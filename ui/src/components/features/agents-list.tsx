import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, Plus } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type Agent, useAgents, useReorderAgents } from "@/hooks/use-agents";
import { toast } from "@/lib/toast";

import { AgentCard } from "./agent-card";
import { AgentFormDialog } from "./agent-form-dialog";

interface AgentsListProps {
  workspaceId: string;
}

interface SortableAgentCardProps {
  agent: Agent;
  onClick: () => void;
}

function SortableAgentCard({ agent, onClick }: SortableAgentCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AgentCard
        agent={agent}
        onClick={onClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function AgentsList({ workspaceId }: AgentsListProps) {
  const { data: agents, isLoading, isError, error } = useAgents(workspaceId);
  const reorderMutation = useReorderAgents();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !agents) {
      return;
    }

    const sortedAgents = [...agents].sort((a, b) => a.order - b.order);
    const oldIndex = sortedAgents.findIndex((a) => a.id === active.id);
    const newIndex = sortedAgents.findIndex((a) => a.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Create new order by moving the item
    const newOrder = [...sortedAgents];
    const [movedItem] = newOrder.splice(oldIndex, 1);
    if (!movedItem) return;
    newOrder.splice(newIndex, 0, movedItem);

    const orderedIds = newOrder.map((a) => a.id);

    reorderMutation.mutate(
      { workspaceId, orderedIds },
      {
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to reorder agents",
          );
        },
      },
    );
  };

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
            Configure agents that process tasks in this workspace. Drag to
            reorder.
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedAgents.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedAgents.map((agent) => (
                <SortableAgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={() => setEditingAgent(agent)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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

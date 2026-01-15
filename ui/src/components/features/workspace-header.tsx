import { Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Workspace } from "@/hooks/use-workspace";

import { WorkspaceEditDialog } from "./workspace-edit-dialog";

interface WorkspaceHeaderProps {
  workspace: Workspace;
}

export function WorkspaceHeader({ workspace }: WorkspaceHeaderProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {workspace.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage agents, tasks, and settings for this workspace
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditOpen(true)}
          className="shrink-0"
          aria-label="Edit workspace"
        >
          <Pencil className="size-4" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
      </div>

      <WorkspaceEditDialog
        key={workspace.id}
        workspace={workspace}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </>
  );
}

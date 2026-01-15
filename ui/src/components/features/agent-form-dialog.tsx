import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type Agent,
  useCreateAgent,
  useDeleteAgent,
  useUpdateAgent,
} from "@/hooks/use-agents";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  mode: "create" | "edit";
  agent?: Agent;
}

export function AgentFormDialog({
  open,
  onOpenChange,
  workspaceId,
  mode,
  agent,
}: AgentFormDialogProps) {
  const [name, setName] = useState(agent?.name ?? "");
  const [roleInstruction, setRoleInstruction] = useState(
    agent?.roleInstruction ?? "",
  );
  const [workingInstruction, setWorkingInstruction] = useState(
    agent?.workingInstruction ?? "",
  );
  const [timeoutMinutes, setTimeoutMinutes] = useState<string>(
    agent?.timeoutMinutes?.toString() ?? "",
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();

  const isValid = name.trim().length > 0;
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName(agent?.name ?? "");
      setRoleInstruction(agent?.roleInstruction ?? "");
      setWorkingInstruction(agent?.workingInstruction ?? "");
      setTimeoutMinutes(agent?.timeoutMinutes?.toString() ?? "");
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    const timeout = timeoutMinutes.trim()
      ? parseInt(timeoutMinutes.trim(), 10)
      : null;

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          workspaceId,
          name: name.trim(),
          roleInstruction: roleInstruction.trim() || undefined,
          workingInstruction: workingInstruction.trim() || undefined,
          timeoutMinutes: timeout ?? undefined,
        });
        toast.success("Agent created", `"${name.trim()}" has been created.`);
      } else if (agent) {
        await updateMutation.mutateAsync({
          workspaceId,
          agentId: agent.id,
          name: name.trim(),
          roleInstruction: roleInstruction.trim() || null,
          workingInstruction: workingInstruction.trim() || null,
          timeoutMinutes: timeout,
        });
        toast.success("Agent updated", `"${name.trim()}" has been updated.`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        `Failed to ${mode === "create" ? "create" : "update"} agent`,
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  const handleDelete = async () => {
    if (!agent) return;

    try {
      await deleteMutation.mutateAsync({
        workspaceId,
        agentId: agent.id,
      });
      toast.success("Agent deleted", `"${agent.name}" has been deleted.`);
      setIsDeleteOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        "Failed to delete agent",
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {mode === "create" ? "Create Agent" : "Edit Agent"}
              </DialogTitle>
              <DialogDescription>
                {mode === "create"
                  ? "Add a new agent to process tasks in this workspace."
                  : "Edit the agent configuration."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Name</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Code Reviewer"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-role">Role Instruction</Label>
                <Textarea
                  id="agent-role"
                  value={roleInstruction}
                  onChange={(e) => setRoleInstruction(e.target.value)}
                  placeholder="Describe the agent's role and responsibilities..."
                  disabled={isPending}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  The role instruction defines who the agent is and what they
                  do.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-working">Working Instruction</Label>
                <Textarea
                  id="agent-working"
                  value={workingInstruction}
                  onChange={(e) => setWorkingInstruction(e.target.value)}
                  placeholder="Specific instructions for how the agent should work..."
                  disabled={isPending}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  The working instruction provides specific guidance on how to
                  complete tasks.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-timeout">Timeout (minutes)</Label>
                <Input
                  id="agent-timeout"
                  type="number"
                  min="1"
                  value={timeoutMinutes}
                  onChange={(e) => setTimeoutMinutes(e.target.value)}
                  placeholder="e.g., 30"
                  disabled={isPending}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum time the agent can run before timing out. Leave empty
                  to use the default.
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              {mode === "edit" && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={isPending}
                >
                  Delete
                </Button>
              )}
              <div className={cn("flex gap-2", mode === "create" && "w-full justify-end")}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!isValid || isPending}>
                  {isPending
                    ? "Saving..."
                    : mode === "create"
                      ? "Create"
                      : "Save changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {agent && (
        <ConfirmDeleteDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          resourceType="Agent"
          resourceName={agent.name}
          onConfirm={handleDelete}
          isLoading={deleteMutation.isPending}
        />
      )}
    </>
  );
}

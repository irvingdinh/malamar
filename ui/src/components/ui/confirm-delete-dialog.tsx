"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: string;
  resourceName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

function ConfirmDeleteDialog({
  open,
  onOpenChange,
  resourceType,
  resourceName,
  onConfirm,
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  const [confirmText, setConfirmText] = React.useState("");
  const isConfirmed =
    resourceName.trim() !== "" && confirmText === resourceName;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmText("");
    }
    onOpenChange(open);
  };

  const handleConfirm = () => {
    if (isConfirmed && !isLoading) {
      onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isConfirmed && !isLoading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {resourceType}</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the{" "}
            {resourceType.toLowerCase()}{" "}
            <span className="font-semibold text-foreground">
              {resourceName}
            </span>{" "}
            and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label
            htmlFor="confirm-delete-input"
            className="text-sm text-muted-foreground"
          >
            Please type{" "}
            <span className="font-mono font-semibold text-foreground">
              {resourceName}
            </span>{" "}
            to confirm.
          </label>
          <Input
            id="confirm-delete-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={resourceName}
            disabled={isLoading}
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={!isConfirmed || isLoading}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDeleteDialog };

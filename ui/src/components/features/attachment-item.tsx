import { Download, File, FileImage, FileText, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import type { Attachment } from "@/hooks/use-tasks";
import { useDeleteAttachment } from "@/hooks/use-tasks";
import { toast } from "@/lib/toast";

interface AttachmentItemProps {
  attachment: Attachment;
  taskId: string;
}

export function AttachmentItem({ attachment, taskId }: AttachmentItemProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteMutation = useDeleteAttachment();

  const downloadUrl = `/api/attachments/${attachment.id}/download`;

  const handleDelete = () => {
    deleteMutation.mutate(
      { attachmentId: attachment.id, taskId },
      {
        onSuccess: () => {
          toast.success("Attachment deleted", `${attachment.filename} has been removed.`);
          setIsDeleteOpen(false);
        },
        onError: (err) => {
          toast.error(
            "Failed to delete attachment",
            err instanceof Error ? err.message : "An error occurred",
          );
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileTypeIcon mimeType={attachment.mimeType} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <a href={downloadUrl} download={attachment.filename}>
            <Download className="size-4" />
            <span className="sr-only">Download {attachment.filename}</span>
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete {attachment.filename}</span>
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        resourceType="Attachment"
        resourceName={attachment.filename}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) {
    return <File className="size-5 text-muted-foreground" />;
  }
  if (mimeType.startsWith("image/")) {
    return <FileImage className="size-5 text-muted-foreground" />;
  }
  if (mimeType.startsWith("text/") || mimeType.includes("document")) {
    return <FileText className="size-5 text-muted-foreground" />;
  }
  return <File className="size-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

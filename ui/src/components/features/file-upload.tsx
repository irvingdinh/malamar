import { Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useUploadAttachment } from "@/hooks/use-tasks";
import { toast } from "@/lib/toast";
import { cn, formatFileSize } from "@/lib/utils";

interface FileUploadProps {
  taskId: string;
}

interface QueuedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export function FileUpload({ taskId }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadAttachment();

  const uploadFile = useCallback(
    async (queuedFile: QueuedFile) => {
      setQueue((prev) =>
        prev.map((f) => (f.id === queuedFile.id ? { ...f, status: "uploading" } : f)),
      );

      try {
        await uploadMutation.mutateAsync({
          taskId,
          file: queuedFile.file,
        });

        setQueue((prev) =>
          prev.map((f) => (f.id === queuedFile.id ? { ...f, status: "success" } : f)),
        );

        // Remove successful uploads after a short delay
        setTimeout(() => {
          setQueue((prev) => prev.filter((f) => f.id !== queuedFile.id));
        }, 1000);

        toast.success("File uploaded", `${queuedFile.file.name} has been uploaded.`);
      } catch (error) {
        setQueue((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id
              ? {
                  ...f,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f,
          ),
        );

        toast.error(
          "Upload failed",
          error instanceof Error ? error.message : "An error occurred",
        );
      }
    },
    [taskId, uploadMutation],
  );

  const addFilesToQueue = useCallback(
    (files: FileList | File[]) => {
      const newFiles: QueuedFile[] = Array.from(files).map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: "pending" as const,
      }));

      setQueue((prev) => [...prev, ...newFiles]);

      // Upload files sequentially
      newFiles.forEach((queuedFile) => {
        uploadFile(queuedFile);
      });
    },
    [uploadFile],
  );

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={0}
        aria-label="Upload area for file attachments. Press Enter or Space to browse files, or drag files here."
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
      >
        <Upload className="mb-2 size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Drag and drop files here, or{" "}
          <span className="font-medium text-primary">browse</span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          aria-label="Choose files to upload"
          onChange={handleFileInputChange}
        />
      </div>

      {/* Upload queue */}
      {queue.length > 0 && (
        <div className="space-y-2" role="status" aria-live="polite">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.file.size)}
                  {item.status === "uploading" && " • Uploading..."}
                  {item.status === "success" && " • Uploaded"}
                  {item.status === "error" && ` • ${item.error}`}
                </p>
              </div>

              {item.status === "uploading" && (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-label={`Uploading ${item.file.name}`}
                />
              )}

              {item.status === "error" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(item.id);
                  }}
                >
                  <X className="size-4" />
                  <span className="sr-only">Remove {item.file.name}</span>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

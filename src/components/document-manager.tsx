"use client";

import { useCallback } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { DocumentListSkeleton } from "@/components/loading-skeletons";
import { Badge } from "@/components/ui/badge";

interface DocumentManagerProps {
  projectId: string;
}

export function DocumentManager({ projectId }: DocumentManagerProps) {
  const utils = trpc.useUtils();
  const documentsQuery = trpc.document.listByProject.useQuery({ projectId });

  const uploadMutation = trpc.document.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded and indexed successfully");
      utils.document.listByProject.invalidate({ projectId });
      utils.project.getById.invalidate({ id: projectId });
      utils.project.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      utils.document.listByProject.invalidate({ projectId });
      utils.project.getById.invalidate({ id: projectId });
      utils.project.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];

      if (!file) return;

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Only PDF files are supported");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds the 10MB limit");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        if (!base64) {
          toast.error("Failed to read file");
          return;
        }

        uploadMutation.mutate({
          projectId,
          fileName: file.name,
          fileData: base64,
          fileSize: file.size,
        });
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
      };
      reader.readAsDataURL(file);
    },
    [projectId, uploadMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="glass rounded-xl p-8 border-2 border-dashed border-border/50 hover:border-primary/30 transition-colors text-center cursor-pointer group"
        onClick={() => {
          if (uploadMutation.isPending) return;
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".pdf";
          input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            handleFileSelect(target.files);
          };
          input.click();
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload PDF document"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf";
            input.onchange = (ev) => {
              const target = ev.target as HTMLInputElement;
              handleFileSelect(target.files);
            };
            input.click();
          }
        }}
      >
        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div>
              <p className="text-sm font-medium">
                Processing document...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Parsing PDF, generating embeddings, and indexing vectors
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <div>
              <p className="text-sm font-medium">
                Drop a PDF here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Building codes, specs, RFIs, submittals, ASTM standards — up to
                10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Document List */}
      {documentsQuery.isLoading && <DocumentListSkeleton />}

      {documentsQuery.data?.length === 0 && !documentsQuery.isLoading && (
        <EmptyState
          icon={FileText}
          title="No documents uploaded"
          description="Upload building codes, specifications, or construction documents to start querying with AI."
        />
      )}

      {documentsQuery.data && documentsQuery.data.length > 0 && (
        <div className="space-y-2">
          {documentsQuery.data.map((doc) => (
            <div
              key={doc.id}
              className="glass rounded-lg px-4 py-3 flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-primary/10 border border-primary/20 p-2 rounded-lg shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(doc.fileSize)}
                    </span>
                    {doc.chunkCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        · {doc.chunkCount} chunks
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      ·{" "}
                      {new Date(doc.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge
                  status={doc.status}
                  errorMessage={doc.errorMessage}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `Delete "${doc.filename}"? This will remove the document and its indexed vectors.`
                      )
                    ) {
                      deleteMutation.mutate({
                        id: doc.id,
                        projectId,
                      });
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                  title="Delete document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  errorMessage,
}: {
  status: string;
  errorMessage: string | null;
}) {
  switch (status) {
    case "ready":
      return (
        <Badge variant="success">
          <CheckCircle className="w-3 h-3 mr-1" />
          Ready
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" title={errorMessage ?? "Unknown error"}>
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return null;
  }
}

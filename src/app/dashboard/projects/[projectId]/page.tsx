"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DocumentManager } from "@/components/document-manager";
import { ChatSessionList } from "@/components/chat-session-list";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const projectQuery = trpc.project.getById.useQuery({ id: projectId });
  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      utils.project.list.invalidate();
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this project? All documents and chat history will be permanently removed."
      )
    ) {
      deleteProject.mutate({ id: projectId });
    }
  };

  if (projectQuery.isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted/50 rounded-lg" />
          <div className="h-4 w-96 bg-muted/30 rounded-lg" />
        </div>
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="p-8">
        <div className="glass rounded-xl p-8 text-center max-w-md mx-auto">
          <p className="text-destructive font-medium mb-2">
            Project not found
          </p>
          <Link
            href="/dashboard"
            className="text-sm text-primary hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const project = projectQuery.data;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </Link>

      {/* Project Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary">
              <FileText className="w-3 h-3 mr-1" />
              {project._count.documents} documents
            </Badge>
            <Badge variant="secondary">
              <MessageSquare className="w-3 h-3 mr-1" />
              {project._count.chatSessions} chats
            </Badge>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleteProject.isPending}
          className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10"
          title="Delete project"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Documents Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Documents
          </h2>
        </div>
        <DocumentManager projectId={projectId} />
      </section>

      {/* Chat Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Chat Sessions
          </h2>
        </div>
        <ChatSessionList projectId={projectId} />
      </section>
    </div>
  );
}

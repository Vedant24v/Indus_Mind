"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

interface ChatSessionListProps {
  projectId: string;
}

export function ChatSessionList({ projectId }: ChatSessionListProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const sessionsQuery = trpc.chat.listSessions.useQuery({ projectId });

  const createSession = trpc.chat.createSession.useMutation({
    onSuccess: (session) => {
      utils.chat.listSessions.invalidate({ projectId });
      utils.project.getById.invalidate({ id: projectId });
      utils.project.list.invalidate();
      router.push(
        `/dashboard/projects/${projectId}/chat/${session.id}`
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteSession = trpc.chat.deleteSession.useMutation({
    onSuccess: () => {
      toast.success("Chat session deleted");
      utils.chat.listSessions.invalidate({ projectId });
      utils.project.getById.invalidate({ id: projectId });
      utils.project.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleNewChat = () => {
    createSession.mutate({ projectId });
  };

  if (sessionsQuery.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="glass rounded-lg p-4 animate-pulse h-16"
          />
        ))}
      </div>
    );
  }

  if (sessionsQuery.data?.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No chat sessions"
        description="Start a conversation to ask questions about your project documents."
        action={
          <button
            onClick={handleNewChat}
            disabled={createSession.isPending}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {createSession.isPending ? "Creating..." : "New Chat"}
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleNewChat}
        disabled={createSession.isPending}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 mb-2"
      >
        <Plus className="w-4 h-4" />
        {createSession.isPending ? "Creating..." : "New Chat"}
      </button>

      {sessionsQuery.data?.map((session) => (
        <div
          key={session.id}
          className="glass rounded-lg px-4 py-3 flex items-center justify-between gap-4 group"
        >
          <Link
            href={`/dashboard/projects/${projectId}/chat/${session.id}`}
            className="flex items-center gap-3 min-w-0 flex-1"
          >
            <div className="bg-muted/50 p-2 rounded-lg shrink-0">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{session.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {session._count.messages} messages
                </span>
                <span className="text-xs text-muted-foreground">
                  ·{" "}
                  {new Date(session.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </Link>

          <button
            onClick={() => {
              if (
                window.confirm("Delete this chat session and all its messages?")
              ) {
                deleteSession.mutate({ sessionId: session.id });
              }
            }}
            disabled={deleteSession.isPending}
            className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10 opacity-0 group-hover:opacity-100 shrink-0"
            title="Delete chat session"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

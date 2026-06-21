"use client";

import Link from "next/link";
import {
  FolderKanban,
  FileText,
  MessageSquare,
  Plus,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/components/empty-state";
import { ProjectListSkeleton } from "@/components/loading-skeletons";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const projectsQuery = trpc.project.list.useQuery();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your AEC projects and documents
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Projects Grid */}
      {projectsQuery.isLoading && <ProjectListSkeleton />}

      {projectsQuery.isError && (
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load projects. Please try again.
          </p>
          <button
            onClick={() => projectsQuery.refetch()}
            className="mt-3 text-sm text-primary hover:underline font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {projectsQuery.data?.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first AEC project to start uploading building codes, specifications, and construction documents."
          action={
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </Link>
          }
        />
      )}

      {projectsQuery.data && projectsQuery.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsQuery.data.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="glass rounded-xl p-6 glass-hover group block"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="bg-primary/10 border border-primary/20 p-2 rounded-lg">
                  <FolderKanban className="w-4 h-4 text-primary" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-2 mt-auto">
                <Badge variant="secondary">
                  <FileText className="w-3 h-3 mr-1" />
                  {project._count.documents} docs
                </Badge>
                <Badge variant="secondary">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  {project._count.chatSessions} chats
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Updated{" "}
                {new Date(project.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

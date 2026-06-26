"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function NewProjectPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createProject = trpc.project.create.useMutation({
    onSuccess: (project) => {
      toast.success("Project created successfully");
      utils.project.list.invalidate();
      router.push(`/dashboard/projects/${project.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createProject.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="glass rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 border border-primary/20 p-2.5 rounded-lg">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Create New Project</h1>
            <p className="text-sm text-muted-foreground">
              Organize your AEC documents by project
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="project-name"
              className="text-sm font-medium"
            >
              Project Name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Downtown Office Tower — Phase 2"
              className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="project-description"
              className="text-sm font-medium"
            >
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Structural specs, building code compliance docs, and RFIs for the 12-story mixed-use development at 4th & Main"
              className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none h-24"
              maxLength={500}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!name.trim() || createProject.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createProject.isPending ? "Creating..." : "Create Project"}
            </button>
            <Link
              href="/dashboard"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors border border-border"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Building2,
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Plus,
  ChevronRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const projectsQuery = trpc.project.list.useQuery(undefined, {
    enabled: status === "authenticated",
    refetchOnMount: "always",
  });

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
  ];

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-border bg-card/30 backdrop-blur-xl shrink-0">
      {/* Brand */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border/50 shrink-0">
        <div className="bg-primary/10 border border-primary/20 p-1.5 rounded-lg">
          <Building2 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-foreground uppercase">
            IndusMind
          </span>
          <p className="text-[10px] text-muted-foreground font-medium leading-none">
            AEC Intelligence
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Projects Section */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Projects
            </span>
            <Link
              href="/dashboard/projects/new"
              className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded"
              title="Create new project"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projectsQuery.isLoading && (
            <div className="space-y-1 px-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 rounded-lg bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          )}

          {projectsQuery.data?.map((project) => {
            const isActive = pathname.includes(project.id);
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors group",
                  isActive
                    ? "bg-muted/60 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{project.name}</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            );
          })}

          {projectsQuery.isError && (
            <p className="text-xs text-destructive px-3 py-2">
              Failed to load projects
            </p>
          )}

          {!projectsQuery.isLoading &&
            !projectsQuery.isError &&
            projectsQuery.data?.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">
              No projects yet
            </p>
          )}
        </div>
      </nav>

      {/* User Footer */}
      <div className="border-t border-border/50 p-3 shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {session?.user?.name ?? "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {session?.user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-muted/50"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

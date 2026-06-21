import { HardHat } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/[0.07] blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-1/4 h-[400px] w-[400px] rounded-full bg-amber-600/[0.05] blur-[100px]"
      />

      {/* Branding */}
      <div className="relative z-10 mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <HardHat className="h-5 w-5 text-primary" />
        </div>
        <span className="text-xl font-bold tracking-tight">
          <span className="gradient-text">Indus</span>
          <span className="text-foreground">Mind</span>
        </span>
      </div>

      {/* Auth card slot */}
      <div className="relative z-10 w-full max-w-md">{children}</div>

      {/* Footer tagline */}
      <p className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
        AEC Document Intelligence — powered by AI
      </p>
    </div>
  );
}

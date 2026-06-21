"use client";

import { SessionProvider } from "@/providers/session-provider";
import { TRPCProvider } from "@/lib/trpc";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        {children}
        <Toaster theme="dark" richColors position="top-right" />
      </TRPCProvider>
    </SessionProvider>
  );
}

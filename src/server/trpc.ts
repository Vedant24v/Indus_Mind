import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createContext() {
  const session = await auth();

  return {
    session,
    prisma,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource.",
    });
  }

  let userId = ctx.session.user.id;

  if (!userId && ctx.session.user.email) {
    const user = await ctx.prisma.user.findUnique({
      where: { email: ctx.session.user.email },
      select: { id: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authenticated user could not be resolved.",
      });
    }

    userId = user.id;
  }

  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authenticated user could not be resolved.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId,
    },
  });
});

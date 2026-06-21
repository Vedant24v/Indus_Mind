import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { queryPythonService } from "../python-service";

export const chatRouter = router({
  listSessions: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.userId },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      return ctx.prisma.chatSession.findMany({
        where: { projectId: input.projectId },
        include: {
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.prisma.chatSession.findFirst({
        where: { id: input.sessionId },
        include: {
          project: { select: { userId: true, name: true } },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!session || session.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat session not found.",
        });
      }

      return session;
    }),

  createSession: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.userId },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      return ctx.prisma.chatSession.create({
        data: {
          projectId: input.projectId,
        },
      });
    }),

  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.chatSession.findFirst({
        where: { id: input.sessionId },
        include: { project: { select: { userId: true } } },
      });

      if (!session || session.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat session not found.",
        });
      }

      await ctx.prisma.chatSession.delete({
        where: { id: input.sessionId },
      });

      return { success: true };
    }),

  updateSessionTitle: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        title: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.chatSession.findFirst({
        where: { id: input.sessionId },
        include: { project: { select: { userId: true } } },
      });

      if (!session || session.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat session not found.",
        });
      }

      return ctx.prisma.chatSession.update({
        where: { id: input.sessionId },
        data: { title: input.title },
      });
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        content: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.chatSession.findFirst({
        where: { id: input.sessionId },
        include: {
          project: {
            select: {
              userId: true,
              id: true,
              documents: {
                where: { status: "ready" },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!session || session.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat session not found.",
        });
      }

      if (session.project.documents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No documents have been uploaded to this project yet. Please upload at least one document before asking questions.",
        });
      }

      // Save the user message
      const userMessage = await ctx.prisma.message.create({
        data: {
          role: "user",
          content: input.content,
          chatSessionId: input.sessionId,
        },
      });

      try {
        // Query the Python RAG service
        const ragResponse = await queryPythonService(
          session.project.id,
          input.content
        );

        // Save the assistant response
        const assistantMessage = await ctx.prisma.message.create({
          data: {
            role: "assistant",
            content: ragResponse.answer,
            sources: ragResponse.sources as any,
            chatSessionId: input.sessionId,
          },
        });

        // Auto-generate title from first message if still default
        if (session.title === "New Chat") {
          const title =
            input.content.length > 60
              ? input.content.substring(0, 57) + "..."
              : input.content;

          await ctx.prisma.chatSession.update({
            where: { id: input.sessionId },
            data: { title },
          });
        }

        // Touch the session's updatedAt
        await ctx.prisma.chatSession.update({
          where: { id: input.sessionId },
          data: { updatedAt: new Date() },
        });

        return {
          userMessage,
          assistantMessage,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to generate a response.";

        // Save error as assistant message so user sees what went wrong
        const errorAssistantMessage = await ctx.prisma.message.create({
          data: {
            role: "assistant",
            content: `I encountered an error while processing your question: ${errorMessage}`,
            chatSessionId: input.sessionId,
          },
        });

        return {
          userMessage,
          assistantMessage: errorAssistantMessage,
        };
      }
    }),
});

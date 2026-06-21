import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import {
  uploadToPythonService,
  deleteDocumentVectors,
} from "../python-service";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const documentRouter = router({
  listByProject: protectedProcedure
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

      return ctx.prisma.document.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  upload: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        fileName: z.string(),
        fileData: z.string(), // Base64-encoded PDF
        fileSize: z.number().max(MAX_FILE_SIZE, "File exceeds 10MB limit"),
      })
    )
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

      if (!input.fileName.toLowerCase().endsWith(".pdf")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only PDF files are supported.",
        });
      }

      const document = await ctx.prisma.document.create({
        data: {
          filename: input.fileName,
          fileSize: input.fileSize,
          status: "processing",
          qdrantCollection: `project_${input.projectId}`,
          projectId: input.projectId,
        },
      });

      try {
        const fileBuffer = Buffer.from(input.fileData, "base64");

        const result = await uploadToPythonService(
          fileBuffer,
          input.fileName,
          input.projectId,
          document.id
        );

        const updatedDocument = await ctx.prisma.document.update({
          where: { id: document.id },
          data: {
            status: "ready",
            chunkCount: result.chunks,
          },
        });

        return updatedDocument;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during upload.";

        await ctx.prisma.document.update({
          where: { id: document.id },
          data: {
            status: "error",
            errorMessage,
          },
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Document processing failed: ${errorMessage}`,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.prisma.document.findFirst({
        where: { id: input.id, projectId: input.projectId },
        include: {
          project: { select: { userId: true } },
        },
      });

      if (!document || document.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found.",
        });
      }

      try {
        await deleteDocumentVectors(input.projectId, input.id);
      } catch {
        // Vectors may not exist if upload failed before indexing
      }

      await ctx.prisma.document.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  reindex: protectedProcedure
    .input(z.object({ id: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.prisma.document.findFirst({
        where: { id: input.id, projectId: input.projectId },
        include: {
          project: { select: { userId: true } },
        },
      });

      if (!document || document.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found.",
        });
      }

      // Re-indexing requires the original file, which we don't store.
      // Mark as needing re-upload instead.
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Re-indexing requires re-uploading the original PDF. Please delete this document and upload it again.",
      });
    }),
});

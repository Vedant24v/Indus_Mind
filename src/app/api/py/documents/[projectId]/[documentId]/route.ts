import { NextResponse } from "next/server";
import { deleteDocumentVectors } from "@/lib/rag-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> }
) {
  try {
    const { projectId, documentId } = await params;
    await deleteDocumentVectors(projectId, documentId);
    return NextResponse.json({ message: "deleted", projectId, documentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

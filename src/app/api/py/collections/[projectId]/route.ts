import { NextResponse } from "next/server";
import { deleteProjectCollection } from "@/lib/rag-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await deleteProjectCollection(projectId);
    return NextResponse.json({ message: "collection_deleted", projectId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

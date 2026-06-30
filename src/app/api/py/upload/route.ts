import { NextResponse } from "next/server";
import { uploadToPythonService } from "@/lib/rag-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fileName = body?.file_name as string | undefined;
    const fileData = body?.file_data as string | undefined;
    const projectId = body?.project_id as string | undefined;
    const documentId = body?.document_id as string | undefined;

    if (!fileName || !fileData || !projectId || !documentId) {
      return NextResponse.json(
        { detail: "file_name, file_data, project_id, and document_id are required." },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(fileData, "base64");
    const result = await uploadToPythonService(fileBuffer, fileName, projectId, documentId);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { queryRagService } from "@/lib/rag-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = body?.project_id as string | undefined;
    const question = body?.question as string | undefined;
    const documentIds = body?.document_ids as string[] | undefined;

    if (!projectId || !question) {
      return NextResponse.json(
        { detail: "project_id and question are required." },
        { status: 400 }
      );
    }

    const result = await queryRagService(projectId, question, documentIds);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

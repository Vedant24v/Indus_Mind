import { getPythonServiceUrl } from "@/lib/python-service-url";

async function pythonFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = getPythonServiceUrl();
  const url = `${baseUrl}${path}`;

  try {
    return await fetch(url, init);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown network error";
    throw new Error(
      `Cannot reach Python RAG service at ${url}: ${reason}. ` +
        "Ensure PYTHON_SERVICE_URL is set (local: http://localhost:8000) " +
        "and the Python service is running."
    );
  }
}

interface UploadResponse {
  message: string;
  chunks: number;
  document_id: string;
}

interface QuerySource {
  document_name: string;
  chunk_text: string;
  chunk_index: number;
}

interface QueryResponse {
  answer: string;
  sources: QuerySource[];
}

export async function uploadToPythonService(
  fileBuffer: Buffer,
  fileName: string,
  projectId: string,
  documentId: string
): Promise<UploadResponse> {
  const base64Data = fileBuffer.toString("base64");

  const response = await pythonFetch("/api/py/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_name: fileName,
      file_data: base64Data,
      project_id: projectId,
      document_id: documentId,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(
      errorData?.detail ?? `Python service upload failed (HTTP ${response.status})`
    );
  }

  return response.json() as Promise<UploadResponse>;
}

export async function queryPythonService(
  projectId: string,
  question: string,
  documentIds?: string[]
): Promise<QueryResponse> {
  const body: Record<string, unknown> = {
    project_id: projectId,
    question,
  };

  if (documentIds && documentIds.length > 0) {
    body.document_ids = documentIds;
  }

  const response = await pythonFetch("/api/py/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(
      errorData?.detail ?? `Python service query failed (HTTP ${response.status})`
    );
  }

  return response.json() as Promise<QueryResponse>;
}

export async function deleteDocumentVectors(
  projectId: string,
  documentId: string
): Promise<void> {
  const response = await pythonFetch(
    `/api/py/documents/${projectId}/${documentId}`,
    { method: "DELETE" }
  );

  if (!response.ok && response.status !== 404) {
    const errorData = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(
      errorData?.detail ??
        `Failed to delete document vectors (HTTP ${response.status})`
    );
  }
}

export async function deleteProjectCollection(
  projectId: string
): Promise<void> {
  const response = await pythonFetch(
    `/api/py/collections/${projectId}`,
    { method: "DELETE" }
  );

  if (!response.ok && response.status !== 404) {
    const errorData = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(
      errorData?.detail ??
        `Failed to delete project collection (HTTP ${response.status})`
    );
  }
}

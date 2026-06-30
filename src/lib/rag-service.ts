import { randomUUID } from "crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { PDFParse } from "pdf-parse";

const EMBEDDING_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const AEC_SYSTEM_PROMPT = `You are an AEC document assistant. Answer using ONLY the provided context chunks from project documents (specs, RFIs, codes, submittals).

Rules:
1. If the answer is in the context, state it directly and confidently in 1-3 sentences. No hedging, no disclaimers, no "according to the provided context" more than once.
1a. If the user asks for a summary, overview, recap, or "tell me about" the document, summarize the retrieved context directly instead of refusing. Keep it concise and grounded only in the provided chunks.
2. Synthesize across ALL provided chunks before answering — the full answer may require combining facts from more than one chunk. Don't treat each chunk as needing to independently contain the whole answer.
3. If the context does not contain the answer, respond with exactly: "This isn't covered in the provided documents." Do not guess, infer, or partially answer with caveats. Never say "not found" and then answer anyway in the same response — pick one.
4. When a question covers multiple categories (e.g., strength values for different building elements), list each value clearly against its category, not merged into one ambiguous sentence.
5. Bridge close synonyms in the source text (e.g., "exterior slabs" and "exterior flatwork" refer to the same scope) — don't fail to connect an answer just because the question's wording doesn't exactly match the document's wording.
6. Do not restate the question. Do not repeat the same fact twice in one answer.`;
const SUMMARY_SYSTEM_PROMPT = `You are summarizing retrieved document chunks.

Rules:
1. Use only the provided chunk text.
2. If the chunks contain readable content, provide a concise summary in 2-4 sentences.
3. Do not say the document is empty or lacks content unless the provided chunks are actually empty or unreadable.
4. Do not invent details that are not present in the chunks.`;

function splitText(text: string, chunkSize = 500, chunkOverlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      const spaceIndex = text.lastIndexOf(" ", end);
      if (spaceIndex > start + Math.floor(chunkSize / 2)) {
        end = spaceIndex;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - chunkOverlap;
  }

  return chunks.filter(Boolean);
}

function meanPool(tokenEmbeddings: Array<number | number[]>): number[] {
  if (!tokenEmbeddings.length) {
    return [];
  }

  const first = tokenEmbeddings[0];
  if (typeof first === "number") {
    return tokenEmbeddings as number[];
  }

  const dimensions = (first as number[]).length;
  const sums = Array.from({ length: dimensions }, () => 0);

  for (const embedding of tokenEmbeddings as number[][]) {
    for (let i = 0; i < dimensions; i += 1) {
      const value = embedding[i] ?? 0;
      const current = sums[i] ?? 0;
      sums[i] = current + value;
    }
  }

  return sums.map((value) => value / tokenEmbeddings.length);
}

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const hfToken = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  if (!hfToken) {
    throw new Error(
      "HUGGINGFACE_API_KEY environment variable is missing. Please add it to your environment."
    );
  }

  const response = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: texts,
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HuggingFace embedding failed (HTTP ${response.status}): ${await response.text()}`
    );
  }

  const raw = (await response.json()) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error("Unexpected HuggingFace response format.");
  }

  return raw.map((item) => meanPool(item as Array<number | number[]>));
}

function getQdrantClient() {
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;

  if (!qdrantUrl || qdrantUrl === "local") {
    return new QdrantClient({ url: "http://127.0.0.1:6333" });
  }

  if (!qdrantApiKey) {
    throw new Error("QDRANT_API_KEY must be set when QDRANT_URL is provided.");
  }

  return new QdrantClient({ url: qdrantUrl, apiKey: qdrantApiKey });
}

async function callGroq(prompt: string): Promise<string> {
  return callGroqWithSystemPrompt(AEC_SYSTEM_PROMPT, prompt);
}

async function callGroqWithSystemPrompt(
  systemPrompt: string,
  prompt: string
): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY environment variable must be set.");
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error (HTTP ${response.status}): ${await response.text()}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return json.choices?.[0]?.message?.content ?? "";
}

function isSummaryRequest(question: string): boolean {
  const normalized = question.toLowerCase();
  return [
    "summarize",
    "summary",
    "overview",
    "recap",
    "tell me about",
    "what is this document about",
  ].some((pattern) => normalized.includes(pattern));
}

function cleanContextText(context: string): string {
  return context
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFallbackSummary(context: string): string {
  const cleaned = cleanContextText(context);
  if (!cleaned) {
    return "This isn't covered in the provided documents.";
  }

  const excerpt = cleaned.slice(0, 320).trim();
  return excerpt.endsWith(".") ? excerpt : `${excerpt}${cleaned.length > 320 ? "..." : "."}`;
}

export interface UploadResponse {
  message: string;
  chunks: number;
  document_id: string;
}

export interface QuerySource {
  document_name: string;
  chunk_text: string;
  chunk_index: number;
}

export interface QueryResponse {
  answer: string;
  sources: QuerySource[];
}

export async function uploadToRagService(
  fileBuffer: Buffer,
  fileName: string,
  projectId: string,
  documentId: string
): Promise<UploadResponse> {
  const parser = new PDFParse({ data: fileBuffer });
  const result = await parser.getText();
  const text = result.text?.trim() ?? "";

  if (!text) {
    throw new Error("No text could be extracted from the PDF file.");
  }

  const chunks = splitText(text, 500, 50);
  const vectors: number[][] = [];
  const batchSize = 32;

  for (let index = 0; index < chunks.length; index += batchSize) {
    const batch = chunks.slice(index, index + batchSize);
    const batchVectors = await getEmbeddings(batch);
    vectors.push(...batchVectors);
  }

  const client = getQdrantClient();
  const collectionName = `project_${projectId}`;
  const collections = await client.getCollections();
  const existingCollections = collections.collections?.map((collection) => collection.name) ?? [];

  if (!existingCollections.includes(collectionName)) {
    await client.createCollection(collectionName, {
      vectors: {
        size: 384,
        distance: "Cosine",
      },
    });
  }

  const points = chunks.map((chunk, index) => ({
    id: randomUUID(),
    vector: vectors[index] ?? [],
    payload: {
      document_id: documentId,
      document_name: fileName,
      chunk_index: index,
      page_content: chunk,
    },
  }));

  await client.upsert(collectionName, {
    wait: true,
    points,
  });

  return {
    message: "uploaded",
    chunks: chunks.length,
    document_id: documentId,
  };
}

export async function queryRagService(
  projectId: string,
  question: string,
  documentIds?: string[]
): Promise<QueryResponse> {
  const client = getQdrantClient();
  const collectionName = `project_${projectId}`;

  let collection;
  try {
    collection = await client.getCollection(collectionName);
  } catch {
    throw new Error(`Project collection '${collectionName}' not found. Please upload documents first.`);
  }

  if (!collection) {
    throw new Error(`Project collection '${collectionName}' not found. Please upload documents first.`);
  }

  const queryVector = (await getEmbeddings([question]))[0];
  const searchOptions: Record<string, unknown> = {
    query: queryVector,
    limit: 4,
    with_payload: true,
    with_vector: false,
  };

  if (documentIds && documentIds.length > 0) {
    searchOptions.filter = {
      must: [
        {
          key: "document_id",
          match: {
            any: documentIds,
          },
        },
      ],
    };
  }

  const searchResult = await client.query(collectionName, searchOptions);
  const points = (searchResult as { points?: Array<{ payload?: Record<string, unknown> }> }).points ?? [];

  if (!points.length) {
    return {
      answer: "This isn't covered in the provided documents.",
      sources: [],
    };
  }

  const sources: QuerySource[] = points.map((point, index) => ({
    document_name: String(point.payload?.document_name ?? ""),
    chunk_text: String(point.payload?.page_content ?? ""),
    chunk_index: Number(point.payload?.chunk_index ?? index),
  }));

  const context = sources.map((source) => source.chunk_text).join("\n\n");
  const answer = isSummaryRequest(question)
    ? await callGroqWithSystemPrompt(
        SUMMARY_SYSTEM_PROMPT,
        `Summarize these document chunks:\n\n${context}`
      )
    : await callGroq(`Context:\n${context}\n\nQuestion: ${question}`);

  const finalAnswer =
    isSummaryRequest(question) &&
    /no actual content|nothing to summarize|document is empty|no content provided/i.test(
      answer
    ) &&
    cleanContextText(context)
      ? buildFallbackSummary(context)
      : answer;

  return {
    answer: finalAnswer,
    sources,
  };
}

export async function deleteDocumentVectors(projectId: string, documentId: string): Promise<void> {
  const client = getQdrantClient();
  const collectionName = `project_${projectId}`;

  try {
    await client.getCollection(collectionName);
  } catch {
    return;
  }

  await client.delete(collectionName, {
    wait: true,
    filter: {
      must: [
        {
          key: "document_id",
          match: {
            value: documentId,
          },
        },
      ],
    },
  });
}

export async function deleteProjectCollection(projectId: string): Promise<void> {
  const client = getQdrantClient();
  const collectionName = `project_${projectId}`;

  try {
    await client.getCollection(collectionName);
  } catch {
    return;
  }

  await client.deleteCollection(collectionName);
}

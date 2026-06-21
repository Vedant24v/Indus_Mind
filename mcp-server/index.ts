import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL ?? "http://localhost:8000";

interface QuerySource {
  document_name: string;
  chunk_text: string;
  chunk_index: number;
}

interface QueryResponse {
  answer: string;
  sources: QuerySource[];
}

const server = new McpServer({
  name: "indusmind-aec",
  version: "1.0.0",
});

server.tool(
  "search_aec_documents",
  "Search AEC project documents using semantic similarity. Returns relevant document chunks for a given natural language query within a specific project.",
  {
    projectId: z
      .string()
      .describe("The project ID to search documents within"),
    query: z
      .string()
      .describe(
        "Natural language query to search for in the project documents"
      ),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of results to return (default: 4)"),
  },
  async ({ projectId, query }) => {
    try {
      const response = await fetch(`${PYTHON_SERVICE_URL}/api/py/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          question: query,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching documents: ${errorText}`,
            },
          ],
          isError: true,
        };
      }

      const data = (await response.json()) as QueryResponse;

      const formattedSources = data.sources
        .map(
          (s, i) =>
            `### Source ${i + 1}: ${s.document_name} (Chunk #${s.chunk_index})\n${s.chunk_text}`
        )
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `## Answer\n${data.answer}\n\n## Sources\n${formattedSources}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to connect to IndusMind service: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "summarize_document",
  "Generate a summary of a specific document within an AEC project by retrieving its chunks and synthesizing key information.",
  {
    projectId: z.string().describe("The project ID containing the document"),
    documentId: z.string().describe("The document ID to summarize"),
  },
  async ({ projectId, documentId }) => {
    try {
      const response = await fetch(`${PYTHON_SERVICE_URL}/api/py/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          question:
            "Provide a comprehensive summary of this document, covering its main topics, key requirements, and important specifications.",
          document_ids: [documentId],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Error summarizing document: ${errorText}`,
            },
          ],
          isError: true,
        };
      }

      const data = (await response.json()) as QueryResponse;

      return {
        content: [
          {
            type: "text" as const,
            text: `## Document Summary\n${data.answer}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to summarize document: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`MCP server error: ${error}\n`);
  process.exit(1);
});

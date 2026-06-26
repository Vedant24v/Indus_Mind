/**
 * Resolves the Python RAG service base URL for server-side requests.
 *
 * Local dev: FastAPI runs separately on port 8000 (PYTHON_SERVICE_URL).
 * Vercel: Python is deployed as a serverless function at /api/py via api/index.py.
 */
export function getPythonServiceUrl(): string {
  if (process.env.PYTHON_SERVICE_URL) {
    return process.env.PYTHON_SERVICE_URL.replace(/\/$/, "");
  }

  // Vercel sets these automatically — use the deployment URL so server-side
  // tRPC can reach the co-located Python function (not localhost:8000).
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:8000";
}

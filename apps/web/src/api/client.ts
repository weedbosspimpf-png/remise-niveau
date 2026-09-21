/**
 * Client HTTP minimal vers l'API EDU RESTART.
 *
 * Simplification MVP assumée : le jeton JWT est conservé en `localStorage`
 * (voir state/auth.ts). Pour la production, migrer vers un cookie httpOnly
 * signé côté serveur — ce fichier est le seul endroit à modifier.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const hasBody = options.body !== undefined;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      // N'annoncer un corps JSON que s'il y en a réellement un : sinon Fastify
      // rejette la requête (content-type JSON + corps vide = erreur serveur).
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : undefined;

  if (!response.ok) {
    const message = (payload as { message?: string } | undefined)?.message ?? response.statusText;
    throw new ApiError(response.status, message);
  }

  return payload as T;
}

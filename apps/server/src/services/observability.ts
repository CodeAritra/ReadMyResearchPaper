/**
 * Observability & Telemetry Configuration for LangSmith Cloud.
 *
 * Provides zero-overhead tracing management, environment verification,
 * and project isolation between live queries and automated evaluation runs.
 */

export interface TracingStatus {
  enabled: boolean;
  project: string;
  hasApiKey: boolean;
  endpoint?: string;
}

export const DEFAULT_PROJECT = 'research-paper-qna';
export const EVAL_PROJECT = 'research-paper-qna-evals';

/**
 * Returns current LangSmith tracing status and active configuration.
 */
export function getTracingStatus(): TracingStatus {
  const enabled = process.env.LANGCHAIN_TRACING_V2 === 'true';
  const hasApiKey = Boolean(process.env.LANGCHAIN_API_KEY && process.env.LANGCHAIN_API_KEY.trim().length > 0);
  const project = process.env.LANGCHAIN_PROJECT || DEFAULT_PROJECT;
  const endpoint = process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com';

  return {
    enabled: enabled && hasApiKey,
    project,
    hasApiKey,
    endpoint,
  };
}

/**
 * Ensures standard project defaults are applied to process.env.
 */
export function initializeTracing(): void {
  if (!process.env.LANGCHAIN_PROJECT) {
    process.env.LANGCHAIN_PROJECT = DEFAULT_PROJECT;
  }
}

/**
 * Executes a function within the isolated evaluation LangSmith project (`research-paper-qna-evals`).
 * Restores the previous project after execution completes.
 */
export async function withEvalProject<T>(fn: () => Promise<T>): Promise<T> {
  const previousProject = process.env.LANGCHAIN_PROJECT;
  try {
    process.env.LANGCHAIN_PROJECT = EVAL_PROJECT;
    return await fn();
  } finally {
    if (previousProject !== undefined) {
      process.env.LANGCHAIN_PROJECT = previousProject;
    } else {
      delete process.env.LANGCHAIN_PROJECT;
    }
  }
}

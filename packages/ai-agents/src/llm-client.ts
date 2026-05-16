import type { LLMRequest, LLMResponse } from '@wfk/shared';

export interface LLMClientOptions {
  /** Backend proxy URL, e.g. http://localhost:8787 */
  backendUrl: string;
  /** User's Anthropic API key. Sent as X-Anthropic-Api-Key header when provided. */
  apiKey?: string;
  /** Optional Anthropic-compatible API base URL. Sent as X-Anthropic-Base-Url header. */
  anthropicBaseUrl?: string;
  /** Per-request timeout, default 60s. */
  timeoutMs?: number;
}

export class LLMClient {
  constructor(private options: LLMClientOptions) {}

  async call(request: LLMRequest): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutMs = this.options.timeoutMs ?? 60_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = buildHeaders(this.options);
      const res = await fetch(buildMessagesUrl(this.options.backendUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!res.ok) {
        let body: unknown = null;
        try {
          body = await res.json();
        } catch {
          // ignore parse error
        }
        const message =
          body && typeof body === 'object' && 'error' in body
            ? String(((body as Record<string, { message?: string }>)['error'])?.message ?? res.statusText)
            : res.statusText;
        throw new LLMError(message, res.status);
      }

      return (await res.json()) as LLMResponse;
    } catch (err) {
      if (err instanceof LLMError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new LLMError(`Request timed out after ${timeoutMs}ms`, 408);
      }
      throw new LLMError(err instanceof Error ? err.message : 'Unknown error', 500);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildMessagesUrl(backendUrl: string): string {
  const base = backendUrl.replace(/\/$/, '');
  if (base.endsWith('/api/llm')) return `${base}/messages`;
  return `${base}/api/llm/messages`;
}

function buildHeaders(options: LLMClientOptions): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(options.apiKey ? { 'X-Anthropic-Api-Key': options.apiKey } : {}),
    ...(options.anthropicBaseUrl
      ? { 'X-Anthropic-Base-Url': options.anthropicBaseUrl }
      : {}),
  };
}

export class LLMError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

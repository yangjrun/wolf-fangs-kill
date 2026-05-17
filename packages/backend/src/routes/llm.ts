import { Hono } from 'hono';
import Anthropic from '@anthropic-ai/sdk';

export const llmRoutes = new Hono();

interface UsageStats {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

llmRoutes.post('/messages', async (c) => {
  const headerKey = c.req.header('X-Anthropic-Api-Key')?.trim();
  const headerBaseUrl = c.req.header('X-Anthropic-Base-Url')?.trim();
  const envApiKey = process.env['ANTHROPIC_API_KEY']?.trim();
  const envBaseUrl = process.env['ANTHROPIC_BASE_URL']?.trim();
  const apiKey = headerKey || envApiKey;
  const baseURL = headerKey ? headerBaseUrl : envBaseUrl;

  if (!apiKey) {
    return c.json(
      {
        error: {
          type: 'authentication_error',
          message:
            'Missing Anthropic API key. Set X-Anthropic-Api-Key header or ANTHROPIC_API_KEY env var.',
        },
      },
      401
    );
  }

  if (headerBaseUrl && !headerKey) {
    return c.json(
      {
        error: {
          type: 'invalid_request',
          message: 'X-Anthropic-Base-Url requires X-Anthropic-Api-Key.',
        },
      },
      400
    );
  }

  const normalizedBaseURL = normalizeBaseURL(baseURL, Boolean(headerBaseUrl));
  if (baseURL && !normalizedBaseURL) {
    return c.json(
      {
        error: {
          type: 'invalid_request',
          message:
            'Anthropic base URL must be a valid URL. Client-provided URLs must use https unless they target localhost.',
        },
      },
      400
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json(
      { error: { type: 'invalid_request', message: 'Body must be valid JSON' } },
      400
    );
  }

  const client = new Anthropic({ apiKey, baseURL: normalizedBaseURL });

  // Convention: model name suffix "[1m]" opts in to the 1M-context window.
  // Different endpoints expect different things:
  //   - Official Anthropic API: bare model ID (e.g. "claude-sonnet-4-6") plus
  //     the "context-1m-2025-08-07" beta header.
  //   - Third-party relays (e.g. common Chinese gateways): the literal
  //     "[1m]"-suffixed model name and NO beta header (their 1M offering is
  //     GA from their side; sending the beta header makes them 503).
  //     The account often also needs a "1m context" toggle enabled in the
  //     relay's dashboard.
  const usingRelay = Boolean(normalizedBaseURL);
  const rawModel = typeof body['model'] === 'string' ? body['model'] : '';
  const wants1M = rawModel.endsWith('[1m]');
  const cleanModel =
    wants1M && !usingRelay ? rawModel.slice(0, -'[1m]'.length) : rawModel;
  const requestOptions =
    wants1M && !usingRelay
      ? { headers: { 'anthropic-beta': 'context-1m-2025-08-07' } }
      : undefined;

  try {
    // Force non-streaming response (we don't support SSE pass-through in M2).
    const params = {
      ...body,
      model: cleanModel || body['model'],
      stream: false,
    } as Anthropic.MessageCreateParamsNonStreaming;
    const response = await client.messages.create(params, requestOptions);

    const usage = response.usage;
    const stats: UsageStats = {
      model: String(body['model'] ?? 'unknown'),
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    };
    console.log('[LLM]', stats);

    // Expose usage to clients so they can monitor cache hit rate
    c.header('X-Token-Usage', JSON.stringify(stats));
    return c.json(response);
  } catch (err) {
    console.error('[LLM] error:', err);
    if (err instanceof Anthropic.APIError) {
      return c.json(
        { error: { type: err.name, message: err.message } },
        (err.status as 400 | 401 | 403 | 404 | 429 | 500) ?? 500
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: { type: 'internal_error', message } }, 500);
  }
});

function normalizeBaseURL(
  baseURL: string | undefined,
  isClientProvided: boolean
): string | undefined {
  if (!baseURL) return undefined;

  try {
    const url = new URL(baseURL);
    if (url.protocol === 'https:') return url.toString().replace(/\/$/, '');
    if (url.protocol === 'http:' && (!isClientProvided || isLocalHost(url.hostname))) {
      return url.toString().replace(/\/$/, '');
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { llmRoutes } from './routes/llm.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => origin,  // allow any localhost dev origin
    allowHeaders: ['Content-Type', 'X-Anthropic-Api-Key', 'X-Anthropic-Base-Url'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['X-Token-Usage'],
  })
);

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'wfk-backend', version: '0.1.0' })
);

app.route('/api/llm', llmRoutes);

const port = Number(process.env['PORT'] ?? 8787);
console.log(`🐺 wfk-backend listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../../config/env';
import { applyShiftActionFromEmailToken } from '../../services/shifts/shift-email-action.service';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resultHtml(title: string, message: string, ok: boolean): string {
  const app = config.webAppUrl.replace(/\/$/, '');
  const msg = escapeHtml(message);
  const accent = ok ? '#0a0a0a' : '#b42318';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #fff;
      color: #111;
      line-height: 1.55;
      padding: 48px 24px;
    }
    .box { max-width: 420px; margin: 0 auto; }
    h1 { font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 12px; color: ${accent}; }
    p { color: #444; font-size: 15px; margin-bottom: 20px; }
    a {
      display: inline-block;
      margin-top: 8px;
      padding: 12px 22px;
      background: #0a0a0a;
      color: #fff !important;
      text-decoration: none;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
    }
    .muted { font-size: 12px; color: #aaa; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${escapeHtml(title)}</h1>
    <p>${msg}</p>
    <a href="${escapeHtml(app)}">Open app</a>
    <p class="muted">You can close this tab.</p>
  </div>
</body>
</html>`;
}

type TokenQuery = { Querystring: { token?: string } };

export default async function shiftEmailPublicRoutes(app: FastifyInstance): Promise<void> {
  app.get('/email/confirm', async (request: FastifyRequest<TokenQuery>, reply: FastifyReply) => {
    const token = typeof request.query.token === 'string' ? request.query.token : '';
    if (!token.trim()) {
      return reply
        .type('text/html; charset=utf-8')
        .code(400)
        .send(resultHtml('Missing link', 'No token was provided.', false));
    }

    const result = await applyShiftActionFromEmailToken(token, 'confirm');
    const title = result.ok ? 'Shift confirmed' : 'Could not confirm';
    const code = result.ok ? 200 : 400;
    return reply.type('text/html; charset=utf-8').code(code).send(resultHtml(title, result.message, result.ok));
  });

  app.get('/email/decline', async (request: FastifyRequest<TokenQuery>, reply: FastifyReply) => {
    const token = typeof request.query.token === 'string' ? request.query.token : '';
    if (!token.trim()) {
      return reply
        .type('text/html; charset=utf-8')
        .code(400)
        .send(resultHtml('Missing link', 'No token was provided.', false));
    }

    const result = await applyShiftActionFromEmailToken(token, 'decline');
    const title = result.ok ? 'Shift declined' : 'Could not decline';
    const code = result.ok ? 200 : 400;
    return reply.type('text/html; charset=utf-8').code(code).send(resultHtml(title, result.message, result.ok));
  });
}

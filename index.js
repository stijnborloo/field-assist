/**
 * Cloudflare Worker — Claude AI Proxy voor AV Install Pro
 * =========================================================
 * Deploy op: https://dash.cloudflare.com → Workers & Pages → Create Worker
 *
 * Vereiste Environment Variable (via Worker Settings → Variables):
 *   ANTHROPIC_API_KEY = sk-ant-...
 *
 * Gebruik in je app:
 *   fetch('https://JOUW-WORKER.workers.dev/v1/messages', { ... })
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

// Toegestane origins — voeg je eigen domein(en) toe
const ALLOWED_ORIGINS = [
  'https://jouwdomein.nl',        // ← vervang met jouw domein
  'https://www.jouwdomein.nl',
  'http://localhost',             // voor lokaal testen
  'http://127.0.0.1',
  'null',                         // file:// (HTML direct geopend)
];

export default {
  async fetch(request, env) {

    // ── CORS preflight ──────────────────────────────────────────
    const origin = request.headers.get('Origin') || '';
    const corsAllowed = ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*');

    const corsHeaders = {
      'Access-Control-Allow-Origin':  corsAllowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age':       '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── Alleen POST toestaan ────────────────────────────────────
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Alleen POST toegestaan' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── API-sleutel ophalen uit env ─────────────────────────────
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY niet ingesteld in Worker' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Body doorsturen naar Anthropic ──────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Ongeldige JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optioneel: model forceren / max_tokens beperken
    body.model     = body.model     || 'claude-sonnet-4-20250514';
    body.max_tokens = body.max_tokens || 1000;

    const upstream = await fetch(ANTHROPIC_API, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
      status:  upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};

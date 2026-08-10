/* Solana RPC proxy · Vercel Edge
 *
 * Why this file exists: api.mainnet-beta.solana.com returns 403 to any
 * request carrying a browser Origin header, and every other free endpoint
 * either restricts the methods this site needs or rate-limits a public
 * page into uselessness. Proxying from the edge removes the Origin, and —
 * more importantly — lets one cached response serve every visitor.
 *
 * It is a proxy, not a backend. It stores nothing, logs nothing, and reads
 * only public chain data. Deleting it does not break the site: the page
 * falls through to a direct endpoint if this route 404s.
 *
 * The method allowlist is the whole security model. Without it this is an
 * open relay that anyone can point at any RPC, on your bandwidth.
 */
export const config = { runtime: 'edge' };

const UPSTREAM = [
  'https://api.mainnet-beta.solana.com',
  'https://solana.leorpc.com/?api_key=FREE',
  'https://solana-rpc.publicnode.com',
];

/* seconds of shared cache per method. A confirmed transaction is immutable,
   so it can be cached until the heat death of the CDN; a signature list is
   only true for a moment. */
const TTL = {
  getTransaction: 86400,
  getMultipleAccounts: 8,
  getAccountInfo: 8,
  getSignaturesForAddress: 10,
  getTokenSupply: 30,
  getTokenAccountsByOwner: 8,
  getLatestBlockhash: 2,
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

const bad = (status, message) =>
  new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message } }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS },
  });

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return bad(405, 'POST only');

  let body;
  try {
    const raw = await req.text();
    if (raw.length > 8192) return bad(413, 'body too large');
    body = JSON.parse(raw);
  } catch {
    return bad(400, 'invalid JSON');
  }

  /* one call per request — batches are how an allowlist gets walked around */
  if (Array.isArray(body)) return bad(400, 'no batches');
  const method = body && body.method;
  if (typeof method !== 'string' || !(method in TTL)) return bad(403, 'method not allowed');

  const payload = JSON.stringify({ jsonrpc: '2.0', id: body.id ?? 1, method, params: body.params ?? [] });
  const ttl = TTL[method];

  let lastErr = 'no upstream answered';
  for (const url of UPSTREAM) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 9000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        signal: ctl.signal,
        /* the edge cache is the point: N visitors, one upstream call */
        cf: { cacheTtl: ttl },
      });
      clearTimeout(timer);
      if (!res.ok) { lastErr = 'upstream ' + res.status; continue; }
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { lastErr = 'upstream sent non-JSON'; continue; }
      /* an upstream error is a real answer for a bad address, but a
         node refusing the method should fall through to the next one */
      if (json.error && /method|not supported|forbidden|unauthorized/i.test(String(json.error.message || ''))) {
        lastErr = String(json.error.message);
        continue;
      }
      return new Response(text, {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 6}`,
          ...CORS,
        },
      });
    } catch (e) {
      lastErr = (e && e.message) || 'fetch failed';
    }
  }
  return bad(502, lastErr);
}

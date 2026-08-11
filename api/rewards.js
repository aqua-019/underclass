/* Reward totals · Vercel Node function
 *
 * stonkfun.xyz runs the distributions, so its own figures are the
 * authoritative ones — how much has gone out, how much is queued, how
 * many holders qualify. Its API sends no access-control-allow-origin
 * header, so a browser cannot read it directly. This proxies it.
 *
 * The site works without this file: the payouts panel falls back to the
 * totals it reconstructs from the chain, which run a few percent light
 * (a holder who has since closed their token account stops looking like
 * one). Having both is the point — one number is the operator's, the
 * other is independently checkable, and the page says which is which.
 *
 * Same shape as api/rpc.js and for the same reason: an `export const
 * config = { runtime: "edge" }` is ignored here and the file is built as
 * a Node function.
 */

const UPSTREAM = 'https://www.stonkfun.xyz/api/rewards?mint=';
const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;   /* base58, no 0 O I l */
const TTL = 30;

function send(res, status, body, cache) {
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, OPTIONS');
  res.setHeader('cache-control', cache || 'no-store');
  res.statusCode = status;
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-headers', 'content-type');
    return send(res, 204, '');
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, { error: 'GET only' });
  }

  /* parse without assuming a framework helper populated req.query */
  const url = new URL(req.url, 'http://x');
  const mint = url.searchParams.get('mint') || '';
  if (!MINT_RE.test(mint)) return send(res, 400, { error: 'bad mint' });

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    let up;
    try {
      up = await fetch(UPSTREAM + encodeURIComponent(mint), {
        headers: { accept: 'application/json' },
        signal: ctl.signal,
      });
    } finally { clearTimeout(timer); }

    if (!up.ok) return send(res, 502, { error: 'upstream ' + up.status });
    const text = await up.text();
    try { JSON.parse(text); } catch { return send(res, 502, { error: 'upstream sent non-JSON' }); }
    return send(res, 200, text, 'public, s-maxage=' + TTL + ', stale-while-revalidate=' + TTL * 10);
  } catch (e) {
    return send(res, 502, { error: (e && e.message) || 'fetch failed' });
  }
}

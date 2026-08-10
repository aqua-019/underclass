# ESCAPE THE PERMANENT UNDERCLASS · $UNDERCLASS

A single-file website for the `$UNDERCLASS` memecoin on Solana.
Mint `8SKrQVfmiNsP6K8Wg9amMAM5uQUayoveiawFfpZbgFgn` — launched on stonk.fun,
deepest book on Raydium CLMM against `$ANTHROPIC` pre-stock.

Everything is in `index.html`: inline CSS, markup, and one vanilla-JS IIFE.
No framework, no build step, no npm, no bundler, no backend, no analytics,
no cookies. Drop it on any static host.

## Deploy

Vercel, Netlify, Cloudflare Pages or GitHub Pages, framework preset "Other".
Upload `index.html` and `signals.json` to the root and you are done. It also
opens correctly straight off the filesystem — the only thing that degrades on
`file://` is the optional `signals.json` fetch, which falls back to the copy
compiled into the page.

Two files worth adding later: `/og.png` (1200×630 social card, referenced in
the meta tags) and a favicon if you want something other than the inline SVG.

## What is live

| Source | What it feeds | Cadence |
|---|---|---|
| `api.dexscreener.com/latest/dex/tokens/{mint}` | price, market cap, liquidity, volume, 5m/1h/6h/24h deltas, trade split, sparkline, pool reserves, the venue list | 30s |
| Public Solana RPC (`publicnode` → `leorpc` → `mainnet-beta`) | circulating supply, mint/freeze authority, decimals, token program, the live trade feed | 12s feed, 60s supply |
| GeckoTerminal / DexScreener iframe | the price chart, loaded only when the Market section is opened | on demand |

Liquidity and volume are summed across all three venues so the turnover figure
divides like against like. RPC calls walk the whole endpoint list before they
are allowed to fail, back off with jitter, and trip a circuit breaker rather
than hammering a dead host. One browser tab owns the polling via a
`BroadcastChannel` lease, so six open tabs make one set of requests, not six.

## Editing the content

**The signal feed** — `signals.json` next to `index.html`. Each entry:

```json
{ "kind": "warning", "who": "Dario Amodei", "role": "CEO, Anthropic",
  "date": "12 Feb 2026", "hue": "#d97757", "init": "DA", "verified": true,
  "quote": "We might be <hl>6 to 12 months away</hl>.",
  "src": "https://x.com/..." }
```

`kind` is `warning` or `counter`; `<hl>…</hl>` highlights a phrase; `hue` must
be a hex colour and `src` an https URL — anything else is rejected, because
this file is fetched at runtime and therefore treated as untrusted input.
Delete the file and the version compiled into `index.html` is used instead.

**Everything else** — the timeline, the citations, the assessment questions and
the verdict bands are the `LORE`, `CITES`, `QUIZ` and `VERDICTS` arrays near the
top of the script block. The countdown is `TARGET`; the progress bar measures
from `ORIGIN`.

## Notes on the build

Carried over from the last project: the accordion (now driven purely by
`aria-expanded` + `:has()`, so visual and assistive state cannot diverge), the
copy-address chip that always copies the constant rather than the rendered
text, the RPC rotation, the toast rail, hairline inset-shadow borders, and the
one-class theme flip. No `backdrop-filter` anywhere and no `ad-` prefixed class
names — both learned the hard way last time.

Built against the D4000 catalogue. The load-bearing calls:

- **GX01 restraint stack** — warm ground, one reserved accent, colour-only
  transitions, zero hover transforms.
- **D2557 / D1130 / D0291** — the countdown is rendered in ink, not red. A
  timer that has been red for five hundred days is not urgent, it is
  wallpaper, and a red clock beside a buy button is the archetypal dark
  pattern. The honesty note sits directly under it.
- **D1144** — every delta carries an arrow as well as a colour, so the page
  survives colour blindness and the inverted red/green convention.
- **D2419** — the escape-velocity calculator outputs a bear/base/bull band.
  A single number for a seventeen-month projection is a lie with a decimal
  place on it.
- **D0971 / D1000** — the safety panel prints the exact RPC call next to each
  claim, and renders "could not verify" rather than a green tick when the
  endpoint does not answer.
- **D2450** — a written degradation ladder: everything live → DexScreener only
  → no network at all (clock, curve, calculator and assessment are pure client
  maths) → no JavaScript, where every panel opens and the whole argument stays
  readable.

## Interactive bits

Countdown and window-elapsed bar · signal feed with four filters interleaving
curated quotes with live on-chain buys · market tiles with sparkline and
accessible data table · contract-safety panel · draggable constant-product
curve with severity bands, slippage presets, a full cost-to-exit breakdown and
a plain-English readout of the same state · live trades table with size bars
and commitment states · the 4D AI-fluency self-assessment · the escape-velocity
calculator. The assessment and calculator encode into the URL hash, so any
result is shareable and reproduces exactly.

Type `2027`, `gm` or `ubi` anywhere on the page.

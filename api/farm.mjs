const YEAR_SECONDS = 31_536_000;
const MIN_LIQUIDITY_USD = 5_000;

const EXPONENT_MARKETS_URL = 'https://api-n408.onrender.com/api/markets';
const JUPITER_PRICE_URL = 'https://lite-api.jup.ag/price/v3';
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL ||
  'https://rpc.ironforge.network/mainnet?apiKey=01JQY5ECD2JGV0MV98J80X9D8H';

const TOKEN_META = {
  '3ThdFZQKM6kRyVGLG48kaPg5TRMhYMKY1iCRa9xop1WC': {
    symbol: 'eUSX',
    protocol: 'Solstice',
    boost: '15x Solstice Flares',
    tone: 'orange',
    stable: true,
  },
  '6FrrzDk5mQARGc1TDYoyVnSyRdds1t4PbtohCD6p3tgG': {
    symbol: 'USX',
    protocol: 'Solstice',
    boost: 'Solstice Flares',
    tone: 'orange',
    stable: true,
  },
  'BULKoNSGzxtCqzwTvg5hFJg8fx6dqZRScyXe5LYMfxrn': {
    symbol: 'BulkSOL',
    protocol: 'BULK Staked SOL',
    boost: 'Bulk [redacted]',
    tone: 'silver',
  },
  '5Y8NV33Vv7WbnLfq3zBcKSdYPrk7g2KoiQoe7M2tcxp5': {
    symbol: 'ONyc',
    protocol: 'OnRe',
    boost: '8x OnRe Points',
    tone: 'gold',
    stable: true,
  },
  'sTorERYB6xAZ1SSbwpK3zoK2EEwbBrc7TZAzg1uCGiH': {
    symbol: 'stORE',
    protocol: 'Ore',
    boost: 'ORE yield',
    tone: 'yellow',
  },
  'usd63SVWcKqLeyNHpmVhZGYAqfE5RHE8jwqjRA2ida2': {
    symbol: 'USDC+',
    protocol: 'Reflect',
    boost: 'Reflect yield',
    tone: 'blue',
    stable: true,
  },
  'FRAGSEthVFL7fdqM8hxfxkfCZzUvmg21cqPJVvC1qdbo': {
    symbol: 'fragSOL',
    protocol: 'Jito Restaking',
    boost: 'Restaking yield',
    tone: 'cyan',
  },
  '4sWNB8zGWHkh6UnmwiEtzNxL4XrN7uK9tosbESbJFfVs': {
    symbol: 'xSOL',
    protocol: 'Hylo Leveraged SOL',
    boost: '25x Hylo XP Points',
    tone: 'violet',
  },
  'hy1oXYgrBW6PVcJ4s6s2FKavRdwgWTXdfE69AxT7kPT': {
    symbol: 'hyloSOL',
    protocol: 'Hylo Staked SOL',
    boost: 'Hylo XP Points',
    tone: 'violet',
  },
  'hy1opf2bqRDwAxoktyWAj6f3UpeHcLydzEdKjMYGs2u': {
    symbol: 'hyloSOL+',
    protocol: 'Hylo SOL Plus',
    boost: 'Hylo XP Points',
    tone: 'amber',
  },
  '5YMkXAYccHSGnHn9nob9xEvv6Pvka9DZWH7nTbotTu9E': {
    symbol: 'hyUSD',
    protocol: 'Hylo USD',
    boost: 'Hylo yield',
    tone: 'green',
    stable: true,
  },
};

const DISPLAY_ORDER = [
  'eUSX-2026-06-01',
  'USX-2026-06-01',
  'BulkSOL-2026-06-20',
  'ONyc-2026-05-13',
  'ONyc-2026-09-10',
  'stORE-2026-05-20',
  'USDC+-2026-06-04',
  'fragSOL-2026-12-15',
  'xSOL-2026-08-12',
  'hyloSOL-2026-08-12',
  'hyloSOL+-2026-08-12',
  'hyUSD-2026-08-12',
];

function pct(value) {
  return Number.isFinite(value) ? value : 0;
}

function dateKey(unixTs) {
  return new Date(unixTs * 1000).toISOString().slice(0, 10);
}

function dateCode(unixTs) {
  const date = new Date(unixTs * 1000);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

function maturityLabel(unixTs) {
  return new Date(unixTs * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function slugFor(symbol, unixTs) {
  const date = new Date(unixTs * 1000);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${symbol.toLowerCase().replace('+', 'plus')}-${day}${month}${year}`;
}

function priceFor(mint, priceMap) {
  const meta = TOKEN_META[mint];
  if (meta?.stable) return 1;
  return Number(priceMap?.[mint]?.usdPrice) || 1;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148 Safari/537.36',
      accept: 'application/json,text/plain,*/*',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

async function rpc(method, params) {
  const payload = await fetchJson(SOLANA_RPC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.exponent.finance',
      referer: 'https://app.exponent.finance/farm',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (payload.error) {
    throw new Error(payload.error.message || 'Solana RPC error');
  }

  return payload.result;
}

function decodeMarketAccount(base64) {
  const data = Buffer.from(base64, 'base64');
  if (data.length < 405) return null;

  return {
    expirationTs: Number(data.readBigUInt64LE(364)),
    ptBalance: Number(data.readBigUInt64LE(372)),
    syBalance: Number(data.readBigUInt64LE(380)),
    lastLnImpliedRate: data.readDoubleLE(396),
  };
}

async function fetchLiveMarkets(marketIds) {
  const result = await rpc('getMultipleAccounts', [marketIds, { encoding: 'base64', commitment: 'confirmed' }]);
  const live = new Map();

  result.value.forEach((account, index) => {
    if (!account?.data?.[0]) return;
    const decoded = decodeMarketAccount(account.data[0]);
    if (decoded) live.set(marketIds[index], decoded);
  });

  return live;
}

async function fetchPrices(mints) {
  const needed = mints.filter((mint) => !TOKEN_META[mint]?.stable);
  if (!needed.length) return {};

  const url = `${JUPITER_PRICE_URL}?ids=${encodeURIComponent(needed.join(','))}`;

  try {
    return await fetchJson(url);
  } catch {
    return {};
  }
}

function buildRow(market, live, priceMap, now) {
  const vault = market.vault || {};
  const stats = market.stats || {};
  const mint = vault.mintAsset;
  const meta = TOKEN_META[mint] || {
    symbol: (vault.platform || 'Asset').replace(/\s+/g, ''),
    protocol: vault.niceName || vault.platform || 'Protocol',
    boost: null,
    tone: 'green',
  };

  const expirationTs = live ? live.expirationTs : stats.maturityDateUnixTs;
  const secondsRemaining = Math.max(0, expirationTs - now);
  const currentPtPriceInAsset =
    live && secondsRemaining > 0
      ? Math.exp((live.lastLnImpliedRate * secondsRemaining) / YEAR_SECONDS)
      : Number(stats.currentPtPriceInAsset || 1);

  const impliedApy =
    secondsRemaining > 0 ? (YEAR_SECONDS / secondsRemaining) * (currentPtPriceInAsset - 1) : 0;
  const ytPrice = Math.max(0, 1 - 1 / currentPtPriceInAsset);
  const effectiveExposure = ytPrice > 0 ? 1 / ytPrice : null;
  const syRate = Number(vault.lastSeenSyExchangeRate || stats.syPriceInAsset || 1);
  const liquidityRaw =
    live && Number.isFinite(live.syBalance) && Number.isFinite(live.ptBalance)
      ? live.syBalance * syRate + live.ptBalance / currentPtPriceInAsset
      : Number(stats.liquidityPoolTvl || 0);
  const decimals = Number(vault.decimals || 6);
  const liquidityUnits = liquidityRaw / 10 ** decimals;
  const assetPriceUsd = priceFor(mint, priceMap);
  const liquidityUsd = liquidityUnits * assetPriceUsd;
  const underlyingApy = Number(stats.underlyingYieldsPct || 0) + Number(stats.annualizedSyEmissionsPct || 0);
  const key = `${meta.symbol}-${dateKey(expirationTs)}`;

  return {
    id: market.id,
    vaultAddress: vault.id,
    key,
    symbol: meta.symbol,
    protocol: meta.protocol,
    boost: meta.boost,
    tone: meta.tone,
    tokenMint: mint,
    iconUrl: `https://app.exponent.finance/images/icons/tokens/${mint}.svg`,
    maturityUnixTs: expirationTs,
    maturityLabel: maturityLabel(expirationTs),
    maturityCode: dateCode(expirationTs),
    tokenCode: `YT-${meta.symbol}-${dateCode(expirationTs)}`,
    impliedApy: pct(impliedApy),
    underlyingApy: pct(underlyingApy),
    effectiveExposure,
    liquidityUsd,
    liquidityUnits,
    assetPriceUsd,
    currentPtPriceInAsset,
    url: `https://app.exponent.finance/farm/${slugFor(meta.symbol, expirationTs)}`,
  };
}

async function buildDashboardData() {
  const now = Math.floor(Date.now() / 1000);
  const marketPayload = await fetchJson(EXPONENT_MARKETS_URL);
  const markets = (marketPayload.data || []).filter((market) => market && market.id && market.vault && market.stats);
  const activeMarkets = markets.filter((market) => market.stats.maturityDateUnixTs > now);

  const [liveMarkets, priceMap] = await Promise.all([
    fetchLiveMarkets(activeMarkets.map((market) => market.id)).catch(() => new Map()),
    fetchPrices([...new Set(activeMarkets.map((market) => market.vault.mintAsset))]),
  ]);

  const rows = activeMarkets
    .map((market) => buildRow(market, liveMarkets.get(market.id), priceMap, now))
    .filter((row) => row.liquidityUsd >= MIN_LIQUIDITY_USD)
    .sort((a, b) => {
      const ai = DISPLAY_ORDER.indexOf(a.key);
      const bi = DISPLAY_ORDER.indexOf(b.key);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return b.liquidityUsd - a.liquidityUsd;
    });

  const cards = [
    rows.find((row) => row.key === 'eUSX-2026-06-01'),
    rows.find((row) => row.key === 'ONyc-2026-09-10'),
    rows.find((row) => row.key === 'BulkSOL-2026-06-20'),
  ].filter(Boolean);

  return {
    generatedAt: new Date().toISOString(),
    refreshMs: 20_000,
    rowCount: rows.length,
    cards,
    rows,
  };
}

export async function GET() {
  try {
    const data = await buildDashboardData();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }
}

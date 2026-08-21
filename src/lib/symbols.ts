export const EQUITY_REGIME = [
  { symbol: "QQQ", name: "Nasdaq-100" },
  { symbol: "SPY", name: "S&P 500" },
  { symbol: "SOXX", name: "Semiconductors" },
  { symbol: "IWM", name: "Russell 2000" },
] as const;

export const CRYPTO_REGIME = [
  { symbol: "BTC", name: "Bitcoin", coingeckoId: "bitcoin", binance: "BTCUSDT" },
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", binance: "ETHUSDT" },
] as const;

/** Martin Luk Master System 4.0 Pro — core momentum universe */
export const FOCUS_UNIVERSE = [
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "AAOI", name: "Applied Optoelectronics" },
  { symbol: "ANET", name: "Arista Networks" },
  { symbol: "MSTR", name: "MicroStrategy" },
  { symbol: "COIN", name: "Coinbase" },
  { symbol: "MU", name: "Micron" },
  { symbol: "STX", name: "Seagate" },
  { symbol: "ICHR", name: "Ichor Holdings" },
  { symbol: "PLTR", name: "Palantir" },
  { symbol: "ARM", name: "Arm Holdings" },
  { symbol: "SMCI", name: "Super Micro" },
  { symbol: "LITE", name: "Lumentum" },
  { symbol: "CRDO", name: "Credo Technology" },
  { symbol: "RIVN", name: "Rivian" },
  { symbol: "HOOD", name: "Robinhood" },
  { symbol: "TSLA", name: "Tesla" },
] as const;

export const CRYPTO_SYMBOLS = new Set(["BTC", "ETH", "BTCUSDT", "ETHUSDT"]);

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9.]/g, "");
}

export function detectAssetClass(symbol: string): "equity" | "crypto" {
  const s = normalizeSymbol(symbol);
  if (CRYPTO_SYMBOLS.has(s) || s.endsWith("USDT")) return "crypto";
  return "equity";
}

export function toYahooSymbol(symbol: string): string {
  const s = normalizeSymbol(symbol);
  if (s === "BTC" || s === "BTCUSDT") return "BTC-USD";
  if (s === "ETH" || s === "ETHUSDT") return "ETH-USD";
  return s;
}

export function toBinanceSymbol(symbol: string): string {
  const s = normalizeSymbol(symbol);
  if (s === "BTC" || s === "BTCUSDT") return "BTCUSDT";
  if (s === "ETH" || s === "ETHUSDT") return "ETHUSDT";
  return s.endsWith("USDT") ? s : `${s}USDT`;
}

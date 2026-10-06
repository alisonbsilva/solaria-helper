import { medianMap } from "./stats";
import type { Offer } from "./types";

type Point = { at: number; price: number };
type History = Record<string, Point[]>;
const KEY = "solaria-helper-price-history";
const MIN_INTERVAL = 2 * 60 * 60 * 1000;
const MAX_POINTS = 360;

function read(): History {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}

export function recordMarketSnapshot(offers: Offer[]) {
  if (typeof window === "undefined" || !offers.length) return;
  const now = Date.now();
  const history = read();
  const medians = medianMap(offers);
  for (const [item, price] of [...medians].slice(0, 160)) {
    const points = history[item] ?? [];
    if (points.at(-1) && now - points.at(-1)!.at < MIN_INTERVAL) continue;
    history[item] = [...points, { at: now, price }].slice(-MAX_POINTS);
  }
  try { window.localStorage.setItem(KEY, JSON.stringify(history)); } catch { /* Storage is optional. */ }
}

export function priceTrend(item?: string | null) {
  if (!item) return [] as Point[];
  return read()[item] ?? [];
}

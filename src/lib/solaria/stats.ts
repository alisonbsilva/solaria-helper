import type { EquipPiece, Kill, Offer, Player } from "./types";
import { unitPrice } from "./format";

export function medianMap(offers: Offer[]) {
  const map = new Map<string, number[]>();
  for (const o of offers) {
    const u = unitPrice(o.gold, o.amount);
    if (u == null || !o.item) continue;
    const arr = map.get(o.item) ?? [];
    arr.push(u);
    map.set(o.item, arr);
  }
  const med = new Map<string, number>();
  for (const [k, arr] of map) {
    arr.sort((a, b) => a - b);
    med.set(k, arr[Math.floor(arr.length / 2)] ?? 0);
  }
  return med;
}

export function isDeal(o: Offer, medians: Map<string, number>) {
  const u = unitPrice(o.gold, o.amount);
  const med = o.item ? medians.get(o.item) : undefined;
  return u != null && med != null && med > 0 && u < med * 0.7;
}

export function bargains(offers: Offer[], medians: Map<string, number>, limit = 8) {
  return offers
    .filter((o) => isDeal(o, medians))
    .sort((a, b) => {
      const ua = unitPrice(a.gold, a.amount) ?? 0;
      const ub = unitPrice(b.gold, b.amount) ?? 0;
      const ma = a.item ? medians.get(a.item) ?? 1 : 1;
      const mb = b.item ? medians.get(b.item) ?? 1 : 1;
      return ua / ma - ub / mb;
    })
    .slice(0, limit);
}

export function cheapestFor(offers: Offer[], itemKey: string) {
  const n = itemKey.toLowerCase();
  const rows = offers.filter((o) => (o.item ?? "").toLowerCase() === n);
  if (!rows.length) return null;
  return [...rows].sort((a, b) => (unitPrice(a.gold, a.amount) ?? 1e18) - (unitPrice(b.gold, b.amount) ?? 1e18))[0];
}

export function pvpLeaders(kills: Kill[], limit = 8) {
  const killsBy = new Map<string, number>();
  const deathsBy = new Map<string, number>();
  for (const k of kills) {
    if (k.killer) killsBy.set(k.killer, (killsBy.get(k.killer) ?? 0) + 1);
    if (k.victim) deathsBy.set(k.victim, (deathsBy.get(k.victim) ?? 0) + 1);
  }
  const top = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, n]) => ({ name, n }));
  return { killers: top(killsBy), deaths: top(deathsBy) };
}

export function classMix(players: Player[]) {
  const map = new Map<string, number>();
  for (const p of players) {
    const c = p.class || "?";
    map.set(c, (map.get(c) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
}

export function rarityMix(offers: Offer[]) {
  const bins = new Array(6).fill(0);
  for (const o of offers) {
    const r = Math.min(5, Math.max(0, o.rarety ?? o.rarity ?? 0));
    bins[r] += 1;
  }
  return bins.map((n, rarity) => ({ rarity, n }));
}

export function equipScore(items: EquipPiece[] | undefined) {
  return (items ?? []).reduce((s, e) => {
    const rar = e.rarety && e.rarety > 0 ? e.rarety : (e.rarity ?? 0);
    return s + (e.level ?? 0) + (e.rank ?? 0) * 10 + rar * 25;
  }, 0);
}

export function playerKd(p: Player) {
  const kills = p.kills ?? [];
  const wins = kills.filter((k) => k.killer?.toLowerCase() === p.name.toLowerCase()).length;
  return { wins, losses: kills.length - wins, total: kills.length };
}

export function joinClass(name: string, board?: Player[]) {
  const n = name.toLowerCase();
  return board?.find((p) => p.name.toLowerCase() === n)?.class;
}

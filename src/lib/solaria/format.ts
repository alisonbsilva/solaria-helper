import type { Lang } from "./types";

export function formatNumber(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR");
}

export function formatGold(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return formatNumber(n);
}

export function timeAgo(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return dateStr;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 0) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function elapsedSince(ts?: number | null, nowSec?: number) {
  if (!ts) return "—";
  const s = Math.floor((nowSec ?? Date.now() / 1000) - ts);
  if (s < 0) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d`;
}

export function formatEta(eta?: number | null, nowSec?: number) {
  if (!eta) return "—";
  const s = eta - Math.floor(nowSec ?? Date.now() / 1000);
  if (s <= 0) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d`;
}

export function rarityName(r?: number | null, lang: Lang = "pt") {
  const tables = {
    pt: ["Comum", "Incomum", "Raro", "Épico", "Lendário", "Mítico"],
    en: ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"],
    es: ["Común", "Poco común", "Raro", "Épico", "Legendario", "Mítico"],
  };
  const names = tables[lang];
  return names[r ?? 0] ?? `R${r}`;
}

export function unitPrice(gold?: number, amount?: number) {
  if (!gold || !amount) return null;
  return gold / amount;
}

export function pctOff(unit?: number | null, median?: number | null) {
  if (unit == null || median == null || median <= 0) return null;
  return ((median - unit) / median) * 100;
}

export function rarityClass(r?: number | null) {
  return (["text-r0", "text-r1", "text-r2", "text-r3", "text-r4", "text-r5"] as const)[r ?? 0] ?? "text-r0";
}

export function gradeTextClass(grade?: number | null, vip?: boolean) {
  if (vip) return "text-grade-3";
  return (["text-grade-0", "text-grade-1", "text-grade-2", "text-grade-3"] as const)[Math.min(3, Math.max(0, grade ?? 0))] ?? "text-grade-0";
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

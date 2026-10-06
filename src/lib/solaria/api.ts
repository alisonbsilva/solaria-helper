import type {
  AchievementMeta,
  BossesPayload,
  CatalogItem,
  Guild,
  GuildDetail,
  Market,
  Player,
  PlayersBoard,
} from "./types";

export const API_BASE = "https://worldofsolariammo.com";

async function getJson<T>(path: string): Promise<T> {
  const key = `solaria-api:${path}`;
  try {
    const res = await fetch(`${API_BASE}/${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    if (typeof window !== "undefined") try { window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch { /* optional cache */ }
    return data;
  } catch (error) {
    if (typeof window !== "undefined") { const cached = window.localStorage.getItem(key); if (cached) try { return JSON.parse(cached).data as T; } catch { /* invalid cache */ } }
    throw error;
  }
}

export function itemImageUrl(icon?: string | null) {
  if (!icon) return null;
  if (icon.startsWith("http")) return icon;
  return `${API_BASE}/${icon.replace(/^\//, "")}`;
}

export const solariaApi = {
  players: (board = "overall") =>
    getJson<PlayersBoard>(`players.php?board=${board}&realm=normal`),
  player: (name: string) =>
    getJson<Player>(`players.php?name=${encodeURIComponent(name)}`),
  pvp: () => getJson<{ count?: number; kills: import("./types").Kill[] }>("players.php?pvp=1"),
  guilds: () => getJson<{ realm?: string; count?: number; guilds: Guild[] }>("guild.php?realm=normal"),
  guildMembers: async (name: string) => {
    const data = await getJson<GuildDetail | { members?: unknown }>(
      `guild.php?members=${encodeURIComponent(name)}`,
    );
    const members = (data as GuildDetail).members ?? [];
    return {
      guild: (data as GuildDetail).guild ?? name,
      count: (data as GuildDetail).count ?? members.length,
      points: (data as GuildDetail).points,
      members: Array.isArray(members) ? members : [],
    } as GuildDetail;
  },
  market: () => getJson<Market>("tienda.php"),
  bosses: () => getJson<BossesPayload>("bosses.php"),
  items: async () => {
    const raw = await getJson<Record<string, Omit<CatalogItem, "id">>>("items.json");
    return Object.entries(raw).map(([id, it]) => ({ id, ...it })) as CatalogItem[];
  },
  achievements: async () => {
    const raw = await getJson<Record<string, AchievementMeta>>("achievements.json");
    return raw;
  },
};

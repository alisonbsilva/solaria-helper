import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "./types";

export type Goal = { id: string; title: string; target: number; current: number; done: boolean };
export type EvolutionPoint = { at: number; level: number; gold: number; power: number; rank?: number };
export type SavedFilter = { id: string; name: string; query: string };
export type TierAlert = { id: string; className: string; level: number; maxGold: number };

type Prefs = {
  lang: Lang;
  compact: boolean;
  contrast: boolean;
  light: boolean;
  favPlayers: string[];
  favItems: string[];
  favGuilds: string[];
  recentPlayers: string[];
  notes: Record<string, string>;
  mainPlayer: string;
  bossAlerts: boolean;
  seenBossKeys: string[];
  seenDealKeys: string[];
  priceAlerts: Record<string, number>;
  favBosses: string[];
  goals: Goal[];
  savedFilters: SavedFilter[];
  evolution: Record<string, EvolutionPoint[]>;
  tierAlerts: TierAlert[];
  toggleFavPlayer: (name: string) => void;
  toggleFavItem: (id: string) => void;
  toggleFavGuild: (name: string) => void;
  isFavPlayer: (name: string) => boolean;
  isFavItem: (id: string) => boolean;
  isFavGuild: (name: string) => boolean;
  touchRecent: (name: string) => void;
  setNote: (name: string, note: string) => void;
  setMainPlayer: (name: string) => void;
  setLang: (lang: Lang) => void;
  setCompact: (v: boolean) => void;
  setContrast: (v: boolean) => void;
  setLight: (v: boolean) => void;
  setBossAlerts: (v: boolean) => void;
  markBosses: (keys: string[]) => string[];
  markDeals: (keys: string[]) => string[];
  setPriceAlert: (itemId: string, maxGold: number | null) => void;
  toggleFavBoss: (name: string) => void;
  addGoal: (title: string, target: number) => void;
  updateGoal: (id: string, current: number) => void;
  removeGoal: (id: string) => void;
  saveFilter: (name: string, query: string) => void;
  removeFilter: (id: string) => void;
  recordEvolution: (name: string, point: Omit<EvolutionPoint, "at">) => void;
  addTierAlert: (className: string, level: number, maxGold: number) => void;
  removeTierAlert: (id: string) => void;
};

export const usePrefs = create<Prefs>()(
  persist(
    (set, get) => ({
      lang: "pt",
      compact: false,
      contrast: false,
      light: false,
      favPlayers: [],
      favItems: [],
      favGuilds: [],
      recentPlayers: [],
      notes: {},
      mainPlayer: "",
      bossAlerts: false,
      seenBossKeys: [],
      seenDealKeys: [],
      priceAlerts: {},
      favBosses: [],
      goals: [],
      savedFilters: [],
      evolution: {},
      tierAlerts: [],
      setLang: (lang) => set({ lang }),
      setCompact: (compact) => set({ compact }),
      setContrast: (contrast) => set({ contrast }),
      setLight: (light) => set({ light }),
      setBossAlerts: (bossAlerts) => set({ bossAlerts }),
      isFavPlayer: (name) =>
        get().favPlayers.some((n) => n.toLowerCase() === name.toLowerCase()),
      isFavItem: (id) => get().favItems.includes(id),
      isFavGuild: (name) =>
        get().favGuilds.some((n) => n.toLowerCase() === name.toLowerCase()),
      toggleFavPlayer: (name) => {
        const list = get().favPlayers;
        const i = list.findIndex((n) => n.toLowerCase() === name.toLowerCase());
        if (i >= 0) set({ favPlayers: list.filter((_, idx) => idx !== i) });
        else set({ favPlayers: [name, ...list].slice(0, 40) });
      },
      toggleFavItem: (id) => {
        const list = get().favItems;
        if (list.includes(id)) set({ favItems: list.filter((x) => x !== id) });
        else set({ favItems: [id, ...list].slice(0, 80) });
      },
      toggleFavGuild: (name) => {
        const list = get().favGuilds;
        const i = list.findIndex((n) => n.toLowerCase() === name.toLowerCase());
        if (i >= 0) set({ favGuilds: list.filter((_, idx) => idx !== i) });
        else set({ favGuilds: [name, ...list].slice(0, 24) });
      },
      touchRecent: (name) => {
        const list = get().recentPlayers.filter((n) => n.toLowerCase() !== name.toLowerCase());
        set({ recentPlayers: [name, ...list].slice(0, 12) });
      },
      setNote: (name, note) => set({ notes: { ...get().notes, [name]: note } }),
      setMainPlayer: (name) => {
        const mainPlayer = name.trim();
        const favs = get().favPlayers;
        const has = favs.some((n) => n.toLowerCase() === mainPlayer.toLowerCase());
        set({
          mainPlayer,
          favPlayers: mainPlayer && !has ? [mainPlayer, ...favs].slice(0, 40) : favs,
        });
      },
      markBosses: (keys) => {
        const prev = new Set(get().seenBossKeys);
        const fresh = keys.filter((k) => !prev.has(k));
        set({ seenBossKeys: keys.slice(0, 80) });
        return fresh;
      },
      markDeals: (keys) => {
        const prev = new Set(get().seenDealKeys);
        const fresh = keys.filter((k) => !prev.has(k));
        set({ seenDealKeys: [...prev, ...fresh].slice(-120) });
        return fresh;
      },
      setPriceAlert: (itemId, maxGold) => set({
        priceAlerts: maxGold != null && maxGold > 0
          ? { ...get().priceAlerts, [itemId]: maxGold }
          : Object.fromEntries(Object.entries(get().priceAlerts).filter(([key]) => key !== itemId)),
      }),
      toggleFavBoss: (name) => set({ favBosses: get().favBosses.includes(name) ? get().favBosses.filter((value) => value !== name) : [name, ...get().favBosses].slice(0, 30) }),
      addGoal: (title, target) => set({ goals: [{ id: crypto.randomUUID(), title, target, current: 0, done: false }, ...get().goals] }),
      updateGoal: (id, current) => set({ goals: get().goals.map((goal) => goal.id === id ? { ...goal, current, done: current >= goal.target } : goal) }),
      removeGoal: (id) => set({ goals: get().goals.filter((goal) => goal.id !== id) }),
      saveFilter: (name, query) => set({ savedFilters: [{ id: crypto.randomUUID(), name, query }, ...get().savedFilters].slice(0, 20) }),
      removeFilter: (id) => set({ savedFilters: get().savedFilters.filter((filter) => filter.id !== id) }),
      recordEvolution: (name, point) => {
        const previous = get().evolution[name] ?? [];
        const latest = previous.at(-1);
        if (latest && latest.level === point.level && latest.gold === point.gold && latest.power === point.power && Date.now() - latest.at < 21_600_000) return;
        set({ evolution: { ...get().evolution, [name]: [...previous, { ...point, at: Date.now() }].slice(-90) } });
      },
      addTierAlert: (className, level, maxGold) => set({ tierAlerts: [{ id: crypto.randomUUID(), className, level, maxGold }, ...get().tierAlerts].slice(0, 20) }),
      removeTierAlert: (id) => set({ tierAlerts: get().tierAlerts.filter((alert) => alert.id !== id) }),
    }),
    { name: "solaria-helper-prefs" },
  ),
);

import { QueryClient } from "@tanstack/react-query";
import { solariaApi } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 45_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const qk = {
  players: (board: string) => ["players", board] as const,
  player: (name: string) => ["player", name] as const,
  pvp: () => ["pvp"] as const,
  guilds: () => ["guilds"] as const,
  guild: (name: string) => ["guild", name] as const,
  market: () => ["market"] as const,
  bosses: () => ["bosses"] as const,
  items: () => ["items"] as const,
  achievements: () => ["achievements"] as const,
};

export const fetchers = {
  players: (board: string) => solariaApi.players(board),
  player: (name: string) => solariaApi.player(name),
  pvp: () => solariaApi.pvp(),
  guilds: () => solariaApi.guilds(),
  guild: (name: string) => solariaApi.guildMembers(name),
  market: () => solariaApi.market(),
  bosses: () => solariaApi.bosses(),
  items: () => solariaApi.items(),
  achievements: () => solariaApi.achievements(),
};

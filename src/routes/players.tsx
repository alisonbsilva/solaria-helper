import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchers, qk } from "@/lib/solaria/query";
import { buildItemIndex } from "@/lib/solaria/equip";
import { formatGold } from "@/lib/solaria/format";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { PlayerProfile } from "@/components/player-profile";
import { ErrorBanner, Skeleton, EmptyState } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { ClassLabel, CLASS_NAMES } from "@/components/class-icon";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Search = { name?: string; board?: string; server?: string; cls?: string; online?: string };

export const Route = createFileRoute("/players")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    name: typeof s.name === "string" ? s.name : undefined,
    board: typeof s.board === "string" ? s.board : undefined,
    server: typeof s.server === "string" ? s.server : undefined,
    cls: typeof s.cls === "string" ? s.cls : undefined,
    online: typeof s.online === "string" ? s.online : undefined,
  }),
  component: PlayersPage,
});

function PlayersPage() {
  const { name, board = "overall", server = "", cls = "", online = "" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const lang = usePrefs((s) => s.lang);
  const isFav = usePrefs((s) => s.isFavPlayer);
  const [q, setQ] = useState(name ?? "");
  const [openSug, setOpenSug] = useState(false);
  const boardQ = useQuery({ queryKey: qk.players(board), queryFn: () => fetchers.players(board) });
  const playerQ = useQuery({
    queryKey: qk.player(name ?? ""),
    queryFn: () => fetchers.player(name!),
    enabled: Boolean(name),
  });
  const itemsQ = useQuery({ queryKey: qk.items(), queryFn: fetchers.items });
  const achQ = useQuery({ queryKey: qk.achievements(), queryFn: fetchers.achievements });
  const index = useMemo(() => (itemsQ.data ? buildItemIndex(itemsQ.data) : null), [itemsQ.data]);

  const list = (boardQ.data?.players ?? []).filter((p) => {
    if (server && p.server !== server) return false;
    if (cls && p.class !== cls) return false;
    if (online === "1" && !p.online) return false;
    return true;
  });
  const servers = [...new Set((boardQ.data?.players ?? []).map((p) => p.server).filter(Boolean))] as string[];
  const suggestions = (boardQ.data?.players ?? [])
    .filter((p) => q.trim() && p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 8);

  const patch = (p: Partial<Search>) => navigate({ search: { name, board, server: server || undefined, cls: cls || undefined, online: online || undefined, ...p } });

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setOpenSug(false);
          patch({ name: q.trim() || undefined });
        }}
      >
        <div className="relative min-w-48 flex-1">
          <input
            className="min-h-11 w-full rounded-md border border-line bg-surface px-3"
            placeholder={t(lang, "searchPlayer")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpenSug(true);
            }}
            onFocus={() => setOpenSug(true)}
            autoComplete="off"
          />
          {openSug && suggestions.length ? (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-surface shadow-xl">
              {suggestions.map((p) => (
                <li key={p.name}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-2"
                    onClick={() => {
                      setQ(p.name);
                      setOpenSug(false);
                      patch({ name: p.name });
                    }}
                  >
                    <span className="font-semibold">{p.name}</span>
                    <ClassLabel name={p.class} level={p.level} className="text-mist" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button variant="primary" type="submit">
          {t(lang, "search")}
        </Button>
        <select className="min-h-11 rounded-md border border-line bg-surface px-3" value={board} onChange={(e) => patch({ board: e.target.value })}>
          <option value="overall">{t(lang, "byLevel")}</option>
          <option value="gold">{t(lang, "byGold")}</option>
        </select>
        <select className="min-h-11 rounded-md border border-line bg-surface px-3" value={server} onChange={(e) => patch({ server: e.target.value || undefined })}>
          <option value="">{t(lang, "allServers")}</option>
          {servers.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="min-h-11 rounded-md border border-line bg-surface px-3" value={cls} onChange={(e) => patch({ cls: e.target.value || undefined })}>
          <option value="">{t(lang, "allClasses")}</option>
          {CLASS_NAMES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm">
          <input type="checkbox" checked={online === "1"} onChange={(e) => patch({ online: e.target.checked ? "1" : undefined })} />
          {t(lang, "onlineOnly")}
        </label>
      </form>

      {name && playerQ.isLoading ? <Skeleton className="h-64" /> : null}
      {name && playerQ.isError ? <ErrorBanner onRetry={() => playerQ.refetch()} /> : null}
      {playerQ.data?.name ? <PlayerProfile player={playerQ.data} index={index} achievements={achQ.data} /> : null}

      {boardQ.isLoading ? <Skeleton className="h-48" /> : null}
      {boardQ.isError ? <ErrorBanner onRetry={() => boardQ.refetch()} /> : null}
      {!boardQ.isLoading && !list.length ? <EmptyState>{t(lang, "emptySearch")}</EmptyState> : null}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="sticky-head bg-ink-2 text-left text-xs uppercase text-mist">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">{t(lang, "players")}</th>
              <th className="px-3 py-2">{t(lang, "classFilter")}</th>
              <th className="px-3 py-2">{t(lang, "sortLevel")}</th>
              <th className="px-3 py-2">{t(lang, "gold")}</th>
              <th className="px-3 py-2">{t(lang, "guild")}</th>
              <th className="px-3 py-2">{t(lang, "server")}</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 100).map((p, i) => (
              <tr key={p.name} className={cn("border-t border-line", isFav(p.name) && "bg-gold/5")}>
                <td className="px-3 py-2 tabular-nums text-mist">{i + 1}</td>
                <td className="px-3 py-2">
                  <Link to="/players" search={{ name: p.name, board, server: server || undefined }} className="font-semibold hover:text-teal">
                    {p.name}
                  </Link>
                  {p.online ? <span className="ml-2 inline-block size-1.5 rounded-full bg-ok" title={t(lang, "online")} /> : null}
                  {isFav(p.name) ? <Star className="ml-1 inline size-3 fill-gold text-gold" /> : null}
                </td>
                <td className="px-3 py-2">
                  <ClassLabel name={p.class} />
                </td>
                <td className="px-3 py-2 tabular-nums">{p.level}</td>
                <td className="px-3 py-2 tabular-nums text-gold">{formatGold(p.gold)}</td>
                <td className="px-3 py-2">
                  {p.guild ? (
                    <Link to="/guilds" search={{ name: p.guild }} className="hover:text-teal">
                      {p.guild}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-mist">{p.server ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

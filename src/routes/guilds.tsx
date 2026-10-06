import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bell, Share2, Star, Users } from "lucide-react";
import { fetchers, qk } from "@/lib/solaria/query";
import { copyText, formatNumber, timeAgo } from "@/lib/solaria/format";
import { classMix, joinClass } from "@/lib/solaria/stats";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { ErrorBanner, Skeleton, EmptyState } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { ClassLabel } from "@/components/class-icon";
import { ClassMixBars } from "@/components/charts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/solaria/types";

type Search = { name?: string };

export const Route = createFileRoute("/guilds")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    name: typeof s.name === "string" ? s.name : undefined,
  }),
  component: GuildsPage,
});

function GuildsPage() {
  const { name } = Route.useSearch();
  const navigate = Route.useNavigate();
  const lang = usePrefs((s) => s.lang);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"points" | "members" | "name">("points");
  const toggleFav = usePrefs((s) => s.toggleFavGuild);
  const isFav = usePrefs((s) => s.isFavGuild);
  const listQ = useQuery({ queryKey: qk.guilds(), queryFn: fetchers.guilds });
  const detQ = useQuery({
    queryKey: qk.guild(name ?? ""),
    queryFn: () => fetchers.guild(name!),
    enabled: Boolean(name),
  });
  const boardQ = useQuery({ queryKey: qk.players("overall"), queryFn: () => fetchers.players("overall") });
  const meta = listQ.data?.guilds.find((g) => g.name === name);
  const members = detQ.data?.members ?? [];
  const online = members.filter((m) => m.online).length;
  const board = boardQ.data?.players;

  const filtered = useMemo(() => {
    let rows = listQ.data?.guilds ?? [];
    const n = q.trim().toLowerCase();
    if (n) rows = rows.filter((g) => g.name.toLowerCase().includes(n));
    if (sort === "points") rows = [...rows].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    if (sort === "members") rows = [...rows].sort((a, b) => (b.members ?? 0) - (a.members ?? 0));
    if (sort === "name") rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [listQ.data, q, sort]);

  const mix = useMemo(() => {
    const asPlayers: Player[] = members.map((m) => ({
      name: m.name,
      class: joinClass(m.name, board) ?? m.class,
    }));
    return classMix(asPlayers.filter((p) => p.class));
  }, [members, board]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="min-h-11 min-w-40 flex-1 rounded-md border border-line bg-surface px-3"
          placeholder={t(lang, "guildSearch")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="min-h-11 rounded-md border border-line bg-surface px-3" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="points">{t(lang, "sortPoints")}</option>
          <option value="members">{t(lang, "sortMembers")}</option>
          <option value="name">{t(lang, "sortName")}</option>
        </select>
      </div>
      {listQ.isError ? <ErrorBanner onRetry={() => listQ.refetch()} /> : null}
      {listQ.isLoading ? <Skeleton className="h-40" /> : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="sticky-head bg-ink-2 text-left text-xs uppercase text-mist">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">{t(lang, "guilds")}</th>
                <th className="px-3 py-2">{t(lang, "points")}</th>
                <th className="px-3 py-2">{t(lang, "members")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => (
                <tr key={g.name} className={cn("border-t border-line", name === g.name && "bg-teal/5")}>
                  <td className="px-3 py-2 tabular-nums text-mist">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold">
                    {g.name}
                    {isFav(g.name) ? <Star className="ml-1 inline size-3 fill-gold text-gold" /> : null}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatNumber(g.points)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatNumber(g.members)}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" onClick={() => navigate({ search: { name: g.name } })}>
                      {t(lang, "open")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {name ? (
        <section className="rounded-lg border border-line bg-surface">
          <div className="border-b border-line bg-ink-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold">{name}</h2>
              <Button size="icon" onClick={() => toggleFav(name)} aria-label="favorite">
                <Star className={cn("size-5", isFav(name) && "fill-gold text-gold")} />
              </Button>
              <Button
                size="icon"
                onClick={async () => {
                  const url = `${window.location.origin}/guilds?name=${encodeURIComponent(name)}`;
                  const ok = await copyText(url);
                  toast.success(ok ? t(lang, "copied") : url);
                }}
                aria-label={t(lang, "shareGuild")}
              >
                <Share2 className="size-4" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <span className="rounded-md border border-line bg-ink px-3 py-1">
                {t(lang, "points")}: {formatNumber(meta?.points)}
              </span>
              <span className="rounded-md border border-line bg-ink px-3 py-1">
                {t(lang, "members")}: {formatNumber(detQ.data?.count ?? members.length)}
              </span>
              <span className="rounded-md border border-line bg-ink px-3 py-1 text-ok">
                {t(lang, "online")}: {online}
              </span>
            </div>
          </div>
          {detQ.isLoading ? <Skeleton className="m-4 h-40" /> : null}
          {detQ.isError ? <ErrorBanner onRetry={() => detQ.refetch()} /> : null}
          {mix.length ? (
            <div className="border-b border-line p-3">
              <h3 className="mb-1 px-1 text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "classMix")}</h3>
              <ClassMixBars data={mix} />
            </div>
          ) : null}
          {members.length ? <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-3"><div className="rounded-md border border-line bg-ink p-3"><Users className="mb-2 size-4 text-teal"/><div className="text-xs text-mist">Presença da guilda</div><strong className="text-xl tabular-nums">{Math.round((online/members.length)*100)}%</strong></div><div className="rounded-md border border-line bg-ink p-3"><div className="text-xs text-mist">Level médio</div><strong className="text-xl tabular-nums">{Math.round(members.reduce((sum,m)=>sum+(m.level??0),0)/members.length)}</strong></div><Link to="/bosses" className="flex min-h-20 items-center justify-center gap-2 rounded-md border border-teal/40 bg-teal/5 p-3 font-semibold text-teal"><Bell className="size-4"/>Abrir alertas de boss</Link></div> : null}
          {!detQ.isLoading && !members.length ? <EmptyState>{t(lang, "emptyGuild")}</EmptyState> : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-mist">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">{t(lang, "players")}</th>
                  <th className="px-3 py-2">{t(lang, "sortLevel")}</th>
                  <th className="px-3 py-2">{t(lang, "memberClass")}</th>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">{t(lang, "online")}</th>
                  <th className="px-3 py-2">{t(lang, "lastSeen")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const cls = joinClass(m.name, board) ?? m.class;
                  return (
                    <tr key={m.name} className="border-t border-line">
                      <td className="px-3 py-2 tabular-nums text-mist">{i + 1}</td>
                      <td className="px-3 py-2">
                        <Link to="/players" search={{ name: m.name }} className="font-semibold hover:text-teal">
                          {m.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{m.level ?? "—"}</td>
                      <td className="px-3 py-2">
                        <ClassLabel name={cls} />
                      </td>
                      <td className="px-3 py-2">{m.rank ?? "—"}</td>
                      <td className="px-3 py-2">{m.online ? <span className="text-ok">{t(lang, "online")}</span> : t(lang, "offline")}</td>
                      <td className="px-3 py-2 text-mist">{m.lastSeen ? timeAgo(m.lastSeen) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyState>{t(lang, "emptyGuild")}</EmptyState>
      )}
    </div>
  );
}

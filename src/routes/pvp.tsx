import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchers, qk } from "@/lib/solaria/query";
import { timeAgo } from "@/lib/solaria/format";
import { pvpLeaders } from "@/lib/solaria/stats";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { ErrorBanner, Skeleton, EmptyState } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type Search = { server?: string; favs?: string };

export const Route = createFileRoute("/pvp")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    server: typeof s.server === "string" ? s.server : undefined,
    favs: typeof s.favs === "string" ? s.favs : undefined,
  }),
  component: PvpPage,
});

function PvpPage() {
  const { server, favs } = Route.useSearch();
  const navigate = Route.useNavigate();
  const lang = usePrefs((s) => s.lang);
  const isFav = usePrefs((s) => s.isFavPlayer);
  const q = useQuery({ queryKey: qk.pvp(), queryFn: fetchers.pvp, refetchInterval: 25_000 });
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const first = useRef(true);
  const kills = (q.data?.kills ?? []).filter((k) => {
    if (server && k.server !== server) return false;
    if (favs === "1") {
      return isFav(k.killer ?? "") || isFav(k.victim ?? "");
    }
    return true;
  });
  const servers = [...new Set((q.data?.kills ?? []).map((k) => k.server).filter(Boolean))] as string[];
  const leaders = useMemo(() => pvpLeaders(kills, 8), [kills]);

  useEffect(() => {
    if (!q.data?.kills) return;
    const keys = q.data.kills.map((k) => `${k.killer}-${k.victim}-${k.time}`);
    if (first.current) {
      setSeen(new Set(keys));
      first.current = false;
    }
  }, [q.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className="min-h-11 rounded-md border border-line bg-surface px-3"
          value={server ?? ""}
          onChange={(e) => navigate({ search: { server: e.target.value || undefined, favs } })}
        >
          <option value="">{t(lang, "allServers")}</option>
          {servers.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Button
          size="sm"
          variant={favs === "1" ? "primary" : "ghost"}
          onClick={() => navigate({ search: { server, favs: favs === "1" ? undefined : "1" } })}
        >
          <Star className="size-3.5" />
          {t(lang, "onlyFavs")}
        </Button>
      </div>
      {q.isLoading ? <Skeleton className="h-40" /> : null}
      {q.isError ? <ErrorBanner onRetry={() => q.refetch()} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Board title={t(lang, "topKillers")} rows={leaders.killers} />
        <Board title={t(lang, "deaths")} rows={leaders.deaths} />
      </div>

      {!q.isLoading && !kills.length ? <EmptyState>{t(lang, "emptyPvp")}</EmptyState> : null}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="sticky-head bg-ink-2 text-left text-xs uppercase text-mist">
            <tr>
              <th className="px-3 py-2">Killer</th>
              <th className="px-3 py-2">Victim</th>
              <th className="px-3 py-2">{t(lang, "server")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {kills.map((k, i) => {
              const key = `${k.killer}-${k.victim}-${k.time}`;
              const isNew = !first.current && !seen.has(key);
              const hot = isFav(k.killer ?? "") || isFav(k.victim ?? "");
              return (
                <tr key={i} className={cn("border-t border-line", hot && "bg-gold/5")}>
                  <td className="px-3 py-2">
                    <Link to="/players" search={{ name: k.killer }} className="font-semibold text-ok">
                      {k.killer}
                    </Link>
                    {isFav(k.killer ?? "") ? <Star className="ml-1 inline size-3 fill-gold text-gold" /> : null}
                  </td>
                  <td className="px-3 py-2">
                    <Link to="/players" search={{ name: k.victim }} className="font-semibold text-danger">
                      {k.victim}
                    </Link>
                    {isFav(k.victim ?? "") ? <Star className="ml-1 inline size-3 fill-gold text-gold" /> : null}
                  </td>
                  <td className="px-3 py-2 text-mist">{k.server}</td>
                  <td className="px-3 py-2 tabular-nums text-mist">
                    {timeAgo(k.time)} {isNew ? <span className="ml-1 text-xs uppercase text-teal">{t(lang, "newKill")}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Board({ title, rows }: { title: string; rows: { name: string; n: number }[] }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-mist">{title}</h3>
      <ol className="space-y-1">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-center justify-between text-sm">
            <span>
              <span className="mr-2 tabular-nums text-mist">{i + 1}</span>
              <Link to="/players" search={{ name: r.name }} className="font-semibold hover:text-teal">
                {r.name}
              </Link>
            </span>
            <span className="tabular-nums text-teal">{r.n}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

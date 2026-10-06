import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchers, qk } from "@/lib/solaria/query";
import { formatGold, formatNumber, timeAgo, formatEta, pctOff, unitPrice } from "@/lib/solaria/format";
import { bargains, classMix, medianMap } from "@/lib/solaria/stats";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { ErrorBanner, Skeleton, EmptyState } from "@/components/error-banner";
import { ClassLabel } from "@/components/class-icon";
import { ClassMixBars, GoldBars } from "@/components/charts";
import { ItemHotspot } from "@/components/item-modal";
import { ItemImg } from "@/components/item-img";
import { buildItemIndex, findItem } from "@/lib/solaria/equip";
import { instanceFromOffer } from "@/lib/solaria/tooltip";
import { Star } from "lucide-react";
import { DataFreshness } from "@/components/data-freshness";
import { itemLabel } from "@/lib/solaria/item-display";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const lang = usePrefs((s) => s.lang);
  const favs = usePrefs((s) => s.favPlayers);
  const recent = usePrefs((s) => s.recentPlayers);
  const favGuilds = usePrefs((s) => s.favGuilds);
  const favItems = usePrefs((s) => s.favItems);
  const players = useQuery({ queryKey: qk.players("overall"), queryFn: () => fetchers.players("overall"), refetchInterval: 45_000 });
  const goldBoard = useQuery({ queryKey: qk.players("gold"), queryFn: () => fetchers.players("gold") });
  const market = useQuery({ queryKey: qk.market(), queryFn: fetchers.market, refetchInterval: 45_000 });
  const bosses = useQuery({ queryKey: qk.bosses(), queryFn: fetchers.bosses, refetchInterval: 30_000 });
  const guilds = useQuery({ queryKey: qk.guilds(), queryFn: fetchers.guilds });
  const pvp = useQuery({ queryKey: qk.pvp(), queryFn: fetchers.pvp, refetchInterval: 25_000 });
  const items = useQuery({ queryKey: qk.items(), queryFn: fetchers.items });
  const index = useMemo(() => (items.data ? buildItemIndex(items.data) : null), [items.data]);

  const online = players.data?.players.filter((p) => p.online).length ?? 0;
  const bossCount = bosses.data?.servers.reduce((a, s) => a + (s.count || 0), 0) ?? 0;
  const mix = classMix(players.data?.players ?? []);
  const med = useMemo(() => medianMap(market.data?.offers ?? []), [market.data]);
  const deals = bargains(market.data?.offers ?? [], med, 6);
  const nextUpcoming = (bosses.data?.servers ?? [])
    .flatMap((s) => (s.upcoming ?? []).map((u) => ({ ...u, server: s.server })))
    .filter((u) => u.eta)
    .sort((a, b) => (a.eta ?? 0) - (b.eta ?? 0))[0];

  const watchHits = useMemo(() => {
    if (!favItems.length || !items.data) return [];
    const names = new Set(
      items.data.filter((i) => favItems.includes(i.id)).flatMap((i) => [i.id.toLowerCase(), (i.itemName ?? "").toLowerCase()]),
    );
    return (market.data?.offers ?? []).filter((o) => names.has((o.item ?? "").toLowerCase())).slice(0, 6);
  }, [favItems, items.data, market.data]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-semibold">{t(lang, "heroTitle")}</h2>
        <p className="mt-1 max-w-xl text-mist">{t(lang, "heroDesc")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`${t(lang, "online")} (top 100)`} value={`${online}+`} loading={players.isLoading} />
        <Stat label={t(lang, "offers")} value={formatNumber(market.data?.count)} loading={market.isLoading} />
        <Stat label={t(lang, "activeBosses")} value={String(bossCount)} loading={bosses.isLoading} />
        <Stat label={t(lang, "guildCount")} value={formatNumber(guilds.data?.count)} loading={guilds.isLoading} />
      </div>
      <DataFreshness updated={market.data?.updated} isFetching={market.isFetching} onRefresh={() => { market.refetch(); bosses.refetch(); players.refetch(); }} />

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2">
        <div><h3 className="mb-2 text-sm font-bold">{t(lang, "favorites")}</h3>{favs.length ? <div className="flex flex-wrap gap-2">{favs.slice(0, 6).map((n) => <Link key={n} to="/players" search={{ name: n }} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-ink px-3 text-sm font-semibold hover:border-gold"><Star className="size-3.5 fill-gold text-gold" /> {n}</Link>)}</div> : <p className="text-sm text-mist">{t(lang, "emptyFav")}</p>}{favGuilds.length ? <div className="mt-2 flex flex-wrap gap-2">{favGuilds.slice(0, 4).map((n) => <Link key={n} to="/guilds" search={{ name: n }} className="min-h-10 rounded-full border border-line bg-ink px-3 py-2 text-sm hover:border-teal">{n}</Link>)}</div> : null}</div>
        <div><h3 className="mb-2 text-sm font-bold">{t(lang, "recent")}</h3>{recent.length ? <div className="flex flex-wrap gap-2">{recent.slice(0, 6).map((n) => <Link key={n} to="/players" search={{ name: n }} className="min-h-10 rounded-full border border-line px-3 py-2 text-sm hover:border-teal">{n}</Link>)}</div> : <p className="text-sm text-mist">{t(lang, "emptyRecent")}</p>}</div>
      </section>

      {players.isError || market.isError ? (
        <ErrorBanner
          onRetry={() => {
            players.refetch();
            market.refetch();
          }}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t(lang, "bargains")} to="/market" hint={t(lang, "bargainsHint")}>
          {market.isLoading ? (
            <Skeleton className="m-4 h-40" />
          ) : deals.length ? (
            <ul className="divide-y divide-line">
              {deals.map((o, i) => {
                const rec = findItem(index, o.item);
                const u = unitPrice(o.gold, o.amount);
                const off = pctOff(u, o.item ? med.get(o.item) : null);
                return (
                  <li key={i} className="flex items-center gap-3 px-4 py-2">
                    <ItemHotspot itemId={rec?.id ?? o.item} instance={instanceFromOffer(o)}>
                      <ItemImg icon={rec?.icon} name={o.item} size={32} />
                    </ItemHotspot>
                    <div className="min-w-0 flex-1">
                      <ItemHotspot itemId={rec?.id ?? o.item} instance={instanceFromOffer(o)} className="truncate font-semibold">
                        {itemLabel(o.item, rec)}
                      </ItemHotspot>
                      <div className="text-xs text-mist">
                        {o.player} · {o.server}
                        {off != null ? <span className="ml-2 font-bold text-ok">{Math.round(off)}% {t(lang, "cheaper")}</span> : null}
                      </div>
                    </div>
                    <span className="tabular-nums text-gold">{formatGold(o.gold)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState>{t(lang, "emptyDeals")}</EmptyState>
          )}
        </Panel>

        <Panel title={t(lang, "upcoming")} to="/bosses">
          {bosses.isLoading ? (
            <Skeleton className="m-4 h-40" />
          ) : (
            <div className="p-4">
              {nextUpcoming ? (
                <p className="mb-3 text-sm">
                  {t(lang, "nextBoss")}: <span className="font-semibold">{nextUpcoming.name}</span> · {nextUpcoming.server} · {t(lang, "eta")}{" "}
                  <span className="tabular-nums text-teal">{formatEta(nextUpcoming.eta, bosses.data?.now)}</span>
                </p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {(bosses.data?.servers ?? []).slice(0, 4).map((s) => (
                  <div key={s.server} className="rounded-md border border-line bg-ink p-3">
                    <div className="text-xs uppercase text-mist">{s.server}</div>
                    <div className="font-display text-xl tabular-nums text-teal">{s.count ?? 0}</div>
                    <div className="text-xs text-mist">{t(lang, "activeNow")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {watchHits.length ? (
        <Panel title={t(lang, "watchlist")} to="/items">
          <ul className="divide-y divide-line">
            {watchHits.map((o, i) => (
              <li key={i} className="flex justify-between gap-2 px-4 py-2 text-sm">
                <span>{o.item}</span>
                <span className="tabular-nums text-gold">{formatGold(o.gold)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t(lang, "classMix")}>
          {players.isLoading ? <Skeleton className="m-4 h-40" /> : <div className="p-2"><ClassMixBars data={mix} /></div>}
        </Panel>
        <Panel title={t(lang, "goldLeaders")} to="/players">
          {goldBoard.isLoading ? <Skeleton className="m-4 h-40" /> : <div className="p-2"><GoldBars players={goldBoard.data?.players ?? []} /></div>}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t(lang, "recentPvp")} to="/pvp">
          {pvp.isLoading ? (
            <Skeleton className="m-4 h-40" />
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {(pvp.data?.kills ?? []).slice(0, 8).map((k, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2">
                      <Link to="/players" search={{ name: k.killer }} className="font-semibold text-ok">
                        {k.killer}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link to="/players" search={{ name: k.victim }} className="font-semibold text-danger">
                        {k.victim}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-mist">{k.server}</td>
                    <td className="px-3 py-2 tabular-nums text-mist">{timeAgo(k.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title={t(lang, "players")} to="/players">
          {players.isLoading ? (
            <Skeleton className="m-4 h-40" />
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {(players.data?.players ?? []).slice(0, 10).map((p, i) => (
                  <tr key={p.name} className="border-t border-line">
                    <td className="px-3 py-2 tabular-nums text-mist">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link to="/players" search={{ name: p.name }} className="font-semibold hover:text-teal">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <ClassLabel name={p.class} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">{p.level}</td>
                    <td className="px-3 py-2 tabular-nums text-gold">{formatGold(p.gold)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      {loading ? <Skeleton className="h-8 w-12" /> : <div className="font-display text-2xl font-semibold tabular-nums text-teal">{value}</div>}
      <div className="text-xs text-mist">{label}</div>
    </div>
  );
}

function Panel({
  title,
  to,
  hint,
  children,
}: {
  title: string;
  to?: "/" | "/players" | "/market" | "/bosses" | "/pvp" | "/items" | "/guilds" | "/compare";
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          {hint ? <p className="text-xs text-mist">{hint}</p> : null}
        </div>
        {to ? (
          <Link to={to} className="text-sm text-teal">
            →
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Bookmark, CircleDollarSign, Download, PackageSearch, Search, ShieldCheck, SlidersHorizontal, Sparkles, Tags, TrendingDown, X } from "lucide-react";
import { fetchers, qk } from "@/lib/solaria/query";
import { buildItemIndex, findItem } from "@/lib/solaria/equip";
import { formatGold, formatNumber, pctOff, rarityName, unitPrice } from "@/lib/solaria/format";
import { isDeal, medianMap, rarityMix } from "@/lib/solaria/stats";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { ErrorBanner, Skeleton, EmptyState } from "@/components/error-banner";
import { ItemHotspot } from "@/components/item-modal";
import { ItemImg } from "@/components/item-img";
import { instanceFromOffer } from "@/lib/solaria/tooltip";
import { RarityBars } from "@/components/charts";
import { PriceHistoryChart } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataFreshness } from "@/components/data-freshness";
import { itemLabel } from "@/lib/solaria/item-display";
import { priceTrend, recordMarketSnapshot } from "@/lib/solaria/price-history";
import { adviseOffer, bestRecommendedOffer, smartOfferSearch } from "@/lib/solaria/market-intelligence";

type Search = { q?: string; server?: string; rarity?: string; cat?: string; sort?: string; deals?: string; minLevel?: string; minRank?: string; maxGold?: string; watch?: string; fit?: string; cls?: string };

export const Route = createFileRoute("/market")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    server: typeof s.server === "string" ? s.server : undefined,
    rarity: typeof s.rarity === "string" ? s.rarity : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
    deals: typeof s.deals === "string" ? s.deals : undefined,
    minLevel: typeof s.minLevel === "string" ? s.minLevel : undefined,
    minRank: typeof s.minRank === "string" ? s.minRank : undefined,
    maxGold: typeof s.maxGold === "string" ? s.maxGold : undefined,
    watch: typeof s.watch === "string" ? s.watch : undefined,
    fit: typeof s.fit === "string" ? s.fit : undefined,
    cls: typeof s.cls === "string" ? s.cls : undefined,
  }),
  component: MarketPage,
});

function MarketPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const lang = usePrefs((s) => s.lang);
  const favItems = usePrefs((s) => s.favItems);
  const priceAlerts = usePrefs((s) => s.priceAlerts);
  const saveFilter = usePrefs((s) => s.saveFilter);
  const mainPlayer = usePrefs((s) => s.mainPlayer);
  const [q, setQ] = useState(search.q ?? "");
  const [limit, setLimit] = useState(80);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [historyItem, setHistoryItem] = useState<string | null>(null);
  const [historyPeriod, setHistoryPeriod] = useState<"24h" | "7d" | "30d">("7d");
  const marketQ = useQuery({ queryKey: qk.market(), queryFn: fetchers.market, refetchInterval: 45_000 });
  const itemsQ = useQuery({ queryKey: qk.items(), queryFn: fetchers.items });
  const playerQ = useQuery({ queryKey: qk.player(mainPlayer), queryFn: () => fetchers.player(mainPlayer), enabled: Boolean(mainPlayer) });
  const index = useMemo(() => (itemsQ.data ? buildItemIndex(itemsQ.data) : null), [itemsQ.data]);
  const offers = useMemo(() => marketQ.data?.offers ?? [], [marketQ.data?.offers]);
  const servers = [...new Set(offers.map((o) => o.server).filter(Boolean))] as string[];
  const cats = [...new Set((itemsQ.data ?? []).map((i) => i.eq?.cat).filter(Boolean))] as string[];
  const medians = useMemo(() => medianMap(offers), [offers]);
  const mix = useMemo(() => rarityMix(offers), [offers]);
  const playerClass = search.cls || playerQ.data?.class || playerQ.data?.classes?.[0]?.name || "";
  const playerLevel = playerQ.data?.level ?? 0;

  const adviceFor = (offer: (typeof offers)[number]) => {
    const rec = findItem(index, offer.item);
    return adviseOffer({ offer, rec, playerClass, playerLevel, equipment: playerQ.data?.equipment, index, median: offer.item ? medians.get(offer.item) : undefined });
  };

  let list = offers.filter((o) => {
    const rec = findItem(index, o.item);
    if (search.q) {
      const n = search.q.toLowerCase();
      if (!smartOfferSearch(o, rec, n)) return false;
    }
    if (search.server && o.server !== search.server) return false;
    if (search.rarity != null && search.rarity !== "") {
      const r = o.rarety ?? rec?.rarity ?? 0;
      if (String(r) !== search.rarity) return false;
    }
    if (search.cat && rec?.eq?.cat !== search.cat) return false;
    if (search.deals === "1" && !isDeal(o, medians)) return false;
    if (search.watch === "1" && (!rec || !favItems.includes(rec.id))) return false;
    if (search.minLevel && (o.level ?? 0) < Number(search.minLevel)) return false;
    if (search.minRank && (o.rank ?? 0) < Number(search.minRank)) return false;
    if (search.maxGold && (unitPrice(o.gold, o.amount) ?? Infinity) > Number(search.maxGold)) return false;
    if (search.fit === "1") {
      const advice = adviceFor(o);
      if (!advice.compatible || !advice.levelOk || !advice.upgrade) return false;
    }
    return true;
  });
  const sort = search.sort ?? "default";
  if (sort === "gold-asc") list = [...list].sort((a, b) => (a.gold ?? 0) - (b.gold ?? 0));
  if (sort === "gold-desc") list = [...list].sort((a, b) => (b.gold ?? 0) - (a.gold ?? 0));
  if (sort === "qty") list = [...list].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  if (sort === "unit")
    list = [...list].sort((a, b) => (unitPrice(a.gold, a.amount) ?? 1e18) - (unitPrice(b.gold, b.amount) ?? 1e18));
  if (sort === "recommended" || (sort === "default" && playerClass)) list = [...list].sort((a, b) => adviceFor(b).score - adviceFor(a).score);

  const patch = (p: Partial<Search>) => navigate({ search: { ...search, ...p } });
  const dealCount = offers.filter((o) => isDeal(o, medians)).length;

  useEffect(() => setQ(search.q ?? ""), [search.q]);
  useEffect(() => setLimit(80), [search.q, search.server, search.rarity, search.cat, search.sort, search.deals, search.minLevel, search.minRank, search.maxGold, search.watch, search.fit, search.cls]);
  useEffect(() => { recordMarketSnapshot(offers); }, [offers]);

  const history = priceTrend(historyItem);
  const periodMs = historyPeriod === "24h" ? 86_400_000 : historyPeriod === "7d" ? 604_800_000 : 2_592_000_000;
  const periodHistory = history.filter((point) => point.at >= Date.now() - periodMs);
  const best = bestRecommendedOffer(offers, index, playerClass, playerLevel, playerQ.data?.equipment, medians);
  const exportMarket = () => { const rows=[["item","quantidade","gold","unitario","vendedor","servidor"],...list.map((offer)=>[offer.item,offer.amount??0,offer.gold??0,unitPrice(offer.gold,offer.amount)??0,offer.player??"",offer.server??""])]; const blob=new Blob([rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="mercado-solaria.csv";anchor.click();URL.revokeObjectURL(url);};

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MarketMetric icon={PackageSearch} label={t(lang, "offersNow")} value={formatNumber(offers.length)} loading={marketQ.isLoading} />
        <MarketMetric icon={Tags} label={t(lang, "deals")} value={formatNumber(dealCount)} tone="ok" loading={marketQ.isLoading} />
        <MarketMetric icon={CircleDollarSign} label={t(lang, "results")} value={formatNumber(list.length)} tone="gold" loading={marketQ.isLoading} />
      </div>
      {mainPlayer && best ? (
        <section className="rounded-lg border border-teal/40 bg-surface p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-teal/10 text-teal"><Sparkles className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-teal">Melhor oportunidade para {mainPlayer}</div>
              <ItemHotspot itemId={best.rec?.id ?? best.offer.item} instance={instanceFromOffer(best.offer)} className="mt-1 block truncate font-display text-lg font-semibold hover:text-teal">{itemLabel(best.offer.item, best.rec)}</ItemHotspot>
              <p className="text-sm text-mist">{best.advice.className} · Lv {best.offer.level ?? "—"} · {best.advice.reason}</p>
            </div>
            <div className="sm:text-right"><strong className="block text-lg tabular-nums text-gold">{formatGold(best.offer.gold)}</strong><span className="text-xs text-mist">Pontuação {Math.round(best.advice.score)}</span></div>
          </div>
        </section>
      ) : null}
      <form className="rounded-lg border border-line bg-surface p-3" onSubmit={(e) => { e.preventDefault(); patch({ q: q.trim() || undefined }); }}>
        <div className="grid gap-2 lg:grid-cols-[minmax(12rem,1fr)_repeat(4,auto)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-mist" />
            <input
              className="min-h-11 w-full rounded-md border border-line bg-ink pl-10 pr-3 outline-none focus:border-teal"
              placeholder={`${t(lang, "item")} / ${t(lang, "seller")}`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        <select className="min-h-11 rounded-md border border-line bg-surface px-2" value={search.server ?? ""} onChange={(e) => patch({ server: e.target.value || undefined })}>
          <option value="">{t(lang, "allServers")}</option>
          {servers.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="min-h-11 rounded-md border border-line bg-surface px-2" value={search.rarity ?? ""} onChange={(e) => patch({ rarity: e.target.value || undefined })}>
          <option value="">{t(lang, "allRarities")}</option>
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <option key={r} value={r}>
              {rarityName(r, lang)}
            </option>
          ))}
        </select>
        <select className="min-h-11 rounded-md border border-line bg-surface px-2" value={search.cat ?? ""} onChange={(e) => patch({ cat: e.target.value || undefined })}>
          <option value="">{t(lang, "allCats")}</option>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="min-h-11 rounded-md border border-line bg-surface px-2" value={sort} onChange={(e) => patch({ sort: e.target.value })}>
          <option value="default">{t(lang, "sortDefault")}</option>
          <option value="recommended">Recomendados para mim</option>
          <option value="gold-asc">{t(lang, "sortGoldAsc")}</option>
          <option value="gold-desc">{t(lang, "sortGoldDesc")}</option>
          <option value="unit">{t(lang, "sortUnit")}</option>
          <option value="qty">{t(lang, "sortQty")}</option>
        </select>
        </div>
        <button type="button" onClick={() => setShowAdvanced((value) => !value)} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-3 text-sm font-semibold md:hidden"><SlidersHorizontal className="size-4" />Filtros avançados</button>
        <div className={cn("mt-2 grid gap-2 sm:grid-cols-4", !showAdvanced && "hidden md:grid")}>
          <select className="min-h-11 rounded-md border border-line bg-ink px-3 text-sm" value={search.cls ?? ""} onChange={(e) => patch({ cls: e.target.value || undefined })}><option value="">Classe do personagem{playerClass ? ` (${playerClass})` : ""}</option>{["Warrior","Archer","Mage","Priest","Defense"].map((value)=><option key={value}>{value}</option>)}</select>
          <input type="number" min="0" className="min-h-11 rounded-md border border-line bg-ink px-3 text-sm" placeholder="Level mínimo" value={search.minLevel ?? ""} onChange={(e) => patch({ minLevel: e.target.value || undefined })} />
          <input type="number" min="0" className="min-h-11 rounded-md border border-line bg-ink px-3 text-sm" placeholder="Rank mínimo" value={search.minRank ?? ""} onChange={(e) => patch({ minRank: e.target.value || undefined })} />
          <input type="number" min="0" className="min-h-11 rounded-md border border-line bg-ink px-3 text-sm" placeholder="Preço unitário máximo" value={search.maxGold ?? ""} onChange={(e) => patch({ maxGold: e.target.value || undefined })} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" variant="primary">{t(lang, "search")}</Button>
          <Button type="button" size="sm" variant={search.deals === "1" ? "primary" : "ghost"} onClick={() => patch({ deals: search.deals === "1" ? undefined : "1" })}>
            {t(lang, "onlyDeals")} ({dealCount})
          </Button>
          <Button type="button" size="sm" variant={search.watch === "1" ? "primary" : "ghost"} onClick={() => patch({ watch: search.watch === "1" ? undefined : "1" })}>Itens salvos ({favItems.length})</Button>
          <Button type="button" size="sm" variant={search.fit === "1" ? "primary" : "ghost"} disabled={!playerClass} onClick={() => patch({ fit: search.fit === "1" ? undefined : "1" })}><ShieldCheck className="size-3.5" />Serve para mim</Button>
          <Button type="button" size="sm" variant="ghost" onClick={()=>saveFilter(`Filtro ${new Date().toLocaleDateString()}`,new URLSearchParams(Object.entries(search).filter((entry):entry is [string,string]=>Boolean(entry[1]))).toString())}><Bookmark className="size-3.5"/>Salvar filtro</Button>
          <Button type="button" size="sm" variant="ghost" onClick={exportMarket}><Download className="size-3.5"/>CSV</Button>
          {(search.q || search.server || search.rarity || search.cat || search.sort || search.deals || search.minLevel || search.minRank || search.maxGold || search.watch || search.fit || search.cls) ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => { setQ(""); navigate({ search: {} }); }}>{t(lang, "clear")}</Button>
          ) : null}
          <span className="ml-auto text-sm tabular-nums text-mist">{list.length} {t(lang, "offers")}</span>
        </div>
      </form>
      <DataFreshness updated={marketQ.data?.updated} isFetching={marketQ.isFetching} onRefresh={() => marketQ.refetch()} />
      {historyItem ? (
        <section className="rounded-lg border border-line bg-surface p-3" aria-live="polite">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal"><TrendingDown className="size-4" />Histórico local de preço</div><h3 className="mt-1 font-semibold">{itemLabel(historyItem, findItem(index, historyItem))}</h3></div><button type="button" onClick={() => setHistoryItem(null)} className="min-h-9 rounded-md px-2 text-mist hover:bg-ink-2 hover:text-fog" aria-label="Fechar histórico"><X className="size-4" /></button></div>
          <div className="mt-3 flex gap-1">{(["24h","7d","30d"] as const).map(period=><button key={period} onClick={()=>setHistoryPeriod(period)} className={cn("min-h-9 rounded-md border px-3 text-xs font-semibold",historyPeriod===period?"border-teal bg-teal/10 text-teal":"border-line text-mist")}>{period}</button>)}</div>
          {periodHistory.length > 1 ? <><div className="mt-3 grid grid-cols-3 gap-2 text-sm"><Metric label="Amostras" value={String(periodHistory.length)} /><Metric label="Menor" value={formatGold(Math.min(...periodHistory.map((point) => point.price)))} /><Metric label="Variação" value={`${Math.round(((periodHistory.at(-1)!.price - periodHistory[0].price) / periodHistory[0].price) * 100)}%`} tone={periodHistory.at(-1)!.price <= periodHistory[0].price ? "ok" : "gold"} /></div><PriceHistoryChart points={periodHistory}/></> : <p className="mt-2 text-sm text-mist">Ainda estamos criando o histórico deste período. Novas amostras são guardadas automaticamente.</p>}
        </section>
      ) : null}
      <div className="rounded-lg border border-line bg-surface p-3">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "rarityMix")}</h3>
        <RarityBars data={mix} />
      </div>
      {marketQ.isLoading ? <Skeleton className="h-48" /> : null}
      {marketQ.isError ? <ErrorBanner onRetry={() => marketQ.refetch()} /> : null}
      {!marketQ.isLoading && !list.length ? <EmptyState>{t(lang, "emptyMarket")}</EmptyState> : null}
      <div className="space-y-2 md:hidden">
        {list.slice(0, limit).map((o, i) => {
          const rec = findItem(index, o.item);
          const u = unitPrice(o.gold, o.amount);
          const med = o.item ? medians.get(o.item) : undefined;
          const deal = isDeal(o, medians);
          const off = pctOff(u, med);
          return (
            <article key={`${o.item}-${o.player}-${i}`} className={cn("rounded-lg border border-line bg-surface p-3", deal && "border-ok/40")}>
              <div className="flex gap-3">
                <ItemHotspot itemId={rec?.id ?? o.item} instance={instanceFromOffer(o)} className="shrink-0"><ItemImg icon={rec?.icon} name={o.item} /></ItemHotspot>
                <div className="min-w-0 flex-1">
                  <ItemHotspot itemId={rec?.id ?? o.item} instance={instanceFromOffer(o)} className="block truncate font-semibold hover:text-teal">{itemLabel(o.item, rec)}</ItemHotspot>
                  <p className="mt-1 text-xs text-mist">{formatNumber(o.amount)} {t(lang, "unit")} · {o.server ?? "—"}</p>
                  {(() => { const advice=adviceFor(o); return <p className={cn("mt-1 text-xs font-semibold",advice.upgrade?"text-ok":advice.compatible&&advice.levelOk?"text-teal":"text-mist")}>{advice.className} · {advice.reason}</p>; })()}
                </div>
                {deal ? <span className="self-start rounded bg-ok/10 px-2 py-1 text-xs font-bold uppercase text-ok">{t(lang, "deal")}</span> : null}
              </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-sm">
                <div><span className="block text-xs text-mist">{t(lang, "gold")}</span><strong className="tabular-nums text-gold">{formatGold(o.gold)}</strong></div>
                <div className="text-right"><span className="block text-xs text-mist">{t(lang, "unit")}</span><strong className="tabular-nums">{u != null ? formatGold(u) : "—"}</strong></div>
                <div><span className="block text-xs text-mist">{t(lang, "seller")}</span>{o.player ? <Link to="/players" search={{ name: o.player }} className="font-semibold hover:text-teal">{o.player}</Link> : "—"}</div>
                <div className="text-right"><span className="block text-xs text-mist">{t(lang, "vsMedian")}</span><strong className={off != null && off > 0 ? "text-ok" : "text-mist"}>{off != null ? `${off > 0 ? "−" : "+"}${Math.abs(Math.round(off))}%` : "—"}</strong></div>
                </div>
                <button type="button" onClick={() => setHistoryItem(o.item)} className="mt-3 min-h-9 text-xs font-semibold text-teal hover:text-fog">Ver histórico de preço</button>
              </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">
        <table className="w-full text-sm">
          <thead className="sticky-head bg-ink-2 text-left text-xs uppercase text-mist">
            <tr>
              <th className="px-2 py-2" />
              <th className="px-2 py-2">{t(lang, "item")}</th>
              <th className="px-2 py-2">Classe</th>
              <th className="px-2 py-2">Análise</th>
              <th className="px-2 py-2">{t(lang, "qty")}</th>
              <th className="px-2 py-2">{t(lang, "gold")}</th>
              <th className="px-2 py-2">{t(lang, "unit")}</th>
              <th className="px-2 py-2">{t(lang, "vsMedian")}</th>
              <th className="px-2 py-2">{t(lang, "seller")}</th>
              <th className="px-2 py-2">{t(lang, "server")}</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, limit).map((o, i) => {
              const rec = findItem(index, o.item);
              const u = unitPrice(o.gold, o.amount);
              const med = o.item ? medians.get(o.item) : undefined;
              const deal = isDeal(o, medians);
              const off = pctOff(u, med);
              const watched = rec ? favItems.includes(rec.id) : false;
              const alertPrice = rec ? priceAlerts[rec.id] : undefined;
              const advice = adviceFor(o);
              return (
                <tr key={i} className={cn("border-t border-line", deal && "bg-ok/5", watched && "bg-gold/5")}>
                  <td className="px-2 py-2">
                    <ItemHotspot itemId={rec?.id ?? o.item} instance={instanceFromOffer(o)}>
                      <ItemImg icon={rec?.icon} name={o.item} />
                    </ItemHotspot>
                  </td>
                  <td className="px-2 py-2">
                    <ItemHotspot itemId={rec?.id ?? o.item} instance={instanceFromOffer(o)} className="font-semibold hover:text-teal">
                      {itemLabel(o.item, rec)}
                    </ItemHotspot>
                    {deal ? <span className="ml-2 text-xs font-bold uppercase text-ok">{t(lang, "deal")}</span> : null}
                    {alertPrice ? <span className="ml-2 text-xs font-bold uppercase text-gold">alerta</span> : null}
                  </td>
                  <td className="px-2 py-2"><span className="rounded bg-teal/10 px-2 py-1 text-xs font-bold text-teal">{advice.className}</span></td>
                  <td className="max-w-56 px-2 py-2"><div className={cn("flex items-center gap-1 text-xs font-semibold",advice.upgrade?"text-ok":advice.compatible&&advice.levelOk?"text-teal":"text-mist")}>{advice.upgrade?<BadgeCheck className="size-3.5 shrink-0"/>:null}{advice.reason}</div><div className="mt-1 text-xs uppercase tracking-wide text-mist">Calculado · score {Math.round(advice.score)}</div></td>
                  <td className="px-2 py-2 tabular-nums">{formatNumber(o.amount)}</td>
                  <td className="px-2 py-2 tabular-nums text-gold">{formatGold(o.gold)}</td>
                  <td className="px-2 py-2 tabular-nums text-mist">{u != null ? formatGold(u) : "—"}</td>
                  <td className={cn("px-2 py-2 tabular-nums text-xs", off != null && off > 0 ? "text-ok" : "text-mist")}>
                    {off != null ? `${off > 0 ? "−" : "+"}${Math.abs(Math.round(off))}%` : "—"}
                  </td>
                  <td className="px-2 py-2">
                    {o.player ? (
                      <Link to="/players" search={{ name: o.player }} className="hover:text-teal">
                        {o.player}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {o.online ? <span className="ml-1 inline-block size-1.5 rounded-full bg-ok" /> : null}
                  </td>
                  <td className="px-2 py-2 text-mist">{o.server}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {list.length > limit ? (
        <Button className="w-full" onClick={() => setLimit((n) => n + 80)}>
          {t(lang, "loadMore")} ({limit} {t(lang, "ofTotal")} {list.length})
        </Button>
      ) : null}
    </div>
  );
}

function MarketMetric({ icon: Icon, label, value, tone, loading }: { icon: typeof PackageSearch; label: string; value: string; tone?: "ok" | "gold"; loading?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
      <span className={cn("grid size-10 place-items-center rounded-md bg-ink-2 text-teal", tone === "ok" && "text-ok", tone === "gold" && "text-gold")}><Icon className="size-5" /></span>
      <div><div className="text-xs uppercase tracking-wide text-mist">{label}</div>{loading ? <Skeleton className="mt-1 h-6 w-12" /> : <div className="font-display text-xl font-semibold tabular-nums">{value}</div>}</div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "ok" | "gold" }) {
  return <div className="rounded-md border border-line bg-ink p-2"><div className="text-xs text-mist">{label}</div><strong className={cn("mt-1 block tabular-nums", tone === "ok" && "text-ok", tone === "gold" && "text-gold")}>{value}</strong></div>;
}

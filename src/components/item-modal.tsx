import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Equal, Lightbulb, Star, UserRound, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fetchers, qk } from "@/lib/solaria/query";
import { buildItemIndex, findItem } from "@/lib/solaria/equip";
import { formatGold, formatNumber, rarityClass, rarityName, unitPrice } from "@/lib/solaria/format";
import { cheapestFor, medianMap } from "@/lib/solaria/stats";
import {
  compareInspect,
  inspectItem,
  instanceFromEquip,
  instanceFromOffer,
  matchEquipped,
  tooltipText,
  type ItemInstance,
  type Inspected,
  type TipLine,
} from "@/lib/solaria/tooltip";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import type { CatalogItem, Offer } from "@/lib/solaria/types";
import { ItemImg } from "./item-img";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

type OpenPayload = { id: string; inst?: ItemInstance | null };

type Ctx = {
  openItem: (id: string, inst?: ItemInstance | null) => void;
  previewItem: (id: string, rect: DOMRect, inst?: ItemInstance | null) => void;
  hidePreview: () => void;
};

const ItemCtx = createContext<Ctx>({
  openItem: () => {},
  previewItem: () => {},
  hidePreview: () => {},
});
export const useItemModal = () => useContext(ItemCtx);

function StatRows({ lines, compact }: { lines: TipLine[]; compact?: boolean }) {
  if (!lines.length) return null;
  return (
    <div className={cn("mt-3 space-y-1", compact && "mt-2")}>
      {lines.map((l) =>
        l.flag ? (
          <p key={l.key} className="text-xs text-gold">
            {l.display}
          </p>
        ) : (
          <div key={l.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-mist">{l.label}</span>
            <span className="tabular-nums font-semibold">{l.display}</span>
          </div>
        ),
      )}
    </div>
  );
}

function deltaText(value: number | null) {
  if (value == null || Math.abs(value) < 0.0001) return "—";
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function ItemCard({
  rec,
  inspected,
  offers,
  compact,
  onInspectOffer,
  showOffers = false,
}: {
  rec: CatalogItem;
  inspected: Inspected;
  offers: Offer[];
  compact?: boolean;
  onInspectOffer?: (offer: Offer) => void;
  showOffers?: boolean;
}) {
  const lang = usePrefs((s) => s.lang);
  const toggleFavItem = usePrefs((s) => s.toggleFavItem);
  const isFavItem = usePrefs((s) => s.isFavItem);
  const tip = tooltipText(rec, lang);
  const med = useMemo(() => medianMap(offers), [offers]);
  const cheap = cheapestFor(offers, rec.itemName ?? rec.id) ?? cheapestFor(offers, rec.id);
  const cheapClass = cheap ? inspectItem(rec, instanceFromOffer(cheap), lang).classReq : "";

  return (
    <>
      <div className="flex gap-3">
        <ItemImg icon={rec.icon} name={rec.itemName} size={compact ? 48 : 64} />
        <div className="min-w-0">
          <h2 className={cn("font-display font-semibold", compact ? "text-base" : "text-xl", rarityClass(inspected.rarety))}>
            {rec.itemName || rec.id}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className={cn("rounded px-2 py-0.5 text-xs font-bold", rarityClass(inspected.rarety))}>
              {rarityName(inspected.rarety, lang)}
            </span>
            {inspected.cat ? <span className="text-xs text-mist">{inspected.cat}</span> : null}
            {inspected.classReq ? <span className="text-xs text-teal">{inspected.classReq}</span> : null}
            <span className="font-mono text-xs text-mist">{rec.id}</span>
          </div>
        </div>
      </div>
      {tip ? <p className="mt-3 text-sm text-mist">{tip}</p> : null}
      <StatRows lines={inspected.lines} compact={compact} />
      {cheap && !compact ? (
        <div className="mt-3 rounded-md border border-line bg-ink-2 px-3 py-2 text-sm">
          <div className="text-xs uppercase tracking-wide text-mist">{t(lang, "cheapest")}</div>
          <div className="flex justify-between gap-2">
            <span>
              {formatNumber(cheap.amount)} · {cheap.player} · {cheap.server}{cheapClass ? <span className="ml-1 font-semibold text-teal">· {cheapClass}</span> : null}
            </span>
            <span className="tabular-nums text-gold">{formatGold(cheap.gold)}</span>
          </div>
        </div>
      ) : null}
      {!compact ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant={isFavItem(rec.id) ? "primary" : "ghost"} onClick={() => toggleFavItem(rec.id)}>
              <Star className="size-4" />
              {isFavItem(rec.id) ? t(lang, "saved") : t(lang, "saveItem")}
            </Button>
            <Link
              to="/market"
              search={{ q: rec.itemName ?? rec.id }}
              className="inline-flex min-h-9 items-center rounded-md border border-line px-3 text-xs font-semibold hover:bg-surface-2"
            >
              {t(lang, "fromMarket")}
            </Link>
          </div>
          {showOffers ? <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "soldAt")}</h3> : null}
          {showOffers && offers.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {offers.slice(0, 8).map((o, i) => {
                const u = unitPrice(o.gold, o.amount);
                const m = o.item ? med.get(o.item) : undefined;
                const deal = u != null && m != null && m > 0 && u < m * 0.7;
                const offerClass = inspectItem(rec, instanceFromOffer(o), lang).classReq;
                return (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-ink-2 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      {formatNumber(o.amount)} ·{" "}
                      {o.player ? (
                        <Link to="/players" search={{ name: o.player }} className="hover:text-teal">
                          {o.player}
                        </Link>
                      ) : (
                        "—"
                      )}{" "}
                      · {o.server}
                      {o.level ? <span className="ml-1 text-xs text-mist">Lv {o.level}</span> : null}
                      {o.rank ? <span className="ml-1 text-xs text-mist">+{o.rank}</span> : null}
                      {offerClass ? <span className="ml-2 rounded bg-teal/10 px-2 py-0.5 text-xs font-bold text-teal">Classe: {offerClass}</span> : null}
                      {deal ? <span className="ml-2 text-xs font-bold uppercase text-ok">{t(lang, "deal")}</span> : null}
                    </span>
                    <span className="tabular-nums text-gold">
                      {formatGold(o.gold)}
                      {u != null ? (
                        <span className="ml-2 text-xs text-mist">
                          {formatGold(u)}/{t(lang, "unit")}
                        </span>
                      ) : null}
                    </span>
                    {onInspectOffer ? <button type="button" className="min-h-9 rounded-md border border-line px-3 text-xs font-semibold text-fog hover:border-teal hover:bg-surface" onClick={() => onInspectOffer(o)}>Analisar esta oferta</button> : null}
                  </li>
                );
              })}
            </ul>
          ) : showOffers ? (
            <p className="mt-2 text-sm text-mist">{t(lang, "noOffers")}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-xs text-mist">{t(lang, "hoverClick")}</p>
      )}
    </>
  );
}

function ComparePane({
  left,
  rightName,
  right,
}: {
  left: Inspected;
  rightName: string;
  right: Inspected | null;
}) {
  const lang = usePrefs((s) => s.lang);
  if (!right) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-ink-2 p-4">
        <h3 className="font-display text-lg font-semibold">{t(lang, "yours")}</h3>
        <p className="mt-2 text-sm text-mist">{t(lang, "noEquipped")}</p>
        <p className="mt-1 text-xs text-ok">{t(lang, "verdictBetter")}</p>
      </div>
    );
  }
  const cmp = compareInspect(left, right);
  const banner =
    cmp.verdict === "better"
      ? t(lang, "verdictBetter")
      : cmp.verdict === "worse"
        ? t(lang, "verdictWorse")
        : cmp.verdict === "mixed"
          ? t(lang, "verdictMixed")
          : t(lang, "verdictEqual");
  const tone =
    cmp.verdict === "better" ? "text-ok border-ok/40 bg-ok/10" : cmp.verdict === "worse" ? "text-danger border-danger/40 bg-danger/10" : "text-gold border-gold/40 bg-gold/10";
  const gains = cmp.rows.filter((row) => row.winner === "a");
  const losses = cmp.rows.filter((row) => row.winner === "b");

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <ItemImg icon={right.rec.icon} name={right.rec.itemName} size={48} />
        <div>
          <div className="text-xs uppercase tracking-wide text-mist">{t(lang, "yours")}</div>
          <h3 className={cn("font-display text-lg font-semibold", rarityClass(right.rarety))}>{right.rec.itemName || right.rec.id}</h3>
          <div className="text-xs text-mist">{rightName}</div>
        </div>
      </div>
      <div className={cn("mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold", tone)}>
        {cmp.verdict === "better" ? <ArrowUpRight className="size-4" /> : cmp.verdict === "worse" ? <ArrowDownRight className="size-4" /> : <Equal className="size-4" />}
        <span>{banner}</span>
        <span className="ml-auto text-xs font-normal tabular-nums">
          {cmp.winsA} {t(lang, "gains")} · {cmp.winsB} {t(lang, "losses")}
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-line">
        <div className="grid grid-cols-[1fr_1.2fr_.8fr_1fr] bg-ink-2 px-3 py-1.5 text-xs uppercase tracking-wide text-mist">
          <span>{t(lang, "thisItem")}</span>
          <span className="text-center">{t(lang, "attribute")}</span>
          <span className="text-center">{t(lang, "delta")}</span>
          <span className="text-right">{t(lang, "yours")}</span>
        </div>
        {cmp.rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[1fr_1.2fr_.8fr_1fr] items-center border-t border-line px-3 py-2 text-sm">
            <span className={cn("tabular-nums font-semibold", r.winner === "a" && "text-ok", r.winner === "b" && "text-danger")}>
              {r.a}
            </span>
            <span className="text-center text-xs text-mist">{r.label}</span>
            <span className={cn("text-center text-xs tabular-nums", r.winner === "a" && "text-ok", r.winner === "b" && "text-danger", r.winner === "tie" && "text-mist")}>
              {deltaText(r.delta)}
            </span>
            <span className={cn("text-right tabular-nums font-semibold", r.winner === "b" && "text-ok", r.winner === "a" && "text-danger")}>
              {r.b}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-line bg-ink-2 p-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mist">
          <Lightbulb className="size-4 text-teal" />
          {t(lang, "recommendation")}
        </div>
        <p className="mt-2 text-sm">
          {cmp.verdict === "better"
            ? t(lang, "recommendEquip")
            : cmp.verdict === "worse"
              ? t(lang, "recommendKeep")
              : cmp.verdict === "mixed"
                ? t(lang, "recommendSituational")
                : t(lang, "recommendEqual")}
        </p>
        {gains.length || losses.length ? (
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
            <p className="text-ok">
              <span className="font-semibold">{t(lang, "youGain")}:</span> {gains.slice(0, 3).map((row) => row.label).join(", ") || "—"}
            </p>
            <p className="text-danger">
              <span className="font-semibold">{t(lang, "youLose")}:</span> {losses.slice(0, 3).map((row) => row.label).join(", ") || "—"}
            </p>
          </div>
        ) : null}
        {left.cat === "Ring" ? <p className="mt-2 text-xs text-mist">{t(lang, "replaceHint")}</p> : null}
      </div>
    </div>
  );
}

export function ItemModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<OpenPayload | null>(null);
  const [preview, setPreview] = useState<{ id: string; x: number; y: number; inst?: ItemInstance | null } | null>(null);
  const [mainDraft, setMainDraft] = useState("");
  const [cmpClass, setCmpClass] = useState("");
  const [modalTab, setModalTab] = useState<"details" | "offers" | "compare">("details");
  const hideTimer = useRef<number | null>(null);
  const lang = usePrefs((s) => s.lang);
  const mainPlayer = usePrefs((s) => s.mainPlayer);
  const setMainPlayer = usePrefs((s) => s.setMainPlayer);
  const favPlayers = usePrefs((s) => s.favPlayers);
  const recentPlayers = usePrefs((s) => s.recentPlayers);
  const itemsQ = useQuery({ queryKey: qk.items(), queryFn: fetchers.items });
  const marketQ = useQuery({ queryKey: qk.market(), queryFn: fetchers.market });
  const mineQ = useQuery({
    queryKey: qk.player(mainPlayer),
    queryFn: () => fetchers.player(mainPlayer),
    enabled: Boolean(mainPlayer) && Boolean(open || preview),
  });
  const index = useMemo(() => (itemsQ.data ? buildItemIndex(itemsQ.data) : null), [itemsQ.data]);

  const recFor = (key: string | null) => (key ? findItem(index, key) : null);
  const offersFor = (key: string | null, rec: CatalogItem | null) =>
    (marketQ.data?.offers ?? []).filter((o) => {
      if (!key || !rec) return false;
      const n = (o.item ?? "").toLowerCase();
      return n === rec.itemName?.toLowerCase() || n === rec.id.toLowerCase() || n === key.toLowerCase();
    });

  const modalRec = recFor(open?.id ?? null);
  const previewRec = recFor(preview?.id ?? null);
  const left = modalRec ? inspectItem(modalRec, open?.inst, lang) : null;
  const previewIns = previewRec ? inspectItem(previewRec, preview?.inst, lang) : null;

  const mine = mineQ.data?.name ? mineQ.data : null;
  const activeClass = cmpClass || mine?.class || mine?.classes?.[0]?.name || "Warrior";
  const equipped = left && mine ? matchEquipped(mine.equipment, modalRec!, index, activeClass) : null;
  const rightRec = equipped ? findItem(index, equipped.item) : null;
  const right = rightRec && equipped ? inspectItem(rightRec, instanceFromEquip(equipped), lang) : null;

  const previewEquipped = previewIns && mine && previewRec ? matchEquipped(mine.equipment, previewRec, index, activeClass) : null;
  const previewRightRec = previewEquipped ? findItem(index, previewEquipped.item) : null;
  const previewRight = previewRightRec && previewEquipped ? inspectItem(previewRightRec, instanceFromEquip(previewEquipped), lang) : null;

  const hidePreview = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setPreview(null), 80);
  };

  const previewItem = (itemId: string, rect: DOMRect, inst?: ItemInstance | null) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    const width = mainPlayer && window.innerWidth >= 900 ? 680 : 300;
    const leftX = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const below = rect.bottom + 8;
    const estimatedHeight = mainPlayer && window.innerWidth >= 900 ? 520 : 300;
    const y = below + estimatedHeight < window.innerHeight ? below : Math.max(8, rect.top - estimatedHeight);
    setPreview({ id: itemId, x: leftX, y, inst });
  };

  useEffect(() => {
    if (open) setMainDraft(mainPlayer);
  }, [open, mainPlayer]);

  useEffect(() => {
    if (mine?.class) setCmpClass(mine.class);
  }, [mine?.class]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setPreview(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const suggestions = [...new Set([mainPlayer, ...favPlayers, ...recentPlayers].filter(Boolean))];

  return (
    <ItemCtx.Provider
      value={{
        openItem: (id, inst) => { setModalTab("details"); setOpen({ id, inst }); },
        previewItem,
        hidePreview,
      }}
    >
      {children}
      {preview && previewRec && previewIns && !open ? (
        <div
          className={cn("pointer-events-none fixed z-50 max-h-screen overflow-y-auto rounded-lg border border-line bg-surface p-3 shadow-2xl", mainPlayer ? "w-72 lg:w-2xl" : "w-72")}
          style={{ left: preview.x, top: preview.y }}
          role="tooltip"
        >
          <div className={cn("grid gap-4", mainPlayer && "lg:grid-cols-2")}>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "thisItem")}</div>
              <ItemCard rec={previewRec} inspected={previewIns} offers={offersFor(preview.id, previewRec)} compact />
            </div>
            {mainPlayer ? (
              <div className="hidden border-l border-line pl-4 lg:block">
                <ComparePane left={previewIns} rightName={mainPlayer} right={previewRight} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-3 sm:p-4" onClick={() => setOpen(null)}>
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-line bg-surface p-4 shadow-2xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
          >
            <button
              className="absolute right-3 top-3 size-11 rounded-md text-mist hover:bg-ink-2 hover:text-fog"
              onClick={() => setOpen(null)}
              aria-label={t(lang, "close")}
            >
              <X className="mx-auto size-5" />
            </button>
            {modalRec && left ? (
              <>
                <p className="mb-3 pr-10 text-xs text-mist">{t(lang, "inspectHint")}</p>
                <div className="mb-4 flex gap-1 border-b border-line" role="tablist" aria-label="Seções do item">
                  {([['details','Detalhes'],['offers',`Ofertas (${offersFor(open.id, modalRec).length})`],['compare','Comparação']] as const).map(([key,label])=><button key={key} type="button" role="tab" aria-selected={modalTab===key} onClick={()=>setModalTab(key)} className={cn("min-h-11 border-b-2 px-3 text-sm font-semibold",modalTab===key?"border-teal text-teal":"border-transparent text-mist hover:text-fog")}>{label}</button>)}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className={cn(modalTab === "compare" && "hidden")}>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "thisItem")}</div>
                    <ItemCard rec={modalRec} inspected={left} offers={offersFor(open.id, modalRec)} showOffers={modalTab === "offers"} onInspectOffer={(offer) => { setOpen({ id: open.id, inst: instanceFromOffer(offer) }); setModalTab("details"); }} />
                    {modalTab === "details" ? <div className="mt-4 rounded-md border border-line bg-ink-2 p-3 text-xs text-mist"><strong className="text-fog">Origem dos dados</strong><p className="mt-1">Nome, categoria e atributos-base: <span className="text-teal">oficial</span>. Armadura, ataque, compatibilidade e comparação: <span className="text-gold">calculados</span> a partir da instância.</p></div> : null}
                  </div>
                  <div className={cn("border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0", modalTab !== "compare" && "hidden", modalTab === "compare" && "lg:col-span-2 lg:border-l-0 lg:pl-0")}>
                    <div className="mb-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "vsEquipped")}</div>
                      {mainPlayer ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                          <UserRound className="size-3.5 text-teal" />
                          <span>
                            {t(lang, "comparingWith")}{" "}
                            <Link to="/players" search={{ name: mainPlayer }} className="font-semibold text-teal">
                              {mainPlayer}
                            </Link>
                            {mine?.class ? <span className="text-mist"> · {activeClass}</span> : null}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-mist">{t(lang, "pickMe")}</p>
                      )}
                      <form
                        className="mt-2 flex flex-wrap gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (mainDraft.trim()) setMainPlayer(mainDraft.trim());
                        }}
                      >
                        <input
                          list="solaria-mains"
                          className="min-h-11 min-w-40 flex-1 rounded-md border border-line bg-ink px-3 text-sm"
                          placeholder={t(lang, "myChar")}
                          value={mainDraft}
                          onChange={(e) => setMainDraft(e.target.value)}
                        />
                        <datalist id="solaria-mains">
                          {suggestions.map((n) => (
                            <option key={n} value={n} />
                          ))}
                        </datalist>
                        <Button size="sm" type="submit">
                          {t(lang, "changeMain")}
                        </Button>
                      </form>
                      {mine?.classes?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {mine.classes.map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setCmpClass(c.name)}
                              className={cn(
                                "min-h-9 rounded-md border px-3 text-xs font-semibold",
                                activeClass === c.name ? "border-teal bg-ink-2 text-fog" : "border-line text-mist",
                              )}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {mainPlayer ? (
                      mineQ.isLoading ? (
                        <div className="h-40 animate-pulse rounded-md bg-ink-2" />
                      ) : (
                        <ComparePane left={left} rightName={mainPlayer} right={right} />
                      )
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-mist">{open.id}</p>
            )}
          </div>
        </div>
      ) : null}
    </ItemCtx.Provider>
  );
}

export function ItemHotspot({
  itemId,
  instance,
  children,
  className,
}: {
  itemId?: string | null;
  instance?: ItemInstance | null;
  children: React.ReactNode;
  className?: string;
}) {
  const { openItem, previewItem, hidePreview } = useItemModal();
  const enter = useRef<number | null>(null);
  if (!itemId) return <div className={className}>{children}</div>;

  const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  return (
    <button
      type="button"
      className={cn("text-left", className)}
      onClick={() => {
        if (enter.current) window.clearTimeout(enter.current);
        hidePreview();
        openItem(itemId, instance);
      }}
      onMouseEnter={(e) => {
        if (!canHover()) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (enter.current) window.clearTimeout(enter.current);
        enter.current = window.setTimeout(() => previewItem(itemId, rect, instance), 180);
      }}
      onMouseLeave={() => {
        if (enter.current) window.clearTimeout(enter.current);
        hidePreview();
      }}
    >
      {children}
    </button>
  );
}

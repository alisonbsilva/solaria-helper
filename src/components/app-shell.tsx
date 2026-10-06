import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Contrast,
  Download,
  GitCompare,
  Globe,
  Home,
  Menu,
  MoreHorizontal,
  Package,
  RefreshCw,
  Search,
  Shield,
  Skull,
  Store,
  Swords,
  UserRound,
  Users,
  X,
  Sun,
  Smartphone,
  ListChecks,
  LayoutDashboard,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { t, type I18nKey } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { fetchers, qk } from "@/lib/solaria/query";
import { isDeal, medianMap } from "@/lib/solaria/stats";
import { Button } from "./ui/button";
import { CommandPalette } from "./command-palette";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/solaria/types";
import { buildItemIndex, findItem } from "@/lib/solaria/equip";
import { inspectItem, instanceFromOffer } from "@/lib/solaria/tooltip";

const NAV: { to: string; key: I18nKey; icon: typeof Home }[] = [
  { to: "/", key: "home", icon: Home },
  { to: "/my-character", key: "myChar", icon: UserRound },
  { to: "/players", key: "players", icon: Users },
  { to: "/guilds", key: "guilds", icon: Shield },
  { to: "/market", key: "market", icon: Store },
  { to: "/bosses", key: "bosses", icon: Skull },
  { to: "/pvp", key: "pvp", icon: Swords },
  { to: "/items", key: "items", icon: Package },
  { to: "/compare", key: "compare", icon: GitCompare },
  { to: "/planner", key: "planner", icon: ListChecks },
  { to: "/command-center", key: "commandCenter", icon: LayoutDashboard },
];

const MOBILE: { to: string; key: I18nKey; icon: typeof Home }[] = [
  { to: "/", key: "home", icon: Home },
  { to: "/my-character", key: "myChar", icon: UserRound },
  { to: "/market", key: "market", icon: Store },
  { to: "/bosses", key: "bosses", icon: Skull },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const lang = usePrefs((s) => s.lang);
  const compact = usePrefs((s) => s.compact);
  const contrast = usePrefs((s) => s.contrast);
  const setLang = usePrefs((s) => s.setLang);
  const setCompact = usePrefs((s) => s.setCompact);
  const setContrast = usePrefs((s) => s.setContrast);
  const light = usePrefs((s) => s.light);
  const setLight = usePrefs((s) => s.setLight);
  const bossAlerts = usePrefs((s) => s.bossAlerts);
  const setBossAlerts = usePrefs((s) => s.setBossAlerts);
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.compact = String(compact);
    document.documentElement.dataset.contrast = String(contrast);
    document.documentElement.dataset.light = String(light);
  }, [lang, compact, contrast, light]);

  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const title = NAV.find((n) => (n.to === "/" ? path === "/" : path.startsWith(n.to)))?.key ?? "home";

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-ink-2 transition-transform duration-200 ease-out lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <div>
            <div className="font-display text-lg font-semibold text-fog">{t(lang, "app")}</div>
            <div className="text-xs uppercase tracking-widest text-teal">{t(lang, "live")}</div>
          </div>
          <button className="size-11 lg:hidden" onClick={() => setOpen(false)} aria-label={t(lang, "close")}>
            <X className="mx-auto size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
                  active ? "bg-teal/15 text-teal" : "text-mist hover:bg-surface hover:text-fog",
                )}
              >
                <Icon className="size-4" />
                {t(lang, n.key)}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-line p-3 text-xs">
          <label className="flex items-center justify-between text-mist">
            <span className="flex items-center gap-2">
              <Globe className="size-3.5" /> {t(lang, "lang")}
            </span>
            <select
              className="rounded border border-line bg-ink px-2 py-1 text-fog"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              <option value="pt">PT</option>
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center justify-between text-mist">
            {t(lang, "compact")}
            <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
          </label>
          <label className="flex min-h-11 items-center justify-between text-mist"><span className="flex items-center gap-2"><Sun className="size-3.5" /> Tema claro</span><input type="checkbox" checked={light} onChange={(e) => setLight(e.target.checked)} /></label>
          <label className="flex min-h-11 items-center justify-between text-mist">
            <span className="flex items-center gap-2">
              <Contrast className="size-3.5" /> {t(lang, "contrast")}
            </span>
            <input type="checkbox" checked={contrast} onChange={(e) => setContrast(e.target.checked)} />
          </label>
          <Button
            size="sm"
            className="w-full"
            variant={bossAlerts ? "primary" : "ghost"}
            onClick={async () => {
              if (!bossAlerts && "Notification" in window) {
                const p = await Notification.requestPermission();
                if (p !== "granted") return;
              }
              setBossAlerts(!bossAlerts);
            }}
          >
            <Bell className="size-3.5" />
            {bossAlerts ? t(lang, "notifyOn") : t(lang, "notifyBoss")}
          </Button>
          <p className="px-1 text-mist">{t(lang, "installHint")}</p>
          <a href="/?install=1" className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal px-3 font-semibold text-ink"><Smartphone className="size-3.5"/>Instalar aplicativo</a>
          <a
            href="/solaria-helper.zip"
            download="solaria-helper.zip"
            className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-surface px-3 font-semibold text-fog hover:border-teal hover:text-teal"
          >
            <Download className="size-3.5" />
            {t(lang, "download")}
          </a>
          <a
            href="https://worldofsolariammo.com"
            target="_blank"
            rel="noreferrer"
            className="block text-center text-mist hover:text-teal"
          >
            {t(lang, "official")}
          </a>
        </div>
      </aside>
      {open ? <div className="fixed inset-0 z-30 bg-ink/60 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-ink/90 px-4 backdrop-blur">
          <button className="size-11 lg:hidden" onClick={() => setOpen(true)} aria-label="menu">
            <Menu className="mx-auto size-5" />
          </button>
          <h1 className="flex-1 font-display text-lg font-semibold text-balance">{t(lang, title)}</h1>
          <span className="hidden items-center gap-1.5 text-xs font-bold tracking-widest text-ok sm:inline-flex">
            <span className="size-1.5 rounded-full bg-ok" />
            {t(lang, "live")}
          </span>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-mist hover:bg-surface hover:text-fog"
            onClick={() => setPalette(true)}
            aria-label={t(lang, "openPalette")}
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">{t(lang, "commandHint")}</span>
            <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] lg:inline">{t(lang, "kbdSearch")}</kbd>
          </button>
          <button
            className="size-11 rounded-md hover:bg-surface"
            onClick={() => window.location.reload()}
            aria-label="refresh"
          >
            <RefreshCw className="mx-auto size-4" />
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>
        <footer className="hidden border-t border-line px-4 py-4 text-center text-xs text-mist lg:block">{t(lang, "footer")}</footer>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-ink-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {MOBILE.map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                active ? "text-teal" : "text-mist",
              )}
            >
              <Icon className="size-4" />
              {t(lang, n.key)}
            </Link>
          );
        })}
        <button
          className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-mist"
          onClick={() => setOpen(true)}
        >
          <MoreHorizontal className="size-4" />
          {t(lang, "more")}
        </button>
      </nav>

      <CommandPalette open={palette} onOpenChange={setPalette} />
      <DealWatcher />
    </div>
  );
}

function DealWatcher() {
  const lang = usePrefs((s) => s.lang);
  const favItems = usePrefs((s) => s.favItems);
  const priceAlerts = usePrefs((s) => s.priceAlerts);
  const tierAlerts = usePrefs((s) => s.tierAlerts);
  const markDeals = usePrefs((s) => s.markDeals);
  const market = useQuery({ queryKey: qk.market(), queryFn: fetchers.market, refetchInterval: 60_000 });
  const items = useQuery({ queryKey: qk.items(), queryFn: fetchers.items });
  const primed = useRef(false);

  useEffect(() => {
    if (!market.data || (!favItems.length && !tierAlerts.length && !Object.keys(priceAlerts).length)) return;
    const names = new Set(
      (items.data ?? [])
        .filter((i) => favItems.includes(i.id))
        .flatMap((i) => [i.id.toLowerCase(), (i.itemName ?? "").toLowerCase()]),
    );
    const med = medianMap(market.data.offers);
    const itemIndex = items.data ? buildItemIndex(items.data) : null;
    const hits = market.data.offers.filter((o) => {
      const rec = (items.data ?? []).find((item) => item.id.toLowerCase() === (o.item ?? "").toLowerCase() || item.itemName?.toLowerCase() === (o.item ?? "").toLowerCase());
      const limit = rec ? priceAlerts[rec.id] : undefined;
      const underAlert = limit != null && (o.gold ?? Infinity) / Math.max(1, o.amount ?? 1) <= limit;
      const catalog = findItem(itemIndex, o.item);
      const inspected = catalog ? inspectItem(catalog, instanceFromOffer(o), lang) : null;
      const underTierAlert = tierAlerts.some((alert) => inspected?.level === alert.level && (o.gold ?? Infinity) / Math.max(1, o.amount ?? 1) <= alert.maxGold && (!inspected.classReq || inspected.classReq === alert.className || (inspected.classReq === "Hunter" && alert.className === "Archer")));
      return (names.has((o.item ?? "").toLowerCase()) && isDeal(o, med)) || underAlert || underTierAlert;
    });
    const keys = hits.map((o) => `${o.item}:${o.player}:${o.gold}`);
    const fresh = markDeals(keys);
    if (!primed.current) {
      primed.current = true;
      return;
    }
    if (fresh.length) toast.message(t(lang, "newDeal"), { description: hits[0]?.item });
  }, [market.data, favItems, items.data, lang, markDeals, priceAlerts, tierAlerts]);

  return null;
}

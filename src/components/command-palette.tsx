import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { GitCompare, Home, LayoutDashboard, ListChecks, Package, Search, Shield, Skull, Store, Swords, Users } from "lucide-react";
import { fetchers, qk } from "@/lib/solaria/query";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { useItemModal } from "./item-modal";
import { ClassIcon } from "./class-icon";

const PAGES = [
  { to: "/", key: "home" as const, icon: Home },
  { to: "/players", key: "players" as const, icon: Users },
  { to: "/guilds", key: "guilds" as const, icon: Shield },
  { to: "/market", key: "market" as const, icon: Store },
  { to: "/bosses", key: "bosses" as const, icon: Skull },
  { to: "/pvp", key: "pvp" as const, icon: Swords },
  { to: "/items", key: "items" as const, icon: Package },
  { to: "/compare", key: "compare" as const, icon: GitCompare },
  { to: "/planner", key: "planner" as const, icon: ListChecks },
  { to: "/command-center", key: "commandCenter" as const, icon: LayoutDashboard },
] as const;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const lang = usePrefs((s) => s.lang);
  const navigate = useNavigate();
  const { openItem } = useItemModal();
  const players = useQuery({ queryKey: qk.players("overall"), queryFn: () => fetchers.players("overall") });
  const guilds = useQuery({ queryKey: qk.guilds(), queryFn: fetchers.guilds });
  const items = useQuery({ queryKey: qk.items(), queryFn: fetchers.items });
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const nq = q.trim().toLowerCase();
  const playerHits = (players.data?.players ?? [])
    .filter((p) => !nq || p.name.toLowerCase().includes(nq))
    .slice(0, 8);
  const guildHits = (guilds.data?.guilds ?? [])
    .filter((g) => !nq || g.name.toLowerCase().includes(nq))
    .slice(0, 6);
  const itemHits = (items.data ?? [])
    .filter((i) => !nq || (i.itemName ?? i.id).toLowerCase().includes(nq) || i.id.toLowerCase().includes(nq))
    .slice(0, 8);

  const go = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/70 p-4 pt-[12vh]" onClick={() => onOpenChange(false)}>
      <Command
        className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        label={t(lang, "commandHint")}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="size-4 text-mist" />
          <Command.Input
            value={q}
            onValueChange={setQ}
            placeholder={t(lang, "searchAll")}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-mist"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] text-mist sm:inline">esc</kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-mist">{t(lang, "noResults")}</Command.Empty>
          <Command.Group heading={t(lang, "pages")} className="mb-2">
            {PAGES.map((p) => {
              const Icon = p.icon;
              return (
                <Command.Item
                  key={p.to}
                  value={`${p.key} ${p.to}`}
                  onSelect={() => go(() => navigate({ to: p.to }))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-ink-2"
                >
                  <Icon className="size-4 text-mist" />
                  {t(lang, p.key)}
                </Command.Item>
              );
            })}
          </Command.Group>
          {playerHits.length ? (
            <Command.Group heading={t(lang, "palettePlayers")} className="mb-2">
              {playerHits.map((p) => (
                <Command.Item
                  key={p.name}
                  value={`player ${p.name}`}
                  onSelect={() => go(() => navigate({ to: "/players", search: { name: p.name } }))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-ink-2"
                >
                  <ClassIcon name={p.class} />
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-mist">Lv {p.level}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
          {guildHits.length ? (
            <Command.Group heading={t(lang, "paletteGuilds")} className="mb-2">
              {guildHits.map((g) => (
                <Command.Item
                  key={g.name}
                  value={`guild ${g.name}`}
                  onSelect={() => go(() => navigate({ to: "/guilds", search: { name: g.name } }))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-ink-2"
                >
                  <Shield className="size-4 text-mist" />
                  {g.name}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
          {itemHits.length ? (
            <Command.Group heading={t(lang, "paletteItems")}>
              {itemHits.map((i) => (
                <Command.Item
                  key={i.id}
                  value={`item ${i.itemName} ${i.id}`}
                  onSelect={() => go(() => openItem(i.id))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-ink-2"
                >
                  <Package className="size-4 text-mist" />
                  {i.itemName ?? i.id}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>
      </Command>
    </div>
  );
}

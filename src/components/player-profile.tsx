import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, GitCompare, Share2, Star, UserRound } from "lucide-react";
import type { AchievementMeta, Player } from "@/lib/solaria/types";
import { buildPaperDoll, CLASS_COLORS, companionItem, DOLL_ORDER, filterClassEquip, type ItemIndex } from "@/lib/solaria/equip";
import { copyText, formatGold, formatNumber, gradeTextClass, rarityName, timeAgo } from "@/lib/solaria/format";
import { equipScore, playerKd } from "@/lib/solaria/stats";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { ItemHotspot } from "./item-modal";
import { instanceFromEquip } from "@/lib/solaria/tooltip";
import { ItemImg } from "./item-img";
import { Button } from "./ui/button";
import { ClassIcon, ClassLabel } from "./class-icon";
import { ClassRadar } from "./charts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PlayerProfile({
  player,
  index,
  achievements,
}: {
  player: Player;
  index: ItemIndex | null;
  achievements?: Record<string, AchievementMeta>;
}) {
  const lang = usePrefs((s) => s.lang);
  const toggle = usePrefs((s) => s.toggleFavPlayer);
  const isFav = usePrefs((s) => s.isFavPlayer(player.name));
  const mainPlayer = usePrefs((s) => s.mainPlayer);
  const setMainPlayer = usePrefs((s) => s.setMainPlayer);
  const touchRecent = usePrefs((s) => s.touchRecent);
  const notes = usePrefs((s) => s.notes[player.name] ?? "");
  const setNote = usePrefs((s) => s.setNote);
  const [cls, setCls] = useState(player.class || player.classes?.[0]?.name || "Warrior");
  const [note, setNoteLocal] = useState(notes);
  const filtered = filterClassEquip(player.equipment, cls, index);
  const doll = buildPaperDoll(filtered, index);
  const pet = companionItem(player.pet);
  const mount = companionItem(player.mount);
  const { wins, losses } = playerKd(player);
  const kills = player.kills ?? [];
  const power = equipScore(filtered);
  const totalLv = (player.classes ?? []).reduce((s, c) => s + (c.level ?? 0), 0);

  useEffect(() => {
    touchRecent(player.name);
  }, [player.name, touchRecent]);

  useEffect(() => {
    setNoteLocal(notes);
  }, [notes, player.name]);

  const share = async () => {
    const url = `${window.location.origin}/players?name=${encodeURIComponent(player.name)}`;
    const ok = await copyText(url);
    toast.success(ok ? t(lang, "copied") : url);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <header className="border-b border-line bg-ink-2 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={cn("font-display text-2xl font-semibold text-balance", gradeTextClass(player.grade, player.vip))}>{player.name}</h2>
              <Button size="icon" onClick={() => toggle(player.name)} aria-label="favorite">
                <Star className={cn("size-5", isFav && "fill-gold text-gold")} />
              </Button>
              <Button
                size="icon"
                onClick={async () => {
                  const ok = await copyText(player.name);
                  toast.success(ok ? t(lang, "copied") : player.name);
                }}
                aria-label={t(lang, "copyName")}
              >
                <Copy className="size-4" />
              </Button>
              <Button size="icon" onClick={share} aria-label="share">
                <Share2 className="size-5" />
              </Button>
              <Link
                to="/compare"
                search={{ a: player.name }}
                className="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface"
                aria-label={t(lang, "compareWith")}
              >
                <GitCompare className="size-5" />
              </Link>
              <Button
                size="sm"
                variant={mainPlayer.toLowerCase() === player.name.toLowerCase() ? "primary" : "ghost"}
                onClick={() => setMainPlayer(player.name)}
              >
                <UserRound className="size-4" />
                {mainPlayer.toLowerCase() === player.name.toLowerCase() ? t(lang, "isMe") : t(lang, "setAsMe")}
              </Button>
              {player.vip ? <span className="rounded bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">VIP</span> : null}
              <span className={cn("rounded px-2 py-0.5 text-xs font-bold", player.online ? "bg-ok/15 text-ok" : "bg-ink text-mist")}>
                {player.online ? `${t(lang, "online")}${player.server ? ` · ${player.server}` : ""}` : t(lang, "offline")}
              </span>
              {player.permadeath ? <span className="text-xs font-bold text-danger">{t(lang, "permadeath")}</span> : null}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-mist">
              <span className="tabular-nums">Level {player.level ?? "—"}</span>
              <ClassLabel name={player.class} />
              {player.guild ? (
                <Link to="/guilds" search={{ name: player.guild }} className="text-teal hover:underline">
                  {player.guild}
                </Link>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Chip>
              {t(lang, "gold")} <span className="tabular-nums text-gold">{formatGold(player.gold)}</span>
            </Chip>
            <Chip>
              {t(lang, "honor")} <span className="tabular-nums">{formatNumber(player.honor)}</span>
            </Chip>
            <Chip>
              {t(lang, "kd")}: <span className="tabular-nums">{wins}/{losses}</span>
            </Chip>
            <Chip>
              {t(lang, "power")} <span className="tabular-nums">{formatNumber(power)}</span>
            </Chip>
            <Chip>
              {t(lang, "totalLv")} <span className="tabular-nums">{formatNumber(totalLv)}</span>
            </Chip>
            {player.created ? <Chip>{t(lang, "created")}: {player.created}</Chip> : null}
            {player.lastSeen ? <Chip>{t(lang, "lastSeen")}: {player.lastSeen}</Chip> : null}
          </div>
        </div>
        {(pet || mount) && (
          <div className="mt-3 flex gap-3">
            {mount?.item || mount?.name ? (
              <Companion label="Mount" item={mount.item || mount.name} level={mount.level} index={index} />
            ) : null}
            {pet?.item || pet?.name ? (
              <Companion label="Pet" item={pet.item || pet.name} level={pet.level} index={index} />
            ) : null}
          </div>
        )}
        <label className="mt-3 block">
          <span className="text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "notes")}</span>
          <textarea
            className="mt-1 min-h-16 w-full rounded-md border border-line bg-ink px-3 py-2 text-sm"
            placeholder={t(lang, "notesPh")}
            value={note}
            onChange={(e) => setNoteLocal(e.target.value)}
            onBlur={() => setNote(player.name, note)}
          />
        </label>
      </header>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-line p-4 lg:border-b-0 lg:border-r">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-mist">
            {t(lang, "equipment")} ({cls}) · {t(lang, "power")} {formatNumber(power)}
          </h3>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(player.classes ?? []).map((c) => (
              <button
                key={c.name}
                onClick={() => setCls(c.name)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold",
                  cls === c.name ? "border-teal bg-ink-2 text-fog" : "border-line text-mist",
                )}
              >
                <ClassIcon name={c.name} /> {c.name} Lv {c.level}
              </button>
            ))}
          </div>
          <div className="paper-doll grid grid-cols-3 gap-2">
            {DOLL_ORDER.map((slot, i) => {
              if (slot.key === "Blank") return <div key={i} className="hidden sm:block" />;
              const e = doll[slot.key];
              if (!e) {
                return (
                  <div key={i} className="eq-slot flex min-h-24 flex-col items-center rounded-md border border-dashed border-line bg-ink p-2 opacity-50">
                    <span className="text-xs uppercase text-mist">{slot.label}</span>
                    <span className="mt-2 text-mist">—</span>
                  </div>
                );
              }
              const rec = index ? index.byId.get(e.item) ?? index.byId.get(e.item.toLowerCase()) : null;
              const rar = (e.rarety && e.rarety > 0 ? e.rarety : rec?.rarity) ?? 0;
              return (
                <ItemHotspot key={i} itemId={e.item} instance={instanceFromEquip(e)} className="eq-slot flex min-h-24 flex-col items-center rounded-md border border-line bg-ink p-2 hover:border-teal">
                  <span className="text-xs uppercase text-mist">{slot.label}</span>
                  <ItemImg icon={rec?.icon ?? `item_images/${e.item}.png`} name={rec?.itemName} />
                  <span className="mt-1 w-full truncate text-center text-xs font-semibold">{rec?.itemName ?? e.item}</span>
                  <span className="text-xs text-mist">
                    {rarityName(rar, lang)} {e.level ? `Lv ${e.level}` : ""} {e.rank ? `+${e.rank}` : ""}
                  </span>
                </ItemHotspot>
              );
            })}
          </div>
        </div>

        <div className="p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "levels")}</h3>
          <div className="space-y-2">
            {(player.classes ?? []).map((c) => {
              const pct = Math.max(0, Math.min(100, c.pct ?? 0));
              const main = c.name === player.class;
              return (
                <div key={c.name} className={cn("rounded-md border bg-ink p-3", main ? "border-teal/40" : "border-line")}>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      <ClassIcon name={c.name} /> {c.name}{" "}
                      {main ? <span className="ml-1 text-xs uppercase text-teal">{t(lang, "main")}</span> : null}
                    </span>
                    <span className="font-display text-xl font-semibold tabular-nums" style={{ color: CLASS_COLORS[c.name] }}>
                      {c.level}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="xp-fill h-full rounded-full" style={{ width: `${pct}%`, background: CLASS_COLORS[c.name] }} />
                  </div>
                  <div className="mt-1 text-xs text-mist">
                    {pct}% {t(lang, "xpNext")}
                  </div>
                </div>
              );
            })}
          </div>

          {player.classes?.length ? (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "radar")}</h3>
              <ClassRadar players={[player]} />
            </div>
          ) : null}

          {kills.length ? (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "recentPvp")}</h3>
              <ul className="space-y-1">
                {kills.slice(0, 8).map((k, i) => {
                  const won = k.killer?.toLowerCase() === player.name.toLowerCase();
                  const other = won ? k.victim : k.killer;
                  return (
                    <li key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-ink px-3 py-2 text-sm">
                      <span className={won ? "text-ok" : "text-danger"}>{won ? t(lang, "win") : t(lang, "loss")}</span>
                      <span>
                        {won ? t(lang, "vs") : t(lang, "by")}{" "}
                        <Link to="/players" search={{ name: other }} className="font-semibold hover:text-teal">
                          {other}
                        </Link>
                      </span>
                      <span className="text-xs text-mist">{k.server}</span>
                      <span className="text-xs text-mist">{timeAgo(k.time)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {player.achievements?.length ? <AchievementsList player={player} meta={achievements} /> : null}
        </div>
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-line bg-ink px-3 py-1.5 text-xs font-medium">{children}</span>;
}

function Companion({
  label,
  item,
  level,
  index,
}: {
  label: string;
  item?: string;
  level?: number;
  index: ItemIndex | null;
}) {
  const rec = item && index ? index.byId.get(item) ?? index.byName.get(item.toLowerCase()) : null;
  return (
    <ItemHotspot itemId={rec?.id ?? item} className="flex items-center gap-2 rounded-md border border-line bg-ink px-3 py-2">
      <ItemImg icon={rec?.icon ?? (item ? `item_images/${item}.png` : null)} name={rec?.itemName ?? item} size={28} />
      <div className="text-xs">
        <div className="text-mist">{label}</div>
        <div className="font-semibold">
          {rec?.itemName ?? item} {level ? `Lv ${level}` : ""}
        </div>
      </div>
    </ItemHotspot>
  );
}

function AchievementsList({ player, meta }: { player: Player; meta?: Record<string, AchievementMeta> }) {
  const lang = usePrefs((s) => s.lang);
  const rows = useMemo(() => player.achievements ?? [], [player.achievements]);
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-mist">
        {t(lang, "achievements")} {player.achPoints != null ? `· ${player.achPoints} pts` : ""}
      </h3>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {rows.map((a) => {
          const m = meta?.[String(a.id)];
          const mx = Math.max(m?.maxLevel ?? 0, m?.maxLevel2 ?? 0, 1);
          const pct = Math.min(100, (a.level / mx) * 100);
          return (
            <li key={a.id} className="rounded-md border border-line bg-ink px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{m?.name ?? `#${a.id}`}</span>
                <span className="tabular-nums text-mist">
                  Lv {a.level}
                  {mx ? ` / ${mx}` : ""}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
              </div>
              {m?.tip ? <p className="mt-1 text-xs text-mist">{m.tip}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

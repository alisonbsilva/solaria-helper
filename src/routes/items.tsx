import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchers, qk } from "@/lib/solaria/query";
import { rarityClass, rarityName } from "@/lib/solaria/format";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { ErrorBanner, Skeleton, EmptyState } from "@/components/error-banner";
import { ItemHotspot } from "@/components/item-modal";
import { ItemImg } from "@/components/item-img";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { dropsFor } from "@/lib/solaria/drops";

type Search = { q?: string; rarity?: string; cat?: string; kind?: string; mob?: string };

export const Route = createFileRoute("/items")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    rarity: typeof s.rarity === "string" ? s.rarity : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
    kind: typeof s.kind === "string" ? s.kind : undefined,
    mob: typeof s.mob === "string" ? s.mob : undefined,
  }),
  component: ItemsPage,
});

function kindOf(cat?: string, type?: number) {
  if (type === 1 || ["Bow", "Mace", "Sword", "Wand", "Ax", "Pick"].includes(cat ?? "")) return "weapon";
  if (["Head", "Chest", "Legs", "Foot", "Hand", "Hand2", "Belt"].includes(cat ?? "")) return "armor";
  if (["Necklace", "Ring", "Shield"].includes(cat ?? "")) return "accessory";
  if (cat === "Bag" || type === 2) return "bag";
  return "other";
}

function ItemsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const lang = usePrefs((s) => s.lang);
  const favItems = usePrefs((s) => s.favItems);
  const [q, setQ] = useState(search.q ?? "");
  const [limit, setLimit] = useState(80);
  const itemsQ = useQuery({ queryKey: qk.items(), queryFn: fetchers.items });
  const cats = [...new Set((itemsQ.data ?? []).map((i) => i.eq?.cat).filter(Boolean))] as string[];
  const list = useMemo(() => {
    let rows = itemsQ.data ?? [];
    const n = (search.q ?? "").toLowerCase();
    if (n) rows = rows.filter((i) => (i.itemName ?? i.id).toLowerCase().includes(n) || i.id.toLowerCase().includes(n));
    if (search.rarity) rows = rows.filter((i) => String(i.rarity ?? 0) === search.rarity);
    if (search.cat) rows = rows.filter((i) => i.eq?.cat === search.cat);
    if (search.kind) rows = rows.filter((i) => kindOf(i.eq?.cat, i.eq?.type) === search.kind);
    if (search.mob) rows = rows.filter((i) => dropsFor(i.id).some((drop) => drop.mob.toLowerCase().includes(search.mob!.toLowerCase())));
    return [...rows].sort((a, b) => (a.itemName ?? a.id).localeCompare(b.itemName ?? b.id));
  }, [itemsQ.data, search.q, search.rarity, search.cat, search.kind, search.mob]);

  const saved = (itemsQ.data ?? []).filter((i) => favItems.includes(i.id));
  const patch = (p: Partial<Search>) => navigate({ search: { ...search, ...p } });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-sm text-mist"><Info className="mt-0.5 size-4 shrink-0 text-teal" /><span><strong className="text-fog">Drops de mobs:</strong> a fonte oficial atual não expõe criatura, chance ou local de drop. Esta seção será preenchida automaticamente quando esses dados estiverem disponíveis, sem inventar informações.</span></div>
      <div className="flex flex-wrap gap-2">
        <input
          className="min-h-11 flex-1 rounded-md border border-line bg-surface px-3"
          placeholder={t(lang, "item")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => patch({ q: q || undefined })}
          onKeyDown={(e) => e.key === "Enter" && patch({ q: q || undefined })}
        />
        <select
          className="min-h-11 rounded-md border border-line bg-surface px-3"
          value={search.rarity ?? ""}
          onChange={(e) => patch({ rarity: e.target.value || undefined })}
        >
          <option value="">{t(lang, "allRarities")}</option>
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <option key={r} value={r}>
              {rarityName(r, lang)}
            </option>
          ))}
        </select>
        <select className="min-h-11 rounded-md border border-line bg-surface px-3" value={search.cat ?? ""} onChange={(e) => patch({ cat: e.target.value || undefined })}>
          <option value="">{t(lang, "allCats")}</option>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="min-h-11 rounded-md border border-line bg-surface px-3" value={search.kind ?? ""} onChange={(e) => patch({ kind: e.target.value || undefined })}>
          <option value="">{t(lang, "allTypes")}</option>
          <option value="weapon">{t(lang, "weapon")}</option>
          <option value="armor">{t(lang, "armor")}</option>
          <option value="accessory">{t(lang, "accessory")}</option>
          <option value="bag">{t(lang, "bag")}</option>
          <option value="other">{t(lang, "other")}</option>
        </select>
        <input className="min-h-11 rounded-md border border-line bg-surface px-3" placeholder="Filtrar por mob" value={search.mob??""} onChange={(e)=>patch({mob:e.target.value||undefined})}/>
        <span className="self-center text-sm tabular-nums text-mist">
          {list.length} {t(lang, "results")}
        </span>
      </div>
      {saved.length ? (
        <div>
          <h3 className="mb-2 text-sm font-bold">{t(lang, "favItems")}</h3>
          <div className="flex flex-wrap gap-2">
            {saved.map((i) => (
              <ItemHotspot key={i.id} itemId={i.id} className="flex items-center gap-2 rounded-md border border-line bg-surface px-2 py-1">
                <ItemImg icon={i.icon} name={i.itemName} size={24} />
                <span className="text-sm">{i.itemName}</span>
              </ItemHotspot>
            ))}
          </div>
        </div>
      ) : null}
      {itemsQ.isLoading ? <Skeleton className="h-48" /> : null}
      {itemsQ.isError ? <ErrorBanner onRetry={() => itemsQ.refetch()} /> : null}
      {!itemsQ.isLoading && !list.length ? <EmptyState>{t(lang, "emptyItems")}</EmptyState> : null}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="sticky-head bg-ink-2 text-left text-xs uppercase text-mist">
            <tr>
              <th className="px-2 py-2" />
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">{t(lang, "item")}</th>
              <th className="px-2 py-2">{t(lang, "category")}</th>
              <th className="px-2 py-2">{t(lang, "rarity")}</th>
              <th className="px-2 py-2">Dropa de</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, limit).map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="px-2 py-2">
                  <ItemHotspot itemId={i.id}>
                    <ItemImg icon={i.icon} name={i.itemName} />
                  </ItemHotspot>
                </td>
                <td className="px-2 py-2 font-mono text-xs text-mist">{i.id}</td>
                <td className="px-2 py-2">
                  <ItemHotspot itemId={i.id} className="font-semibold hover:text-teal">
                    {i.itemName}
                  </ItemHotspot>
                </td>
                <td className="px-2 py-2 text-mist">{i.eq?.cat ?? "—"}</td>
                <td className={cn("px-2 py-2", rarityClass(i.rarity))}>{rarityName(i.rarity, lang)}</td>
                <td className="px-2 py-2 text-mist">{dropsFor(i.id).map((drop)=>drop.mob).join(", ")||"Sem fonte oficial"}</td>
              </tr>
            ))}
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

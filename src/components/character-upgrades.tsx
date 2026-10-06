import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Bell, Coins, ShieldCheck, Sparkles, Target } from "lucide-react";
import type { Offer, Player } from "@/lib/solaria/types";
import type { ItemIndex } from "@/lib/solaria/equip";
import { eqType, filterClassEquip, findItem } from "@/lib/solaria/equip";
import { compareInspect, inspectItem, instanceFromEquip, instanceFromOffer } from "@/lib/solaria/tooltip";
import { fetchers, qk } from "@/lib/solaria/query";
import { formatGold, formatNumber, unitPrice } from "@/lib/solaria/format";
import { usePrefs } from "@/lib/solaria/store";
import { ItemHotspot } from "./item-modal";
import { ItemImg } from "./item-img";
import { cn } from "@/lib/utils";

type Focus = "balanced" | "pvp" | "pve" | "farm" | "defense";

const FOCUS: { key: Focus; label: string }[] = [
  { key: "balanced", label: "Equilibrado" },
  { key: "pve", label: "PvE" },
  { key: "pvp", label: "PvP" },
  { key: "farm", label: "Farm" },
  { key: "defense", label: "Defesa" },
];

const MODE_BONUS: Record<Focus, Record<string, number>> = {
  balanced: {},
  pve: { Attack: 2, Damage: 2, Magic: 2, Melee: 2, Distance: 2, Skill: 1.5 },
  pvp: { Crit: 3, Speed: 2, Defense: 2, Armor: 1.5, Damage: 2 },
  farm: { Speed: 3, Capacity: 3, Mining: 3, Logging: 3, "Regen health": 1.5, "Regen mana": 1.5 },
  defense: { Defense: 4, Armor: 3, "Regen health": 2, Speed: 1.2 },
};

type Upgrade = {
  offer: Offer;
  itemId: string;
  itemName: string;
  icon?: string;
  currentName: string;
  slot: string;
  score: number;
  gains: number;
  losses: number;
  price: number;
};

function isClassCompatible(requiredClass: string | undefined, activeClass: string) {
  if (!requiredClass || requiredClass === activeClass) return true;
  // The game catalog calls the bow class "Hunter", while character profiles
  // may expose the same class as "Archer".
  return requiredClass === "Hunter" && activeClass === "Archer";
}

export function CharacterUpgrades({ player, index }: { player: Player; index: ItemIndex | null }) {
  const lang = usePrefs((state) => state.lang);
  const favItems = usePrefs((state) => state.favItems);
  const toggleFavItem = usePrefs((state) => state.toggleFavItem);
  const priceAlerts = usePrefs((state) => state.priceAlerts);
  const setPriceAlert = usePrefs((state) => state.setPriceAlert);
  const [focus, setFocus] = useState<Focus>("balanced");
  const [budget, setBudget] = useState("");
  const marketQ = useQuery({ queryKey: qk.market(), queryFn: fetchers.market });
  const activeClass = player.class || player.classes?.[0]?.name || "Warrior";

  const analysis = useMemo(() => {
    if (!index || !marketQ.data) return { upgrades: [] as Upgrade[], nextTier: null as number | null };
    const equipped = filterClassEquip(player.equipment, activeClass, index);
    const playerLevel = player.level ?? 0;

    // Find one global tier first. This makes the recommendation follow the
    // character level (Lv 96 => Lv 100), instead of the level of an equipped
    // item that could be unusually high or incorrectly recorded.
    let nextTier: number | null = null;
    for (const offer of marketQ.data.offers) {
      const candidate = findItem(index, offer.item);
      if (!candidate) continue;
      const candidateIns = inspectItem(candidate, instanceFromOffer(offer), lang);
      if (candidateIns.level <= playerLevel || !isClassCompatible(candidateIns.classReq, activeClass)) continue;
      const fitsAnEquippedSlot = equipped.some((current) => {
        const currentRec = findItem(index, current.item);
        if (!currentRec) return false;
        return eqType(index, current) === 1 ? candidate.eq?.type === 1 : candidate.eq?.cat === currentRec.eq?.cat;
      });
      if (fitsAnEquippedSlot && (nextTier == null || candidateIns.level < nextTier)) nextTier = candidateIns.level;
    }

    if (nextTier == null) return { upgrades: [] as Upgrade[], nextTier };
    const results: Upgrade[] = [];
    for (const current of equipped) {
      const currentRec = findItem(index, current.item);
      if (!currentRec) continue;
      const currentIns = inspectItem(currentRec, instanceFromEquip(current), lang);
      let best: Upgrade | null = null;
      for (const offer of marketQ.data.offers) {
        const candidate = findItem(index, offer.item);
        if (!candidate || candidate.id === currentRec.id) continue;
        if (eqType(index, current) === 1 ? candidate.eq?.type !== 1 : candidate.eq?.cat !== currentRec.eq?.cat) continue;
        const candidateIns = inspectItem(candidate, instanceFromOffer(offer), lang);
        if (!isClassCompatible(candidateIns.classReq, activeClass) || candidateIns.level !== nextTier) continue;
        const comparison = compareInspect(candidateIns, currentIns);
        const modeScore = comparison.rows.reduce((total, row) => {
          if (row.delta == null) return total;
          return total + row.delta * (MODE_BONUS[focus][row.key] ?? 1);
        }, comparison.score);
        if (modeScore <= 4) continue;
        const price = unitPrice(offer.gold, offer.amount) ?? offer.gold ?? 0;
        const row: Upgrade = {
          offer,
          itemId: candidate.id,
          itemName: candidate.itemName ?? candidate.id,
          icon: candidate.icon,
          currentName: currentRec.itemName ?? currentRec.id,
          slot: currentRec.eq?.cat ?? "Equipamento",
          score: modeScore,
          gains: comparison.winsA,
          losses: comparison.winsB,
          price,
        };
        if (!best || row.score > best.score || (row.score === best.score && row.price < best.price)) best = row;
      }
      if (best) results.push(best);
    }
    return { upgrades: results.sort((a, b) => b.score - a.score).slice(0, 6), nextTier };
  }, [activeClass, focus, index, lang, marketQ.data, player.equipment, player.level]);

  const { upgrades, nextTier } = analysis;
  const budgetValue = Number(budget) || 0;
  const visibleUpgrades = budgetValue > 0 ? upgrades.filter((upgrade) => upgrade.price <= budgetValue) : upgrades;
  const total = visibleUpgrades.reduce((sum, item) => sum + item.price, 0);

  return (
    <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-teal"><Sparkles className="size-5" /><span className="text-xs font-bold uppercase tracking-wider">Análise inteligente</span></div>
          <h2 className="mt-1 font-display text-xl font-semibold">Próximos upgrades</h2>
          <p className="mt-1 text-sm text-mist">{nextTier != null ? `Próximo tier disponível: Lv ${nextTier}, acima do seu Lv ${player.level ?? 0}, para ${activeClass}.` : `Buscando o primeiro tier acima do seu Lv ${player.level ?? 0}, para ${activeClass}.`}</p>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Foco da build">
          {FOCUS.map((mode) => <button key={mode.key} onClick={() => setFocus(mode.key)} className={cn("min-h-9 rounded-md border px-3 text-xs font-semibold", focus === mode.key ? "border-teal bg-teal/10 text-teal" : "border-line text-mist hover:text-fog")}>{mode.label}</button>)}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 rounded-md border border-line bg-ink p-3 sm:flex-row sm:items-center">
        <label className="text-sm font-semibold" htmlFor="upgrade-budget">Seu orçamento</label>
        <input id="upgrade-budget" type="number" min="0" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Sem limite" className="min-h-10 rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-teal sm:w-48" />
        <span className="text-xs text-mist">Filtra cada sugestão pelo preço unitário e mantém apenas opções compráveis agora.</span>
      </div>

      {marketQ.isLoading ? <div className="mt-4 h-24 animate-pulse rounded-md bg-ink-2" /> : null}
      {!marketQ.isLoading && !visibleUpgrades.length ? <div className="mt-4 rounded-md border border-dashed border-line bg-ink p-4 text-sm text-mist"><ShieldCheck className="mb-2 size-5 text-ok" />{upgrades.length && budgetValue > 0 ? "Nenhum upgrade deste tier cabe no orçamento informado." : nextTier == null ? "Ainda não há itens acima do seu nível à venda para os seus slots." : `Não há ganho claro nos itens do Lv ${nextTier} para este foco agora.`}</div> : null}
      {visibleUpgrades.length ? (
        <>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {visibleUpgrades.map((upgrade, indexPosition) => (
              <article key={`${upgrade.itemId}-${upgrade.slot}-${indexPosition}`} className="rounded-md border border-line bg-ink p-3">
                <div className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-teal/10 text-xs font-bold text-teal">{indexPosition + 1}</span>
                  <ItemHotspot itemId={upgrade.itemId} instance={instanceFromOffer(upgrade.offer)} className="shrink-0"><ItemImg icon={upgrade.icon} name={upgrade.itemName} /></ItemHotspot>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wide text-mist">{upgrade.slot} · substitui {upgrade.currentName}</div>
                    <ItemHotspot itemId={upgrade.itemId} instance={instanceFromOffer(upgrade.offer)} className="mt-0.5 block truncate font-semibold hover:text-teal">{upgrade.itemName}</ItemHotspot>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs"><span className="text-ok">+{upgrade.gains} ganhos</span><span className="text-danger">{upgrade.losses} perdas</span><span className="text-gold">{formatGold(upgrade.price)}</span></div>
                  </div>
                  <button onClick={() => { if (!favItems.includes(upgrade.itemId)) toggleFavItem(upgrade.itemId); setPriceAlert(upgrade.itemId, priceAlerts[upgrade.itemId] ? null : upgrade.price); }} className={cn("size-10 rounded-md border border-line text-mist", priceAlerts[upgrade.itemId] && "border-gold/40 bg-gold/10 text-gold")} aria-label="Criar alerta de preço"><Bell className="mx-auto size-4" /></button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 rounded-md border border-line bg-ink-2 p-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-3"><Coins className="size-5 text-gold" /><div><div className="text-xs uppercase tracking-wide text-mist">Custo estimado da evolução</div><strong className="font-display text-xl text-gold">{formatGold(total)}</strong></div></div>
            <div className="text-xs text-mist"><Target className="mr-1 inline size-4" />{formatNumber(visibleUpgrades.length)} slots com melhoria disponível</div>
            <Link to="/market" search={{ deals: "1", sort: "unit" }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal px-4 text-sm font-semibold text-ink">Ver oportunidades <ArrowUpRight className="size-4" /></Link>
          </div>
        </>
      ) : null}
    </section>
  );
}

import type { CatalogItem, EquipPiece, Offer } from "./types";
import type { ItemIndex } from "./equip";
import { findItem } from "./equip";
import { inspectItem, instanceFromOffer, matchEquipped } from "./tooltip";
import { unitPrice } from "./format";

const UNIVERSAL = new Set(["Shield", "Necklace", "Ring", "Bag", "Ax", "Pick"]);

export function offerClass(rec: CatalogItem | null, offer: Offer) {
  if (!rec) return "Desconhecida";
  return inspectItem(rec, instanceFromOffer(offer), "pt").classReq || "Desconhecida";
}

export function offerPower(offer: Offer) {
  return (offer.level ?? 0) + (offer.rank ?? 0) * 10 + (offer.rarety ?? offer.rarity ?? 0) * 25;
}

export type OfferAdvice = {
  compatible: boolean;
  levelOk: boolean;
  upgrade: boolean;
  delta: number;
  score: number;
  className: string;
  reason: string;
  equipped: EquipPiece | null;
};

export function adviseOffer(args: {
  offer: Offer;
  rec: CatalogItem | null;
  playerClass?: string;
  playerLevel?: number;
  equipment?: EquipPiece[];
  index: ItemIndex | null;
  median?: number;
}): OfferAdvice {
  const { offer, rec, playerClass = "", playerLevel = 0, equipment, index, median } = args;
  const className = offerClass(rec, offer);
  const cat = rec?.eq?.cat ?? "";
  const compatible = !playerClass || UNIVERSAL.has(cat) || className === "Todas as classes" || className.toLowerCase() === playerClass.toLowerCase();
  const levelOk = !playerLevel || (offer.level ?? 0) <= playerLevel;
  const equipped = rec && playerClass ? matchEquipped(equipment, rec, index, playerClass) : null;
  const currentPower = equipped ? (equipped.level ?? 0) + (equipped.rank ?? 0) * 10 + (equipped.rarety ?? equipped.rarity ?? 0) * 25 : 0;
  const delta = offerPower(offer) - currentPower;
  const upgrade = compatible && levelOk && delta > 0;
  const price = unitPrice(offer.gold, offer.amount) ?? Number.POSITIVE_INFINITY;
  const dealBonus = median && median > 0 && Number.isFinite(price) ? Math.max(-20, Math.min(35, ((median - price) / median) * 50)) : 0;
  const score = (compatible ? 45 : -80) + (levelOk ? 20 : -45) + Math.max(-30, Math.min(60, delta / 4)) + dealBonus;
  const reason = !compatible
    ? `Incompatível com ${playerClass || "sua classe"}`
    : !levelOk
      ? `Exige Lv ${offer.level ?? 0}; você está no Lv ${playerLevel}`
      : upgrade
        ? `Upgrade estimado de +${delta} pontos para este slot`
        : equipped
          ? `Seu equipamento atual é igual ou superior (${Math.abs(delta)} pts)`
          : "Compatível; você ainda não possui item identificado neste slot";
  return { compatible, levelOk, upgrade, delta, score, className, reason, equipped };
}

export function smartOfferSearch(offer: Offer, rec: CatalogItem | null, query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const eq = rec?.eq ?? {};
  const attrs = Object.entries(eq).filter(([, value]) => typeof value === "number" && value !== 0).map(([key]) => key);
  const cls = offerClass(rec, offer);
  const haystack = [offer.item, rec?.id, rec?.itemName, offer.player, offer.server, rec?.eq?.cat, cls,
    `lv${offer.level ?? 0}`, `level${offer.level ?? 0}`, `rank${offer.rank ?? 0}`, `raridade${offer.rarety ?? offer.rarity ?? rec?.rarity ?? 0}`,
    rec?.tooltip, rec?.tooltipPT, ...attrs].filter(Boolean).join(" ").toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function bestRecommendedOffer(offers: Offer[], items: ItemIndex | null, playerClass?: string, playerLevel?: number, equipment?: EquipPiece[], medians?: Map<string, number>) {
  return offers.map((offer) => {
    const rec = findItem(items, offer.item);
    return { offer, rec, advice: adviseOffer({ offer, rec, playerClass, playerLevel, equipment, index: items, median: offer.item ? medians?.get(offer.item) : undefined }) };
  }).filter((row) => row.advice.compatible && row.advice.levelOk).sort((a, b) => b.advice.score - a.advice.score || (unitPrice(a.offer.gold, a.offer.amount) ?? Infinity) - (unitPrice(b.offer.gold, b.offer.amount) ?? Infinity))[0] ?? null;
}

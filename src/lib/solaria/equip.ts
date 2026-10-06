import type { CatalogItem, EquipPiece } from "./types";

export const CLASS_ID: Record<string, number> = {
  Warrior: 0,
  Archer: 1,
  Hunter: 1,
  Mage: 2,
  Priest: 3,
  Defense: 4,
};

export const CLASS_COLORS: Record<string, string> = {
  Warrior: "var(--color-class-warrior)",
  Archer: "var(--color-class-archer)",
  Hunter: "var(--color-class-archer)",
  Mage: "var(--color-class-mage)",
  Priest: "var(--color-class-priest)",
  Defense: "var(--color-class-defense)",
};

const UNIVERSAL = new Set(["Shield", "Necklace", "Ring", "Bag"]);

export type ItemIndex = {
  byId: Map<string, CatalogItem>;
  byName: Map<string, CatalogItem>;
};

export function buildItemIndex(items: CatalogItem[]): ItemIndex {
  const byId = new Map<string, CatalogItem>();
  const byName = new Map<string, CatalogItem>();
  for (const it of items) {
    byId.set(it.id, it);
    if (it.itemName) byName.set(it.itemName.toLowerCase(), it);
    byId.set(it.id.toLowerCase(), it);
  }
  return { byId, byName };
}

export function findItem(index: ItemIndex | null, key?: string | null) {
  if (!index || !key) return null;
  return index.byId.get(key) ?? index.byId.get(key.toLowerCase()) ?? index.byName.get(key.toLowerCase()) ?? null;
}

export function eqCat(index: ItemIndex | null, eq: EquipPiece) {
  return findItem(index, eq.item)?.eq?.cat ?? "";
}

export function eqType(index: ItemIndex | null, eq: EquipPiece) {
  return findItem(index, eq.item)?.eq?.type ?? 0;
}

export function filterClassEquip(
  equipment: EquipPiece[] | undefined,
  className: string,
  index: ItemIndex | null,
) {
  const c = CLASS_ID[className] ?? 0;
  const base = c === 0 ? 0 : 12 + (c - 1) * 8;
  return (equipment ?? []).filter(
    (e) => UNIVERSAL.has(eqCat(index, e)) || (e.slot >= base && e.slot <= base + 7),
  );
}

export type DollSlot =
  | "Necklace"
  | "Helmet"
  | "Shield"
  | "HandR"
  | "Armor"
  | "HandL"
  | "Weapon"
  | "Legs"
  | "Belt"
  | "Ring"
  | "Boots"
  | "Ring2"
  | "Bag"
  | "Blank";

export const DOLL_ORDER: { key: DollSlot; label: string }[] = [
  { key: "Necklace", label: "Necklace" },
  { key: "Helmet", label: "Helmet" },
  { key: "Shield", label: "Shield" },
  { key: "HandR", label: "Hand R" },
  { key: "Armor", label: "Armor" },
  { key: "HandL", label: "Hand L" },
  { key: "Weapon", label: "Weapon" },
  { key: "Legs", label: "Legs" },
  { key: "Belt", label: "Belt" },
  { key: "Ring", label: "Ring" },
  { key: "Boots", label: "Boots" },
  { key: "Ring2", label: "Ring" },
  { key: "Blank", label: "" },
  { key: "Bag", label: "Bag" },
  { key: "Blank", label: "" },
];

export function buildPaperDoll(items: EquipPiece[], index: ItemIndex | null) {
  const byCat: Record<string, EquipPiece> = {};
  const rings: EquipPiece[] = [];
  let weapon: EquipPiece | undefined;
  for (const e of items) {
    const cat = eqCat(index, e);
    if (cat === "Ring") rings.push(e);
    else if (eqType(index, e) === 1) {
      if (!weapon) weapon = e;
    } else if (cat) byCat[cat] = e;
  }
  const map: Partial<Record<DollSlot, EquipPiece>> = {
    Necklace: byCat.Necklace,
    Helmet: byCat.Head,
    Shield: byCat.Shield,
    HandR: byCat.Hand,
    Armor: byCat.Chest,
    HandL: byCat.Hand2,
    Weapon: weapon,
    Legs: byCat.Legs,
    Belt: byCat.Belt,
    Ring: rings[0],
    Boots: byCat.Foot,
    Ring2: rings[1],
    Bag: byCat.Bag,
  };
  return map;
}

export function companionItem(raw: unknown): { item?: string; level?: number; name?: string } | null {
  if (!raw) return null;
  if (typeof raw === "string") return { name: raw, item: raw };
  if (typeof raw === "object") {
    const o = raw as { item?: string; name?: string; level?: number };
    if (!o.item && !o.name) return null;
    return o;
  }
  return null;
}

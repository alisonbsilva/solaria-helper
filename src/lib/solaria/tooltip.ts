import type { CatalogItem, EquipPiece, ItemEq, Lang, Offer } from "./types";
import { eqCat, eqType, filterClassEquip, findItem, type ItemIndex } from "./equip";
import { rarityName } from "./format";

export type ItemInstance = {
  level?: number;
  rank?: number;
  rarity?: number;
  rarety?: number;
  attr?: number;
};

export type TipLine = {
  key: string;
  label: string;
  display: string;
  n: number | null;
  flag?: boolean;
};

export type Inspected = {
  rec: CatalogItem;
  rarety: number;
  rank: number;
  level: number;
  attr: number;
  classReq: string;
  cat: string;
  type: number;
  lines: TipLine[];
};

const CLASS_NAMES = ["Warrior", "Archer", "Mage", "Priest"] as const;
const WEAPON_CLASS: Record<string, string> = { Sword: "Warrior", Bow: "Archer", Wand: "Mage", Mace: "Priest" };
const UNIVERSAL_CATS = new Set(["Shield", "Necklace", "Ring", "Bag", "Ax", "Pick"]);
const HEAVY: Record<string, number> = {
  Head: 0.15, Chest: 0.28, Legs: 0.2, Foot: 0.15, Hand: 0.1, Hand2: 0.1, Belt: 0.12, Shield: 0.2,
};

const LABELS: Record<Lang, Record<string, string>> = {
  pt: {
    Level: "Level", Logging: "Madeira", Mining: "Mineração", Capacity: "Capacidade", Class: "Classe",
    Armor: "Armadura", Attack: "Ataque", Sharp: "Corte", Crit: "Crítico",
    "Regen health": "Regen vida", "Regen mana": "Regen mana", Speed: "Velocidade", Damage: "Dano", Skill: "Skill",
    Intelligence: "Inteligência", Magic: "Magia", Melee: "Melee", Distance: "Distância", Defense: "Defesa",
    Rank: "Rank", Rarity: "Raridade", AllClasses: "Todas as classes", CatalogClasses: "Classe varia por oferta — escolha uma abaixo", deathNeck: "Evita perda de XP na morte (1 uso)",
    xpStop: "Bloqueia ganho de XP base", aggro: "Puxa aggro dos monstros ao redor",
  },
  en: {
    Level: "Level", Logging: "Logging", Mining: "Mining", Capacity: "Capacity", Class: "Class",
    Armor: "Armor", Attack: "Attack", Sharp: "Sharp", Crit: "Crit",
    "Regen health": "Regen health", "Regen mana": "Regen mana", Speed: "Speed", Damage: "Damage", Skill: "Skill",
    Intelligence: "Intelligence", Magic: "Magic", Melee: "Melee", Distance: "Distance", Defense: "Defense",
    Rank: "Rank", Rarity: "Rarity", AllClasses: "All classes", CatalogClasses: "Class varies by offer — choose one below", deathNeck: "Avoids experience death penalties, one use only",
    xpStop: "Stop base experience gains", aggro: "Aggro the monsters around you",
  },
  es: {
    Level: "Nivel", Logging: "Madera", Mining: "Minería", Capacity: "Capacidad", Class: "Clase",
    Armor: "Armadura", Attack: "Ataque", Sharp: "Corte", Crit: "Crítico",
    "Regen health": "Regen vida", "Regen mana": "Regen maná", Speed: "Velocidad", Damage: "Daño", Skill: "Skill",
    Intelligence: "Inteligencia", Magic: "Magia", Melee: "Melee", Distance: "Distancia", Defense: "Defensa",
    Rank: "Rank", Rarity: "Rareza", AllClasses: "Todas las clases", CatalogClasses: "La clase varía por oferta — elige una abajo", deathNeck: "Evita pérdida de XP al morir (1 uso)",
    xpStop: "Detiene la XP base", aggro: "Agro de los monstruos alrededor",
  },
};

function trunc(n: number) {
  return Math.trunc(n);
}
function fmt(n: number) {
  return String(Math.round(n * 100) / 100);
}
function rarityMult(rarety: number, cat: string) {
  return cat === "Ring" || cat === "Necklace" ? 1 + rarety * 0.5 : 1;
}
function attackMedium(level: number) {
  return trunc(20 + 0.13 * level);
}
function signed(b: number | undefined, rarety: number, rank: number, cat: string) {
  if (!b) return 0;
  const val = trunc(Math.abs(b) * rarityMult(rarety, cat)) + rank;
  return b >= 0 ? val : -val;
}

export function instRarety(inst?: ItemInstance | null, rec?: CatalogItem | null) {
  if (inst?.rarety && inst.rarety > 0) return inst.rarety;
  if (inst?.rarity && inst.rarity > 0) return inst.rarity;
  return rec?.rarity ?? 0;
}

export function inspectItem(rec: CatalogItem, inst: ItemInstance | null | undefined, lang: Lang): Inspected {
  const eq = rec.eq ?? {};
  const cat = eq.cat || "";
  const type = eq.type || 0;
  const elite = Number(eq.elite ?? 0);
  const rarety = instRarety(inst, rec);
  const rank = inst?.rank ?? 0;
  const level = inst?.level ?? 0;
  const hasInstance = inst != null;
  const hasClassAttribute = inst?.attr != null && inst.attr >= 0 && inst.attr < CLASS_NAMES.length;
  const attr = inst?.attr ?? -1;
  const RM = rarityMult(rarety, cat);
  const label = (k: string) => LABELS[lang][k] ?? LABELS.en[k] ?? k;
  const lines: TipLine[] = [];
  const push = (key: string, display: string, n: number | null, flag = false) =>
    lines.push({ key, label: label(key), display, n, flag });

  if (cat === "Ax") push("Logging", String(level), level);
  else if (cat === "Pick") push("Mining", String(level), level);
  else if (level > 1) push("Level", String(level), level);

  if (rank > 0) push("Rank", `+${rank}`, rank);
  if (rarety > 0) push("Rarity", rarityName(rarety, lang), rarety);

  if (Number(eq.bag) > 0) push("Capacity", String(eq.bag), Number(eq.bag));

  let classReq = label("AllClasses");
  if (type === 1 && !UNIVERSAL_CATS.has(cat)) {
    classReq = WEAPON_CLASS[cat] || "";
  } else if (!UNIVERSAL_CATS.has(cat)) {
    classReq = hasClassAttribute ? CLASS_NAMES[attr] : label("CatalogClasses");
  }
  if (classReq) push("Class", classReq, null);

  if (eq.deathNeck) push("deathNeck", label("deathNeck"), null, true);
  if (eq.xpStop) push("xpStop", label("xpStop"), null, true);
  if (eq.aggro) push("aggro", label("aggro"), null, true);

  if (hasInstance && type === 0 && !eq.noArmor) {
    const armor = rarety + Math.max(1, rank + trunc(((level + elite + rarety * 2) * 2) * (HEAVY[cat] || 0)));
    if (armor > 0) push("Armor", String(armor), armor);
  }
  if (type === 1 && (hasInstance || Number(eq.data0) > 0)) {
    const atk = Number(eq.data0) > 0 ? Number(eq.data0) : Math.max(1, attackMedium(level + elite) + (rank + rarety) * 2);
    if (atk > 0) {
      if (cat === "Ax" || cat === "Pick") push("Sharp", String(trunc(atk * 1.5)), trunc(atk * 1.5));
      else push("Attack", String(atk), atk);
    }
  }
  if (Number(eq.crit) > 0) {
    const v = Number(eq.crit) * RM + rank * 0.01;
    push("Crit", `+${fmt(v)}%`, v);
  }
  if (Number(eq.regenHealth) > 0) {
    const v = trunc(Number(eq.regenHealth) * RM) + rank * 2;
    push("Regen health", `+${v}`, v);
  }
  if (Number(eq.regenMana) > 0) {
    const v = trunc(Number(eq.regenMana) * RM) + rank * 2;
    push("Regen mana", `+${v}`, v);
  }
  if (Number(eq.speed) > 0) {
    const v = trunc((Number(eq.speed) * (1 + rarety * 0.75) + rank * 0.01) * 100);
    push("Speed", `+${v}`, v);
  }
  if (Number(eq.dmg) > 0) {
    const v = trunc(Number(eq.dmg) * RM) + rank;
    push("Damage", `+${v}`, v);
  }
  if (Number(eq.skillXp) > 0) {
    const v = Number(eq.skillXp) * 100;
    push("Skill", `+${fmt(v)}%`, v);
  }

  const bonus = (key: string, base: unknown) => {
    const v = signed(Number(base) || 0, rarety, rank, cat);
    if (v) push(key, `${v > 0 ? "+" : ""}${v}`, v);
  };
  bonus("Intelligence", eq.intel);
  bonus("Magic", eq.magic);
  bonus("Melee", eq.melee);
  bonus("Distance", eq.dist);
  bonus("Defense", eq.def);
  bonus("Mining", (eq as ItemEq).mine);
  bonus("Logging", (eq as ItemEq).log);

  return { rec, rarety, rank, level, attr, classReq, cat, type, lines };
}

export function instanceFromEquip(e: EquipPiece): ItemInstance {
  return { level: e.level, rank: e.rank, rarety: e.rarety, rarity: e.rarity, attr: e.attr };
}

export function instanceFromOffer(o: Offer): ItemInstance {
  return { level: o.level, rank: o.rank, rarety: o.rarety, rarity: o.rarity, attr: o.attr };
}

export function matchEquipped(
  equipment: EquipPiece[] | undefined,
  rec: CatalogItem,
  index: ItemIndex | null,
  className: string,
) {
  const filtered = filterClassEquip(equipment, className, index);
  const cat = rec.eq?.cat ?? "";
  const type = rec.eq?.type ?? 0;
  if (type === 1) return filtered.find((e) => eqType(index, e) === 1) ?? null;
  if (cat === "Ring") {
    const rings = filtered.filter((e) => eqCat(index, e) === "Ring");
    if (!rings.length) return null;
    const score = (e: EquipPiece) => (e.level ?? 0) + (e.rank ?? 0) * 20 + (e.rarety ?? e.rarity ?? 0) * 25;
    return [...rings].sort((a, b) => score(a) - score(b))[0];
  }
  return filtered.find((e) => eqCat(index, e) === cat) ?? null;
}

const WEIGHT: Record<string, number> = {
  Armor: 2, Attack: 2, Sharp: 2, Defense: 3, Melee: 3, Magic: 3, Distance: 3, Intelligence: 3,
  Crit: 80, "Regen health": 1, "Regen mana": 1, Speed: 1, Damage: 2, Capacity: 0.4,
  Level: 0.4, Rank: 10, Rarity: 14, Logging: 0.3, Mining: 0.3, Skill: 1,
};

export type CompareRow = {
  key: string;
  label: string;
  a: string;
  b: string;
  delta: number | null;
  winner: "a" | "b" | "tie";
};

export function compareInspect(a: Inspected, b: Inspected) {
  const keys = [...new Set([...a.lines, ...b.lines].filter((l) => !l.flag).map((l) => l.key))];
  const pick = (ins: Inspected, key: string) => ins.lines.find((l) => l.key === key);
  const rows: CompareRow[] = keys.map((key) => {
    const la = pick(a, key);
    const lb = pick(b, key);
    const na = la?.n ?? null;
    const nb = lb?.n ?? null;
    let winner: "a" | "b" | "tie" = "tie";
    let delta: number | null = null;
    if (na != null && nb != null) {
      delta = na - nb;
      if (delta > 0.0001) winner = "a";
      else if (delta < -0.0001) winner = "b";
    } else if (na != null && nb == null) winner = "a";
    else if (nb != null && na == null) winner = "b";
    return {
      key,
      label: la?.label ?? lb?.label ?? key,
      a: la?.display ?? "—",
      b: lb?.display ?? "—",
      delta,
      winner,
    };
  });
  let score = 0;
  for (const r of rows) {
    if (r.delta == null) continue;
    score += r.delta * (WEIGHT[r.key] ?? 1);
  }
  const winsA = rows.filter((r) => r.winner === "a").length;
  const winsB = rows.filter((r) => r.winner === "b").length;
  const verdict: "better" | "worse" | "mixed" | "equal" =
    rows.every((r) => r.winner === "tie")
      ? "equal"
      : score > 4
        ? "better"
        : score < -4
          ? "worse"
          : winsA && winsB
            ? "mixed"
            : winsA
              ? "better"
              : "worse";
  return { rows, score, winsA, winsB, verdict };
}

export function tooltipText(rec: CatalogItem | null, lang: Lang) {
  if (!rec) return "";
  return lang === "pt" ? rec.tooltipPT || rec.tooltip || "" : lang === "es" ? rec.tooltipES || rec.tooltip || "" : rec.tooltip || "";
}

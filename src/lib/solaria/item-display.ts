import type { CatalogItem } from "./types";

/** Converts API keys such as `Hand4_2` into a readable fallback label. */
export function itemLabel(item?: string | null, record?: CatalogItem | null) {
  if (record?.itemName?.trim()) return record.itemName;
  if (!item) return "Item desconhecido";
  const readable = item
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/([A-Za-z])(\d+)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return readable.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

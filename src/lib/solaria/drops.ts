export type DropSource = { mob: string; chance?: number; respawn?: string; location?: string };
// Intentionally empty until an official/reliable source is available.
export const DROP_DATA: Record<string, DropSource[]> = {};
export function dropsFor(itemId: string) { return DROP_DATA[itemId] ?? DROP_DATA[itemId.toLowerCase()] ?? []; }

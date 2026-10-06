export type ClassInfo = {
  name: string;
  icon?: string;
  level: number;
  pct: number;
};

export type EquipPiece = {
  slot: number;
  item: string;
  rarety?: number;
  rarity?: number;
  rank?: number;
  attr?: number;
  level?: number;
};

export type Kill = {
  killer: string;
  victim: string;
  killerPvp?: number;
  victimPvp?: number;
  server?: string;
  time?: string;
};

export type AchievementProg = { id: number; level: number };

export type Companion = {
  item?: string;
  name?: string;
  level?: number;
};

export type Player = {
  name: string;
  level?: number;
  class?: string;
  classId?: number;
  grade?: number;
  vip?: boolean;
  online?: boolean;
  lastSeen?: string;
  permadeath?: boolean;
  server?: string | null;
  gold?: number;
  honor?: number;
  guild?: string | null;
  created?: string;
  classes?: ClassInfo[];
  equipment?: EquipPiece[];
  kills?: Kill[];
  pet?: Companion | string | null;
  mount?: Companion | string | null;
  achPoints?: number;
  achievements?: AchievementProg[];
};

export type PlayersBoard = {
  count?: number;
  board?: string;
  realm?: string;
  players: Player[];
};

export type Guild = {
  name: string;
  points?: number;
  members?: number;
};

export type GuildMember = {
  name: string;
  level?: number;
  rank?: string;
  rankId?: number;
  online?: boolean;
  lastSeen?: string;
  class?: string;
};

export type GuildDetail = {
  guild?: string;
  count?: number;
  points?: number;
  members: GuildMember[];
};

export type Offer = {
  item: string;
  amount?: number;
  gold?: number;
  coins?: number;
  player?: string;
  online?: boolean;
  server?: string;
  serverId?: number;
  level?: number;
  rarety?: number;
  rarity?: number;
  rank?: number;
  attr?: number;
  permadeath?: boolean;
};

export type Market = {
  updated?: string;
  count?: number;
  offers: Offer[];
};

export type WorldBoss = {
  name: string;
  tier?: number;
  level?: number;
  x?: number;
  y?: number;
  since?: number;
};

export type UpcomingBoss = {
  name?: string;
  tier?: number;
  level?: number;
  eta?: number;
};

export type BossServer = {
  server: string;
  count?: number;
  bosses?: WorldBoss[];
  upcoming?: UpcomingBoss[];
};

export type BossesPayload = {
  total?: number;
  now?: number;
  servers: BossServer[];
};

export type ItemEq = {
  type?: number;
  cat?: string;
  bag?: number;
  def?: number;
  melee?: number;
  magic?: number;
  intel?: number;
  dist?: number;
  crit?: number;
  speed?: number;
  regenHealth?: number;
  regenMana?: number;
  [key: string]: unknown;
};

export type ItemInstance = {
  level?: number;
  rank?: number;
  rarity?: number;
  rarety?: number;
  attr?: number;
};

export type CatalogItem = {
  id: string;
  itemName?: string;
  rarity?: number;
  tooltip?: string;
  tooltipES?: string;
  tooltipPT?: string;
  icon?: string;
  eq?: ItemEq;
};

export type AchievementMeta = {
  name?: string;
  tip?: string;
  amount?: number;
  maxLevel?: number;
  maxLevel2?: number;
  title?: string;
  title2?: string;
};

export type Lang = "pt" | "en" | "es";

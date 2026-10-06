import { Heart, Shield, Sparkles, Sword, Target } from "lucide-react";
import { CLASS_COLORS } from "@/lib/solaria/equip";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Sword> = {
  Warrior: Sword,
  Archer: Target,
  Hunter: Target,
  Mage: Sparkles,
  Priest: Heart,
  Defense: Shield,
};

export const CLASS_NAMES = ["Warrior", "Archer", "Mage", "Priest", "Defense"] as const;

export function ClassIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const Icon = ICONS[name ?? ""] ?? Shield;
  return (
    <Icon
      className={cn("inline-block size-3.5 shrink-0", className)}
      style={{ color: CLASS_COLORS[name ?? ""] || "var(--color-mist)" }}
      aria-hidden
    />
  );
}

export function ClassLabel({
  name,
  level,
  className,
}: {
  name?: string;
  level?: number;
  className?: string;
}) {
  if (!name) return <span className="text-mist">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <ClassIcon name={name} />
      <span>
        {name}
        {level != null ? <span className="text-mist"> {level}</span> : null}
      </span>
    </span>
  );
}

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function DataFreshness({
  updated,
  isFetching,
  onRefresh,
  className,
}: {
  updated?: string | number;
  isFetching?: boolean;
  onRefresh?: () => void;
  className?: string;
}) {
  const normalized = typeof updated === "number" && updated < 10_000_000_000 ? updated * 1000 : updated;
  const date = normalized ? new Date(normalized) : null;
  const minutes = date && !Number.isNaN(date.getTime()) ? Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000)) : null;
  const label = minutes == null ? "Atualizando dados…" : minutes <= 0 ? "Dados atualizados agora" : `Atualizado há ${minutes} min`;
  return (
    <div className={cn("flex items-center gap-2 text-xs text-mist", className)} aria-live="polite">
      <span>{label}</span>
      {onRefresh ? <button type="button" onClick={onRefresh} className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 hover:bg-ink-2 hover:text-fog" aria-label="Atualizar dados"><RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />Atualizar</button> : null}
    </div>
  );
}

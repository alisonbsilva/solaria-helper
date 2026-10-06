import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function ErrorBanner({ onRetry }: { onRetry?: () => void }) {
  const lang = usePrefs((s) => s.lang);
  return (
    <div className="rounded-md border border-danger/40 bg-danger/10 p-4 text-sm">
      <p>{t(lang, "error")}</p>
      {onRetry ? (
        <Button className="mt-2" size="sm" onClick={onRetry}>
          {t(lang, "retry")}
        </Button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className = "h-24" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-mist">
      {children}
    </div>
  );
}

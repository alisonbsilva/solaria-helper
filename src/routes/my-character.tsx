import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Copy, Search, ShieldCheck, UserRound } from "lucide-react";
import { PlayerProfile } from "@/components/player-profile";
import { CharacterUpgrades } from "@/components/character-upgrades";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBanner, Skeleton } from "@/components/error-banner";
import { buildItemIndex } from "@/lib/solaria/equip";
import { t } from "@/lib/solaria/i18n";
import { fetchers, qk } from "@/lib/solaria/query";
import { usePrefs } from "@/lib/solaria/store";
import { copyText } from "@/lib/solaria/format";
import { toast } from "sonner";

export const Route = createFileRoute("/my-character")({
  component: MyCharacterPage,
});

function MyCharacterPage() {
  const lang = usePrefs((state) => state.lang);
  const mainPlayer = usePrefs((state) => state.mainPlayer);
  const setMainPlayer = usePrefs((state) => state.setMainPlayer);
  const favPlayers = usePrefs((state) => state.favPlayers);
  const recentPlayers = usePrefs((state) => state.recentPlayers);
  const [name, setName] = useState(mainPlayer);
  const playerQ = useQuery({
    queryKey: qk.player(mainPlayer),
    queryFn: () => fetchers.player(mainPlayer),
    enabled: Boolean(mainPlayer),
  });
  const itemsQ = useQuery({ queryKey: qk.items(), queryFn: fetchers.items });
  const achievementsQ = useQuery({ queryKey: qk.achievements(), queryFn: fetchers.achievements });
  const index = useMemo(() => (itemsQ.data ? buildItemIndex(itemsQ.data) : null), [itemsQ.data]);
  const suggestions = [...new Set([...favPlayers, ...recentPlayers].filter(Boolean))];

  const chooseCharacter = (event: React.FormEvent) => {
    event.preventDefault();
    const next = name.trim();
    if (next) setMainPlayer(next);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-md border border-teal/40 bg-teal/10 text-teal">
              <UserRound className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">{t(lang, "myChar")}</h2>
              <p className="mt-1 text-sm text-mist">{t(lang, "myCharHint")}</p>
            </div>
          </div>
          {mainPlayer ? (
            <div className="flex flex-wrap gap-2"><span className="inline-flex min-h-9 items-center gap-2 self-start rounded-md border border-ok/40 bg-ok/10 px-3 text-xs font-semibold text-ok"><ShieldCheck className="size-4" /> {t(lang, "activeCharacter")}: {mainPlayer}</span><Button type="button" size="sm" variant="ghost" onClick={async () => { const detail=playerQ.data; const share={title:`${mainPlayer} · Solaria Helper`,text:`${mainPlayer} · Lv ${detail?.level??"—"} · ${detail?.class??"—"}`,url:window.location.href}; if(navigator.share){await navigator.share(share).catch(()=>undefined);return;} const ok=await copyText(`${share.text}\n${share.url}`);toast.success(ok?"Ficha copiada com level e classe":"Não foi possível compartilhar"); }}><Copy className="size-3.5" />Compartilhar ficha</Button></div>
          ) : null}
          <Link to="/planner" className="text-sm font-semibold text-teal hover:text-fog">Abrir Build Planner →</Link>
        </div>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={chooseCharacter}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-mist" />
            <input
              list="my-character-suggestions"
              className="min-h-11 w-full rounded-md border border-line bg-ink pl-10 pr-3 text-sm outline-none focus:border-teal"
              placeholder={t(lang, "searchPlayer")}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <datalist id="my-character-suggestions">
              {suggestions.map((playerName) => <option key={playerName} value={playerName} />)}
            </datalist>
          </div>
          <Button type="submit" variant="primary">{mainPlayer ? t(lang, "changeMain") : t(lang, "setMyCharacter")}</Button>
        </form>
      </section>

      {!mainPlayer ? <EmptyState>{t(lang, "myCharEmpty")}</EmptyState> : null}
      {mainPlayer && playerQ.isLoading ? <Skeleton className="h-64" /> : null}
      {mainPlayer && playerQ.isError ? <ErrorBanner onRetry={() => playerQ.refetch()} /> : null}
      {playerQ.data?.name ? <CharacterUpgrades player={playerQ.data} index={index} /> : null}
      {playerQ.data?.name ? <PlayerProfile player={playerQ.data} index={index} achievements={achievementsQ.data} /> : null}
    </div>
  );
}

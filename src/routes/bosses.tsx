import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Copy, Crosshair, ImagePlus, MapPin, Navigation, Star, Trash2 } from "lucide-react";
import { fetchers, qk } from "@/lib/solaria/query";
import { copyText, elapsedSince, formatEta } from "@/lib/solaria/format";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { ErrorBanner, Skeleton, EmptyState } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { UpcomingBoss, WorldBoss } from "@/lib/solaria/types";
import { DataFreshness } from "@/components/data-freshness";
import { cn } from "@/lib/utils";

type Search = { server?: string };

export const Route = createFileRoute("/bosses")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    server: typeof s.server === "string" ? s.server : undefined,
  }),
  component: BossesPage,
});

function BossesPage() {
  const { server } = Route.useSearch();
  const navigate = Route.useNavigate();
  const lang = usePrefs((s) => s.lang);
  const bossAlerts = usePrefs((s) => s.bossAlerts);
  const markBosses = usePrefs((s) => s.markBosses);
  const favBosses = usePrefs((s) => s.favBosses);
  const toggleFavBoss = usePrefs((s) => s.toggleFavBoss);
  const q = useQuery({ queryKey: qk.bosses(), queryFn: fetchers.bosses, refetchInterval: 30_000 });
  const mapInputRef = useRef<HTMLInputElement>(null);
  const [mapImage, setMapImage] = useState("");
  const [selectedBoss, setSelectedBoss] = useState<string | null>(null);
  const servers = q.data?.servers ?? [];
  const shown = server ? servers.filter((s) => s.server === server) : servers;
  const now = q.data?.now;

  useEffect(() => {
    setMapImage(localStorage.getItem("solaria-boss-map") ?? "");
  }, []);

  const allBosses = useMemo(() => {
    const rows: { server: string; boss: WorldBoss }[] = [];
    for (const sv of shown) for (const b of sv.bosses ?? []) rows.push({ server: sv.server, boss: b });
    return rows;
  }, [shown]);

  const upcoming = useMemo(() => {
    const rows: { server: string; u: UpcomingBoss }[] = [];
    for (const sv of shown) for (const u of sv.upcoming ?? []) rows.push({ server: sv.server, u });
    return rows.sort((a, b) => (a.u.eta ?? 0) - (b.u.eta ?? 0));
  }, [shown]);

  useEffect(() => {
    if (!q.data) return;
    const keys = (q.data.servers ?? []).flatMap((sv) =>
      (sv.bosses ?? []).map((b) => `${sv.server}:${b.name}:${b.x}:${b.y}`),
    );
    const fresh = markBosses(keys);
    if (bossAlerts && fresh.length && "Notification" in window && Notification.permission === "granted") {
      new Notification("Solaria Helper", { body: fresh.slice(0, 3).join(" · ") });
    }
  }, [q.data, bossAlerts, markBosses]);

  const xs = allBosses.map((r) => r.boss.x ?? 0);
  const ys = allBosses.map((r) => r.boss.y ?? 0);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);

  const route = useMemo(() => {
    if (!allBosses.length) return [];
    const remaining = [...allBosses];
    const ordered = [remaining.shift()!];
    while (remaining.length) {
      const last = ordered[ordered.length - 1].boss;
      let nearest = 0;
      let distance = Number.POSITIVE_INFINITY;
      remaining.forEach((candidate, index) => {
        const dx = (candidate.boss.x ?? 0) - (last.x ?? 0);
        const dy = (candidate.boss.y ?? 0) - (last.y ?? 0);
        const nextDistance = dx * dx + dy * dy;
        if (nextDistance < distance) {
          distance = nextDistance;
          nearest = index;
        }
      });
      ordered.push(remaining.splice(nearest, 1)[0]);
    }
    return ordered;
  }, [allBosses]);

  const saveMapImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha uma imagem do mapa.");
      return;
    }
    if (file.size > 4_000_000) {
      toast.error("A imagem deve ter no máximo 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      try {
        localStorage.setItem("solaria-boss-map", value);
        setMapImage(value);
        toast.success("Mapa salvo neste dispositivo.");
      } catch {
        toast.error("Não foi possível salvar. Tente uma imagem menor.");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className="min-h-11 rounded-md border border-line bg-surface px-3"
          value={server ?? ""}
          onChange={(e) => navigate({ search: { server: e.target.value || undefined } })}
        >
          <option value="">{t(lang, "allServers")}</option>
          {servers.map((s) => (
            <option key={s.server}>{s.server}</option>
          ))}
        </select>
        <Button size="sm" variant={bossAlerts ? "primary" : "ghost"} onClick={async () => {
          if (!bossAlerts && "Notification" in window && await Notification.requestPermission() !== "granted") return;
          usePrefs.getState().setBossAlerts(!bossAlerts);
        }}><Bell className="size-3.5" />{bossAlerts ? "Alertas ativos" : "Alertar bosses"}</Button>
      </div>
      <DataFreshness updated={now} isFetching={q.isFetching} onRefresh={() => q.refetch()} />
      {q.isLoading ? <Skeleton className="h-40" /> : null}
      {q.isError ? <ErrorBanner onRetry={() => q.refetch()} /> : null}

      {allBosses.length ? (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold"><Navigation className="size-4 text-teal" />Rota de bosses ativos</h3>
              <p className="mt-1 max-w-2xl text-xs text-mist">
                Ordem calculada pela menor distância entre coordenadas. {server ? `Exibindo o servidor ${server}.` : "Filtre um servidor para evitar posições repetidas."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={mapInputRef} className="hidden" type="file" accept="image/*" onChange={(e) => saveMapImage(e.target.files?.[0])} />
              <Button size="sm" variant="ghost" onClick={() => mapInputRef.current?.click()}><ImagePlus className="size-3.5" />{mapImage ? "Trocar mapa" : "Usar mapa real"}</Button>
              {mapImage ? <Button size="sm" variant="ghost" onClick={() => { localStorage.removeItem("solaria-boss-map"); setMapImage(""); }}><Trash2 className="size-3.5" />Remover</Button> : null}
              <Button size="sm" onClick={async () => {
                const text = route.map((r, index) => `${index + 1}. ${r.boss.name} (${r.boss.x}, ${r.boss.y}) — ${r.server}`).join("\n");
                const ok = await copyText(text);
                toast.success(ok ? "Rota copiada." : "Rota pronta para copiar.");
              }}><Copy className="size-3.5" />Copiar rota</Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="relative min-h-[420px] overflow-hidden border-b border-line bg-ink lg:border-b-0 lg:border-r">
              <div
                className={cn("absolute inset-0", !mapImage && "opacity-60")}
                style={mapImage ? { backgroundImage: `linear-gradient(rgb(7 12 19 / .32), rgb(7 12 19 / .48)), url(${mapImage})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundImage: "linear-gradient(to right, rgb(120 144 168 / .12) 1px, transparent 1px), linear-gradient(to bottom, rgb(120 144 168 / .12) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
              />
              {!mapImage ? (
                <div className="absolute left-4 top-4 max-w-xs rounded-md border border-line bg-surface/95 p-3 text-xs text-mist shadow-lg backdrop-blur">
                  O jogo não publica a imagem do mundo na API. Envie uma captura do mapa para usá-la como fundo neste dispositivo.
                </div>
              ) : null}
              {route.map((r, index) => {
                const left = 7 + ((r.boss.x ?? 0) - minX) / (maxX - minX || 1) * 86;
                const top = 93 - ((r.boss.y ?? 0) - minY) / (maxY - minY || 1) * 86;
                const id = `${r.server}:${r.boss.name}:${r.boss.x}:${r.boss.y}`;
                return (
                  <button
                    key={id}
                    type="button"
                    className={cn("group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-danger p-1.5 text-xs font-black text-white shadow-lg transition hover:z-20 hover:scale-110 focus:z-20 focus:outline-none focus:ring-2 focus:ring-teal", selectedBoss === id && "z-20 scale-110 ring-2 ring-gold")}
                    style={{ left: `${left}%`, top: `${top}%` }}
                    onClick={() => setSelectedBoss(selectedBoss === id ? null : id)}
                    aria-label={`${index + 1}. ${r.boss.name}`}
                  >
                    <span className="grid size-5 place-items-center">{index + 1}</span>
                    <span className={cn("pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-52 -translate-x-1/2 rounded-md border border-line bg-surface px-3 py-2 text-left font-normal text-fog shadow-xl group-hover:block group-focus:block", selectedBoss === id && "block")}>
                      <b className="block text-sm">{r.boss.name}</b>
                      <span className="text-mist">{r.server} · Lv {r.boss.level} · X {r.boss.x} Y {r.boss.y}</span>
                    </span>
                  </button>
                );
              })}
              <div className="absolute bottom-3 left-3 rounded bg-ink/85 px-2 py-1 font-mono text-[10px] text-mist">X {minX}…{maxX} · Y {minY}…{maxY}</div>
            </div>

            <ol className="max-h-[420px] overflow-y-auto p-3">
              {route.map((r, index) => (
                <li key={`${r.server}:${r.boss.name}:${index}`} className="flex items-center gap-3 border-b border-line px-2 py-3 last:border-0">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-danger text-xs font-black text-white">{index + 1}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{r.boss.name}</div><div className="text-xs text-mist">{r.server} · X {r.boss.x} Y {r.boss.y}</div></div>
                  <button className="rounded p-2 text-mist hover:bg-ink hover:text-teal" aria-label={`Copiar posição de ${r.boss.name}`} onClick={async () => { await copyText(`${r.boss.x} ${r.boss.y}`); toast.success("Posição copiada."); }}><Copy className="size-3.5" /></button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : !q.isLoading ? (
        <EmptyState>{t(lang, "emptyBoss")}</EmptyState>
      ) : null}

      <section className="rounded-lg border border-line bg-surface p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "upcoming")}</h3>
        {upcoming.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 18).map((r, i) => (
              <li key={i} className="rounded-md border border-line bg-ink p-3">
                <div className="flex items-center justify-between gap-2 font-semibold"><span>{r.u.name}</span><button onClick={()=>r.u.name&&toggleFavBoss(r.u.name)} aria-label="Favoritar boss"><Star className={cn("size-4 text-mist",r.u.name&&favBosses.includes(r.u.name)&&"fill-gold text-gold")}/></button></div>
                <div className="mt-1 text-xs text-mist">
                  {r.server} · T{r.u.tier} · Lv {r.u.level}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 font-display text-lg tabular-nums text-teal">
                  {t(lang, "eta")} {formatEta(r.u.eta, now)}
                  <span className="rounded bg-teal/10 px-2 py-1 text-xs font-sans font-bold text-teal">Prioridade {i + 1}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mist">{t(lang, "emptyUpcoming")}</p>
        )}
      </section>

      {shown.map((sv) => (
        <section key={sv.server}>
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <span className="rounded bg-teal/15 px-2 py-0.5 text-xs text-teal">{sv.server}</span>
            {sv.count ?? 0} {t(lang, "activeBosses")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(sv.bosses ?? []).map((b, i) => (
              <article key={i} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2"><h4 className="font-semibold">{b.name}</h4><div className="flex items-center gap-1"><button onClick={()=>toggleFavBoss(b.name)} aria-label="Favoritar boss"><Star className={cn("size-4 text-mist",favBosses.includes(b.name)&&"fill-gold text-gold")}/></button><span className="inline-flex items-center gap-1 rounded bg-danger/10 px-2 py-1 text-xs font-bold text-danger"><Crosshair className="size-3" />Ativo</span></div></div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-mist">
                  <div>
                    <div className="text-xs uppercase">Tier</div>
                    <div className="tabular-nums text-fog">{b.tier ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase">Lv</div>
                    <div className="tabular-nums text-fog">{b.level ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase">{t(lang, "position")}</div>
                    <div className="flex items-center gap-1 font-mono text-teal">
                      <MapPin className="size-3" />
                      X {b.x} Y {b.y}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase">{t(lang, "activeFor")}</div>
                    <div className="tabular-nums text-fog">{elapsedSince(b.since, now)}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={async () => {
                    const ok = await copyText(`${b.x} ${b.y}`);
                    toast.success(ok ? t(lang, "copiedPos") : `${b.x} ${b.y}`);
                  }}
                >
                  <Copy className="size-3.5" />
                  {t(lang, "copyPos")}
                </Button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

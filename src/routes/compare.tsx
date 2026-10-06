import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchers, qk } from "@/lib/solaria/query";
import { formatGold, formatNumber } from "@/lib/solaria/format";
import { equipScore, playerKd } from "@/lib/solaria/stats";
import { t } from "@/lib/solaria/i18n";
import { usePrefs } from "@/lib/solaria/store";
import { ErrorBanner, Skeleton, EmptyState } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { ClassLabel } from "@/components/class-icon";
import { ClassRadar } from "@/components/charts";
import { ItemHotspot } from "@/components/item-modal";
import { ItemImg } from "@/components/item-img";
import { buildItemIndex, buildPaperDoll, DOLL_ORDER, filterClassEquip } from "@/lib/solaria/equip";
import { instanceFromEquip } from "@/lib/solaria/tooltip";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/solaria/types";
import { Copy, ShieldCheck, Swords, Trophy } from "lucide-react";
import { copyText } from "@/lib/solaria/format";
import { toast } from "sonner";

type Search = { a?: string; b?: string };

export const Route = createFileRoute("/compare")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    a: typeof s.a === "string" ? s.a : undefined,
    b: typeof s.b === "string" ? s.b : undefined,
  }),
  component: ComparePage,
});

function ComparePage() {
  const { a, b } = Route.useSearch();
  const navigate = Route.useNavigate();
  const lang = usePrefs((s) => s.lang);
  const [aa, setAa] = useState(a ?? "");
  const [bb, setBb] = useState(b ?? "");
  const qa = useQuery({ queryKey: qk.player(a ?? ""), queryFn: () => fetchers.player(a!), enabled: Boolean(a) });
  const qb = useQuery({ queryKey: qk.player(b ?? ""), queryFn: () => fetchers.player(b!), enabled: Boolean(b) });
  const itemsQ = useQuery({ queryKey: qk.items(), queryFn: fetchers.items });
  const index = useMemo(() => (itemsQ.data ? buildItemIndex(itemsQ.data) : null), [itemsQ.data]);
  const both = [qa.data, qb.data].filter((p): p is Player => Boolean(p?.name));

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ search: { a: aa.trim() || undefined, b: bb.trim() || undefined } });
        }}
      >
        <input className="min-h-11 flex-1 rounded-md border border-line bg-surface px-3" placeholder={t(lang, "compareA")} value={aa} onChange={(e) => setAa(e.target.value)} />
        <input className="min-h-11 flex-1 rounded-md border border-line bg-surface px-3" placeholder={t(lang, "compareB")} value={bb} onChange={(e) => setBb(e.target.value)} />
        <Button variant="primary" type="submit">
          {t(lang, "compare")}
        </Button>
        {a && b ? <Button type="button" variant="ghost" onClick={async () => { const ok = await copyText(window.location.href); toast.success(ok ? "Comparação copiada" : "Não foi possível copiar o link"); }}><Copy className="size-3.5" />Compartilhar</Button> : null}
      </form>
      <div className="flex justify-end"><Link to="/set-compare" className="text-sm font-semibold text-teal hover:text-fog">Comparar dois sets do meu personagem →</Link></div>
      {(qa.isLoading && a) || (qb.isLoading && b) ? <Skeleton className="h-40" /> : null}
      {qa.isError || qb.isError ? <ErrorBanner /> : null}
      {!a && !b ? <EmptyState>{t(lang, "emptyCompare")}</EmptyState> : null}

      {both.length === 2 ? (
        <>
          <ComparisonVerdict a={both[0]} b={both[1]} index={index} />
          <div className="rounded-lg border border-line bg-surface p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-mist">{t(lang, "radar")}</h3>
            <ClassRadar players={both} />
          </div>
        </>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Col p={qa.data} other={qb.data} index={index} />
        <Col p={qb.data} other={qa.data} index={index} />
      </div>
    </div>
  );
}

function ComparisonVerdict({ a, b, index }: { a: Player; b: Player; index: ReturnType<typeof buildItemIndex> | null }) {
  const aPower = equipScore(filterClassEquip(a.equipment, a.class || "Warrior", index));
  const bPower = equipScore(filterClassEquip(b.equipment, b.class || "Warrior", index));
  const aKd = playerKd(a).wins - playerKd(a).losses;
  const bKd = playerKd(b).wins - playerKd(b).losses;
  const aPoints = Number((a.level ?? 0) > (b.level ?? 0)) + Number(aPower > bPower) + Number(aKd > bKd);
  const bPoints = Number((b.level ?? 0) > (a.level ?? 0)) + Number(bPower > aPower) + Number(bKd > aKd);
  const winner = aPoints === bPoints ? null : aPoints > bPoints ? a : b;
  const focus = winner ? (winner === a ? aPower >= bPower ? "set e progresso" : "desempenho recente" : bPower >= aPower ? "set e progresso" : "desempenho recente") : "atributos equilibrados";
  return <section className="rounded-lg border border-teal/40 bg-teal/5 p-4"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-teal/10 text-teal"><Trophy className="size-5" /></span><div><div className="text-xs font-bold uppercase tracking-wider text-teal">Decisão rápida</div><h2 className="mt-1 font-display text-xl font-semibold">{winner ? `${winner.name} leva vantagem geral` : "Comparação equilibrada"}</h2><p className="mt-1 text-sm text-mist">Baseado em nível, poder do set e saldo de combates recentes. Destaque: {focus}.</p></div></div><div className="mt-3 grid grid-cols-3 gap-2 text-sm"><VerdictMetric label="Nível" a={a.level ?? 0} b={b.level ?? 0} /><VerdictMetric label="Poder" a={aPower} b={bPower} /><VerdictMetric label="PvP recente" a={aKd} b={bKd} /></div><div className="mt-3 flex items-center gap-2 text-xs text-mist"><ShieldCheck className="size-4 text-ok" /><Swords className="size-4 text-teal" />Use os cartões abaixo para conferir a classe e os equipamentos.</div></section>;
}

function VerdictMetric({ label, a, b }: { label: string; a: number; b: number }) {
  return <div className="rounded-md border border-line bg-surface p-2"><div className="text-xs text-mist">{label}</div><div className="mt-1 flex justify-between gap-2 tabular-nums"><strong className={a > b ? "text-ok" : ""}>{formatNumber(a)}</strong><span className="text-mist">×</span><strong className={b > a ? "text-ok" : ""}>{formatNumber(b)}</strong></div></div>;
}

function Col({
  p,
  other,
  index,
}: {
  p?: Player;
  other?: Player;
  index: ReturnType<typeof buildItemIndex> | null;
}) {
  const lang = usePrefs((s) => s.lang);
  const [cls, setCls] = useState(p?.class || p?.classes?.[0]?.name || "Warrior");
  if (!p?.name) return <div className="rounded-lg border border-dashed border-line p-6 text-mist">{t(lang, "noData")}</div>;
  const { wins, losses } = playerKd(p);
  const filtered = filterClassEquip(p.equipment, cls, index);
  const doll = buildPaperDoll(filtered, index);
  const power = equipScore(filtered);
  const otherPower = other ? equipScore(filterClassEquip(other.equipment, other.class || cls, index)) : null;

  const rows: { k: string; v: number | string; n?: number; o?: number }[] = [
    { k: "Level", v: p.level ?? "—", n: p.level, o: other?.level },
    { k: t(lang, "gold"), v: formatGold(p.gold), n: p.gold, o: other?.gold },
    { k: t(lang, "honor"), v: formatNumber(p.honor), n: p.honor, o: other?.honor },
    { k: t(lang, "kd"), v: `${wins}/${losses}`, n: wins, o: other ? playerKd(other).wins : undefined },
    { k: t(lang, "power"), v: formatNumber(power), n: power, o: otherPower ?? undefined },
  ];

  return (
    <article className="rounded-lg border border-line bg-surface p-4">
      <h2 className="font-display text-xl font-semibold">{p.name}</h2>
      <p className="mt-1 text-sm text-mist">
        <ClassLabel name={p.class} /> · {p.guild ?? "—"}
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {rows.map((r) => (
          <Li key={r.k} k={r.k} v={String(r.v)} n={r.n} o={r.o} />
        ))}
        {(p.classes ?? []).map((c) => {
          const ov = other?.classes?.find((x) => x.name === c.name)?.level;
          return <Li key={c.name} k={c.name} v={`Lv ${c.level} · ${c.pct}%`} n={c.level} o={ov} />;
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(p.classes ?? []).map((c) => (
          <button
            key={c.name}
            onClick={() => setCls(c.name)}
            className={cn("min-h-9 rounded-md border px-2 text-xs", cls === c.name ? "border-teal" : "border-line text-mist")}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {DOLL_ORDER.filter((s) => s.key !== "Blank").map((slot) => {
          const e = doll[slot.key];
          const rec = e && index ? index.byId.get(e.item) ?? index.byId.get(e.item.toLowerCase()) : null;
          return (
            <div key={slot.key} className="flex min-h-16 flex-col items-center rounded-md border border-line bg-ink p-1">
              <span className="text-[10px] uppercase text-mist">{slot.label}</span>
              {e ? (
                <ItemHotspot itemId={e.item} instance={instanceFromEquip(e)}>
                  <ItemImg icon={rec?.icon ?? `item_images/${e.item}.png`} name={rec?.itemName} size={28} />
                </ItemHotspot>
              ) : (
                <span className="text-mist">—</span>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function Li({ k, v, n, o }: { k: string; v: string; n?: number; o?: number }) {
  const lang = usePrefs((s) => s.lang);
  let edge: string | null = null;
  if (n != null && o != null) {
    if (n > o) edge = t(lang, "better");
    else if (n < o) edge = t(lang, "worse");
    else edge = t(lang, "same");
  }
  return (
    <li className="flex justify-between gap-2 border-b border-line/60 py-1">
      <span className="text-mist">{k}</span>
      <span className="font-semibold tabular-nums">
        {v}
        {edge ? (
          <span className={cn("ml-2 text-xs", edge === t(lang, "better") ? "text-ok" : edge === t(lang, "worse") ? "text-danger" : "text-mist")}>
            {edge}
          </span>
        ) : null}
      </span>
    </li>
  );
}
